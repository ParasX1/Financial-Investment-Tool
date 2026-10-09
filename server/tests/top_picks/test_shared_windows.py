from datetime import date
from unittest.mock import Mock

import numpy as np
import pandas as pd
import pytest

from src.analytics.calculator_registry import get_calculator
from src.top_picks import service as module
from src.top_picks.batch_analytics import calculate_yearly_metrics
from src.top_picks.contracts import Ticker
from src.top_picks.service import TOP_PICKS_WINDOWS, TopPicksService


TODAY = date(2026, 10, 3)


def build_service(
    monkeypatch, string_dates=False, round_complete_callback=None,
    cache_ttl_seconds=600,
):
    dates = pd.date_range("2025-09-01", "2026-10-05", freq="B")
    random = np.random.default_rng(17)
    values = 100 * np.cumprod(1 + random.normal(0.001,
                              0.01, (len(dates), 3)), axis=0)
    frame = pd.DataFrame(values, index=dates, columns=pd.MultiIndex.from_tuples([
        (symbol, "Adj Close") for symbol in ("AAA", "BBB", "SPY")
    ]))
    # Sparse stock: old prices must not leak into the short-window tail.
    frame.loc["2026-08-01":"2026-10-01", ("BBB", "Adj Close")] = np.nan
    frame.iloc[-10, 0] = np.nan
    if string_dates:
        frame.index = frame.index.strftime("%Y-%m-%d")

    def download(symbols, start, end):
        return frame.loc[start:end].copy()

    repository = Mock()
    repository.list_tickers.return_value = (
        Ticker("AAA", "AAA", "Technology"), Ticker("BBB", "BBB", "Materials"),
    )
    refresh_time = [0]

    def advance(seconds):
        refresh_time[0] += seconds

    service = TopPicksService(
        ticker_repository=repository, calculator_provider=get_calculator,
        market_data_provider=Mock(side_effect=download), benchmark_ticker="SPY",
        yearly_metrics_provider=calculate_yearly_metrics,
        today_provider=lambda: TODAY,
        round_complete_callback=round_complete_callback,
        cache_ttl_seconds=cache_ttl_seconds,
        refresh_clock=lambda: refresh_time[0], refresh_waiter=advance,
    )
    jobs = []

    class DeferredThread:
        def __init__(self, target, daemon):
            jobs.append(target)

        def start(self):
            pass

    monkeypatch.setattr(module, "Thread", DeferredThread)
    return service, jobs


class RecordingRetentionProvider:
    def __init__(self, downloader):
        self.downloader = downloader
        self.calls = []

    def prune(self, symbols, start, end):
        self.calls.append(("prune", symbols, start, end))

    def __call__(self, symbols, start, end):
        self.calls.append(("download", symbols, start, end))
        return self.downloader(symbols, start, end)


@pytest.mark.parametrize("initial", TOP_PICKS_WINDOWS)
@pytest.mark.parametrize("string_dates", [False, True])
def test_cold_is_on_demand_then_background_shares_year(monkeypatch, initial, string_dates):
    service, jobs = build_service(monkeypatch, string_dates)
    cold, status, _ = service._get_snapshot(initial)
    assert status == "miss"
    provider = service._market_data_provider
    provider.assert_called_once_with(
        ["AAA", "BBB", "SPY"], service._start_date_for_window(TODAY, initial),
        TODAY.isoformat(),
    )
    provider.reset_mock()
    service._ticker_repository.reset_mock()
    jobs.pop(0)()
    provider.assert_called_once_with(
        ["AAA", "BBB", "SPY"], "2025-10-03", "2026-10-03")
    service._ticker_repository.list_tickers.assert_called_once()
    for window in TOP_PICKS_WINDOWS:
        start = service._start_date_for_window(TODAY, window)
        key = service._snapshot_cache_key(window, start, TODAY.isoformat())
        actual, status = service._snapshot_cache.get(key)
        assert status == "hit"
        expected = service._build_snapshot(start, TODAY.isoformat(), window)
        assert actual["rows"] == expected["rows"]
        assert actual["warnings"] == expected["warnings"]
        actual_metadata = {k: v for k, v in actual["metadata"].items() if k != "generatedAt"}
        expected_metadata = {k: v for k, v in expected["metadata"].items() if k != "generatedAt"}
        assert actual_metadata == expected_metadata
    assert service._get_snapshot(initial)[0] == cold


