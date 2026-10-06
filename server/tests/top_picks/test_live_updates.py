from concurrent.futures import ThreadPoolExecutor, TimeoutError
from datetime import date
from queue import Empty
from threading import Event
from unittest.mock import Mock

import pandas as pd
import pytest

from src.top_picks import service as service_module
from src.top_picks.contracts import Ticker, TopPicksRequest
from src.top_picks.events import SnapshotUpdateHub
from src.top_picks.repository import TopPicksDataSourceError
from src.top_picks.service import TopPicksService


TODAY = date(2026, 10, 4)
GENERATED_AT = "2026-10-04T02:00:00+00:00"


def create_live_service(monkeypatch, cache_ttl_seconds=600):
    jobs = []

    class DeferredThread:
        def __init__(self, target, daemon):
            jobs.append(target)

        def start(self):
            pass

    monkeypatch.setattr(service_module, "Thread", DeferredThread)
    repository = Mock()
    repository.list_tickers.return_value = (
        Ticker("AAA", "Alpha", "Technology"),)
    download = Mock(return_value=pd.DataFrame())
    service = TopPicksService(
        ticker_repository=repository,
        calculator_provider=Mock(),
        market_data_provider=download,
        today_provider=lambda: TODAY,
        cache_ttl_seconds=cache_ttl_seconds,
    )

    def build(start, end, window, **kwargs):
        return {
            "rows": [],
            "metadata": {"windowCode": window, "generatedAt": GENERATED_AT},
            "warnings": [],
        }

    monkeypatch.setattr(service, "_build_snapshot", build)
    return service, jobs, download


def test_hub_routes_updates_to_each_matching_subscriber():
    hub = SnapshotUpdateHub()
    first = hub.subscribe("1Y")
    second = hub.subscribe("1Y")
    other_window = hub.subscribe("1M")
    try:
        hub.publish("1Y", GENERATED_AT)
        first_event = first.get(timeout=0)
        assert first_event == second.get(timeout=0)
        assert first_event["event"] == "snapshot"
        assert first_event["window"] == "1Y"
        assert first_event["generatedAt"] == GENERATED_AT
        with pytest.raises(Empty):
            other_window.get(timeout=0)

        hub.publish("1Y", "2026-10-04T02:01:00+00:00")
        assert first.get(timeout=0)["revision"] > first_event["revision"]
        assert second.get(timeout=0)[
            "generatedAt"] == "2026-10-04T02:01:00+00:00"
    finally:
        first.close()
        second.close()
        other_window.close()
    assert not hub.has_subscribers


def test_closing_subscription_releases_it_without_affecting_other_viewers():
    hub = SnapshotUpdateHub()
    closed = hub.subscribe("1Y")
    remaining = hub.subscribe("1Y")
    closed.close()
    closed.close()
    try:
        hub.publish("1Y", GENERATED_AT)
        assert remaining.get(timeout=0)["generatedAt"] == GENERATED_AT
        with pytest.raises(Empty):
            closed.get(timeout=0)
        assert hub.has_subscribers
    finally:
        remaining.close()
    assert not hub.has_subscribers


def test_slow_subscriber_keeps_only_latest_update_in_bounded_queue():
    hub = SnapshotUpdateHub()
    subscription = hub.subscribe("1Y")
    try:
        for index in range(30):
            hub.publish("1Y", f"2026-10-04T02:00:{index:02d}+00:00")
        assert subscription.get(timeout=0)[
            "generatedAt"] == "2026-10-04T02:00:29+00:00"
        with pytest.raises(Empty):
            subscription.get(timeout=0)
    finally:
        subscription.close()


def test_second_viewer_shares_current_download_without_queuing_another_task(
    monkeypatch,
):
    service, jobs, download = create_live_service(monkeypatch)
    first = service.subscribe_updates("1Y")
    second = service.subscribe_updates("1M")
    try:
        assert len(jobs) == 1
        assert service._refreshing_all_windows
        assert service._pending_force_refresh_window is None
        download.assert_not_called()
    finally:
        first.close()
        second.close()
    jobs[0]()
    assert not service._refreshing_all_windows


