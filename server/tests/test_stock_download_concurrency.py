"""Exercise the installed Yahoo downloader without making network requests."""

import logging
from threading import Event, Lock, RLock, Thread, current_thread

import multitasking
import pandas as pd
import pytest
import yfinance.multi as yf_multi

from src import metrics


@pytest.fixture(autouse=True)
def clear_fetch_cache():
    metrics.clear_stock_data_cache()
    yield
    metrics.clear_stock_data_cache()


class ObservedDownloadLock:
    """Signal a waiting caller before it tries to acquire the real RLock."""

    def __init__(self, waiting_caller, attempted):
        self._lock = RLock()
        self.waiting_caller = waiting_caller
        self.attempted = attempted

    def __enter__(self):
        if current_thread().name == self.waiting_caller:
            self.attempted.set()
        self._lock.acquire()
        return self

    def __exit__(self, *args):
        self._lock.release()


def price_frame(tickers, value=100.0):
    return pd.concat(
        {
            ticker: pd.DataFrame(
                {"Adj Close": [value]},
                index=pd.DatetimeIndex(["2026-10-02"]),
            )
            for ticker in tickers
        },
        axis=1,
    )


def overlapping_fetches(monkeypatch, downloader, second_request=None, second_fetch=None):
    """Hold the first actual download until the second cold request waits."""
    first_entered = Event()
    second_lock_attempt = Event()
    release_first = Event()
    calls = []
    results = {}
    errors = []
    request = {
        "stock_tickers": ["AAA", "BBB"],
        "start_date": "2026-09-27",
        "end_date": "2026-10-04",
    }
    second_request = request | (second_request or {})
    monkeypatch.setattr(
        metrics, "_stock_download_lock",
        ObservedDownloadLock("second-fetch-test", second_lock_attempt),
    )

    def fake_download(tickers, **kwargs):
        calls.append((list(tickers), kwargs))
        if len(calls) == 1:
            first_entered.set()
            assert release_first.wait(timeout=10), "First download was not released"
        return downloader(tickers, len(calls))

    monkeypatch.setattr(metrics.yf, "download", fake_download)

    def fetch(key, parameters):
        try:
            fetcher = second_fetch if key == "second" and second_fetch else metrics.fetch_stock_data
            results[key] = fetcher(**parameters)
        except Exception as error:
            errors.append(error)

    first = Thread(
        target=fetch, args=("first", request),
        name="first-fetch-test", daemon=True,
    )
    second = Thread(
        target=fetch, args=("second", second_request),
        name="second-fetch-test", daemon=True,
    )
    first.start()
    try:
        assert first_entered.wait(timeout=5)
        second.start()
        assert second_lock_attempt.wait(timeout=5)
    finally:
        release_first.set()
        first.join(timeout=10)
        if second.ident is not None:
            second.join(timeout=10)

    assert not first.is_alive()
    assert not second.is_alive()
    assert not errors
    return calls, results


def test_overlapping_identical_cold_fetches_share_a_fill_and_independent_copies(monkeypatch):
    calls, results = overlapping_fetches(
        monkeypatch, lambda tickers, number: price_frame(tickers),
        {"stock_tickers": [" bbb ", "aaa", "AAA"]},
    )

    assert [tickers for tickers, kwargs in calls] == [["AAA", "BBB"]]
    pd.testing.assert_frame_equal(results["first"], results["second"])
    results["first"].iloc[0, 0] = -1
    assert results["second"].iloc[0, 0] == 100.0
    results["second"].iloc[0, 0] = -2
    cached = metrics.fetch_stock_data(
        ["AAA", "BBB"], "2026-09-27", "2026-10-04"
    )
    assert cached.iloc[0, 0] == 100.0
    assert len(calls) == 1


