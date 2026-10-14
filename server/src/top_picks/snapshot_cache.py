"""Thread-safe snapshot storage and atomic last-successful-result persistence."""

from copy import deepcopy
from datetime import date
import json
import logging
import math
import os
from threading import RLock
from tempfile import NamedTemporaryFile
import time
from time import monotonic

from ..market_primitives import CALCULATION_VERSION, TICKER_PATTERN
from .configuration import (
    DEFAULT_STALE_CACHE_TTL_SECONDS, METRIC_KEYS, TOP_PICKS_WINDOWS, WINDOW_METHODS,
)
from .repository import MAX_TICKER_UNIVERSE


LOGGER = logging.getLogger(__name__)


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
            LOGGER.warning(
                "Top Picks snapshot persistence failed; continuing with the in-memory cache."
            )
            return
        finally:
            if temporary_path is not None:
                try:
                    os.unlink(temporary_path)
                except OSError:
                    pass