def test_cold_page_reads_share_stream_download_and_return_on_window_publication(
    monkeypatch,
):
    service, jobs, download = create_live_service(monkeypatch)
    download_started = Event()
    finish_download = Event()
    next_window_started = Event()
    finish_round = Event()

    def controlled_download(*args):
        download_started.set()
        assert finish_download.wait(5)
        return pd.DataFrame()

    def build(start, end, window, **kwargs):
        if window == "1D":
            next_window_started.set()
            assert finish_round.wait(5)
        return {
            "rows": [{"symbol": "LATEST", "ret1y": 0.2}],
            "metadata": {"windowCode": window, "generatedAt": GENERATED_AT},
            "warnings": [],
        }

    download.side_effect = controlled_download
    snapshot_builder = Mock(side_effect=build)
    monkeypatch.setattr(service, "_build_snapshot", snapshot_builder)
    warm_key = service._snapshot_cache_key(
        "1M", service._start_date_for_window(TODAY, "1M"), TODAY.isoformat(),
    )
    service._snapshot_cache.set(warm_key, {
        "rows": [{"symbol": "WARM", "ret1y": 0.1}],
        "metadata": {"windowCode": "1M", "generatedAt": "previous"},
        "warnings": [],
    }, 600)
    subscription = service.subscribe_updates("1Y")
    readers = ThreadPoolExecutor(max_workers=4)

    try:
        worker = readers.submit(jobs[0])
        assert download_started.wait(2)
        cold_reads = [
            readers.submit(
                service.get_page, TopPicksRequest(1, 25, "ret1y", "desc", "1Y"),
            )
            for _ in range(2)
        ]
        for result in cold_reads:
            with pytest.raises(TimeoutError):
                result.result(timeout=0.1)

        warm_read = readers.submit(
            service.get_page, TopPicksRequest(1, 25, "ret1y", "desc", "1M"),
        ).result(timeout=2)
        assert warm_read["data"]["rows"][0]["symbol"] == "WARM"
        download.assert_called_once()

        finish_download.set()
        assert next_window_started.wait(2)
        for result in cold_reads:
            response = result.result(timeout=2)
            assert response["data"]["rows"][0]["symbol"] == "LATEST"
            assert response["metadata"]["generatedAt"] == GENERATED_AT
            assert response["metadata"]["cacheStatus"] == "hit"
        assert not worker.done()
        download.assert_called_once()
    finally:
        subscription.close()
        finish_download.set()
        finish_round.set()
        readers.shutdown(wait=True)

    assert len(jobs) == 1
    assert snapshot_builder.call_count == 4
    assert all(
        "tickers" in call.kwargs and "market_data" in call.kwargs
        for call in snapshot_builder.call_args_list
    )
    assert not service._refreshing_all_windows