def test_force_refresh_downloads_once_and_publishes_priority_first(monkeypatch):
    service, jobs = build_service(monkeypatch)
    service._get_snapshot("1D")
    jobs.pop(0)()
    service._market_data_provider.reset_mock()
    writes = []
    original_set = service._snapshot_cache.set

    def record(key, value, ttl):
        writes.append(key[1])
        original_set(key, value, ttl)

    monkeypatch.setattr(service._snapshot_cache, "set", record)
    service._get_snapshot("1M", force_refresh=True)
    assert service._market_data_provider.call_count == 0
    jobs.pop(0)()
    assert service._market_data_provider.call_count == 1
    assert writes == ["1M", "1D", "1W", "1Y"]
    service._market_data_provider.reset_mock()
    service._refresh_window_snapshots(TODAY, "1D", False)
    service._market_data_provider.assert_not_called()


def test_shared_download_failure_keeps_snapshot_and_releases_refresh(monkeypatch):
    complete = Mock()
    service, jobs = build_service(monkeypatch, round_complete_callback=complete)
    old, _, _ = service._get_snapshot("1D")
    jobs.pop(0)()
    complete.reset_mock()
    service._market_data_provider.side_effect = RuntimeError("offline")
    service._get_snapshot("1D", force_refresh=True)
    jobs.pop(0)()
    assert service._refreshing_all_windows is False
    assert service._get_snapshot("1D")[0] == old
    complete.assert_not_called()


def test_empty_universe_does_not_download_benchmark(monkeypatch):
    complete = Mock()
    service, jobs = build_service(monkeypatch, round_complete_callback=complete)
    service._ticker_repository.list_tickers.return_value = ()
    service._get_snapshot("1D")
    jobs.pop(0)()
    service._market_data_provider.assert_not_called()
    for window in TOP_PICKS_WINDOWS:
        assert service._get_snapshot(window)[0]["rows"] == []
    complete.assert_not_called()


@pytest.mark.parametrize("initial", TOP_PICKS_WINDOWS)
def test_retention_uses_complete_universe_and_year_before_each_download_round(monkeypatch, initial):
    service, jobs = build_service(monkeypatch)
    provider = RecordingRetentionProvider(service._market_data_provider)
    service._market_data_provider = provider
    service._get_snapshot(initial)
    assert provider.calls == [
        ("prune", ["AAA", "BBB", "SPY"], "2025-10-03", "2026-10-03"),
        ("download", ["AAA", "BBB", "SPY"],
         service._start_date_for_window(TODAY, initial), "2026-10-03"),
    ]

    provider.calls.clear()
    service._ticker_repository.reset_mock()
    jobs.pop(0)()
    assert provider.calls == [
        ("prune", ["AAA", "BBB", "SPY"], "2025-10-03", "2026-10-03"),
        ("download", ["AAA", "BBB", "SPY"], "2025-10-03", "2026-10-03"),
    ]
    service._ticker_repository.list_tickers.assert_called_once()

    provider.calls.clear()
    service._get_snapshot(initial)
    assert provider.calls == []


def test_retention_prunes_empty_universe_without_retaining_benchmark(monkeypatch):
    service, jobs = build_service(monkeypatch)
    provider = RecordingRetentionProvider(service._market_data_provider)
    service._market_data_provider = provider
    service._ticker_repository.list_tickers.return_value = ()
    service._get_snapshot("1D")
    assert provider.calls == [
        ("prune", [], "2025-10-03", "2026-10-03"),
    ]
    provider.calls.clear()
    jobs.pop(0)()
    assert provider.calls == [
        ("prune", [], "2025-10-03", "2026-10-03"),
    ]


@pytest.mark.parametrize("background", [False, True])
def test_failed_universe_load_never_prunes_history(monkeypatch, background):
    service, _ = build_service(monkeypatch)
    provider = RecordingRetentionProvider(service._market_data_provider)
    service._market_data_provider = provider
    service._ticker_repository.list_tickers.side_effect = RuntimeError("offline")
    with pytest.raises(RuntimeError, match="offline"):
        if background:
            service._refresh_window_snapshots(TODAY, "1D", True)
        else:
            service._get_snapshot("1D")
    assert provider.calls == []


def test_download_mock_does_not_opt_into_retention_implicitly(monkeypatch):
    service, jobs = build_service(monkeypatch)
    service._get_snapshot("1D")
    jobs.pop(0)()
    assert "prune" not in service._market_data_provider._mock_children


