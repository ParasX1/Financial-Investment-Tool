# metrics.py

# Import necessary libraries
from threading import RLock
from time import monotonic

import yfinance as yf   # Used to fetch stock data from Yahoo Finance
import numpy as np      # Used for numerical calculations
import pandas as pd     # Used for data manipulation

from .market_primitives import (
    calculate_returns,
    get_adjusted_close_prices,
    normalize_tickers,
)

STOCK_DATA_CACHE_TTL_SECONDS = 120
_stock_data_cache = {}
_stock_data_lock = RLock()


def clear_stock_data_cache():
    with _stock_data_lock:
        _stock_data_cache.clear()


def ensure_multiindex_stock_data(stock_data, stock_tickers):
    if stock_data is None or stock_data.empty:
        return pd.DataFrame()

    if not isinstance(stock_data.columns, pd.MultiIndex):
        stock_data = pd.concat({stock_tickers[0]: stock_data}, axis=1)

    if hasattr(stock_data.index, 'strftime'):
        stock_data = stock_data.copy()
        stock_data.index = stock_data.index.strftime('%Y-%m-%d')

    return stock_data


def get_missing_adjusted_close_tickers(stock_data, requested_tickers):
    adj_close = get_adjusted_close_prices(stock_data, requested_tickers)
    missing = []

    for ticker in requested_tickers:
        if ticker not in adj_close.columns or adj_close[ticker].dropna().empty:
            missing.append(ticker)

    return missing


def merge_stock_data_frames(stock_data_frames):
    usable_frames = [frame for frame in stock_data_frames if frame is not None and not frame.empty]
    if not usable_frames:
        return pd.DataFrame()

    merged = pd.concat(usable_frames, axis=1)
    return merged.loc[:, ~merged.columns.duplicated()]


def download_stock_data(stock_tickers, start_date, end_date):
    """Download an inclusive UI date range from yfinance's exclusive-end API."""
    exclusive_end = (
        pd.Timestamp(end_date) + pd.Timedelta(days=1)
    ).strftime("%Y-%m-%d")
    try:
        stock_data = yf.download(
            stock_tickers,
            start=start_date,
            end=exclusive_end,
            group_by='ticker',
            auto_adjust=False,
            threads=False,
            progress=False
        )
    except Exception as error:
        print(f"yfinance download failed for {stock_tickers}: {error}")
        return pd.DataFrame()

    return ensure_multiindex_stock_data(stock_data, stock_tickers)
# Function to fetch full stock data
def fetch_stock_data(stock_tickers, start_date, end_date):
    """
    Fetches full stock data (Open, High, Low, Close, Adj Close, Volume) for the provided stock tickers over a given date range.

    Parameters:
    - stock_tickers (list): List of stock tickers to fetch data for.
    - start_date (str): The start date for fetching the data (format: 'YYYY-MM-DD').
    - end_date (str): The end date for fetching the data (format: 'YYYY-MM-DD').

    Returns:
    - pd.DataFrame: MultiIndex DataFrame where each column represents a data field (Open, High, Low, Close, Adj Close, Volume) for each stock.
    """
    stock_tickers = normalize_tickers(stock_tickers)
    if not stock_tickers:
        return pd.DataFrame()

    cache_key = (tuple(sorted(stock_tickers)), start_date, end_date)
    now = monotonic()

    with _stock_data_lock:
        cached = _stock_data_cache.get(cache_key)
        if cached and now - cached["created_at"] < STOCK_DATA_CACHE_TTL_SECONDS:
            return cached["data"].copy(deep=True)

    stock_data = download_stock_data(stock_tickers, start_date, end_date)
    missing_tickers = get_missing_adjusted_close_tickers(stock_data, stock_tickers)
    retry_frames = []

    for ticker in missing_tickers:
        retry_frame = download_stock_data([ticker], start_date, end_date)
        if not retry_frame.empty:
            retry_frames.append(retry_frame)

    if retry_frames:
        stock_data = merge_stock_data_frames([stock_data, *retry_frames])

    with _stock_data_lock:
        _stock_data_cache[cache_key] = {
            "created_at": monotonic(),
            "data": stock_data.copy(deep=True),
        }

    return stock_data


