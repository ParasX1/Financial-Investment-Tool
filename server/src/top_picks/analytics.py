import numpy as np
import pandas as pd

from ..market_primitives import (
    calculate_returns,
    get_adjusted_close_prices,
)


ANNUALISATION_DAYS = 252
MIN_BENCHMARK_OBSERVATIONS = 21


def calculate_information_ratio(stock_returns, benchmark_returns):
    aligned = pd.concat(
        [
            pd.to_numeric(stock_returns, errors="coerce"),
            pd.to_numeric(benchmark_returns, errors="coerce"),
        ],
        axis=1,
        join="inner",
    ).dropna()
    if aligned.shape[0] < MIN_BENCHMARK_OBSERVATIONS:
        return None

    active_returns = aligned.iloc[:, 0] - aligned.iloc[:, 1]
    tracking_error = (
        active_returns.std(ddof=1) * np.sqrt(ANNUALISATION_DAYS)
    )
    if (
        not np.isfinite(tracking_error)
        or tracking_error <= 0
        or np.isclose(tracking_error, 0, atol=1e-12)
    ):
        return None

    annualized_active_return = (
        active_returns.mean() * ANNUALISATION_DAYS
    )
    ratio = annualized_active_return / tracking_error
    return float(ratio) if np.isfinite(ratio) else None


def calculate_information_ratios(
    stock_data,
    stock_tickers,
    benchmark_ticker,
):
    requested = list(stock_tickers)
    if benchmark_ticker not in requested:
        requested.append(benchmark_ticker)
    adjusted_close = get_adjusted_close_prices(stock_data, requested)
    if benchmark_ticker not in adjusted_close.columns:
        return {}

    returns = calculate_returns(adjusted_close)
    if benchmark_ticker not in returns.columns:
        return {}
    benchmark_returns = returns[benchmark_ticker]

    ratios = {}
    for ticker in stock_tickers:
        if ticker not in returns.columns:
            continue
        ratio = calculate_information_ratio(
            returns[ticker],
            benchmark_returns,
        )
        if ratio is not None:
            ratios[ticker] = ratio
    return ratios


def count_return_observations(stock_data, stock_tickers):
    adjusted_close = get_adjusted_close_prices(
        stock_data,
        stock_tickers,
    )
    returns = calculate_returns(adjusted_close)
    return {
        ticker: int(returns[ticker].dropna().shape[0])
        for ticker in stock_tickers
        if ticker in returns.columns
    }
