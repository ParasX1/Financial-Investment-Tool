from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest.mock import patch

import pandas as pd

from src import metrics
from src.metrics import (
    calculate_alpha,
    calculate_beta,
    calculate_correlation_with_market,
    calculate_efficient_frontier,
)


def adjusted_close_frame(values_by_ticker):
    dates = pd.date_range("2023-01-01", periods=35, freq="D")
    frames = {
        ticker: pd.DataFrame({"Adj Close": values}, index=dates)
        for ticker, values in values_by_ticker.items()
    }
    return pd.concat(frames, axis=1)


def rising_prices(start):
    return [start + index for index in range(35)]


def test_fetch_stock_data_retries_missing_tickers_individually():
    first_response = adjusted_close_frame(
        {"AAPL": rising_prices(100), "SPY": rising_prices(300)}
    )
    retry_response = adjusted_close_frame({"MSFT": rising_prices(200)})
    calls = []

    def fake_download(tickers, **kwargs):
        calls.append((tickers, kwargs))
        if tickers == ["MSFT"]:
            return retry_response
        return first_response

    metrics.clear_stock_data_cache()
    with patch("src.metrics.yf.download", side_effect=fake_download):
        data = metrics.fetch_stock_data(
            ["AAPL", "MSFT", "SPY"], "2023-01-01", "2024-01-01"
        )

    adj_close = metrics.get_adjusted_close_prices(data)

    assert set(adj_close.columns) == {"AAPL", "MSFT", "SPY"}
    assert calls[0][1]["threads"] == 96
    assert calls[1][1]["threads"] is False
    assert calls[0][1]["progress"] is False
    assert [call[0] for call in calls] == [["AAPL", "MSFT", "SPY"], ["MSFT"]]


def test_fetch_stock_data_recovers_bulk_nan_columns_and_caches_copy():
    dates = pd.date_range("2023-01-01", periods=3, freq="D")
    fields = ["Open", "High", "Low", "Close", "Adj Close", "Volume"]
    available = pd.DataFrame(
        {field: [100, 110, 120] for field in fields}, index=dates
    )
    failed = pd.DataFrame(float("nan"), index=dates, columns=fields)
    recovered = pd.DataFrame(
        {field: [200, 210, 220] for field in fields}, index=dates
    )
    bulk_response = pd.concat({"AAA": available, "BBB": failed}, axis=1)
    retry_response = pd.concat({"BBB": recovered}, axis=1)
    expected = pd.concat({"AAA": available, "BBB": recovered}, axis=1)
    expected.index = expected.index.strftime("%Y-%m-%d")

    metrics.clear_stock_data_cache()
    with patch(
        "src.metrics.yf.download",
        side_effect=[bulk_response, retry_response],
    ) as download:
        result = metrics.fetch_stock_data(
            ["AAA", "BBB"], "2023-01-01", "2023-01-03"
        )
        pd.testing.assert_frame_equal(result, expected, check_dtype=False)
        assert not result.columns.duplicated().any()

        result.loc["2023-01-01", ("BBB", "Adj Close")] = -1
        cached = metrics.fetch_stock_data(
            ["AAA", "BBB"], "2023-01-01", "2023-01-03"
        )
        pd.testing.assert_frame_equal(cached, expected, check_dtype=False)

        cached.loc["2023-01-01", ("BBB", "Adj Close")] = -2
        cached_again = metrics.fetch_stock_data(
            ["AAA", "BBB"], "2023-01-01", "2023-01-03"
        )
        pd.testing.assert_frame_equal(cached_again, expected, check_dtype=False)

    assert download.call_count == 2
    pd.testing.assert_frame_equal(bulk_response["AAA"], available)
    assert bulk_response["BBB"].isna().all().all()
    pd.testing.assert_frame_equal(retry_response["BBB"], recovered)