def select_available_prices(adj_close, requested_tickers):
    available_tickers = []
    for ticker in requested_tickers:
        if ticker in adj_close.columns and ticker not in available_tickers:
            available_tickers.append(ticker)

    if not available_tickers:
        return pd.DataFrame(index=adj_close.index)

    return adj_close[available_tickers].dropna(axis=1, how='all')


# Function to calculate Beta
def calculate_beta(stock_tickers, market_ticker, start_date, end_date):
    """
    Calculates the Beta of each stock compared to the market.
    Beta measures a stock's volatility relative to the market.

    Parameters:
    - stock_tickers (list): List of stock tickers to calculate Beta for.
    - market_ticker (str): Market index ticker to compare against.
    - start_date (str): Start date for data fetching.
    - end_date (str): End date for data fetching.

    Returns:
    - dict: Dictionary with stock tickers as keys and their respective Beta values as values.
    """
    # Fetch data for the stocks and the market index
    data = fetch_stock_data(stock_tickers + [market_ticker], start_date, end_date)
    
    # Extract adjusted close prices
    adj_close = get_adjusted_close_prices(data)
    stock_prices = select_available_prices(adj_close, stock_tickers)

    if stock_prices.empty or market_ticker not in adj_close.columns:
        return {}

    # Calculate daily returns for stocks and market
    stock_returns = calculate_returns(stock_prices)
    market_returns = adj_close[market_ticker].pct_change(fill_method=None).dropna()

    if stock_returns.shape[0] < 21 or market_returns.shape[0] < 21:
        return {}
    
    # Align the indices to ensure both DataFrames have the same dates
    common_index = stock_returns.index.intersection(market_returns.index)
    stock_returns = stock_returns.loc[common_index]
    market_returns = market_returns.loc[common_index]
    
    betas = {}
    for ticker in stock_returns.columns:
        aligned = pd.concat(
            [stock_returns[ticker], market_returns],
            axis=1,
            join='inner'
        ).dropna()
        if aligned.shape[0] < 21:
            continue

        # Calculate the covariance between the stock and the market returns
        covariance = np.cov(aligned.iloc[:, 0], aligned.iloc[:, 1])[0][1]
        
        # Calculate the variance of the market returns
        market_variance = aligned.iloc[:, 1].var()
        if market_variance == 0 or pd.isna(market_variance):
            continue
        
        # Calculate Beta: Beta = Covariance(stock, market) / Variance(market)
        beta = covariance / market_variance
        
        if np.isfinite(beta):
            betas[ticker] = beta
    
    return betas

# Function to calculate Alpha
def calculate_alpha(stock_tickers, market_ticker, start_date, end_date, risk_free_rate=0.01):
    """
    Calculates the Alpha of each stock compared to the market.
    Alpha measures the stock's performance relative to the expected return based on Beta.

    Parameters:
    - stock_tickers (list): List of stock tickers to calculate Alpha for.
    - market_ticker (str): Market index ticker to compare against.
    - start_date (str): Start date for data fetching.
    - end_date (str): End date for data fetching.
    - risk_free_rate (float): Risk-free rate used in the calculation.

    Returns:
    - dict: Dictionary with stock tickers as keys and their respective Alpha values as values.
    """
    # First, calculate Betas for the stocks
    betas = calculate_beta(stock_tickers, market_ticker, start_date, end_date)
    
    # Fetch data for stocks and market
    data = fetch_stock_data(stock_tickers + [market_ticker], start_date, end_date)
    adj_close = get_adjusted_close_prices(data)
    stock_prices = select_available_prices(adj_close, stock_tickers)

    if stock_prices.empty or market_ticker not in adj_close.columns:
        return {}
    
    # Calculate daily returns
    stock_returns = calculate_returns(stock_prices)
    market_returns = adj_close[market_ticker].pct_change(fill_method=None).dropna()

    if stock_returns.shape[0] < 21 or market_returns.shape[0] < 21:
        return {}
    
    # Align indices
    common_index = stock_returns.index.intersection(market_returns.index)
    stock_returns = stock_returns.loc[common_index]
    market_returns = market_returns.loc[common_index]
    
    alphas = {}
    for ticker in stock_returns.columns:
        if ticker not in betas:
            continue

        aligned = pd.concat(
            [stock_returns[ticker], market_returns],
            axis=1,
            join='inner'
        ).dropna()
        if aligned.shape[0] < 21:
            continue

        # Calculate the average annualized return for the stock

        stock_avg_return = aligned.iloc[:, 0].mean() * 252  # 252 trading days in a year
        
        # Calculate the average annualized return for the market
        market_avg_return = aligned.iloc[:, 1].mean() * 252
        
        # Retrieve Beta for the stock
        beta = betas[ticker]
        
        # Calculate the expected return using the Capital Asset Pricing Model (CAPM)
        # Expected Return = Risk-Free Rate + Beta * (Market Return - Risk-Free Rate)
        expected_return = risk_free_rate + beta * (market_avg_return - risk_free_rate)
        
        # Calculate Alpha: Alpha = Actual Return - Expected Return
        alpha = stock_avg_return - expected_return
        
        alphas[ticker] = alpha
    
    return alphas

