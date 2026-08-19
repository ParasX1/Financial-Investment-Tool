from copy import deepcopy
from datetime import date, datetime, timedelta, timezone
import json
import logging
import math
import os
import time
from threading import RLock, Thread
from time import monotonic

from ..market_primitives import TICKER_PATTERN, get_adjusted_close_prices
from .analytics import (
    ANNUALISATION_DAYS,
    calculate_information_ratios,
    count_return_observations,
)
from .repository import MAX_TICKER_UNIVERSE, TopPicksDataSourceError


DEFAULT_BENCHMARK_TICKER = "^AXJO"
DEFAULT_RISK_FREE_RATE = 0.0435
DEFAULT_RISK_FREE_RATE_SOURCE = "RBA cash rate target"
DEFAULT_RISK_FREE_RATE_AS_OF = "2026-06-17"
DEFAULT_UNIVERSE_LIMIT = 1000
DEFAULT_CACHE_TTL_SECONDS = 600
DEFAULT_STALE_CACHE_TTL_SECONDS = 86_400
MIN_TRAILING_RETURN_OBSERVATIONS = 200
WINDOW_METHODS = {
    "1D": "trailing_day",
    "1W": "trailing_week",
    "1M": "trailing_month",
    "1Y": "trailing_one_year",
}
TOP_PICKS_WINDOWS = ("1D", "1W", "1M", "1Y")
WINDOW_MIN_OBSERVATIONS = {
    "1D": {"ret1y": 2},
    "1W": {"ret1y": 2, "volatility": 3, "maxDD": 2},
    "1M": {"ret1y": 2, "volatility": 10, "maxDD": 2},
    "1Y": {},
}
WINDOW_PRICE_OBSERVATIONS = {
    "1D": 2,
    "1W": 6,
    "1M": 22,
}
METRIC_KEYS = (
    "ret1y",
    "sharpe",
    "sortino",
    "volatility",
    "maxDD",
    "beta",
    "alpha",
    "infoRatio",
)
METRIC_UNITS = {
    "ret1y": "decimal_return",
    "sharpe": "ratio",
    "sortino": "ratio",
    "volatility": "decimal_annualized",
    "maxDD": "decimal_drawdown",
    "beta": "ratio",
    "alpha": "decimal_annualized",
    "infoRatio": "ratio",
}
WINDOW_METRIC_KEYS = {
    "1D": ("ret1y",),
    "1W": ("ret1y", "volatility", "maxDD"),
    "1M": ("ret1y", "volatility", "maxDD"),
    "1Y": METRIC_KEYS,
}
LOGGER = logging.getLogger(__name__)


class TopPicksConfigurationError(ValueError):
    pass


