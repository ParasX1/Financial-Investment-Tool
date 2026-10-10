import json
from queue import Empty

import pytest

from src.server import create_app
from src.top_picks.events import SubscriptionLimitError
from src.top_picks.service import TopPicksConfigurationError


class FakeSubscription:
    revision = 7
    remaining_seconds = 300

    def __init__(self, events=()):
        self.events = list(events)
        self.closed = False
        self.timeouts = []

    def get(self, timeout):
        self.timeouts.append(timeout)
        if self.events:
            return self.events.pop(0)
        raise Empty

    def close(self):
        self.closed = True


class FakeEventsService:
    def __init__(self, events=(), error=None):
        self.subscription = FakeSubscription(events)
        self.windows = []
        self.clients = []
        self.error = error

    def subscribe_updates(self, window, client_id=None):
        self.windows.append(window)
        self.clients.append(client_id)
        if self.error is not None:
            raise self.error
        return self.subscription


def create_client(service):
    app = create_app({"TESTING": True}, top_picks_service=service)
    return app.test_client()


def decode_event(chunk):
    text = chunk.decode() if isinstance(chunk, bytes) else chunk
    lines = dict(line.split(":", 1)
                 for line in text.splitlines() if ":" in line)
    return text, {key: value.strip() for key, value in lines.items()}


def test_stream_connects_then_sends_completed_snapshot_and_releases_on_close():
    update = {
        "event": "snapshot",
        "revision": 8,
        "window": "1M",
        "generatedAt": "2026-10-04T02:00:00+00:00",
    }
    service = FakeEventsService([update])
    response = create_client(service).get(
        "/api/top-picks/events?window=1M",
        headers={"Origin": "http://localhost:3000"},
        buffered=False,
    )
    try:
        assert response.status_code == 200
        assert response.mimetype == "text/event-stream"
        assert "no-cache" in response.headers["Cache-Control"]
        assert response.headers["X-Accel-Buffering"] == "no"
        assert (
            response.headers["Access-Control-Allow-Origin"]
            == "http://localhost:3000"
        )
        assert service.windows == ["1M"]

        chunks = iter(response.response)
        _, connected = decode_event(next(chunks))
        assert connected["event"] == "connected"
        assert json.loads(connected["data"])["window"] == "1M"
        _, snapshot = decode_event(next(chunks))
        assert snapshot["event"] == "snapshot"
        assert snapshot["id"] == "8"
        payload = json.loads(snapshot["data"])
        assert payload["revision"] == 8
        assert payload["window"] == "1M"
        assert payload["generatedAt"] == update["generatedAt"]
        assert not service.subscription.closed
    finally:
        response.close()
    assert service.subscription.closed


def test_stream_uses_heartbeat_comments_when_no_calculation_has_finished():
    service = FakeEventsService()
    response = create_client(service).get(
        "/api/top-picks/events", buffered=False)
    try:
        chunks = iter(response.response)
        next(chunks)
        text, _ = decode_event(next(chunks))
        assert text.startswith(":")
        assert text.endswith("\n\n")
        assert "event:" not in text
        assert service.windows == ["1Y"]
        assert service.subscription.timeouts == [15]
    finally:
        response.close()
    assert service.subscription.closed


def test_stream_forwards_refresh_failure_without_closing_connection():
    service = FakeEventsService([
        {"event": "refresh-error", "window": "1Y"},
        {
            "event": "snapshot", "revision": 8, "window": "1Y",
            "generatedAt": "2026-10-04T02:00:00+00:00",
        },
    ])
    response = create_client(service).get(
        "/api/top-picks/events", buffered=False)
    try:
        chunks = iter(response.response)
        next(chunks)
        _, failed = decode_event(next(chunks))
        assert failed["event"] == "refresh-error"
        assert json.loads(failed["data"])["window"] == "1Y"
        _, recovered = decode_event(next(chunks))
        assert recovered["event"] == "snapshot"
        assert not service.subscription.closed
    finally:
        response.close()


@pytest.mark.parametrize("window", ["invalid", "", "1y", "1Y%0Aevent%3Abad"])
def test_invalid_window_is_rejected_before_subscription(window):
    service = FakeEventsService()
    response = create_client(service).get(
        f"/api/top-picks/events?window={window}")
    assert response.status_code == 400
    assert "error" in response.get_json()
    assert service.windows == []


def test_unconfigured_stream_returns_json_error_before_starting_sse():
    app = create_app({
        "TESTING": True, "SUPABASE_URL": None, "SUPABASE_KEY": None,
    })
    response = app.test_client().get("/api/top-picks/events")
    assert response.status_code == 503
    assert response.is_json
    assert response.get_json() == {
        "error": "Top Picks service is not configured."}


def test_invalid_configuration_is_not_exposed_to_stream_client():
    service = FakeEventsService(
        error=TopPicksConfigurationError("internal config"))
    response = create_client(service).get("/api/top-picks/events")
    assert response.status_code == 503
    assert "internal config" not in response.get_data(as_text=True)


def test_unexpected_subscription_error_returns_safe_json_response():
    service = FakeEventsService(
        error=RuntimeError("provider token must not leak"))
    response = create_client(service).get("/api/top-picks/events")
    assert response.status_code == 500
    assert response.is_json
    assert "provider token" not in response.get_data(as_text=True)


def test_stream_uses_server_peer_address_and_ignores_forwarding_headers():
    service = FakeEventsService()
    response = create_client(service).get(
        "/api/top-picks/events", headers={"X-Forwarded-For": "attacker"},
        environ_overrides={"REMOTE_ADDR": "192.0.2.4"}, buffered=False,
    )
    assert service.clients == ["192.0.2.4"]
    response.close()


def test_capacity_error_returns_retryable_json_before_opening_stream():
    service = FakeEventsService(error=SubscriptionLimitError())
    response = create_client(service).get("/api/top-picks/events")
    assert response.status_code == 429
    assert response.headers["Retry-After"] == "5"
    assert response.is_json


def test_stream_lifetime_sends_reconnect_and_releases_subscription():
    service = FakeEventsService()
    response = create_client(service).get("/api/top-picks/events", buffered=False)
    chunks = iter(response.response)
    next(chunks)
    service.subscription.remaining_seconds = 0
    _, expired = decode_event(next(chunks))
    assert expired["event"] == "reconnect"
    assert expired["retry"] == "5000"
    with pytest.raises(StopIteration):
        next(chunks)
    assert service.subscription.closed
    response.close()


def test_expiration_bounds_blocking_queue_wait():
    service = FakeEventsService()
    service.subscription.remaining_seconds = 2
    response = create_client(service).get("/api/top-picks/events", buffered=False)
    chunks = iter(response.response)
    next(chunks)
    next(chunks)
    assert service.subscription.timeouts == [2]
    response.close()