def test_fetch_stock_data_retry_aligns_dates_and_preserves_valid_bulk_values():
    bulk_dates = pd.date_range("2023-01-01", periods=3, freq="D")
    retry_dates = pd.date_range("2023-01-02", periods=3, freq="D")
    bulk_response = pd.concat(
        {
            "AAA": pd.DataFrame({"Adj Close": [100, 110, 120]}, index=bulk_dates),
            "BBB": pd.DataFrame(
                {"Open": [10, None, 30], "Adj Close": [None, None, None]},
                index=bulk_dates,
            ),
        },
        axis=1,
    )
    retry_response = pd.concat(
        {
            "BBB": pd.DataFrame(
                {
                    "Open": [200, 300, 400],
                    "High": [201, 301, 401],
                    "Low": [199, 299, 399],
                    "Close": [200, 300, 400],
                    "Adj Close": [200, None, 400],
                    "Volume": [2000, 3000, 4000],
                },
                index=retry_dates,
            ),
        },
        axis=1,
    )

    metrics.clear_stock_data_cache()
    with patch(
        "src.metrics.yf.download", side_effect=[bulk_response, retry_response]
    ):
        result = metrics.fetch_stock_data(
            ["AAA", "BBB"], "2023-01-01", "2023-01-04"
        )

    assert list(result.index) == [
        "2023-01-01", "2023-01-02", "2023-01-03", "2023-01-04"
    ]
    assert result[("BBB", "Open")].tolist() == [10, 200, 30, 400]
    assert result.loc["2023-01-02", ("BBB", "Adj Close")] == 200
    assert result.loc["2023-01-04", ("BBB", "Adj Close")] == 400
    assert pd.isna(result.loc["2023-01-01", ("BBB", "Adj Close")])
    assert pd.isna(result.loc["2023-01-03", ("BBB", "Adj Close")])
    assert result.loc["2023-01-04", ("BBB", "Volume")] == 4000
    assert result[("AAA", "Adj Close")].iloc[:3].tolist() == [100, 110, 120]
    assert pd.isna(result.loc["2023-01-04", ("AAA", "Adj Close")])


def test_fetch_stock_data_retains_missing_prices_when_retry_fails():
    bulk_response = adjusted_close_frame(
        {"AAA": rising_prices(100), "BBB": [float("nan")] * 35}
    )
    retry_response = adjusted_close_frame({"BBB": [float("nan")] * 35})

    metrics.clear_stock_data_cache()
    with patch(
        "src.metrics.yf.download", side_effect=[bulk_response, retry_response]
    ) as download:
        result = metrics.fetch_stock_data(
            ["AAA", "BBB"], "2023-01-01", "2024-01-01"
        )

    assert metrics.get_missing_adjusted_close_tickers(result, ["AAA", "BBB"]) == [
        "BBB"
    ]
    assert result[("BBB", "Adj Close")].isna().all()
    assert result[("AAA", "Adj Close")].tolist() == rising_prices(100)
    assert download.call_count == 2


def test_fetch_stock_data_reuses_cached_downloads():
    data = adjusted_close_frame({"AAPL": rising_prices(100)})

    metrics.clear_stock_data_cache()
    with patch("src.metrics.yf.download", return_value=data) as download:
        metrics.fetch_stock_data(["AAPL"], "2023-01-01", "2024-01-01")
        metrics.fetch_stock_data(["AAPL"], "2023-01-01", "2024-01-01")

    assert download.call_count == 1


def test_fetch_stock_data_force_refresh_bypasses_cached_downloads():
    data = adjusted_close_frame({"AAPL": rising_prices(100)})

    metrics.clear_stock_data_cache()
    with patch("src.metrics.yf.download", return_value=data) as download:
        metrics.fetch_stock_data(["AAPL"], "2023-01-01", "2024-01-01")
        metrics.fetch_stock_data(
            ["AAPL"],
            "2023-01-01",
            "2024-01-01",
            force_refresh=True,
        )

    assert download.call_count == 2


def test_fetch_stock_data_does_not_hold_cache_lock_during_download():
    data = adjusted_close_frame({"AAPL": rising_prices(100)})

    def acquire_from_another_thread():
        acquired = metrics._stock_data_lock.acquire(blocking=False)
        if acquired:
            metrics._stock_data_lock.release()
        return acquired

    def fake_download(*args, **kwargs):
        # RLock is reentrant, so an acquire in this thread cannot detect the bug.
        with ThreadPoolExecutor(max_workers=1) as executor:
            assert executor.submit(acquire_from_another_thread).result(timeout=5)
        return data

    metrics.clear_stock_data_cache()
    with patch("src.metrics.download_stock_data", side_effect=fake_download):
        metrics.fetch_stock_data(["AAPL"], "2023-01-01", "2024-01-01")


