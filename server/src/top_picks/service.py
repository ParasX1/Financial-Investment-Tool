from copy import deepcopy
from datetime import date, datetime, timedelta, timezone
import json
import logging
import math
import os
import time
from threading import Condition, RLock, Thread
from tempfile import NamedTemporaryFile
from time import monotonic

import pandas as pd

from ..market_primitives import (
    CALCULATION_VERSION,
    TICKER_PATTERN,
    calculate_returns,
    get_adjusted_close_prices,
)
from .analytics import (
    ANNUALISATION_DAYS,
    calculate_information_ratios,
    count_return_observations,
)
from .events import (
    DEFAULT_MAX_SUBSCRIBERS, DEFAULT_MAX_SUBSCRIBERS_PER_CLIENT,
    DEFAULT_STREAM_LIFETIME_SECONDS, SnapshotUpdateHub,
)
from .repository import MAX_TICKER_UNIVERSE, TopPicksDataSourceError


DEFAULT_BENCHMARK_TICKER = "^AXJO"
DEFAULT_RISK_FREE_RATE = 0.0435
DEFAULT_RISK_FREE_RATE_SOURCE = "RBA cash rate target"
DEFAULT_RISK_FREE_RATE_AS_OF = "2026-06-17"
DEFAULT_UNIVERSE_LIMIT = 1000
DEFAULT_CACHE_TTL_SECONDS = 600
DEFAULT_REFRESH_INTERVAL_SECONDS = 60
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
    "1D": {"ret1y": 1},
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
            retained_keys = {self._latest_key, *self._latest_keys.values()}
            expired_keys = [
                old_key for old_key, entry in self._entries.items()
                if old_key not in retained_keys
                and (entry["stale_expires_at"] <= now
                     or math.isinf(entry["stale_expires_at"]))
            ]
            for old_key in expired_keys:
                self._entries.pop(old_key)
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
        if (not isinstance(decoded, list) or not decoded
                or any(not isinstance(part, (str, int, float))
                       or isinstance(part, bool)
                       or (isinstance(part, float) and not math.isfinite(part))
                       for part in decoded)):
            return None
        return tuple(decoded)

    @staticmethod
    def _valid_persisted_value(key, value):
        if not isinstance(value, dict):
            return False
        # Other namespaces are used by cache clients with their own values.
        # Production ranking keys carry the complete calculation context.
        if len(key) < 7 or key[0] != "top-picks-snapshot":
            return True
        if len(key) != 8 or key[5] != CALCULATION_VERSION:
            return False
        _, window, benchmark, rate, limit, version, start, end = key
        if (window not in TOP_PICKS_WINDOWS or not isinstance(benchmark, str)
                or not TICKER_PATTERN.fullmatch(benchmark)
                or not isinstance(rate, (int, float)) or not -1 <= rate <= 1
                or not isinstance(limit, int) or not 1 <= limit <= MAX_TICKER_UNIVERSE):
            return False
        try:
            if date.fromisoformat(start).isoformat() != start or date.fromisoformat(end).isoformat() != end or start > end:
                return False
        except (TypeError, ValueError):
            return False
        rows = value.get("rows")
        metadata = value.get("metadata")
        warnings = value.get("warnings")
        if (not isinstance(rows, list) or not isinstance(metadata, dict)
                or not isinstance(warnings, list)
                or any(not isinstance(warning, str) for warning in warnings)):
            return False
        if metadata.get("calculationVersion") != version:
            return False
        context = {
            "windowCode": window, "benchmark": benchmark,
            "window": WINDOW_METHODS[window],
            "riskFreeRate": rate, "universeLimit": limit,
            "requestedStart": start, "requestedEnd": end,
        }
        if any(name in metadata and metadata[name] != expected for name, expected in context.items()):
            return False
        assumptions = metadata.get("assumptions", {})
        if not isinstance(assumptions, dict):
            return False
        assumed_context = {
            "benchmark": benchmark, "riskFreeRateAnnual": rate,
            "universeLimit": limit, "window": WINDOW_METHODS[window],
        }
        if any(name in assumptions and assumptions[name] != expected for name, expected in assumed_context.items()):
            return False
        for row in rows:
            if not isinstance(row, dict) or not isinstance(row.get("symbol"), str) or not row["symbol"]:
                return False
            statuses = row.get("metricStatus", {})
            if not isinstance(statuses, dict) or any(not isinstance(status, str) for status in statuses.values()):
                return False
            for metric in METRIC_KEYS:
                metric_value = row.get(metric)
                if metric_value is not None:
                    try:
                        if (isinstance(metric_value, bool)
                                or not isinstance(metric_value, (int, float))
                                or not math.isfinite(metric_value)):
                            return False
                    except OverflowError:
                        return False
        return True

    @staticmethod
    def _key_prefix(key):
        if len(key) >= 7 and key[0] == "top-picks-snapshot":
            return tuple(key[:-2])
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
            LOGGER.warning("Top Picks persisted cache is invalid or unavailable; rebuilding.")
            return

        if not isinstance(payload, dict):
            LOGGER.warning("Top Picks persisted cache is invalid; rebuilding.")
            return
        persisted_entries = payload.get("entries")
        if not isinstance(persisted_entries, dict):
            LOGGER.warning("Top Picks persisted cache is invalid; rebuilding.")
            return
        persisted_latest_key = None
        invalid_entries = False
        try:
            if payload.get("latest_key") is not None:
                persisted_latest_key = self._deserialize_key(payload["latest_key"])
                invalid_entries = persisted_latest_key is None
        except (TypeError, ValueError):
            invalid_entries = True

        now = self._clock()
        with self._lock:
            loaded_keys = []
            for raw_key, entry in persisted_entries.items():
                if not isinstance(entry, dict) or "value" not in entry:
                    invalid_entries = True
                    continue
                try:
                    key = self._deserialize_key(raw_key)
                except (TypeError, ValueError):
                    invalid_entries = True
                    continue
                if key is None or not self._valid_persisted_value(key, entry["value"]):
                    invalid_entries = True
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
        if invalid_entries:
            LOGGER.warning("Top Picks persisted cache contains invalid entries; retaining valid snapshots and rebuilding missing contexts.")

    def _persist_entries(self):
        if not self._persistence_path:
            return

        directory = os.path.dirname(self._persistence_path)
        temporary_path = None
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
            with NamedTemporaryFile(
                mode="w", encoding="utf-8", dir=directory or ".",
                prefix=".top-picks-snapshot-", delete=False,
            ) as handle:
                temporary_path = handle.name
                json.dump(payload, handle, separators=(",", ":"))
            os.replace(temporary_path, self._persistence_path)
        except OSError:
            return
        finally:
            if temporary_path is not None:
                try:
                    os.unlink(temporary_path)
                except OSError:
                    pass


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