class TopPicksSnapshotCache:
    def __init__(
        self,
        clock=monotonic,
        persistence_path=None,
        stale_ttl_seconds=DEFAULT_STALE_CACHE_TTL_SECONDS,
    ):
        self._clock = clock
        self._entries = {}
        self._latest_key = None
        self._latest_keys = {}
        self._lock = RLock()
        self._persistence_path = persistence_path
        self._stale_ttl_seconds = stale_ttl_seconds
        self._load_persisted_entries()

    def get(self, key):
        now = self._clock()
        with self._lock:
            entry = self._entries.get(key)
            if entry is None:
                return None, "miss"
            if entry["stale_expires_at"] <= now:
                self._entries.pop(key, None)
                return None, "miss"
            if entry["expires_at"] <= now:
                return deepcopy(entry["value"]), "stale"
            return deepcopy(entry["value"]), "hit"

    def get_latest_stale(self, excluded_key=None, prefix=None):
        with self._lock:
            latest_key = (
                self._latest_keys.get(prefix)
                if prefix is not None
                else self._latest_key
            )
            if latest_key is None or latest_key == excluded_key:
                return None, "miss"
            entry = self._entries.get(latest_key)
            if entry is None:
                return None, "miss"
            return deepcopy(entry["value"]), "stale"

    def set(
        self,
        key,
        value,
        ttl_seconds,
        stale_ttl_seconds=None,
    ):
        if ttl_seconds <= 0:
            return
        now = self._clock()
        resolved_stale_ttl = (
            self._stale_ttl_seconds
            if stale_ttl_seconds is None
            else stale_ttl_seconds
        )
        stale_ttl = max(ttl_seconds, resolved_stale_ttl)
        with self._lock:
            self._entries[key] = {
                "expires_at": now + ttl_seconds,
                "stale_expires_at": now + stale_ttl,
                "stale_expires_at_wall_time": time.time() + stale_ttl,
                "value": deepcopy(value),
            }
            self._latest_key = key
            self._latest_keys[self._key_prefix(key)] = key
            self._persist_entries()

    def clear(self):
        with self._lock:
            self._entries.clear()
            self._latest_key = None
            self._latest_keys.clear()
            self._persist_entries()

    @staticmethod
    def _serialize_key(key):
        return json.dumps(list(key), separators=(",", ":"))

    @staticmethod
    def _deserialize_key(value):
        decoded = json.loads(value)
        return tuple(decoded) if isinstance(decoded, list) else None

    @staticmethod
    def _key_prefix(key):
        return tuple(key[:2]) if len(key) >= 2 else tuple(key[:1])

    def _load_persisted_entries(self):
        if not self._persistence_path or not os.path.exists(
            self._persistence_path
        ):
            return

        try:
            with open(self._persistence_path, encoding="utf-8") as handle:
                payload = json.load(handle)
        except (OSError, ValueError, TypeError):
            return

        persisted_entries = payload.get("entries")
        if not isinstance(persisted_entries, dict):
            return
        persisted_latest_key = None
        try:
            persisted_latest_key = self._deserialize_key(
                payload.get("latest_key")
            )
        except (TypeError, ValueError):
            persisted_latest_key = None

        now = self._clock()
        with self._lock:
            loaded_keys = []
            for raw_key, entry in persisted_entries.items():
                if not isinstance(entry, dict) or "value" not in entry:
                    continue
                try:
                    key = self._deserialize_key(raw_key)
                except (TypeError, ValueError):
                    continue
                if key is None:
                    continue
                # Persisted snapshots are intentionally loaded as stale so the
                # user sees the last complete ranking immediately while a fresh
                # build starts in the background. They do not expire on disk:
                # the latest successful calculation is the startup fallback
                # even after the old stale window has passed or the date-based
                # cache key has moved on.
                self._entries[key] = {
                    "expires_at": now - 1,
                    "stale_expires_at": math.inf,
                    "stale_expires_at_wall_time": entry.get(
                        "stale_expires_at_wall_time"
                    ),
                    "value": entry["value"],
                }
                loaded_keys.append(key)
            if persisted_latest_key in self._entries:
                self._latest_key = persisted_latest_key
            elif loaded_keys:
                self._latest_key = loaded_keys[-1]
            self._latest_keys = {
                self._key_prefix(key): key for key in loaded_keys
            }

    def _persist_entries(self):
        if not self._persistence_path:
            return

        directory = os.path.dirname(self._persistence_path)
        try:
            if directory:
                os.makedirs(directory, exist_ok=True)
            persisted_keys = []
            for key in [self._latest_key, *self._latest_keys.values()]:
                if key is not None and key in self._entries:
                    persisted_keys.append(key)
            persisted_keys = list(dict.fromkeys(persisted_keys))
            payload = {
                "latest_key": (
                    self._serialize_key(self._latest_key)
                    if self._latest_key is not None
                    else None
                ),
                "entries": {
                    self._serialize_key(key): {
                        "stale_expires_at_wall_time": entry.get(
                            "stale_expires_at_wall_time"
                        ),
                        "value": entry["value"],
                    }
                    for key in persisted_keys
                    for entry in [self._entries[key]]
                }
            }
            with open(self._persistence_path, "w", encoding="utf-8") as handle:
                json.dump(payload, handle, separators=(",", ":"))
        except OSError:
            return


def _finite_float(value):
    if isinstance(value, bool):
        return None
    try:
        normalized = float(value)
    except (TypeError, ValueError):
        return None
    return normalized if math.isfinite(normalized) else None


def _last_value(series):
    if not hasattr(series, "dropna"):
        return None
    available = series.dropna()
    return _finite_float(available.iloc[-1]) if not available.empty else None


