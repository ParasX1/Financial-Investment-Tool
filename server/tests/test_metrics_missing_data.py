from unittest.mock import patch

import pandas as pd

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
