from dataclasses import dataclass
from math import ceil
from threading import RLock
from time import monotonic


@dataclass(frozen=True)
class RateLimitDecision:
    allowed: bool
    retry_after: int


class FixedWindowRateLimiter:
    """Small per-process v1 limiter; not a distributed security boundary."""

    def __init__(
        self,
        limit=20,
        window_seconds=60,
        max_keys=10_000,
        clock=monotonic,
    ):
        if isinstance(limit, bool) or not isinstance(limit, int) or limit < 1:
            raise ValueError("Rate limit must be a positive integer.")
        if window_seconds <= 0:
            raise ValueError("Rate-limit window must be positive.")
        if (
            isinstance(max_keys, bool)
            or not isinstance(max_keys, int)
            or max_keys < 1
        ):
            raise ValueError("Rate-limit capacity must be a positive integer.")
        self.limit = limit
        self.window_seconds = float(window_seconds)
        self.max_keys = max_keys
        self._clock = clock
        self._entries = {}
        self._lock = RLock()

    def _prune(self, now):
        expired = [
            key for key, entry in self._entries.items()
            if now >= entry["window_end"]
        ]
        for key in expired:
            self._entries.pop(key, None)

    def _enforce_capacity(self):
        while len(self._entries) >= self.max_keys:
            oldest_key = min(
                self._entries,
                key=lambda key: (
                    self._entries[key]["last_seen"],
                    str(key),
                ),
            )
            self._entries.pop(oldest_key, None)

    def check(self, key):
        now = float(self._clock())
        normalized_key = str(key)
        with self._lock:
            self._prune(now)
            entry = self._entries.get(normalized_key)
            if entry is None:
                self._enforce_capacity()
                self._entries[normalized_key] = {
                    "count": 1,
                    "window_end": now + self.window_seconds,
                    "last_seen": now,
                }
                return RateLimitDecision(True, 0)

            entry["last_seen"] = now
            if entry["count"] >= self.limit:
                retry_after = max(1, ceil(entry["window_end"] - now))
                return RateLimitDecision(False, retry_after)
            entry["count"] += 1
            return RateLimitDecision(True, 0)

    @property
    def tracked_key_count(self):
        with self._lock:
            return len(self._entries)