def _minimum_value(series):
    if not hasattr(series, "dropna"):
        return None
    available = series.dropna()
    return _finite_float(available.min()) if not available.empty else None


def _sortino_value(value):
    if isinstance(value, dict):
        return _finite_float(value.get("value"))
    return _finite_float(value)


def _sortino_status(value):
    if isinstance(value, dict):
        status = value.get("status")
        if isinstance(status, str) and status:
            return status
    return "ok" if _finite_float(value) is not None else "unavailable"


def _sortable_metric_value(row, sort_key):
    if (
        sort_key == "sortino"
        and row.get("metricStatus", {}).get("sortino") == "infinite"
    ):
        return math.inf
    return _finite_float(row.get(sort_key))


def _metric_is_available(row, metric_key):
    if (
        metric_key == "sortino"
        and row.get("metricStatus", {}).get("sortino") == "infinite"
    ):
        return True
    return row.get(metric_key) is not None


def sort_top_pick_rows(rows, sort_key, sort_dir):
    available = [
        dict(row) for row in rows
        if _sortable_metric_value(row, sort_key) is not None
    ]
    missing = [
        dict(row) for row in rows
        if _sortable_metric_value(row, sort_key) is None
    ]
    ordered = sorted(
        available,
        key=lambda row: _sortable_metric_value(row, sort_key),
        reverse=sort_dir == "desc",
    )
    return ordered + missing


def _one_year_before(value):
    try:
        return value.replace(year=value.year - 1)
    except ValueError:
        return value.replace(year=value.year - 1, day=28)


def _normalize_benchmark(value):
    if not isinstance(value, str):
        raise TopPicksConfigurationError(
            "Top Picks benchmark must be a ticker symbol."
        )
    benchmark = value.strip().upper()
    if not TICKER_PATTERN.fullmatch(benchmark):
        raise TopPicksConfigurationError(
            "Top Picks benchmark must be a ticker symbol."
        )
    return benchmark


def _normalize_risk_free_rate(value):
    rate = _finite_float(value)
    if rate is None or not -1 <= rate <= 1:
        raise TopPicksConfigurationError(
            "Top Picks risk-free rate is invalid."
        )
    return rate


def _normalize_universe_limit(value):
    if isinstance(value, str) and value.strip().isdecimal():
        value = int(value.strip())
    if (
        isinstance(value, bool)
        or not isinstance(value, int)
        or not 1 <= value <= MAX_TICKER_UNIVERSE
    ):
        raise TopPicksConfigurationError(
            "Top Picks universe limit is invalid."
        )
    return value


def _normalize_cache_ttl(value):
    if isinstance(value, str) and value.strip().isdecimal():
        value = int(value.strip())
    if (
        isinstance(value, bool)
        or not isinstance(value, int)
        or not 0 <= value <= 86_400
    ):
        raise TopPicksConfigurationError(
            "Top Picks cache TTL is invalid."
        )
    return value


def _normalize_source(value):
    if not isinstance(value, str) or not value.strip():
        raise TopPicksConfigurationError(
            "Top Picks risk-free source is invalid."
        )
    return value.strip()[:120]


def _normalize_as_of(value):
    if value is None:
        return None
    if not isinstance(value, str):
        raise TopPicksConfigurationError(
            "Top Picks risk-free as-of date is invalid."
        )
    try:
        parsed = date.fromisoformat(value)
    except ValueError as error:
        raise TopPicksConfigurationError(
            "Top Picks risk-free as-of date is invalid."
        ) from error
    if parsed.isoformat() != value:
        raise TopPicksConfigurationError(
            "Top Picks risk-free as-of date is invalid."
        )
    return value


def _symbol_summary(prefix, symbols):
    noun = "symbol" if len(symbols) == 1 else "symbols"
    displayed = symbols[:10]
    summary = ", ".join(displayed)
    remaining = len(symbols) - len(displayed)
    if remaining:
        summary = f"{summary}, and {remaining} more"
    return f"{prefix} for {len(symbols)} {noun}: {summary}."


