"""Bounded, process-local notifications for completed Top Picks snapshots."""

from queue import Empty, Full, Queue
from threading import Event, RLock


class SnapshotSubscription:
    def __init__(self, hub, window, revision):
        self._hub = hub
        self.window = window
        self.revision = revision
        self._queue = Queue(maxsize=1)

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
    def __init__(self):
        self._lock = RLock()
        self._revision = 0
        self._subscribers = {}
        self._inactive = Event()
        self._inactive.set()

    @property
    def has_subscribers(self):
        with self._lock:
            return bool(self._subscribers)

    def preferred_window(self):
        with self._lock:
            return next(iter(self._subscribers)).window if self._subscribers else "1Y"

    def subscribe(self, window):
        with self._lock:
            subscription = SnapshotSubscription(self, window, self._revision)
            self._subscribers[subscription] = None
            self._inactive.clear()
            return subscription

    def unsubscribe(self, subscription):
        with self._lock:
            self._subscribers.pop(subscription, None)
            if not self._subscribers:
                self._inactive.set()

    def publish(self, window, generated_at):
        with self._lock:
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
            for subscription in self._subscribers:
                if window is None or subscription.window == window:
                    subscription._deliver({
                        "event": "refresh-error", "window": subscription.window,
                    })

    def wait_for_inactive(self, seconds):
        return self._inactive.wait(seconds)
