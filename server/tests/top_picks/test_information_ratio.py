import numpy as np
import pandas as pd

from src.top_picks.analytics import (
    MIN_BENCHMARK_OBSERVATIONS,
    calculate_information_ratio,
    calculate_information_ratios,
)


def test_information_ratio_uses_annualized_active_return_and_tracking_error():
    benchmark = pd.Series([0.005] * MIN_BENCHMARK_OBSERVATIONS)
    stock = pd.Series(
        ([0.02, 0.01, 0.03, 0.00] * 6)[:MIN_BENCHMARK_OBSERVATIONS]
    )
    active = stock - benchmark
    expected = (
        active.mean() * 252
        / (active.std(ddof=1) * np.sqrt(252))
    )

    result = calculate_information_ratio(stock, benchmark)

    assert np.isclose(result, expected)


def test_information_ratio_rejects_limited_or_zero_tracking_error():
    limited = pd.Series([0.02] * (MIN_BENCHMARK_OBSERVATIONS - 1))
    benchmark = pd.Series([0.01] * len(limited))
    assert calculate_information_ratio(limited, benchmark) is None

    constant_active = pd.Series(
        [0.02] * MIN_BENCHMARK_OBSERVATIONS
    )
    constant_benchmark = pd.Series(
        [0.01] * MIN_BENCHMARK_OBSERVATIONS
    )
    assert calculate_information_ratio(
        constant_active,
        constant_benchmark,
    ) is None


def test_information_ratio_mapping_uses_adjusted_price_returns():
    stock_returns = np.array(
        ([0.02, 0.01, 0.03, 0.00] * 6)[:MIN_BENCHMARK_OBSERVATIONS]
    )
    benchmark_returns = np.array(
        [0.005] * MIN_BENCHMARK_OBSERVATIONS
    )
    prices = pd.DataFrame({
        "AAPL": 100 * np.cumprod(np.r_[1.0, 1 + stock_returns]),
        "SPY": 100 * np.cumprod(np.r_[1.0, 1 + benchmark_returns]),
    })

    result = calculate_information_ratios(prices, ["AAPL"], "SPY")

    expected = calculate_information_ratio(
        pd.Series(stock_returns),
        pd.Series(benchmark_returns),
    )
    assert np.isclose(result["AAPL"], expected)
