from copy import deepcopy
from datetime import date, datetime, timezone
import math
from threading import RLock
from time import monotonic

from ..market_primitives import TICKER_PATTERN
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
DEFAULT_UNIVERSE_LIMIT = 50
DEFAULT_CACHE_TTL_SECONDS = 600
MIN_TRAILING_RETURN_OBSERVATIONS = 200
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


class TopPicksConfigurationError(ValueError):
    pass


class TopPicksSnapshotCache:
    def __init__(self, clock=monotonic):
        self._clock = clock
        self._entries = {}
        self._lock = RLock()

    def get(self, key):
        now = self._clock()
        with self._lock:
            entry = self._entries.get(key)
            if entry is None:
                return None
            if entry["expires_at"] <= now:
                self._entries.pop(key, None)
                return None
            return deepcopy(entry["value"])

    def set(self, key, value, ttl_seconds):
        if ttl_seconds <= 0:
            return
        with self._lock:
            self._entries[key] = {
                "expires_at": self._clock() + ttl_seconds,
                "value": deepcopy(value),
            }

    def clear(self):
        with self._lock:
            self._entries.clear()


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

    def get_page(self, top_picks_request):
        snapshot, cache_status = self._get_snapshot()
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
        }
        return {
            "data": {
                "rows": paginated_rows,
                "total": len(ordered_rows),
            },
            "metadata": metadata,
            "warnings": snapshot["warnings"],
        }

    def _get_snapshot(self):
        today = self._today_provider()
        start_date = _one_year_before(today).isoformat()
        end_date = today.isoformat()
        cache_key = self._snapshot_cache_key(start_date, end_date)
        cached = self._snapshot_cache.get(cache_key)
        if cached is not None:
            return cached, "hit"

        snapshot = self._build_snapshot(start_date, end_date)
        self._snapshot_cache.set(
            cache_key,
            snapshot,
            self._cache_ttl_seconds,
        )
        return deepcopy(snapshot), "miss"

    def _snapshot_cache_key(self, start_date, end_date):
        return (
            "top-picks-snapshot",
            self._benchmark_ticker,
            self._risk_free_rate,
            self._universe_limit,
            start_date,
            end_date,
        )

    def _build_snapshot(self, start_date, end_date):
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
            )
            for ticker in tickers
        ]
        return {
            "rows": rows,
            "metadata": self._build_snapshot_metadata(
                start_date,
                end_date,
                rows,
                observations,
            ),
            "warnings": self._build_warnings(rows, observations),
        }

    def _calculate_metric_maps(self, symbols, start_date, end_date):
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

        cumulative = self._calculator_provider(
            "calculate_cumulative_return"
        )(metric_symbols, start_date, end_date)
        drawdown = self._calculator_provider("calculate_drawdown")(
            metric_symbols,
            start_date,
            end_date,
        )
        sortino = self._calculator_provider("calculate_sortino_ratio")(
            metric_symbols,
            start_date,
            end_date,
            self._risk_free_rate,
        )
        information_ratio = self._information_ratio_provider(
            market_data,
            symbols,
            self._benchmark_ticker,
        )
        metric_maps = {
            "ret1y": {
                symbol: _last_value(series)
                for symbol, series in cumulative.items()
            },
            "sharpe": self._calculator_provider(
                "calculate_sharpe_ratio"
            )(metric_symbols, start_date, end_date, self._risk_free_rate),
            "sortino": {
                symbol: _sortino_value(value)
                for symbol, value in sortino.items()
            },
            "volatility": self._calculator_provider(
                "calculate_volatility"
            )(metric_symbols, start_date, end_date),
            "maxDD": {
                symbol: _minimum_value(series)
                for symbol, series in drawdown.items()
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
            "infoRatio": information_ratio,
        }
        metric_statuses = {
            "sortino": {
                symbol: _sortino_status(value)
                for symbol, value in sortino.items()
            }
        }
        return metric_maps, metric_statuses, observations

    @staticmethod
    def _build_row(ticker, metric_maps, metric_statuses, observations):
        observation_count = int(observations.get(ticker.symbol, 0))
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

    @staticmethod
    def _build_warnings(rows, observations):
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

    def _build_snapshot_metadata(
        self,
        start_date,
        end_date,
        rows,
        observations,
    ):
        available_count = sum(
            any(_metric_is_available(row, key) for key in METRIC_KEYS)
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
            "assumptions": {
                "benchmark": self._benchmark_ticker,
                "riskFreeRateAnnual": self._risk_free_rate,
                "universeLimit": self._universe_limit,
                "window": "trailing_one_year",
            },
            "methods": {
                "infoRatio": (
                    "Annualised mean active return divided by annualised "
                    "sample tracking error."
                )
            },
        }
