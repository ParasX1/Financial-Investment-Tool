from unittest.mock import patch

import numpy as np
import pandas as pd
import pytest

from src.metrics import (
    calculate_cumulative_return,
    calculate_drawdown,
    calculate_efficient_frontier,
    calculate_sharpe_ratio,
    calculate_sortino_ratio,
    calculate_value_at_risk,
    calculate_volatility,
)


def adjusted_close_frame(values_by_ticker):
    periods = max(len(values) for values in values_by_ticker.values())
    dates = pd.date_range("2025-01-01", periods=periods, freq="B")
    frames = {
        ticker: pd.DataFrame({"Adj Close": values}, index=dates)
        for ticker, values in values_by_ticker.items()
    }
    return pd.concat(frames, axis=1)


def prices_from_returns(start_price, returns):
    prices = [start_price]
    for value in returns:
        prices.append(prices[-1] * (1 + value))
    return prices


def test_sharpe_ratio_supports_a_single_stock():
    values = [100 + index + (index % 4) * 0.7 for index in range(40)]
    data = adjusted_close_frame({"AAPL": values})

    with patch("src.metrics.fetch_stock_data", return_value=data):
        result = calculate_sharpe_ratio(
            ["AAPL"], "2025-01-01", "2026-01-01", risk_free_rate=0
        )

    assert set(result) == {"AAPL"}
    assert pd.notna(result["AAPL"])


def test_efficient_frontier_is_deterministic_and_returns_actionable_metadata():
    data = adjusted_close_frame(
        {
            "AAPL": [100 + index * 1.1 + (index % 3) for index in range(40)],
            "MSFT": [200 + index * 0.7 + (index % 5) * 0.8 for index in range(40)],
        }
    )

    with patch("src.metrics.fetch_stock_data", return_value=data):
        first = calculate_efficient_frontier(
            ["AAPL", "MSFT"], "2025-01-01", "2026-01-01", num_portfolios=25
        )
        second = calculate_efficient_frontier(
            ["AAPL", "MSFT"], "2025-01-01", "2026-01-01", num_portfolios=25
        )

    assert first == second
    assert first["asset_order"] == ["AAPL", "MSFT"]
    assert first["sample_count"] == 25
    assert len(first["weights"]) == 25
    assert 0 <= first["max_sharpe_index"] < 25
    assert 0 <= first["min_volatility_index"] < 25
    assert first["sampling_method"] == "dirichlet"
    assert first["seed"] == 0
    assert all(np.isclose(sum(weights), 1) for weights in first["weights"])


def test_sortino_uses_full_sample_downside_shortfall_against_daily_target():
    daily_returns = np.array([0.02, -0.01, 0.03, -0.02])
    annual_risk_free_rate = 0.0252
    data = adjusted_close_frame(
        {"AAPL": prices_from_returns(100, daily_returns)}
    )
    daily_target = annual_risk_free_rate / 252
    expected_downside = np.sqrt(
        np.mean(np.minimum(daily_returns - daily_target, 0) ** 2)
    ) * np.sqrt(252)
    expected = (
        daily_returns.mean() * 252 - annual_risk_free_rate
    ) / expected_downside

    with patch("src.metrics.fetch_stock_data", return_value=data):
        result = calculate_sortino_ratio(
            ["AAPL"],
            "2025-01-01",
            "2025-02-01",
            risk_free_rate=annual_risk_free_rate,
        )

    assert result["AAPL"]["status"] == "ok"
    assert result["AAPL"]["observations"] == 4
    assert result["AAPL"]["value"] == pytest.approx(expected)


def test_sortino_preserves_meaningful_non_finite_and_limited_states():
    increasing = adjusted_close_frame(
        {"AAPL": prices_from_returns(100, [0.01, 0.02, 0.005])}
    )
    limited = adjusted_close_frame({"AAPL": [100, 99]})

    with patch("src.metrics.fetch_stock_data", return_value=increasing):
        infinite = calculate_sortino_ratio(
            ["AAPL"], "2025-01-01", "2025-02-01", risk_free_rate=0
        )
    with patch("src.metrics.fetch_stock_data", return_value=limited):
        insufficient = calculate_sortino_ratio(
            ["AAPL"], "2025-01-01", "2025-02-01", risk_free_rate=0
        )

    assert infinite["AAPL"] == {
        "value": None,
        "status": "infinite",
        "observations": 3,
    }
    assert insufficient["AAPL"] == {
        "value": None,
        "status": "limited_data",
        "observations": 1,
    }


def test_standalone_metrics_use_each_symbols_valid_history_independently():
    aapl = prices_from_returns(
        100,
        [0.01, -0.02, 0.03, -0.01, 0.02, -0.01, 0.015] * 4,
    )
    sparse = [None] * (len(aapl) - 4) + [50, 51, None, 52]
    data = adjusted_close_frame({"AAPL": aapl, "SPARSE": sparse})

    with patch("src.metrics.fetch_stock_data", return_value=data):
        together_volatility = calculate_volatility(
            ["AAPL", "SPARSE"], "2025-01-01", "2025-02-01"
        )
        together_var = calculate_value_at_risk(
            ["AAPL", "SPARSE"], "2025-01-01", "2025-02-01", 0.05
        )
    with patch(
        "src.metrics.fetch_stock_data",
        return_value=adjusted_close_frame({"AAPL": aapl}),
    ):
        alone_volatility = calculate_volatility(
            ["AAPL"], "2025-01-01", "2025-02-01"
        )
        alone_var = calculate_value_at_risk(
            ["AAPL"], "2025-01-01", "2025-02-01", 0.05
        )

    assert together_volatility["AAPL"] == pytest.approx(
        alone_volatility["AAPL"]
    )
    assert together_var["AAPL"] == pytest.approx(alone_var["AAPL"])


def test_return_series_use_first_valid_price_and_never_invent_positive_drawdown():
    data = adjusted_close_frame(
        {
            "AAPL": [None, 100, 110, 90, 99],
            "MSFT": [50, 55, 60, 58, 64],
        }
    )

    with patch("src.metrics.fetch_stock_data", return_value=data):
        cumulative = calculate_cumulative_return(
            ["AAPL", "MSFT"], "2025-01-01", "2025-02-01"
        )
        drawdown = calculate_drawdown(
            ["AAPL", "MSFT"], "2025-01-01", "2025-02-01"
        )

    assert cumulative["AAPL"].dropna().iloc[0] == 0
    assert cumulative["MSFT"].dropna().iloc[0] == 0
    assert max(drawdown["AAPL"].dropna()) <= 0
    assert max(drawdown["MSFT"].dropna()) <= 0


def test_var_is_a_positive_loss_magnitude():
    daily_returns = [-0.08, -0.03, 0.01, 0.02, 0.04] * 4
    data = adjusted_close_frame(
        {"AAPL": prices_from_returns(100, daily_returns)}
    )

    with patch("src.metrics.fetch_stock_data", return_value=data):
        result = calculate_value_at_risk(
            ["AAPL"],
            "2025-01-01",
            "2025-02-01",
            confidence_level=0.2,
        )

    assert result["AAPL"] == pytest.approx(
        max(0, -np.percentile(daily_returns, 20))
    )
