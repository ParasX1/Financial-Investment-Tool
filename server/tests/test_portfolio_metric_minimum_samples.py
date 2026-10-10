from unittest.mock import patch

import pandas as pd

from src.metrics import (
    calculate_alpha,
    calculate_beta,
    calculate_efficient_frontier,
    calculate_value_at_risk,
)


def adjusted_close_frame(values_by_ticker):
    periods = max(len(values) for values in values_by_ticker.values())
    dates = pd.date_range("2025-01-01", periods=periods, freq="B")
    frames = {
        ticker: pd.DataFrame({"Adj Close": values}, index=dates)
        for ticker, values in values_by_ticker.items()
    }
    return pd.concat(frames, axis=1)


def test_beta_requires_21_aligned_daily_returns():
    prices = adjusted_close_frame(
        {
            "AAPL": [100 + index * 1.1 + index % 3 for index in range(21)],
            "SPY": [300 + index * 0.8 + index % 4 for index in range(21)],
        }
    )

    with patch("src.metrics.fetch_stock_data", return_value=prices):
        result = calculate_beta(
            ["AAPL"], "SPY", "2025-01-01", "2025-02-01"
        )

    assert result == {}


def test_historical_var_requires_20_daily_returns():
    prices = adjusted_close_frame(
        {"AAPL": [100 + index * 0.7 + index % 3 for index in range(20)]}
    )

    with patch("src.metrics.fetch_stock_data", return_value=prices):
        result = calculate_value_at_risk(
            ["AAPL"], "2025-01-01", "2025-02-01", confidence_level=0.05
        )

    assert result == {}


def test_portfolio_simulation_requires_21_aligned_daily_returns():
    prices = adjusted_close_frame(
        {
            "AAPL": [100 + index * 1.1 + index % 3 for index in range(21)],
            "MSFT": [200 + index * 0.7 + index % 5 for index in range(21)],
        }
    )

    with patch("src.metrics.fetch_stock_data", return_value=prices):
        result = calculate_efficient_frontier(
            ["AAPL", "MSFT"],
            "2025-01-01",
            "2025-02-01",
            num_portfolios=20,
        )

    assert result == {}


def test_alpha_uses_only_aligned_returns():
    dates = pd.date_range("2025-01-01", periods=23, freq="B")
    prices = pd.concat(
        {
            "AAPL": pd.DataFrame(
                {
                    "Adj Close": [
                        100,
                        101,
                        102,
                        103,
                        104,
                        105,
                        106,
                        107,
                        108,
                        109,
                        110,
                        111,
                        112,
                        113,
                        114,
                        115,
                        116,
                        117,
                        118,
                        119,
                        120,
                        121,
                        200,
                    ]
                },
                index=dates,
            ),
            "SPY": pd.DataFrame(
                {
                    "Adj Close": [
                        300,
                        301,
                        302,
                        303,
                        304,
                        305,
                        306,
                        307,
                        308,
                        309,
                        310,
                        311,
                        312,
                        313,
                        314,
                        315,
                        316,
                        317,
                        318,
                        319,
                        320,
                        321,
                        None,
                    ]
                },
                index=dates,
            ),
        },
        axis=1,
    )

    with patch("src.metrics.fetch_stock_data", return_value=prices):
        result = calculate_alpha(
            ["AAPL"], "SPY", "2025-01-01", "2025-02-01", risk_free_rate=0.01
        )

    aligned_prices = prices.xs("Adj Close", axis=1, level=1)[["AAPL", "SPY"]].dropna()
    aligned_returns = aligned_prices.pct_change(fill_method=None).dropna()
    covariance = aligned_returns.cov().loc["AAPL", "SPY"]
    market_variance = aligned_returns["SPY"].var()
    beta = covariance / market_variance
    stock_avg_return = aligned_returns["AAPL"].mean() * 252
    market_avg_return = aligned_returns["SPY"].mean() * 252
    expected_alpha = stock_avg_return - (0.01 + beta * (market_avg_return - 0.01))

    assert result["AAPL"] == expected_alpha
