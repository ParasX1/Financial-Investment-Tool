"""Calculate a yearly snapshot from one immutable market-data batch.

Keep the existing two missing-data conventions: Sharpe and benchmark metrics
use adjacent rows; volatility and Sortino use successive available prices.
"""

import numpy as np

from ..market_primitives import calculate_returns, get_adjusted_close_prices
from .analytics import ANNUALISATION_DAYS, MIN_BENCHMARK_OBSERVATIONS


def calculate_yearly_metrics(stock_data, symbols, benchmark, risk_free_rate):
    requested = list(dict.fromkeys([*symbols, benchmark]))
    prices = get_adjusted_close_prices(stock_data, requested)
    returns = calculate_returns(prices)
    metrics = {key: {} for key in (
        "ret1y", "sharpe", "sortino", "volatility", "maxDD",
        "beta", "alpha", "infoRatio",
    )}
    statuses = {"sortino": {}}
    observations = {}
    annual = ANNUALISATION_DAYS
    annual_scale = np.sqrt(annual)
    target = float(risk_free_rate) / annual
    market = (
        returns[benchmark].to_numpy(dtype=float)
        if benchmark in returns.columns else None
    )

    def put(metric, symbol, value):
        if np.isfinite(value):
            metrics[metric][symbol] = float(value)

    for symbol in symbols:
        if symbol not in prices.columns:
            continue
        values = prices[symbol].dropna().to_numpy(dtype=float)
        grid_returns = returns[symbol].to_numpy(dtype=float)
        daily = grid_returns[~np.isnan(grid_returns)]
        observations[symbol] = int(daily.size)
        if values.size >= 2:
            put("ret1y", symbol, values[-1] / values[0] - 1)
            drawdown = np.minimum(
                values / np.maximum.accumulate(values) - 1, 0)
            if not np.isnan(drawdown).all():
                put("maxDD", symbol, np.nanmin(drawdown))

        # With no internal gaps, both conventions share the same return array
        # and statistics. Otherwise preserve each metric's original sample.
        shared_sample = daily.size == max(0, values.size - 1)
        if shared_sample:
            compact = daily
        else:
            compact = values[1:] / values[:-1] - 1
            compact = compact[~np.isnan(compact)]
        compact_mean = np.mean(compact) if compact.size else np.nan
        compact_std = np.std(compact, ddof=1) if compact.size >= 2 else np.nan
        if compact.size >= 2:
            put("volatility", symbol, compact_std * annual_scale)
            downside = np.sqrt(np.mean(np.minimum(compact - target, 0) ** 2))
            downside *= annual_scale
            if not np.isfinite(downside):
                status = "invalid"
            elif downside == 0:
                status = "infinite"
            else:
                ratio = (compact_mean * annual - risk_free_rate) / downside
                status = "ok" if np.isfinite(ratio) else "invalid"
                put("sortino", symbol, ratio)
        else:
            status = "limited_data"
        statuses["sortino"][symbol] = status

        if daily.size >= 2:
            daily_mean = compact_mean if shared_sample else np.mean(daily)
            daily_std = compact_std if shared_sample else np.std(daily, ddof=1)
            volatility = daily_std * annual_scale
            if np.isfinite(volatility) and volatility > 0:
                put("sharpe", symbol,
                    (daily_mean * annual - risk_free_rate) / volatility)

        if market is None:
            continue
        aligned = ~np.isnan(grid_returns) & ~np.isnan(market)
        if np.count_nonzero(aligned) < MIN_BENCHMARK_OBSERVATIONS:
            continue
        stock_sample = grid_returns[aligned]
        market_sample = market[aligned]
        covariance = np.cov(stock_sample, market_sample)
        market_variance = np.var(market_sample, ddof=1)
        if np.isfinite(market_variance) and market_variance > 0:
            beta = covariance[0, 1] / market_variance
            put("beta", symbol, beta)
            if np.isfinite(beta):
                alpha = np.mean(stock_sample) * annual - (
                    risk_free_rate
                    + beta * (np.mean(market_sample) * annual - risk_free_rate)
                )
                put("alpha", symbol, alpha)
        active = stock_sample - market_sample
        tracking_error = np.std(active, ddof=1) * annual_scale
        if (np.isfinite(tracking_error) and tracking_error > 0
                and not np.isclose(tracking_error, 0, atol=1e-12)):
            put("infoRatio", symbol, np.mean(active) * annual / tracking_error)

    return metrics, statuses, observations