@pytest.mark.parametrize("fetch_after_completion", [False, True])
def test_cache_clear_invalidates_active_fill_without_waiting_for_download(monkeypatch, fetch_after_completion):
    first_entered = Event()
    release_first = Event()
    clear_finished = Event()
    second_lock_attempt = Event()
    calls = []
    results = {}
    errors = []
    monkeypatch.setattr(
        metrics, "_stock_download_lock",
        ObservedDownloadLock("post-clear-fetch-test", second_lock_attempt),
    )

    def fake_download(tickers, **kwargs):
        calls.append(list(tickers))
        number = len(calls)
        if number == 1:
            first_entered.set()
            assert release_first.wait(timeout=10)
        return price_frame(tickers, value=float(number))

    monkeypatch.setattr(metrics.yf, "download", fake_download)

    def fetch(key):
        try:
            results[key] = metrics.fetch_stock_data(
                ["AAA"], "2026-09-27", "2026-10-04"
            )
        except Exception as error:
            errors.append(error)

    def clear_cache():
        try:
            metrics.clear_stock_data_cache()
            clear_finished.set()
        except Exception as error:
            errors.append(error)

    first = Thread(target=fetch, args=("first",), daemon=True)
    clearer = Thread(target=clear_cache, daemon=True)
    second = Thread(
        target=fetch, args=("second",), name="post-clear-fetch-test", daemon=True,
    )
    first.start()
    try:
        assert first_entered.wait(timeout=5)
        clearer.start()
        assert clear_finished.wait(timeout=5), "Cache clear waited for the provider"
        if not fetch_after_completion:
            second.start()
            assert second_lock_attempt.wait(timeout=5)
    finally:
        release_first.set()
        first.join(timeout=10)
        if clearer.ident is not None:
            clearer.join(timeout=10)
        if second.ident is not None:
            second.join(timeout=10)

    assert not first.is_alive()
    assert not clearer.is_alive()
    assert not second.is_alive()
    if fetch_after_completion:
        fetch("second")
    assert not errors
    assert results["first"].iloc[0, 0] == 1.0
    assert results["second"].iloc[0, 0] == 2.0
    cached = metrics.fetch_stock_data(["AAA"], "2026-09-27", "2026-10-04")
    assert cached.iloc[0, 0] == 2.0
    assert calls == [["AAA"], ["AAA"]]


def test_cache_clear_inside_download_invalidates_fill_without_deadlock(monkeypatch):
    calls = []

    def fake_download(tickers, **kwargs):
        calls.append(list(tickers))
        if len(calls) == 1:
            metrics.clear_stock_data_cache()
        return price_frame(tickers, value=float(len(calls)))

    monkeypatch.setattr(metrics.yf, "download", fake_download)
    first = metrics.fetch_stock_data(["AAA"], "2026-09-27", "2026-10-04")
    second = metrics.fetch_stock_data(["AAA"], "2026-09-27", "2026-10-04")
    cached = metrics.fetch_stock_data(["AAA"], "2026-09-27", "2026-10-04")

    assert first.iloc[0, 0] == 1.0
    assert second.iloc[0, 0] == 2.0
    assert cached.iloc[0, 0] == 2.0
    assert calls == [["AAA"], ["AAA"]]


def test_overlapping_identical_cold_fetches_share_missing_ticker_retry(monkeypatch):
    def downloader(tickers, number):
        if tickers == ["AAA", "BBB"]:
            return price_frame(["AAA"])
        return price_frame(tickers, value=200.0)

    calls, results = overlapping_fetches(monkeypatch, downloader)

    assert [tickers for tickers, kwargs in calls] == [["AAA", "BBB"], ["BBB"]]
    pd.testing.assert_frame_equal(results["first"], results["second"])
    assert results["first"].iloc[0].tolist() == [100.0, 200.0]


def test_overlapping_identical_cold_fetches_share_empty_failed_fill(monkeypatch):
    def downloader(tickers, number):
        raise RuntimeError("Synthetic provider failure")

    calls, results = overlapping_fetches(monkeypatch, downloader)

    assert [tickers for tickers, kwargs in calls] == [
        ["AAA", "BBB"], ["AAA"], ["BBB"]
    ]
    assert results["first"].empty
    assert results["second"].empty
    assert metrics.fetch_stock_data(
        ["AAA", "BBB"], "2026-09-27", "2026-10-04"
    ).empty
    assert len(calls) == 3


def test_direct_download_waits_for_complete_cold_fill_with_retry(monkeypatch):
    def downloader(tickers, number):
        if tickers == ["AAA", "BBB"]:
            return price_frame(["AAA"])
        return price_frame(tickers, value=200.0)

    calls, results = overlapping_fetches(
        monkeypatch, downloader,
        {"stock_tickers": ["TOP"]}, metrics.download_stock_data,
    )

    assert [tickers for tickers, kwargs in calls] == [
        ["AAA", "BBB"], ["BBB"], ["TOP"]
    ]
    assert set(results["first"].columns.get_level_values(0)) == {"AAA", "BBB"}
    assert set(results["second"].columns.get_level_values(0)) == {"TOP"}
    assert results["second"].iloc[0, 0] == 200.0


