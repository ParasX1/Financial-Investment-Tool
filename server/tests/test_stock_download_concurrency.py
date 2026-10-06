"""Exercise the installed Yahoo downloader without making network requests."""

import logging
from threading import Event, Lock, RLock, Thread, current_thread

import multitasking
import pandas as pd
import yfinance.multi as yf_multi

from src import metrics


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

    class ObservedDownloadLock:
        """Expose the second lock attempt so no scheduling sleeps are needed."""

        def __init__(self):
            self._lock = RLock()

        def __enter__(self):
            if current_thread().name == "second-download-test":
                second_lock_attempt.set()
            self._lock.acquire()
            return self

        def __exit__(self, *args):
            self._lock.release()

    monkeypatch.setattr(metrics, "_stock_download_lock", ObservedDownloadLock())

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