@pytest.mark.parametrize("first_failure", [False, True])
def test_concurrent_cold_reads_share_build_and_failed_build_releases_waiter(
    monkeypatch, first_failure,
):
    service, jobs, _ = create_live_service(monkeypatch)
    first_build_started = Event()
    finish_first_build = Event()

    def build(start, end, window, **kwargs):
        if snapshot_builder.call_count == 1:
            first_build_started.set()
            assert finish_first_build.wait(5)
            if first_failure:
                raise TopPicksDataSourceError("Cold source failed")
        return {
            "rows": [{"symbol": "LATEST", "ret1y": 0.2}],
            "metadata": {"windowCode": window, "generatedAt": GENERATED_AT},
            "warnings": [],
        }

    snapshot_builder = Mock(side_effect=build)
    monkeypatch.setattr(service, "_build_snapshot", snapshot_builder)
    readers = ThreadPoolExecutor(max_workers=2)
    request = TopPicksRequest(1, 25, "ret1y", "desc", "1Y")
    try:
        first_read = readers.submit(service.get_page, request)
        assert first_build_started.wait(2)
        second_read = readers.submit(service.get_page, request)
        with pytest.raises(TimeoutError):
            second_read.result(timeout=0.1)
        assert snapshot_builder.call_count == 1

        finish_first_build.set()
        if first_failure:
            with pytest.raises(TopPicksDataSourceError, match="Cold source failed"):
                first_read.result(timeout=2)
        else:
            assert first_read.result(timeout=2)["data"]["total"] == 1
        assert second_read.result(timeout=2)["data"]["rows"][0]["symbol"] == "LATEST"
    finally:
        finish_first_build.set()
        readers.shutdown(wait=True)

    assert snapshot_builder.call_count == (2 if first_failure else 1)
    assert len(jobs) == 1


@pytest.mark.parametrize("failure", ["requested window", "disabled cache"])
def test_cold_reader_makes_progress_between_continuous_background_rounds(
    monkeypatch, failure,
):
    service, jobs, download = create_live_service(
        monkeypatch, cache_ttl_seconds=0 if failure == "disabled cache" else 600,
    )
    download_started = Event()
    finish_first_download = Event()
    finish_later_download = Event()
    foreground_round_counts = []

    def controlled_download(*args):
        if download.call_count == 1:
            download_started.set()
            assert finish_first_download.wait(5)
        else:
            assert finish_later_download.wait(5)
        return pd.DataFrame()

    def build(start, end, window, **kwargs):
        if not kwargs:
            foreground_round_counts.append(download.call_count)
        if window == "1Y" and failure == "requested window":
            raise TopPicksDataSourceError("Requested window unavailable")
        return {
            "rows": [{"symbol": "LATEST", "ret1y": 0.2}],
            "metadata": {"windowCode": window, "generatedAt": GENERATED_AT},
            "warnings": [],
        }

    download.side_effect = controlled_download
    monkeypatch.setattr(service, "_build_snapshot", build)
    subscription = service.subscribe_updates("1Y")
    readers = ThreadPoolExecutor(max_workers=2)
    try:
        readers.submit(jobs[0])
        assert download_started.wait(2)
        cold_read = readers.submit(
            service.get_page, TopPicksRequest(1, 25, "ret1y", "desc", "1Y"),
        )
        with pytest.raises(TimeoutError):
            cold_read.result(timeout=0.1)

        finish_first_download.set()
        if failure == "requested window":
            with pytest.raises(TopPicksDataSourceError, match="Requested window unavailable"):
                cold_read.result(timeout=2)
        else:
            response = cold_read.result(timeout=2)
            assert response["data"]["rows"][0]["symbol"] == "LATEST"
            assert response["metadata"]["cacheStatus"] == "miss"
        # The page completed while the stream was still active, before its
        # worker could claim another download ahead of the waiting reader.
        assert service._updates.has_subscribers
        assert foreground_round_counts == [1]
    finally:
        subscription.close()
        finish_first_download.set()
        finish_later_download.set()
        readers.shutdown(wait=True)

    assert len(jobs) == 1
    assert not service._refreshing_all_windows


def test_notification_is_emitted_only_after_snapshot_has_been_saved(
    monkeypatch,
):
    service, _, _ = create_live_service(monkeypatch)
    subscription = service.subscribe_updates("1M")
    original_set = service._snapshot_cache.set
    saved = []

    def save(key, snapshot, ttl):
        if key[1] == "1M":
            with pytest.raises(Empty):
                subscription.get(timeout=0)
            saved.append(key)
        original_set(key, snapshot, ttl)

    monkeypatch.setattr(service._snapshot_cache, "set", save)
    try:
        service._refresh_window_snapshots(TODAY, "1M", True)
        update = subscription.get(timeout=0)
        cached, status = service._snapshot_cache.get(saved[0])
        assert status == "hit"
        assert update["generatedAt"] == cached["metadata"]["generatedAt"]
        assert update["window"] == "1M"
        with pytest.raises(Empty):
            subscription.get(timeout=0)
    finally:
        subscription.close()