@pytest.mark.parametrize("second_request", [
    {"stock_tickers": ["CCC"]},
    {"start_date": "2026-09-28"},
    {"end_date": "2026-10-03"},
    {"force_refresh": True},
])
def test_overlapping_distinct_or_forced_fetches_still_download(monkeypatch, second_request):
    calls, results = overlapping_fetches(
        monkeypatch,
        lambda tickers, number: price_frame(tickers, value=float(number)),
        second_request,
    )

    assert len(calls) == 2
    assert results["first"].iloc[0, 0] == 1.0
    assert results["second"].iloc[0, 0] == 2.0
    if second_request.get("force_refresh"):
        cached = metrics.fetch_stock_data(
            ["AAA", "BBB"], "2026-09-27", "2026-10-04"
        )
        assert cached.iloc[0, 0] == 2.0
        assert len(calls) == 2


def test_warm_fetch_finishes_while_unrelated_cold_download_waits(monkeypatch):
    first_entered = Event()
    release_first = Event()
    warm_finished = Event()
    errors = []
    calls = []
    results = {}

    def fake_download(tickers, **kwargs):
        calls.append(list(tickers))
        if tickers == ["COLD"]:
            first_entered.set()
            assert release_first.wait(timeout=10)
        return price_frame(tickers)

    monkeypatch.setattr(metrics.yf, "download", fake_download)
    metrics.fetch_stock_data(["WARM"], "2026-09-27", "2026-10-04")

    def fetch(key, tickers):
        try:
            results[key] = metrics.fetch_stock_data(
                tickers, "2026-09-27", "2026-10-04"
            )
        except Exception as error:
            errors.append(error)
        finally:
            if key == "warm":
                warm_finished.set()

    cold = Thread(target=fetch, args=("cold", ["COLD"]), daemon=True)
    warm = Thread(target=fetch, args=("warm", ["WARM"]), daemon=True)
    cold.start()
    try:
        assert first_entered.wait(timeout=5)
        warm.start()
        assert warm_finished.wait(timeout=5), "Warm hit waited for unrelated download"
    finally:
        release_first.set()
        cold.join(timeout=10)
        if warm.ident is not None:
            warm.join(timeout=10)

    assert not cold.is_alive()
    assert not warm.is_alive()
    assert not errors
    assert calls == [["WARM"], ["COLD"]]
    assert results["warm"].iloc[0, 0] == 100.0


def test_unexpected_fill_exception_releases_lock_for_next_caller(monkeypatch):
    def fail_download(*args):
        raise RuntimeError("Synthetic fill failure")

    monkeypatch.setattr(metrics, "download_stock_data", fail_download)
    with pytest.raises(RuntimeError, match="Synthetic fill failure"):
        metrics.fetch_stock_data(["AAA"], "2026-09-27", "2026-10-04")

    monkeypatch.setattr(
        metrics, "download_stock_data",
        lambda *args: price_frame(["AAA"]),
    )
    output = {}
    caller = Thread(
        target=lambda: output.update(data=metrics.fetch_stock_data(
            ["AAA"], "2026-09-27", "2026-10-04"
        )), daemon=True,
    )
    caller.start()
    caller.join(timeout=5)

    assert not caller.is_alive(), "Failed fill left the download lock held"
    assert output["data"].iloc[0, 0] == 100.0