# Function to calculate Drawdown
def calculate_drawdown(stock_tickers, start_date, end_date):
    """Return each available symbol's adjusted-close drawdown history."""
    data = fetch_stock_data(stock_tickers, start_date, end_date)
    adj_close = get_adjusted_close_prices(data, stock_tickers)
    stock_prices = select_available_prices(adj_close, stock_tickers)

    drawdowns = {}
    for ticker in stock_prices.columns:
        prices = stock_prices[ticker].dropna()
        if prices.shape[0] < 2:
            continue
        running_peak = prices.cummax()
        drawdown = (prices / running_peak - 1).clip(upper=0)
        drawdowns[ticker] = drawdown

    return drawdowns
# Function to calculate Cumulative Return
def calculate_cumulative_return(stock_tickers, start_date, end_date):
    """Rebase each symbol to its own first valid adjusted-close observation."""
    data = fetch_stock_data(stock_tickers, start_date, end_date)
    adj_close = get_adjusted_close_prices(data, stock_tickers)
    stock_prices = select_available_prices(adj_close, stock_tickers)

    cumulative_returns = {}
    for ticker in stock_prices.columns:
        prices = stock_prices[ticker].dropna()
        if prices.shape[0] < 2:
            continue
        cumulative_returns[ticker] = prices / prices.iloc[0] - 1

    return cumulative_returns
# Function to calculate Sortino Ratio
def calculate_sortino_ratio(
    stock_tickers,
    start_date,
    end_date,
    risk_free_rate=0.01,
):
    """
    Calculate annualized Sortino using full-sample downside shortfall against
    the daily target. Status objects preserve unbounded and limited samples.
    """
    data = fetch_stock_data(stock_tickers, start_date, end_date)
    adj_close = get_adjusted_close_prices(data, stock_tickers)
    stock_prices = select_available_prices(adj_close, stock_tickers)
    daily_target = float(risk_free_rate) / 252

    sortino_ratios = {}
    for ticker in stock_prices.columns:
        returns = (
            stock_prices[ticker]
            .dropna()
            .pct_change(fill_method=None)
            .dropna()
        )
        observations = int(returns.shape[0])
        if observations < 2:
            sortino_ratios[ticker] = {
                "value": None,
                "status": "limited_data",
                "observations": observations,
            }
            continue

        downside_shortfall = np.minimum(
            returns.to_numpy(dtype=float) - daily_target,
            0,
        )
        downside_deviation = (
            np.sqrt(np.mean(np.square(downside_shortfall)))
            * np.sqrt(252)
        )
        if not np.isfinite(downside_deviation):
            sortino_ratios[ticker] = {
                "value": None,
                "status": "invalid",
                "observations": observations,
            }
            continue
        if downside_deviation == 0:
            sortino_ratios[ticker] = {
                "value": None,
                "status": "infinite",
                "observations": observations,
            }
            continue

        annualized_excess_return = (
            float(returns.mean()) * 252 - float(risk_free_rate)
        )
        ratio = annualized_excess_return / downside_deviation
        sortino_ratios[ticker] = {
            "value": float(ratio) if np.isfinite(ratio) else None,
            "status": "ok" if np.isfinite(ratio) else "invalid",
            "observations": observations,
        }

    return sortino_ratios
