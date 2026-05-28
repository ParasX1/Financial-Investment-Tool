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
    assert calls[0][1]["threads"] is False
    assert calls[0][1]["progress"] is False
    assert [call[0] for call in calls] == [["AAPL", "MSFT", "SPY"], ["MSFT"]]


def test_fetch_stock_data_reuses_cached_downloads():
    data = adjusted_close_frame({"AAPL": rising_prices(100)})

    metrics.clear_stock_data_cache()
    with patch("src.metrics.yf.download", return_value=data) as download:
        metrics.fetch_stock_data(["AAPL"], "2023-01-01", "2024-01-01")
        metrics.fetch_stock_data(["AAPL"], "2023-01-01", "2024-01-01")

    assert download.call_count == 1


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