def test_bulk_download_reaches_and_caps_actual_concurrency_at_96(monkeypatch):
    # Importing yfinance has already created a CPU-sized pool. Merely passing
    # threads=96 does not resize that existing pool in multitasking 0.0.13.
    original_config = {
        key: multitasking.config[key]
        for key in ("MAX_THREADS", "POOL_NAME", "ENGINE")
    }
    for key, value in original_config.items():
        monkeypatch.setitem(multitasking.config, key, value)
    monkeypatch.setitem(
        multitasking.config, "POOLS", dict(multitasking.config["POOLS"])
    )
    earlier_task = Thread(target=lambda: None)
    earlier_task.start()
    earlier_task.join(timeout=5)
    tasks = [earlier_task]
    monkeypatch.setitem(multitasking.config, "TASKS", tasks)
    for name in ("_DFS", "_ERRORS", "_TRACEBACKS", "_ISINS"):
        monkeypatch.setattr(yf_multi.shared, name, {})
    logger = yf_multi.utils.get_yf_logger()
    monkeypatch.setattr(logger, "level", logging.WARNING)

    release_downloads = Event()
    reached_96 = Event()
    counts_lock = Lock()
    active = 0
    peak = 0
    timed_out = []
    worker_threads = []
    output = {}
    tickers = [f"TEST{index:03d}" for index in range(128)]

    def synthetic_download(ticker, *args, **kwargs):
        nonlocal active, peak
        with counts_lock:
            worker_threads.append(current_thread())
            active += 1
            peak = max(peak, active)
            if active == 96:
                reached_96.set()
        try:
            if not release_downloads.wait(timeout=20):
                timed_out.append(ticker)
            frame = pd.DataFrame(
                {"Adj Close": [float(ticker[4:]) + 1]},
                index=pd.DatetimeIndex(["2026-10-02"]),
            )
            yf_multi.shared._DFS[ticker] = frame
            return frame
        finally:
            with counts_lock:
                active -= 1

    monkeypatch.setattr(yf_multi, "_download_one", synthetic_download)

    def run_download():
        output["data"] = metrics.download_stock_data(
            tickers, "2026-09-27", "2026-10-04"
        )

    caller = Thread(target=run_download, name="bulk-download-test", daemon=True)
    caller.start()
    try:
        assert reached_96.wait(timeout=10), "Downloader never reached 96 workers"
        pool = multitasking.config["POOLS"][multitasking.config["POOL_NAME"]]
        assert pool["threads"] == 96
    finally:
        release_downloads.set()
        caller.join(timeout=15)
        # yfinance observes returned frames before its task wrappers finish.
        # Join those wrappers too, before restoring global pool configuration.
        for task in worker_threads:
            task.join(timeout=5)

    assert not caller.is_alive()
    assert not any(task.is_alive() for task in worker_threads)
    assert not timed_out
    assert peak == 96
    assert tasks == [earlier_task], "Completed Yahoo workers must be released"
    prices = metrics.get_adjusted_close_prices(output["data"], tickers)
    assert set(prices.columns) == set(tickers)
    for ticker in tickers:
        assert prices.loc["2026-10-02", ticker] == float(ticker[4:]) + 1

    # Another round must retain the 96-worker setting without accumulating
    # completed thread handles or deleting unrelated pre-existing tasks.
    second_round = metrics.download_stock_data(
        tickers, "2026-09-27", "2026-10-04"
    )
    assert not second_round.empty
    assert tasks == [earlier_task]
    assert not any(task.is_alive() for task in worker_threads)


def test_overlapping_bulk_and_single_downloads_are_serialized(monkeypatch):
    first_entered = Event()
    second_lock_attempt = Event()
    second_entered = Event()
    release_first = Event()
    timed_out = []
    calls = []
    results = {}

    monkeypatch.setattr(
        metrics, "_stock_download_lock",
        ObservedDownloadLock("second-download-test", second_lock_attempt),
    )

    def fake_download(tickers, **kwargs):
        calls.append((tickers, kwargs))
        if tickers == ["FIRST", "BENCHMARK"]:
            first_entered.set()
            if not release_first.wait(timeout=20):
                timed_out.append("first")
        else:
            second_entered.set()
        return pd.concat(
            {
                ticker: pd.DataFrame(
                    {"Adj Close": [100.0]},
                    index=pd.DatetimeIndex(["2026-10-02"]),
                )
                for ticker in tickers
            },
            axis=1,
        )

    monkeypatch.setattr(metrics.yf, "download", fake_download)

    def run_download(key, tickers):
        results[key] = metrics.download_stock_data(
            tickers, "2026-09-27", "2026-10-04"
        )

    first = Thread(
        target=run_download,
        args=("first", ["FIRST", "BENCHMARK"]),
        name="first-download-test",
        daemon=True,
    )
    second = Thread(
        target=run_download,
        args=("second", ["SECOND"]),
        name="second-download-test",
        daemon=True,
    )
    first.start()
    try:
        assert first_entered.wait(timeout=5)
        second.start()
        assert second_lock_attempt.wait(timeout=5)
        assert not second_entered.is_set()
    finally:
        release_first.set()
        first.join(timeout=10)
        if second.ident is not None:
            second.join(timeout=10)

    assert not first.is_alive()
    assert not second.is_alive()
    assert not timed_out
    assert second_entered.is_set()
    assert [call[0] for call in calls] == [["FIRST", "BENCHMARK"], ["SECOND"]]
    assert calls[0][1]["threads"] == 96
    assert calls[1][1]["threads"] is False
    assert calls[0][1]["end"] == "2026-10-05"
    assert set(results["first"].columns.get_level_values(0)) == {
        "FIRST", "BENCHMARK"
    }
    assert set(results["second"].columns.get_level_values(0)) == {"SECOND"}