# Function to calculate Correlation with Market
def calculate_correlation_with_market(stock_tickers, market_ticker, start_date, end_date):
    """
    Calculates the rolling correlation between each stock and the market.

    Parameters:
    - stock_tickers (list): List of stock tickers to calculate correlation for.
    - market_ticker (str): Market index ticker to compare against.
    - start_date (str): Start date for data fetching.
    - end_date (str): End date for data fetching.

    Returns:
    - average correlation between each stock, including market, over 21 rolling days.
    """

    
    # Fetch adjusted close prices
    data = fetch_stock_data(stock_tickers + [market_ticker], start_date, end_date)
    adj_close = get_adjusted_close_prices(data)
    available_prices = select_available_prices(
        adj_close,
        stock_tickers + [market_ticker]
    )

    if available_prices.empty or market_ticker not in available_prices.columns:
        return {}
    
    # Calculate daily returns
    returns = calculate_returns(available_prices)
    if len(returns) < 21:
        return {}
    rolling_corr = returns.rolling(window=21).corr()
    corr_matrix = rolling_corr.groupby(level=1).mean()

    correlations = {}
    for ticker in stock_tickers + [market_ticker]:
        if ticker in corr_matrix.columns:
            correlations[ticker] = corr_matrix[ticker].dropna().to_dict()

    return correlations

# Function to calculate Sharpe Ratio
def calculate_sharpe_ratio(stock_tickers, start_date, end_date, risk_free_rate=0.01):
    """
    Calculates the annualized Sharpe Ratio for each available stock.
    """
    data = fetch_stock_data(stock_tickers, start_date, end_date)
    adj_close = get_adjusted_close_prices(data, stock_tickers)
    stock_prices = select_available_prices(adj_close, stock_tickers)
    stock_returns = calculate_returns(stock_prices)

    if stock_returns.shape[0] < 2 or stock_returns.shape[1] < 1:
        return {}

    sharpe_ratios = {}
    for ticker in stock_returns.columns:
        returns = stock_returns[ticker].dropna()
        if returns.shape[0] < 2:
            continue

        average_return = returns.mean() * 252
        volatility = returns.std() * np.sqrt(252)
        if volatility <= 0 or not np.isfinite(volatility):
            continue

        sharpe_ratio = (average_return - risk_free_rate) / volatility
        if np.isfinite(sharpe_ratio):
            sharpe_ratios[ticker] = float(sharpe_ratio)

    return sharpe_ratios
# Function to calculate Volatility
def calculate_volatility(stock_tickers, start_date, end_date):
    """Calculate annualized volatility independently per available symbol."""
    data = fetch_stock_data(stock_tickers, start_date, end_date)
    adj_close = get_adjusted_close_prices(data, stock_tickers)
    stock_prices = select_available_prices(adj_close, stock_tickers)

    volatilities = {}
    for ticker in stock_prices.columns:
        returns = (
            stock_prices[ticker]
            .dropna()
            .pct_change(fill_method=None)
            .dropna()
        )
        if returns.shape[0] < 2:
            continue
        volatility = returns.std() * np.sqrt(252)
        if np.isfinite(volatility) and volatility >= 0:
            volatilities[ticker] = float(volatility)

    return volatilities
# Function to calculate Value at Risk (VaR)
def calculate_value_at_risk(
    stock_tickers,
    start_date,
    end_date,
    confidence_level=0.05,
):
    """Return historical one-day VaR as a positive loss magnitude."""
    data = fetch_stock_data(stock_tickers, start_date, end_date)
    adj_close = get_adjusted_close_prices(data, stock_tickers)
    stock_prices = select_available_prices(adj_close, stock_tickers)

    values_at_risk = {}
    for ticker in stock_prices.columns:
        returns = (
            stock_prices[ticker]
            .dropna()
            .pct_change(fill_method=None)
            .dropna()
        )
        if returns.shape[0] < 20:
            continue
        tail_return = np.percentile(
            returns.to_numpy(dtype=float),
            100 * float(confidence_level),
        )
        if np.isfinite(tail_return):
            values_at_risk[ticker] = float(max(0, -tail_return))

    return values_at_risk