def test_stock_data_cache_prunes_other_expired_ranges_on_a_fresh_hit(monkeypatch):
    now = [0.0]
    monkeypatch.setattr(metrics, "monotonic", lambda: now[0])
    data = adjusted_close_frame({"AAPL": rising_prices(100)})
    metrics.clear_stock_data_cache()

    with patch("src.metrics.download_stock_data", return_value=data) as download:
        metrics.fetch_stock_data(["AAPL"], "2023-01-01", "2024-01-01")
        now[0] = 10.0
        metrics.fetch_stock_data(["AAPL"], "2023-02-01", "2024-01-01")
        now[0] = metrics.STOCK_DATA_CACHE_TTL_SECONDS
        metrics.fetch_stock_data(["AAPL"], "2023-02-01", "2024-01-01")

    assert download.call_count == 2
    assert list(metrics._stock_data_cache) == [
        (("AAPL",), "2023-02-01", "2024-01-01")
    ]


def test_stock_data_cache_prunes_entries_that_expire_during_download(monkeypatch):
    now = [0.0]
    monkeypatch.setattr(metrics, "monotonic", lambda: now[0])
    data = adjusted_close_frame({"AAPL": rising_prices(100)})
    metrics.clear_stock_data_cache()

    def fake_download(tickers, start_date, end_date):
        if start_date == "2023-02-01":
            now[0] = metrics.STOCK_DATA_CACHE_TTL_SECONDS
        return data

    with patch("src.metrics.download_stock_data", side_effect=fake_download):
        metrics.fetch_stock_data(["AAPL"], "2023-01-01", "2024-01-01")
        now[0] = metrics.STOCK_DATA_CACHE_TTL_SECONDS - 1
        metrics.fetch_stock_data(["AAPL"], "2023-02-01", "2024-01-01")

    assert list(metrics._stock_data_cache) == [
        (("AAPL",), "2023-02-01", "2024-01-01")
    ]


def test_stock_data_cache_evicts_least_recently_used_fresh_range(monkeypatch):
    monkeypatch.setattr(metrics, "STOCK_DATA_CACHE_MAX_ENTRIES", 2, raising=False)
    monkeypatch.setattr(metrics, "monotonic", lambda: 0.0)
    data = adjusted_close_frame({"AAPL": rising_prices(100)})
    metrics.clear_stock_data_cache()

    with patch("src.metrics.download_stock_data", return_value=data) as download:
        metrics.fetch_stock_data(["AAPL"], "2023-01-01", "2024-01-01")
        metrics.fetch_stock_data(["AAPL"], "2023-02-01", "2024-01-01")
        metrics.fetch_stock_data(["AAPL"], "2023-01-01", "2024-01-01")
        metrics.fetch_stock_data(["AAPL"], "2023-03-01", "2024-01-01")

        assert list(metrics._stock_data_cache) == [
            (("AAPL",), "2023-01-01", "2024-01-01"),
            (("AAPL",), "2023-03-01", "2024-01-01"),
        ]
        metrics.fetch_stock_data(["AAPL"], "2023-01-01", "2024-01-01")
        assert download.call_count == 3
        metrics.fetch_stock_data(["AAPL"], "2023-02-01", "2024-01-01")
        assert download.call_count == 4
        assert len(metrics._stock_data_cache) == 2


def test_stock_data_cache_isolates_miss_and_hit_results_from_cached_frames():
    data = adjusted_close_frame({"AAPL": rising_prices(100)})
    metrics.clear_stock_data_cache()

    with patch("src.metrics.download_stock_data", return_value=data) as download:
        first = metrics.fetch_stock_data(["AAPL"], "2023-01-01", "2024-01-01")
        first.iloc[0, 0] = 999
        second = metrics.fetch_stock_data(["AAPL"], "2023-01-01", "2024-01-01")
        assert second.iloc[0, 0] == 100
        second.iloc[0, 0] = 888
        third = metrics.fetch_stock_data(["AAPL"], "2023-01-01", "2024-01-01")
        assert third.iloc[0, 0] == 100
        assert download.call_count == 1


