"""Bounded, process-local notifications for completed Top Picks snapshots."""

from queue import Empty, Full, Queue
from threading import Event, RLock
from time import monotonic


DEFAULT_MAX_SUBSCRIBERS = 64
DEFAULT_MAX_SUBSCRIBERS_PER_CLIENT = 16
DEFAULT_STREAM_LIFETIME_SECONDS = 300
SUBSCRIPTION_RETRY_SECONDS = 5


class SubscriptionLimitError(Exception):
    """The process or peer connection allowance is already in use."""


class SnapshotSubscription:
    def __init__(self, hub, window, revision, client_id, deadline):
        self._hub = hub
        self.window = window
        self.revision = revision
        self.client_id = client_id
        self.deadline = deadline
        self._queue = Queue(maxsize=1)

    @property
    def remaining_seconds(self):
        return max(0, self.deadline - self._hub.clock())

    def get(self, timeout=None):
        return self._queue.get(timeout=timeout)

    def close(self):
        self._hub.unsubscribe(self)

    def _deliver(self, payload):
        try:
            self._queue.put_nowait(dict(payload))
        except Full:
            # A slow browser needs the latest result, not an unbounded backlog.
            try:
                self._queue.get_nowait()
            except Empty:
                pass
            self._queue.put_nowait(dict(payload))


class SnapshotUpdateHub:
    def __init__(self, max_subscribers=DEFAULT_MAX_SUBSCRIBERS,
                 max_per_client=DEFAULT_MAX_SUBSCRIBERS_PER_CLIENT,
                 max_lifetime_seconds=DEFAULT_STREAM_LIFETIME_SECONDS,
                 clock=monotonic):
        self._lock = RLock()
        self._revision = 0
        self._subscribers = {}
        self._client_counts = {}
        self._max_subscribers = max_subscribers
        self._max_per_client = max_per_client
        self._max_lifetime_seconds = max_lifetime_seconds
        self.clock = clock
        self._inactive = Event()
        self._inactive.set()

    @property
    def has_subscribers(self):
        with self._lock:
            self._expire_subscriptions()
            return bool(self._subscribers)

    def preferred_window(self):
        with self._lock:
            self._expire_subscriptions()
            return next(iter(self._subscribers)).window if self._subscribers else "1Y"

    def subscribe(self, window, client_id=None):
        with self._lock:
            self._expire_subscriptions()
            if (len(self._subscribers) >= self._max_subscribers
                    or self._client_counts.get(client_id, 0) >= self._max_per_client):
                raise SubscriptionLimitError()
            subscription = SnapshotSubscription(
                self, window, self._revision, client_id,
                self.clock() + self._max_lifetime_seconds,
            )
            self._subscribers[subscription] = None
            self._client_counts[client_id] = self._client_counts.get(client_id, 0) + 1
            self._inactive.clear()
            return subscription

    def unsubscribe(self, subscription):
        with self._lock:
            if subscription not in self._subscribers:
                return
            del self._subscribers[subscription]
            count = self._client_counts[subscription.client_id] - 1
            if count:
                self._client_counts[subscription.client_id] = count
            else:
                del self._client_counts[subscription.client_id]
            if not self._subscribers:
                self._inactive.set()

    def _expire_subscriptions(self):
        for subscription in list(self._subscribers):
            if subscription.deadline <= self.clock():
                self.unsubscribe(subscription)

    def publish(self, window, generated_at):
        with self._lock:
            self._expire_subscriptions()
            self._revision += 1
            payload = {
                "event": "snapshot", "revision": self._revision,
                "window": window, "generatedAt": generated_at,
            }
            for subscription in self._subscribers:
                if subscription.window == window:
                    subscription._deliver(payload)

    def publish_error(self, window=None):
        with self._lock:
            self._expire_subscriptions()
            for subscription in self._subscribers:
                if window is None or subscription.window == window:
                    subscription._deliver({
                        "event": "refresh-error", "window": subscription.window,
                    })

    def wait_for_inactive(self, seconds):
        return self._inactive.wait(seconds)