# Function to calculate Efficient Frontier
def calculate_efficient_frontier(
    stock_tickers,
    start_date,
    end_date,
    num_portfolios=10000,
    risk_free_rate=0.01,
):
    """
    Simulates deterministic long-only portfolios and returns allocation metadata.
    """
    if (
        isinstance(num_portfolios, bool)
        or not isinstance(num_portfolios, (int, np.integer))
        or num_portfolios < 1
    ):
        raise ValueError("num_portfolios must be a positive integer")

    requested_tickers = normalize_tickers(stock_tickers)
    data = fetch_stock_data(requested_tickers, start_date, end_date)
    adj_close = get_adjusted_close_prices(data, requested_tickers)
    available_prices = select_available_prices(adj_close, requested_tickers)
    stock_returns = calculate_returns(available_prices).dropna(how="any")

    if stock_returns.shape[0] < 21 or stock_returns.shape[1] < 1:
        return {}

    mean_returns = stock_returns.mean().to_numpy(dtype=float) * 252
    covariance = stock_returns.cov().to_numpy(dtype=float) * 252
    if not np.isfinite(mean_returns).all() or not np.isfinite(covariance).all():
        return {}

    random_generator = np.random.default_rng(0)
    weights = random_generator.dirichlet(
        np.ones(stock_returns.shape[1]),
        size=int(num_portfolios),
    )

    portfolio_returns = weights @ mean_returns
    portfolio_variances = np.einsum(
        "ij,jk,ik->i",
        weights,
        covariance,
        weights,
    )
    portfolio_risks = np.sqrt(np.clip(portfolio_variances, 0, None))
    valid_rows = (
        np.isfinite(portfolio_returns)
        & np.isfinite(portfolio_risks)
        & (portfolio_risks > 0)
    )
    if not valid_rows.any():
        return {}

    weights = weights[valid_rows]
    portfolio_returns = portfolio_returns[valid_rows]
    portfolio_risks = portfolio_risks[valid_rows]
    sharpe_ratios = (
        portfolio_returns - float(risk_free_rate)
    ) / portfolio_risks
    finite_rows = np.isfinite(sharpe_ratios)
    if not finite_rows.any():
        return {}

    weights = weights[finite_rows]
    portfolio_returns = portfolio_returns[finite_rows]
    portfolio_risks = portfolio_risks[finite_rows]
    sharpe_ratios = sharpe_ratios[finite_rows]

    return {
        "returns": portfolio_returns.tolist(),
        "risks": portfolio_risks.tolist(),
        "sharpe_ratios": sharpe_ratios.tolist(),
        "asset_order": list(stock_returns.columns),
        "weights": weights.tolist(),
        "sample_count": int(len(portfolio_returns)),
        "sampling_method": "dirichlet",
        "seed": 0,
        "max_sharpe_index": int(np.argmax(sharpe_ratios)),
        "min_volatility_index": int(np.argmin(portfolio_risks)),
    }
# Function to calculate Treynor Ratio
def calculate_treynor_ratio(stock_tickers, market_ticker, start_date, end_date, risk_free_rate=0.01):
    """
    Calculates the Treynor Ratio for each stock.
    The Treynor Ratio measures returns earned in excess of that which could have been earned on a riskless investment per unit of market risk.

    Parameters:
    - stock_tickers (list): List of stock tickers to calculate Treynor Ratio for.
    - market_ticker (str): Market index ticker to compare against.
    - start_date (str): Start date for data fetching.
    - end_date (str): End date for data fetching.
    - risk_free_rate (float): Risk-free rate used in the calculation.

    Returns:
    - dict: Dictionary with stock tickers as keys and their respective Treynor Ratios as values.
    """
    # Calculate Betas for the stocks
    betas = calculate_beta(stock_tickers, market_ticker, start_date, end_date)
    
    # Fetch adjusted close prices and calculate daily returns
    data = fetch_stock_data(stock_tickers, start_date, end_date)
    adj_close = data.xs('Adj Close', level=1, axis=1)
    stock_returns = adj_close.pct_change().dropna()
    
    treynor_ratios = {}
    for ticker in stock_returns.columns:
        # Calculate average annualized return
        avg_return = stock_returns[ticker].mean() * 252
        
        # Retrieve Beta for the stock
        beta = betas[ticker]
        
        # Calculate Treynor Ratio: (Average Return - Risk-Free Rate) / Beta
        treynor_ratio = (avg_return - risk_free_rate) / beta
        
        treynor_ratios[ticker] = treynor_ratio
    
    return treynor_ratios