def test_leap_year_slice_uses_inclusive_requested_bounds():
    frame = pd.DataFrame(
        {"AAA": [1, 2, 3, 4]},
        index=pd.to_datetime(["2024-02-28", "2024-02-29", "2024-03-01", "2024-03-02"]),
    )
    sliced = TopPicksService._slice_market_data(frame, "2024-02-29", "2024-03-01")
    assert sliced["AAA"].tolist() == [2, 3]
    sliced.iloc[0, 0] = 99
    assert frame.iloc[1, 0] == 2


def test_one_window_failure_does_not_block_remaining_windows(monkeypatch):
    complete = Mock()
    service, _ = build_service(monkeypatch, round_complete_callback=complete)
    original = service._build_snapshot

    def fail_one(start, end, window, **kwargs):
        if window == "1W":
            raise RuntimeError("calculation failed")
        return original(start, end, window, **kwargs)

    monkeypatch.setattr(service, "_build_snapshot", fail_one)
    service._refresh_window_snapshots(TODAY, "1W", True)
    assert service._market_data_provider.call_count == 1
    for window in TOP_PICKS_WINDOWS:
        key = service._snapshot_cache_key(
            window, service._start_date_for_window(
                TODAY, window), TODAY.isoformat(),
        )
        assert service._snapshot_cache.get(key)[1] == (
            "miss" if window == "1W" else "hit")
    complete.assert_not_called()


def test_round_callback_waits_for_all_pending_snapshots_and_notifications(monkeypatch):
    events = []
    service, _ = build_service(
        monkeypatch, round_complete_callback=lambda: events.append("export"),
    )

    def record_publication(window, generated_at):
        key = service._snapshot_cache_key(
            window, service._start_date_for_window(TODAY, window), TODAY.isoformat(),
        )
        assert service._snapshot_cache.get(key)[1] == "hit"
        events.append(window)

    monkeypatch.setattr(service._updates, "publish", record_publication)

    assert service._refresh_window_snapshots(TODAY, "1M", True) is True
    assert events == ["1M", "1D", "1W", "1Y", "export"]
    service._market_data_provider.assert_called_once()


def test_cold_foreground_window_does_not_export_before_background_completes(monkeypatch):
    complete = Mock()
    service, jobs = build_service(monkeypatch, round_complete_callback=complete)

    service._get_snapshot("1D")
    complete.assert_not_called()
    jobs.pop(0)()

    complete.assert_called_once_with()
    for window in TOP_PICKS_WINDOWS:
        key = service._snapshot_cache_key(
            window, service._start_date_for_window(TODAY, window), TODAY.isoformat(),
        )
        assert service._snapshot_cache.get(key)[1] == "hit"


def test_round_callback_skips_cache_hits_and_runs_again_for_forced_refresh(monkeypatch):
    complete = Mock()
    service, _ = build_service(monkeypatch, round_complete_callback=complete)

    service._refresh_window_snapshots(TODAY, "1D", True)
    complete.assert_called_once_with()
    complete.reset_mock()
    service._market_data_provider.reset_mock()

    service._refresh_window_snapshots(TODAY, "1Y", False)
    complete.assert_not_called()
    service._market_data_provider.assert_not_called()

    service._refresh_window_snapshots(TODAY, "1Y", True)
    complete.assert_called_once_with()
    service._market_data_provider.assert_called_once()


def test_disabled_snapshot_cache_does_not_export_round(monkeypatch):
    complete = Mock()
    service, _ = build_service(
        monkeypatch, round_complete_callback=complete, cache_ttl_seconds=0,
    )

    service._refresh_window_snapshots(TODAY, "1D", True)

    complete.assert_not_called()
    service._market_data_provider.assert_called_once()


def test_round_callback_failure_preserves_sse_and_allows_next_round(monkeypatch, caplog):
    complete = Mock(side_effect=OSError("Seed disk is unavailable."))
    service, jobs = build_service(monkeypatch, round_complete_callback=complete)
    publish = Mock()
    error = Mock()
    monkeypatch.setattr(service._updates, "publish", publish)
    monkeypatch.setattr(service._updates, "publish_error", error)

    for expected_rounds in (1, 2):
        service._refresh_windows_in_background("1D", force_refresh=True)
        jobs.pop(0)()
        assert service._refreshing_all_windows is False
        assert complete.call_count == expected_rounds
        assert publish.call_count == expected_rounds * len(TOP_PICKS_WINDOWS)
        error.assert_not_called()

    assert "Seed disk is unavailable." in caplog.text
    for window in TOP_PICKS_WINDOWS:
        key = service._snapshot_cache_key(
            window, service._start_date_for_window(TODAY, window), TODAY.isoformat(),
        )
        assert service._snapshot_cache.get(key)[1] == "hit"