def _normalize_refresh_setting(value, name, minimum, maximum):
    if isinstance(value, str) and value.strip().isdecimal():
        value = int(value.strip())
    if isinstance(value, bool) or not isinstance(value, int) or not minimum <= value <= maximum:
        raise TopPicksConfigurationError(f"Top Picks {name} is invalid.")
    return value


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
        market_cache_clearer=None,
        today_provider=date.today,
        yearly_metrics_provider=None,
        round_complete_callback=None,
        refresh_interval_seconds=DEFAULT_REFRESH_INTERVAL_SECONDS,
        max_subscribers=DEFAULT_MAX_SUBSCRIBERS,
        max_subscribers_per_client=DEFAULT_MAX_SUBSCRIBERS_PER_CLIENT,
        stream_lifetime_seconds=DEFAULT_STREAM_LIFETIME_SECONDS,
        refresh_clock=monotonic,
        refresh_waiter=time.sleep,
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
        self._market_cache_clearer = (
            (lambda: None)
            if market_cache_clearer is None
            else market_cache_clearer
        )
        self._today_provider = today_provider
        self._yearly_metrics_provider = yearly_metrics_provider
        self._round_complete_callback = round_complete_callback
        self._refreshing_all_windows = False
        self._pending_force_refresh_window = None
        self._refresh_lock = RLock()
        self._refresh_interval_seconds = _normalize_refresh_setting(
            refresh_interval_seconds, "refresh interval", 5, 3600,
        )
        self._refresh_clock = refresh_clock
        self._refresh_waiter = refresh_waiter
        self._next_refresh_at = 0
        self._snapshot_build_condition = Condition()
        self._building_snapshots = False
        self._waiting_snapshot_readers = 0
        self._updates = SnapshotUpdateHub(
            max_subscribers=_normalize_refresh_setting(max_subscribers, "process stream limit", 1, 1024),
            max_per_client=_normalize_refresh_setting(max_subscribers_per_client, "peer stream limit", 1, 128),
            max_lifetime_seconds=_normalize_refresh_setting(stream_lifetime_seconds, "stream lifetime", 30, 3600),
            clock=refresh_clock,
        )

    def subscribe_updates(self, window, client_id=None):
        subscription = self._updates.subscribe(window, client_id=client_id)
        try:
            self._refresh_windows_in_background(
                window, force_refresh=True, queue_if_busy=False,
            )
        except Exception:
            subscription.close()
            raise
        return subscription

    def get_page(self, top_picks_request):
        snapshot, cache_status, refreshing = self._get_snapshot(
            top_picks_request.window,
            force_refresh=top_picks_request.force_refresh,
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
            "refreshIntervalSeconds": self._refresh_interval_seconds,
        }
        return {
            "data": {
                "rows": paginated_rows,
                "total": len(ordered_rows),
            },
            "metadata": metadata,
            "warnings": snapshot["warnings"],
        }

    def _get_snapshot(self, window, force_refresh=False):
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
            refreshing = force_refresh or cache_status == "stale"
            if refreshing:
                self._refresh_windows_in_background(
                    window,
                    force_refresh=force_refresh,
                )
            return cached, cache_status, refreshing

        latest, latest_status = self._snapshot_cache.get_latest_stale(
            excluded_key=cache_key,
            prefix=self._snapshot_cache_prefix(window),
        )
        if latest is not None:
            self._refresh_windows_in_background(
                window,
                force_refresh=force_refresh,
            )
            return latest, latest_status, True

        # An app-wide stream may already be calculating the first snapshot.
        # Wait for its published result instead of downloading the same data.
        with self._snapshot_build_condition:
            self._waiting_snapshot_readers += 1
            try:
                while True:
                    cached, cache_status = self._snapshot_cache.get(cache_key)
                    if cached is not None:
                        refreshing = force_refresh or cache_status == "stale"
                        break
                    cached, cache_status = self._snapshot_cache.get_latest_stale(
                        excluded_key=cache_key,
                        prefix=self._snapshot_cache_prefix(window),
                    )
                    if cached is not None:
                        refreshing = True
                        break
                    if not self._building_snapshots:
                        self._building_snapshots = True
                        break
                    self._snapshot_build_condition.wait()
            finally:
                self._waiting_snapshot_readers -= 1
                self._snapshot_build_condition.notify_all()

        if cached is not None:
            if refreshing:
                self._refresh_windows_in_background(
                    window, force_refresh=force_refresh,
                )
            return cached, cache_status, refreshing

        try:
            if force_refresh:
                self._market_cache_clearer()
            snapshot = self._build_snapshot(start_date, end_date, window)
            self._snapshot_cache.set(
                cache_key,
                snapshot,
                self._cache_ttl_seconds,
            )
            self._updates.publish(window, snapshot["metadata"]["generatedAt"])
        finally:
            self._finish_snapshot_build()
        self._refresh_windows_in_background(window)
        return deepcopy(snapshot), "miss", False

    def _finish_snapshot_build(self):
        with self._snapshot_build_condition:
            self._building_snapshots = False
            self._snapshot_build_condition.notify_all()

    def _refresh_windows_in_background(
        self,
        priority_window,
        force_refresh=False,
        queue_if_busy=True,
    ):
        with self._refresh_lock:
            if self._refreshing_all_windows:
                if force_refresh and queue_if_busy:
                    self._pending_force_refresh_window = priority_window
                return
            self._refreshing_all_windows = True

        def refresh_all():
            current_priority_window = priority_window
            current_force_refresh = force_refresh
            # Page-request work must complete once even if a stream joins and
            # leaves while it waits. Subscriber-only work may stop on inactivity.
            must_complete_round = queue_if_busy

            while True:
                delay = max(0, self._next_refresh_at - self._refresh_clock())
                while delay:
                    if self._updates.has_subscribers:
                        self._updates.wait_for_inactive(delay)
                        with self._refresh_lock:
                            if (not self._updates.has_subscribers
                                    and self._pending_force_refresh_window is None
                                    and not must_complete_round):
                                self._refreshing_all_windows = False
                                # Return while still owning the lock. A new
                                # subscriber can start another worker at unlock;
                                # its shared flag cannot revive this old worker.
                                return
                    else:
                        with self._refresh_lock:
                            if (not must_complete_round
                                    and self._pending_force_refresh_window is None):
                                if not self._updates.has_subscribers:
                                    self._refreshing_all_windows = False
                                    return
                                # A subscriber arrived during the activity check;
                                # use its interruptible wait rather than sleep.
                                continue
                        # A manual request with no stream still shares the process
                        # cooldown; return its saved snapshot while this job waits.
                        self._refresh_waiter(delay)
                    delay = max(0, self._next_refresh_at - self._refresh_clock())
                with self._refresh_lock:
                    if self._pending_force_refresh_window is not None:
                        current_priority_window = self._pending_force_refresh_window
                        self._pending_force_refresh_window = None
                        current_force_refresh = True
                        must_complete_round = True
                failed = False
                try:
                    with self._snapshot_build_condition:
                        # Give cold readers a build slot if the previous round
                        # could not cache their window (failure or zero TTL).
                        while (self._building_snapshots
                               or self._waiting_snapshot_readers):
                            self._snapshot_build_condition.wait()
                        self._building_snapshots = True
                    try:
                        today = self._today_provider()
                        if current_force_refresh:
                            self._market_cache_clearer()
                        published = self._refresh_window_snapshots(
                            today, current_priority_window, current_force_refresh,
                        )
                    finally:
                        self._finish_snapshot_build()
                    failed = published is False
                except Exception:
                    failed = True
                    self._updates.publish_error()
                    LOGGER.warning(
                        "Top Picks background batch refresh failed.",
                        exc_info=True,
                    )
                finally:
                    with self._refresh_lock:
                        self._next_refresh_at = self._refresh_clock() + (
                            5 if failed else self._refresh_interval_seconds
                        )
                        pending_window = self._pending_force_refresh_window
                        self._pending_force_refresh_window = None
                        if pending_window is None:
                            if not self._updates.has_subscribers:
                                self._refreshing_all_windows = False
                                return
                            current_priority_window = self._updates.preferred_window()
                            must_complete_round = False
                        else:
                            current_priority_window = pending_window
                            must_complete_round = True
                        current_force_refresh = True

        try:
            Thread(target=refresh_all, daemon=True).start()
        except Exception:
            with self._refresh_lock:
                self._refreshing_all_windows = False
            raise

    def _refresh_window_snapshots(self, today, priority_window, force_refresh):
        """Share one universe and annual download within a background round."""
        ordered_windows = (
            priority_window,
            *(window for window in TOP_PICKS_WINDOWS if window != priority_window),
        )
        end_date = today.isoformat()
        pending = []
        for window in ordered_windows:
            start_date = self._start_date_for_window(today, window)
            key = self._snapshot_cache_key(window, start_date, end_date)
            cached, status = self._snapshot_cache.get(key)
            if not force_refresh and cached is not None and status == "hit":
                continue
            pending.append((window, start_date, key))
        if not pending:
            return True

        tickers = self._ticker_repository.list_tickers(self._universe_limit)
        self._prune_market_history(tickers, end_date)
        market_data = pd.DataFrame()
        if tickers:
            symbols = list(dict.fromkeys([
                *(ticker.symbol for ticker in tickers), self._benchmark_ticker,
            ]))
            market_data = self._market_data_provider(
                symbols, self._start_date_for_window(today, "1Y"), end_date,
            )
        completed = 0
        for window, start_date, key in pending:
            try:
                snapshot = self._build_snapshot(
                    start_date, end_date, window, tickers=tickers,
                    market_data=self._slice_market_data(
                        market_data, start_date, end_date,
                    ),
                )
                self._snapshot_cache.set(key, snapshot, self._cache_ttl_seconds)
                self._updates.publish(window, snapshot["metadata"]["generatedAt"])
                with self._snapshot_build_condition:
                    self._snapshot_build_condition.notify_all()
                completed += 1
            except Exception:
                self._updates.publish_error(window)
                LOGGER.warning(
                    "Top Picks background window refresh failed: %s", window,
                    exc_info=True,
                )
        if (completed == len(pending) and tickers and self._cache_ttl_seconds > 0
                and self._round_complete_callback is not None):
            try:
                # Each window has already been saved and announced to viewers.
                # Run once in this worker before starting the next download.
                self._round_complete_callback()
            except Exception:
                LOGGER.warning(
                    "Top Picks initial package update failed; keeping previous package.",
                    exc_info=True,
                )
        return completed > 0 and bool(tickers)

    @staticmethod
    def _slice_market_data(market_data, start_date, end_date):
        if market_data is None or market_data.empty:
            return pd.DataFrame() if market_data is None else market_data.copy()
        # Bound before selecting the last N observations: this preserves the
        # existing short-window sample gates even for sparse/newly listed stocks.
        dates = pd.to_datetime(market_data.index).strftime("%Y-%m-%d")
        return market_data.loc[(dates >= start_date) & (dates <= end_date)].copy()

    @staticmethod
    def _start_date_for_window(today, window):
        if window == "1D":
            return (today - timedelta(days=5)).isoformat()
        if window == "1W":
            return (today - timedelta(days=10)).isoformat()
        if window == "1M":
            return (today - timedelta(days=45)).isoformat()
        return _one_year_before(today).isoformat()

    def _snapshot_cache_prefix(self, window):
        return (
            "top-picks-snapshot",
            window,
            self._benchmark_ticker,
            self._risk_free_rate,
            self._universe_limit,
            CALCULATION_VERSION,
        )

    def _snapshot_cache_key(
        self,
        window,
        start_date,
        end_date,
    ):
        return (
            *self._snapshot_cache_prefix(window),
            start_date,
            end_date,
        )

    def _build_snapshot(
        self, start_date, end_date, window="1Y", *, tickers=None, market_data=None,
    ):
        if tickers is None:
            tickers = self._ticker_repository.list_tickers(self._universe_limit)
        if market_data is None:
            self._prune_market_history(tickers, end_date)

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
                    market_data=market_data,
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

    def _prune_market_history(self, tickers, end_date):
        # Only opt into a provider's explicitly declared retention capability;
        # dynamic test doubles and ordinary download functions have none.
        if not callable(getattr(type(self._market_data_provider), "prune", None)):
            return
        symbols = list(dict.fromkeys([
            *(ticker.symbol for ticker in tickers), self._benchmark_ticker,
        ])) if tickers else []
        self._market_data_provider.prune(
            symbols,
            self._start_date_for_window(date.fromisoformat(end_date), "1Y"),
            end_date,
        )

    def _calculate_metric_maps(
        self, symbols, start_date, end_date, window, *, market_data=None,
    ):
        requested_market_symbols = list(symbols)
        if self._benchmark_ticker not in requested_market_symbols:
            requested_market_symbols.append(self._benchmark_ticker)
        # Use one universe for Top Picks calculations so the expensive market
        # data fetch can be reused by the underlying stock-data cache.
        metric_symbols = requested_market_symbols
        if market_data is None:
            market_data = self._market_data_provider(
                requested_market_symbols, start_date, end_date,
            )
        if window == "1Y" and self._yearly_metrics_provider is not None:
            return self._yearly_metrics_provider(
                market_data, symbols, self._benchmark_ticker,
                self._risk_free_rate,
            )
        metric_maps = {
            key: {} for key in METRIC_KEYS
        }
        observations = {}

        if window in {"1D", "1W", "1M"}:
            short_metrics, observations = self._calculate_short_window_metric_maps(
                market_data,
                symbols,
                window,
            )
            metric_maps.update(short_metrics)
        elif window == "1Y":
            observations = self._observation_count_provider(market_data, symbols)
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
        observations = {}

        for symbol in symbols:
            if symbol not in adj_close.columns:
                continue
            observations[symbol] = 0
            prices = adj_close[symbol].dropna().tail(price_observations)
            if prices.shape[0] < 2:
                continue

            metric_maps["ret1y"][symbol] = _finite_float(
                prices.iloc[-1] / prices.iloc[0] - 1
            )
            running_peak = prices.cummax()
            drawdown = (prices / running_peak - 1).clip(upper=0)
            metric_maps["maxDD"][symbol] = _finite_float(drawdown.min())

            # Keep the supplied rows between the selected observed endpoints.
            # Dropping them before pct_change would bridge missing prices.
            sample = adj_close[[symbol]].loc[prices.index[0]:prices.index[-1]]
            returns = calculate_returns(sample)[symbol].dropna()
            observations[symbol] = int(returns.shape[0])
            if returns.shape[0] >= 2:
                metric_maps["volatility"][symbol] = _finite_float(
                    returns.std() * math.sqrt(ANNUALISATION_DAYS)
                )

        if window == "1D":
            metric_maps["volatility"] = {}
            metric_maps["maxDD"] = {}
        return metric_maps, observations

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
            "calculationVersion": CALCULATION_VERSION,
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
                "volatility": (
                    "Annualised sample standard deviation of adjacent supplied "
                    "daily returns in the selected observed-price span."
                ),
                "infoRatio": (
                    "Annualised mean active return divided by annualised "
                    "sample tracking error."
                )
            },
        }