# Function to calculate Jensen's Alpha
def calculate_jensens_alpha(stock_tickers, market_ticker, start_date, end_date, risk_free_rate=0.01):
    """
    Calculates Jensen's Alpha for each stock.
    Jensen's Alpha measures the excess return of a stock over the expected return predicted by the Capital Asset Pricing Model (CAPM).

    Parameters:
    - stock_tickers (list): List of stock tickers to calculate Jensen's Alpha for.
    - market_ticker (str): Market index ticker to compare against.
    - start_date (str): Start date for data fetching.
    - end_date (str): End date for data fetching.
    - risk_free_rate (float): Risk-free rate used in the calculation.

    Returns:
    - dict: Dictionary with stock tickers as keys and their respective Jensen's Alpha values as values.
    """
    # Calculate Betas for the stocks
    betas = calculate_beta(stock_tickers, market_ticker, start_date, end_date)
    
    # Fetch adjusted close prices and calculate daily returns
    data = fetch_stock_data(stock_tickers + [market_ticker], start_date, end_date)
    adj_close = data.xs('Adj Close', level=1, axis=1)
    
    stock_returns = adj_close[stock_tickers].pct_change().dropna()
    market_returns = adj_close[market_ticker].pct_change().dropna()
    
    # Align indices
    common_index = stock_returns.index.intersection(market_returns.index)
    stock_returns = stock_returns.loc[common_index]
    market_returns = market_returns.loc[common_index]
    
    # Calculate average annualized market return
    market_avg_return = market_returns.mean() * 252
    
    jensens_alphas = {}
    for ticker in stock_returns.columns:
        # Calculate average annualized stock return
        stock_avg_return = stock_returns[ticker].mean() * 252
        
        # Retrieve Beta for the stock
        beta = betas[ticker]
        
        # Calculate expected return using CAPM
        expected_return = risk_free_rate + beta * (market_avg_return - risk_free_rate)
        
        # Calculate Jensen's Alpha: Actual Return - Expected Return
        alpha = stock_avg_return - expected_return
        
        jensens_alphas[ticker] = alpha
    
    return jensens_alphas

# Function to calculate Information Ratio
def calculate_information_ratio(stock_tickers, benchmark_ticker, start_date, end_date):
    """
    Calculates the Information Ratio for each stock.
    The Information Ratio measures the portfolio's ability to generate excess returns relative to a benchmark, adjusted for the consistency of those returns.

    Parameters:
    - stock_tickers (list): List of stock tickers to calculate Information Ratio for.
    - benchmark_ticker (str): Benchmark index ticker to compare against.
    - start_date (str): Start date for data fetching.
    - end_date (str): End date for data fetching.

    Returns:
    - dict: Dictionary with stock tickers as keys and their respective Information Ratios as values.
    """
    # Fetch adjusted close prices
    data = fetch_stock_data(stock_tickers + [benchmark_ticker], start_date, end_date)
    adj_close = data.xs('Adj Close', level=1, axis=1)
    
    # Calculate daily returns
    stock_returns = adj_close[stock_tickers].pct_change().dropna()
    benchmark_returns = adj_close[benchmark_ticker].pct_change().dropna()
    
    # Align indices
    common_index = stock_returns.index.intersection(benchmark_returns.index)
    stock_returns = stock_returns.loc[common_index]
    benchmark_returns = benchmark_returns.loc[common_index]
    
    information_ratios = {}
    for ticker in stock_returns.columns:
        # Calculate the active return: Stock Return - Benchmark Return
        active_return = stock_returns[ticker] - benchmark_returns
        
        # Calculate average annualized active return
        avg_active_return = active_return.mean() * 252
        
        # Calculate tracking error (standard deviation of active returns)
        tracking_error = active_return.std() * np.sqrt(252)
        
        # Calculate Information Ratio: Average Active Return / Tracking Error
        information_ratio = avg_active_return / tracking_error
        
        information_ratios[ticker] = information_ratio
    
    return information_ratios