def test_stock_data_cache_force_refresh_replaces_and_promotes_existing_range(monkeypatch):
    monkeypatch.setattr(metrics, "STOCK_DATA_CACHE_MAX_ENTRIES", 2, raising=False)
    monkeypatch.setattr(metrics, "monotonic", lambda: 0.0)
    original = adjusted_close_frame({"AAPL": rising_prices(100)})
    refreshed = adjusted_close_frame({"AAPL": rising_prices(200)})
    metrics.clear_stock_data_cache()

    with patch(
        "src.metrics.download_stock_data",
        side_effect=[original, original, refreshed, original],
    ) as download:
        metrics.fetch_stock_data(["AAPL"], "2023-01-01", "2024-01-01")
        metrics.fetch_stock_data(["AAPL"], "2023-02-01", "2024-01-01")
        metrics.fetch_stock_data(
            ["AAPL"], "2023-01-01", "2024-01-01", force_refresh=True
        )
        metrics.fetch_stock_data(["AAPL"], "2023-03-01", "2024-01-01")
        cached = metrics.fetch_stock_data(["AAPL"], "2023-01-01", "2024-01-01")

    assert cached.iloc[0, 0] == 200
    assert download.call_count == 4
    assert len(metrics._stock_data_cache) == 2
    assert (("AAPL",), "2023-02-01", "2024-01-01") not in metrics._stock_data_cache


def test_stock_data_cache_enforces_capacity_when_downloads_finish_concurrently(monkeypatch):
    monkeypatch.setattr(metrics, "STOCK_DATA_CACHE_MAX_ENTRIES", 2, raising=False)
    monkeypatch.setattr(metrics, "monotonic", lambda: 0.0)
    data = adjusted_close_frame({"AAPL": rising_prices(100)})
    downloads_started = Barrier(6)
    metrics.clear_stock_data_cache()

    def fake_download(tickers, start_date, end_date):
        downloads_started.wait(timeout=5)
        return data

    def fetch_range(month):
        result = metrics.fetch_stock_data(
            ["AAPL"], f"2023-{month:02d}-01", "2024-01-01"
        )
        with metrics._stock_data_lock:
            assert len(metrics._stock_data_cache) <= 2
        return result

    with patch("src.metrics.download_stock_data", side_effect=fake_download) as download:
        with ThreadPoolExecutor(max_workers=6) as executor:
            results = list(executor.map(fetch_range, range(1, 7)))

    assert len(metrics._stock_data_cache) == 2
    assert download.call_count == 6
    assert all(result.iloc[0, 0] == 100 for result in results)


def test_beta_skips_missing_market_ticker_without_keyerror():
    data = adjusted_close_frame({"AAPL": rising_prices(100)})

    with patch("src.metrics.fetch_stock_data", return_value=data):
        assert calculate_beta(["AAPL"], "SPY", "2023-01-01", "2024-01-01") == {}


def test_alpha_skips_tickers_missing_from_downloaded_prices():
    data = adjusted_close_frame(
        {"AAPL": rising_prices(100), "SPY": rising_prices(300)}
    )

    with patch("src.metrics.fetch_stock_data", return_value=data):
        result = calculate_alpha(
            ["AAPL", "GOOGL"], "SPY", "2023-01-01", "2024-01-01"
        )

    assert "AAPL" in result
    assert "GOOGL" not in result


def test_market_correlation_skips_missing_tickers():
    data = adjusted_close_frame(
        {"AAPL": rising_prices(100), "SPY": rising_prices(300)}
    )

    with patch("src.metrics.fetch_stock_data", return_value=data):
        result = calculate_correlation_with_market(
            ["AAPL", "BAC"], "SPY", "2023-01-01", "2024-01-01"
        )

    assert "AAPL" in result
    assert "SPY" in result
    assert "BAC" not in result


def test_efficient_frontier_uses_available_asset_count():
    data = adjusted_close_frame(
        {"AAPL": rising_prices(100), "MSFT": rising_prices(200)}
    )

    with patch("src.metrics.fetch_stock_data", return_value=data):
        result = calculate_efficient_frontier(
            ["AAPL", "MSFT", "JPM"],
            "2023-01-01",
            "2024-01-01",
            num_portfolios=5,
        )

    assert len(result["returns"]) == 5
    assert len(result["risks"]) == 5
    assert len(result["sharpe_ratios"]) == 5