class TopPicksService:
    def __init__(
        self,
        ticker_repository,
        calculator_provider,
        market_data_provider,
        information_ratio_provider=calculate_information_ratios,
        observation_count_provider=count_return_observations,
        benchmark_ticker=DEFAULT_BENCHMARK_TICKER,
        risk_free_rate=DEFAULT_RISK_FREE_RATE,
        risk_free_rate_source=DEFAULT_RISK_FREE_RATE_SOURCE,
        risk_free_rate_as_of=DEFAULT_RISK_FREE_RATE_AS_OF,
        universe_limit=DEFAULT_UNIVERSE_LIMIT,
        cache_ttl_seconds=DEFAULT_CACHE_TTL_SECONDS,
        snapshot_cache=None,
        today_provider=date.today,
    ):
        self._ticker_repository = ticker_repository
        self._calculator_provider = calculator_provider
        self._market_data_provider = market_data_provider
        self._information_ratio_provider = information_ratio_provider
        self._observation_count_provider = observation_count_provider
        self._benchmark_ticker = _normalize_benchmark(benchmark_ticker)
        self._risk_free_rate = _normalize_risk_free_rate(risk_free_rate)
        normalized_source = _normalize_source(risk_free_rate_source)
        normalized_as_of = _normalize_as_of(risk_free_rate_as_of)
        if self._risk_free_rate != DEFAULT_RISK_FREE_RATE:
            if normalized_source == DEFAULT_RISK_FREE_RATE_SOURCE:
                normalized_source = "Application configuration"
            if normalized_as_of == DEFAULT_RISK_FREE_RATE_AS_OF:
                normalized_as_of = None
        self._risk_free_rate_source = normalized_source
        self._risk_free_rate_as_of = normalized_as_of
        self._universe_limit = _normalize_universe_limit(universe_limit)
        self._cache_ttl_seconds = _normalize_cache_ttl(cache_ttl_seconds)
        self._snapshot_cache = (
            TopPicksSnapshotCache()
            if snapshot_cache is None
            else snapshot_cache
        )
        self._today_provider = today_provider
        self._refreshing_all_windows = False
        self._refresh_lock = RLock()

    def get_page(self, top_picks_request):
        snapshot, cache_status, refreshing = self._get_snapshot(
            top_picks_request.window
        )
        ordered_rows = sort_top_pick_rows(
            snapshot["rows"],
            top_picks_request.sort_key,
            top_picks_request.sort_dir,
        )
        offset = (
            top_picks_request.page - 1
        ) * top_picks_request.page_size
        paginated_rows = ordered_rows[
            offset:offset + top_picks_request.page_size
        ]
        metadata = {
            **snapshot["metadata"],
            "cacheStatus": cache_status,
            "cacheTtlSeconds": self._cache_ttl_seconds,
            "page": top_picks_request.page,
            "pageSize": top_picks_request.page_size,
            "sortKey": top_picks_request.sort_key,
            "sortDir": top_picks_request.sort_dir,
            "snapshotRefreshing": refreshing,
        }
        return {
            "data": {
                "rows": paginated_rows,
                "total": len(ordered_rows),
            },
            "metadata": metadata,
            "warnings": snapshot["warnings"],
        }

    def _get_snapshot(self, window):
        today = self._today_provider()
        start_date = self._start_date_for_window(
            today,
            window,
        )
        end_date = today.isoformat()
        cache_key = self._snapshot_cache_key(
            window,
            start_date,
            end_date,
        )
        cached, cache_status = self._snapshot_cache.get(cache_key)
        if cached is not None:
            refreshing = cache_status == "stale"
            if refreshing:
                self._refresh_windows_in_background(window)
            return cached, cache_status, refreshing

        latest, latest_status = self._snapshot_cache.get_latest_stale(
            excluded_key=cache_key,
            prefix=self._snapshot_cache_prefix(window),
        )
        if latest is None and window == "1Y":
            latest, latest_status = self._snapshot_cache.get_latest_stale(
                excluded_key=cache_key,
            )
        if latest is not None:
            self._refresh_windows_in_background(window)
            return latest, latest_status, True

        snapshot = self._build_snapshot(start_date, end_date, window)
        self._snapshot_cache.set(
            cache_key,
            snapshot,
            self._cache_ttl_seconds,
        )
        self._refresh_windows_in_background(window)
        return deepcopy(snapshot), "miss", False

    def _refresh_windows_in_background(self, priority_window):
        with self._refresh_lock:
            if self._refreshing_all_windows:
                return
            self._refreshing_all_windows = True

        def refresh_all():
            try:
                today = self._today_provider()
                ordered_windows = (
                    priority_window,
                    *[
                        window for window in TOP_PICKS_WINDOWS
                        if window != priority_window
                    ],
                )
                for window in ordered_windows:
                    start_date = self._start_date_for_window(today, window)
                    end_date = today.isoformat()
                    cache_key = self._snapshot_cache_key(
                        window,
                        start_date,
                        end_date,
                    )
                    try:
                        cached, cache_status = self._snapshot_cache.get(
                            cache_key
                        )
                        if cached is not None and cache_status == "hit":
                            continue
                        snapshot = self._build_snapshot(
                            start_date,
                            end_date,
                            window,
                        )
                        self._snapshot_cache.set(
                            cache_key,
                            snapshot,
                            self._cache_ttl_seconds,
                        )
                    except Exception:
                        LOGGER.warning(
                            "Top Picks background window refresh failed.",
                            exc_info=True,
                        )
            finally:
                with self._refresh_lock:
                    self._refreshing_all_windows = False

        Thread(target=refresh_all, daemon=True).start()

    @staticmethod
    def _start_date_for_window(today, window):
        if window == "1D":
            return (today - timedelta(days=5)).isoformat()
        if window == "1W":
            return (today - timedelta(days=10)).isoformat()
        if window == "1M":
            return (today - timedelta(days=45)).isoformat()
        return _one_year_before(today).isoformat()

    @staticmethod
    def _snapshot_cache_prefix(window):
        return ("top-picks-snapshot", window)

    def _snapshot_cache_key(
        self,
        window,
        start_date,
        end_date,
    ):
        return (
            "top-picks-snapshot",
            window,
            self._benchmark_ticker,
            self._risk_free_rate,
            self._universe_limit,
            start_date,
            end_date,
        )

    def _build_snapshot(self, start_date, end_date, window="1Y"):
        tickers = self._ticker_repository.list_tickers(
            self._universe_limit
        )

        if tickers:
            try:
                (
                    metric_maps,
                    metric_statuses,
                    observations,
                ) = self._calculate_metric_maps(
                    [ticker.symbol for ticker in tickers],
                    start_date,
                    end_date,
                    window,
                )
            except TopPicksDataSourceError:
                raise
            except Exception as error:
                raise TopPicksDataSourceError(
                    "Unable to calculate Top Picks market data."
                ) from error
        else:
            metric_maps = {key: {} for key in METRIC_KEYS}
            metric_statuses = {"sortino": {}}
            observations = {}

        rows = [
            self._build_row(
                ticker,
                metric_maps,
                metric_statuses,
                observations,
                window,
            )
            for ticker in tickers
        ]
        return {
            "rows": rows,
            "metadata": self._build_snapshot_metadata(
                start_date,
                end_date,
                window,
                rows,
                observations,
            ),
            "warnings": self._build_warnings(rows, observations, window),
        }

    def _calculate_metric_maps(self, symbols, start_date, end_date, window):
        requested_market_symbols = list(symbols)
        if self._benchmark_ticker not in requested_market_symbols:
            requested_market_symbols.append(self._benchmark_ticker)
        # Use one universe for Top Picks calculations so the expensive market
        # data fetch can be reused by the underlying stock-data cache.
        metric_symbols = requested_market_symbols
        market_data = self._market_data_provider(
            requested_market_symbols,
            start_date,
            end_date,
        )
        observations = self._observation_count_provider(
            market_data,
            symbols,
        )

        metric_maps = {
            key: {} for key in METRIC_KEYS
        }

        if window in {"1D", "1W", "1M"}:
            metric_maps.update(self._calculate_short_window_metric_maps(
                market_data,
                symbols,
                window,
            ))
        elif window == "1Y":
            cumulative = self._calculator_provider(
                "calculate_cumulative_return"
            )(metric_symbols, start_date, end_date)
            metric_maps["ret1y"] = {
                symbol: _last_value(series)
                for symbol, series in cumulative.items()
            }
            drawdown = self._calculator_provider("calculate_drawdown")(
                metric_symbols,
                start_date,
                end_date,
            )
            metric_maps["volatility"] = self._calculator_provider(
                "calculate_volatility"
            )(metric_symbols, start_date, end_date)
            metric_maps["maxDD"] = {
                symbol: _minimum_value(series)
                for symbol, series in drawdown.items()
            }

        metric_statuses = {"sortino": {}}
        if window == "1Y":
            sortino = self._calculator_provider("calculate_sortino_ratio")(
                metric_symbols,
                start_date,
                end_date,
                self._risk_free_rate,
            )
            metric_maps.update({
                "sharpe": self._calculator_provider(
                    "calculate_sharpe_ratio"
                )(
                    metric_symbols,
                    start_date,
                    end_date,
                    self._risk_free_rate,
                ),
                "sortino": {
                    symbol: _sortino_value(value)
                    for symbol, value in sortino.items()
                },
                "beta": self._calculator_provider("calculate_beta")(
                    symbols,
                    self._benchmark_ticker,
                    start_date,
                    end_date,
                ),
                "alpha": self._calculator_provider("calculate_alpha")(
                    symbols,
                    self._benchmark_ticker,
                    start_date,
                    end_date,
                    self._risk_free_rate,
                ),
                "infoRatio": self._information_ratio_provider(
                    market_data,
                    symbols,
                    self._benchmark_ticker,
                ),
            })
            metric_statuses["sortino"] = {
                symbol: _sortino_status(value)
                for symbol, value in sortino.items()
            }

        return metric_maps, metric_statuses, observations

    @staticmethod
    def _calculate_short_window_metric_maps(market_data, symbols, window):
        price_observations = WINDOW_PRICE_OBSERVATIONS[window]
        adj_close = get_adjusted_close_prices(market_data, symbols)
        metric_maps = {
            "ret1y": {},
            "volatility": {},
            "maxDD": {},
        }

        for symbol in symbols:
            if symbol not in adj_close.columns:
                continue
            prices = adj_close[symbol].dropna().tail(price_observations)
            if prices.shape[0] < 2:
                continue

            metric_maps["ret1y"][symbol] = _finite_float(
                prices.iloc[-1] / prices.iloc[0] - 1
            )
            running_peak = prices.cummax()
            drawdown = (prices / running_peak - 1).clip(upper=0)
            metric_maps["maxDD"][symbol] = _finite_float(drawdown.min())

            returns = prices.pct_change(fill_method=None).dropna()
            if returns.shape[0] >= 2:
                metric_maps["volatility"][symbol] = _finite_float(
                    returns.std() * math.sqrt(ANNUALISATION_DAYS)
                )

        if window == "1D":
            metric_maps["volatility"] = {}
            metric_maps["maxDD"] = {}
        return metric_maps

    @staticmethod
    def _build_row(
        ticker,
        metric_maps,
        metric_statuses,
        observations,
        window,
    ):
        observation_count = int(observations.get(ticker.symbol, 0))
        if window == "1Y":
            has_full_window = (
                observation_count >= MIN_TRAILING_RETURN_OBSERVATIONS
            )
            sortino_status = metric_statuses["sortino"].get(
                ticker.symbol,
                "unavailable",
            )
            if not has_full_window:
                sortino_status = (
                    "limited_data" if observation_count else "unavailable"
                )
            return {
                "symbol": ticker.symbol,
                "name": ticker.name,
                "industry": ticker.industry,
                **{
                    key: (
                        _finite_float(metric_maps[key].get(ticker.symbol))
                        if has_full_window
                        else None
                    )
                    for key in METRIC_KEYS
                },
                "metricStatus": {"sortino": sortino_status},
            }

        window_minimums = WINDOW_MIN_OBSERVATIONS.get(window, {})
        enabled_metrics = WINDOW_METRIC_KEYS.get(window, METRIC_KEYS)

        def metric_value(key):
            if key not in enabled_metrics:
                return None
            minimum_observations = window_minimums.get(
                key,
                MIN_TRAILING_RETURN_OBSERVATIONS,
            )
            if observation_count < minimum_observations:
                return None
            return _finite_float(metric_maps[key].get(ticker.symbol))

        return {
            "symbol": ticker.symbol,
            "name": ticker.name,
            "industry": ticker.industry,
            **{key: metric_value(key) for key in METRIC_KEYS},
            "metricStatus": {"sortino": "unavailable"},
        }

    @staticmethod
    def _build_warnings(rows, observations, window="1Y"):
        if window == "1Y":
            partial_symbols = []
            missing_symbols = []
            limited_symbols = []
            for row in rows:
                symbol = row["symbol"]
                observation_count = int(observations.get(symbol, 0))
                if 0 < observation_count < MIN_TRAILING_RETURN_OBSERVATIONS:
                    limited_symbols.append(symbol)
                    continue
                availability = [
                    _metric_is_available(row, key) for key in METRIC_KEYS
                ]
                if not any(availability):
                    missing_symbols.append(symbol)
                elif not all(availability):
                    partial_symbols.append(symbol)

            warnings = []
            if limited_symbols:
                warnings.append(_symbol_summary(
                    "Insufficient trailing history",
                    limited_symbols,
                ))
            if partial_symbols:
                warnings.append(_symbol_summary(
                    "Some metrics are unavailable",
                    partial_symbols,
                ))
            if missing_symbols:
                warnings.append(_symbol_summary(
                    "No usable market data",
                    missing_symbols,
                ))
            if not rows:
                warnings.append("No ticker universe is available.")
            return warnings

        enabled_metrics = WINDOW_METRIC_KEYS.get(window, METRIC_KEYS)
        window_minimums = WINDOW_MIN_OBSERVATIONS.get(window, {})
        minimum_observations = min(
            window_minimums.values(),
            default=MIN_TRAILING_RETURN_OBSERVATIONS,
        )
        partial_symbols = []
        missing_symbols = []
        limited_symbols = []
        for row in rows:
            symbol = row["symbol"]
            observation_count = int(observations.get(symbol, 0))
            if 0 < observation_count < minimum_observations:
                limited_symbols.append(symbol)
                continue
            availability = [
                _metric_is_available(row, key) for key in enabled_metrics
            ]
            if not any(availability):
                missing_symbols.append(symbol)
            elif not all(availability):
                partial_symbols.append(symbol)

        warnings = []
        if limited_symbols:
            warnings.append(_symbol_summary(
                "Insufficient trailing history",
                limited_symbols,
            ))
        if partial_symbols:
            warnings.append(_symbol_summary(
                "Some metrics are unavailable",
                partial_symbols,
            ))
        if missing_symbols:
            warnings.append(_symbol_summary(
                "No usable market data",
                missing_symbols,
            ))
        if not rows:
            warnings.append("No ticker universe is available.")
        return warnings

    def _build_snapshot_metadata(
        self,
        start_date,
        end_date,
        window,
        rows,
        observations,
    ):
        available_count = sum(
            any(
                _metric_is_available(row, key)
                for key in WINDOW_METRIC_KEYS.get(window, METRIC_KEYS)
            )
            for row in rows
        )
        return {
            "benchmark": self._benchmark_ticker,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "requestedStart": start_date,
            "requestedEnd": end_date,
            "endDateInclusive": True,
            "annualisationDays": ANNUALISATION_DAYS,
            "riskFreeRate": self._risk_free_rate,
            "riskFreeRateSource": self._risk_free_rate_source,
            "riskFreeRateAsOf": self._risk_free_rate_as_of,
            "universeLimit": self._universe_limit,
            "universeCount": len(rows),
            "availableCount": available_count,
            "minimumTrailingReturnObservations": (
                MIN_TRAILING_RETURN_OBSERVATIONS
            ),
            "observationsBySymbol": {
                row["symbol"]: int(observations.get(row["symbol"], 0))
                for row in rows
            },
            "units": dict(METRIC_UNITS),
            "window": WINDOW_METHODS.get(window, "trailing_one_year"),
            "windowCode": window,
            "availableMetrics": list(WINDOW_METRIC_KEYS.get(
                window,
                METRIC_KEYS,
            )),
            "assumptions": {
                "benchmark": self._benchmark_ticker,
                "riskFreeRateAnnual": self._risk_free_rate,
                "universeLimit": self._universe_limit,
                "window": WINDOW_METHODS.get(window, "trailing_one_year"),
            },
            "methods": {
                "infoRatio": (
                    "Annualised mean active return divided by annualised "
                    "sample tracking error."
                )
            },
        }