def test_listener_is_registered_before_an_immediately_completed_refresh(
    monkeypatch,
):
    service, _, _ = create_live_service(monkeypatch)

    def immediate_refresh(window, force_refresh=False, queue_if_busy=True):
        assert force_refresh
        assert not queue_if_busy
        service._refresh_window_snapshots(TODAY, window, True)

    monkeypatch.setattr(
        service, "_refresh_windows_in_background", immediate_refresh)
    subscription = service.subscribe_updates("1Y")
    try:
        assert subscription.get(timeout=0)["generatedAt"] == GENERATED_AT
    finally:
        subscription.close()


def test_worker_starts_next_round_on_completion_and_stops_when_viewer_leaves(
    monkeypatch,
):
    service, jobs, download = create_live_service(monkeypatch)
    subscription = service.subscribe_updates("1Y")
    original_refresh = service._refresh_window_snapshots
    rounds = []

    def refresh(today, window, force):
        rounds.append((window, force))
        result = original_refresh(today, window, force)
        if len(rounds) == 2:
            subscription.close()
        return result

    monkeypatch.setattr(service, "_refresh_window_snapshots", refresh)
    try:
        jobs[0]()
        assert rounds == [("1Y", True), ("1Y", True)]
        assert download.call_count == 2
        assert not service._refreshing_all_windows
        assert service._pending_force_refresh_window is None
    finally:
        subscription.close()


@pytest.mark.parametrize("empty_universe", [False, True])
def test_failed_or_empty_round_backs_off_and_disconnect_interrupts_retry(
    monkeypatch, empty_universe,
):
    service, jobs, download = create_live_service(monkeypatch)
    if empty_universe:
        service._ticker_repository.list_tickers.return_value = ()
    else:
        download.side_effect = RuntimeError("temporary provider failure")
    subscription = service.subscribe_updates("1Y")
    waits = []

    def disconnect_during_wait(seconds):
        waits.append(seconds)
        subscription.close()
        return True

    monkeypatch.setattr(
        service._updates, "wait_for_inactive", disconnect_during_wait)
    try:
        jobs[0]()
        assert waits == [5]
        assert not service._refreshing_all_windows
        assert not service._updates.has_subscribers
        if empty_universe:
            download.assert_not_called()
        else:
            download.assert_called_once()
            assert subscription.get(timeout=0)["event"] == "refresh-error"
    finally:
        subscription.close()


def test_failed_window_emits_error_but_keeps_its_previous_snapshot(
    monkeypatch,
):
    service, _, _ = create_live_service(monkeypatch)
    start = service._start_date_for_window(TODAY, "1W")
    key = service._snapshot_cache_key("1W", start, TODAY.isoformat())
    previous = {"rows": [], "metadata": {
        "generatedAt": "previous"}, "warnings": []}
    service._snapshot_cache.set(key, previous, 600)
    subscription = service.subscribe_updates("1W")
    original_build = service._build_snapshot

    def build(start, end, window, **kwargs):
        if window == "1W":
            raise RuntimeError("provider token must not leak")
        return original_build(start, end, window, **kwargs)

    monkeypatch.setattr(service, "_build_snapshot", build)
    try:
        service._refresh_window_snapshots(TODAY, "1W", True)
        update = subscription.get(timeout=0)
        assert update["event"] == "refresh-error"
        assert update["window"] == "1W"
        assert "provider token" not in str(update)
        assert service._snapshot_cache.get(key)[0] == previous
        with pytest.raises(Empty):
            subscription.get(timeout=0)
    finally:
        subscription.close()
