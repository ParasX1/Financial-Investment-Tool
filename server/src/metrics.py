# metrics.py

# Import necessary libraries
import yfinance as yf   # Used to fetch stock data from Yahoo Finance
import numpy as np      # Used for numerical calculations
import pandas as pd     # Used for data manipulation
import matplotlib.pyplot as plt

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
    # Fetch data for the provided stock tickers
    stock_data = yf.download(
        stock_tickers,
        start=start_date,
        end=end_date,
        group_by='ticker',  # Group data by ticker symbol
        auto_adjust=False   # Do not adjust prices for dividends or splits
    )
    
    # Ensure the DataFrame has MultiIndex columns for consistency
    if not isinstance(stock_data.columns, pd.MultiIndex):
        # If only one ticker is provided, the columns are not MultiIndex by default
        stock_data = pd.concat({stock_tickers[0]: stock_data}, axis=1)
    
    # Convert the index (dates) to string format for consistency in JSON serialization
    stock_data.index = stock_data.index.strftime('%Y-%m-%d')
    
    return stock_data

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
    adj_close = data.xs('Adj Close', level=1, axis=1)

    # Calculate daily returns for stocks and market
    stock_returns = adj_close[stock_tickers].pct_change().dropna()
    market_returns = adj_close[market_ticker].pct_change().dropna()

    if stock_returns.shape[0] < 2 or market_returns.shape[0] < 2:
        return {}
    
    # Align the indices to ensure both DataFrames have the same dates
    common_index = stock_returns.index.intersection(market_returns.index)
    stock_returns = stock_returns.loc[common_index]
    market_returns = market_returns.loc[common_index]
    
    betas = {}
    for ticker in stock_returns.columns:
        # Calculate the covariance between the stock and the market returns
        covariance = np.cov(stock_returns[ticker], market_returns)[0][1]
        
        # Calculate the variance of the market returns
        market_variance = market_returns.var()
        
        # Calculate Beta: Beta = Covariance(stock, market) / Variance(market)
        beta = covariance / market_variance
        
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
    adj_close = data.xs('Adj Close', level=1, axis=1)
    
    # Calculate daily returns
    stock_returns = adj_close[stock_tickers].pct_change().dropna()
    market_returns = adj_close[market_ticker].pct_change().dropna()

    if stock_returns.shape[0] < 2 or market_returns.shape[0] < 2:
        return {}
    
    # Align indices
    common_index = stock_returns.index.intersection(market_returns.index)
    stock_returns = stock_returns.loc[common_index]
    market_returns = market_returns.loc[common_index]
    
    alphas = {}
    for ticker in stock_returns.columns:
        # Calculate the average annualized return for the stock

        stock_avg_return = stock_returns[ticker].mean() * 252  # 252 trading days in a year
        
        # Calculate the average annualized return for the market
        market_avg_return = market_returns.mean() * 252
        
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
    """
    Calculates the drawdown for each stock.
    Drawdown is the decline from a historical peak in price.

    Parameters:
    - stock_tickers (list): List of stock tickers to calculate drawdown for.
    - start_date (str): Start date for data fetching.
    - end_date (str): End date for data fetching.

    Returns:
    - dict: Dictionary with stock tickers as keys and their respective drawdown Series as values.
    """
    # Fetch adjusted close prices
    data = fetch_stock_data(stock_tickers, start_date, end_date)
    adj_close = data.xs('Adj Close', level=1, axis=1)
    
    drawdowns = {}
    for ticker in adj_close.columns:
        # Calculate the cumulative maximum up to each point in time
        cumulative_max = adj_close[ticker].cummax()
        
        # Calculate drawdown: (Current Price - Cumulative Max Price) / Cumulative Max Price
        drawdown = (adj_close[ticker] - cumulative_max) / cumulative_max
        
        drawdowns[ticker] = drawdown

    return drawdowns

# Function to calculate Cumulative Return
def calculate_cumulative_return(stock_tickers, start_date, end_date):
    """
    Calculates the cumulative return for each stock over the date range.

    Parameters:
    - stock_tickers (list): List of stock tickers to calculate cumulative return for.
    - start_date (str): Start date for data fetching.
    - end_date (str): End date for data fetching.

    Returns:
    - dict: Dictionary with stock tickers as keys and their respective cumulative return Series as values.
    """
    # Fetch adjusted close prices
    data = fetch_stock_data(stock_tickers, start_date, end_date)
    adj_close = data.xs('Adj Close', level=1, axis=1)
    
    cumulative_returns = {}
    for ticker in adj_close.columns:
        # Calculate cumulative return: (Current Price / Initial Price) - 1
        cumulative_return = adj_close[ticker] / adj_close[ticker].iloc[0] - 1
        
        cumulative_returns[ticker] = cumulative_return
    
    return cumulative_returns

# Function to calculate Sortino Ratio
def calculate_sortino_ratio(stock_tickers, start_date, end_date, risk_free_rate=0.01):
    """
    Calculates the Sortino Ratio for each stock.
    The Sortino Ratio measures risk-adjusted return focusing on downside risk.

    Parameters:
    - stock_tickers (list): List of stock tickers to calculate Sortino Ratio for.
    - start_date (str): Start date for data fetching.
    - end_date (str): End date for data fetching.
    - risk_free_rate (float): Risk-free rate used in the calculation.

    Returns:
    - dict: Dictionary with stock tickers as keys and their respective Sortino Ratios as values.
    """
    # Fetch adjusted close prices and calculate daily returns
    data = fetch_stock_data(stock_tickers, start_date, end_date)
    adj_close = data.xs('Adj Close', level=1, axis=1)
    stock_returns = adj_close.pct_change().dropna()
    
    sortino_ratios = {}
    for ticker in stock_returns.columns:
        returns = stock_returns[ticker]
        
        # Calculate the average annualized return
        avg_return = returns.mean() * 252
        
        # Isolate the negative returns (downside returns)
        downside_returns = returns[returns < 0]
        
        if downside_returns.empty:
            # If there are no negative returns, the downside deviation is zero
            sortino_ratios[ticker] = np.inf  # Infinite Sortino Ratio
            continue
        
        # Calculate the annualized downside deviation
        downside_deviation = downside_returns.std() * np.sqrt(252)
        
        # Calculate the Sortino Ratio: (Average Return - Risk-Free Rate) / Downside Deviation
        sortino_ratio = (avg_return - risk_free_rate) / downside_deviation
        
        sortino_ratios[ticker] = sortino_ratio
    
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
    adj_close = data.xs('Adj Close', level=1, axis=1)
    
    # Calculate daily returns
    returns = adj_close.pct_change().dropna()
    if len(returns) < 21:
        return {}
    rolling_corr = returns.rolling(window=21).corr()
    corr_matrix = rolling_corr.groupby(level=1).mean()

    correlations = {}
    for ticker in stock_tickers:
        correlations[ticker] = corr_matrix[ticker].to_dict()
    correlations[market_ticker] = corr_matrix[market_ticker].to_dict()

    return correlations

# Function to calculate Sharpe Ratio
def calculate_sharpe_ratio(stock_tickers, start_date, end_date, risk_free_rate=0.01):
    """
    Calculates the Sharpe Ratio for each stock.
    The Sharpe Ratio measures risk-adjusted return considering both upside and downside volatility.

    Parameters:
    - stock_tickers (list): List of stock tickers to calculate Sharpe Ratio for.
    - start_date (str): Start date for data fetching.
    - end_date (str): End date for data fetching.
    - risk_free_rate (float): Risk-free rate used in the calculation.

    Returns:
    - dict: Dictionary with stock tickers as keys and their respective Sharpe Ratios as values.
    """
    # Fetch adjusted close prices and calculate daily returns
    data = fetch_stock_data(stock_tickers, start_date, end_date)
    adj_close = data.xs('Adj Close', level=1, axis=1)
    stock_returns = adj_close.pct_change().dropna()
    
    sharpe_ratios = {}
    for ticker in stock_returns.columns:
        # Calculate average annualized return
        avg_return = stock_returns[ticker].mean() * 252
        
        # Calculate annualized standard deviation (volatility)
        std_dev = stock_returns[ticker].std() * np.sqrt(252)
        
        # Calculate Sharpe Ratio: (Average Return - Risk-Free Rate) / Standard Deviation
        sharpe_ratio = (avg_return - risk_free_rate) / std_dev
        
        sharpe_ratios[ticker] = sharpe_ratio
    
    return sharpe_ratios

# Function to calculate Volatility
def calculate_volatility(stock_tickers, start_date, end_date):
    """
    Calculates the annualized volatility for each stock.
    Volatility is the standard deviation of returns, indicating the degree of variation.

    Parameters:
    - stock_tickers (list): List of stock tickers to calculate volatility for.
    - start_date (str): Start date for data fetching.
    - end_date (str): End date for data fetching.

    Returns:
    - dict: Dictionary with stock tickers as keys and their respective volatility values as values.
    """
    # Fetch adjusted close prices and calculate daily returns
    data = fetch_stock_data(stock_tickers, start_date, end_date)
    adj_close = data.xs('Adj Close', level=1, axis=1)
    stock_returns = adj_close.pct_change().dropna()
    
    volatilities = {}
    for ticker in stock_returns.columns:
        # Calculate annualized volatility: Standard Deviation * sqrt(252)
        volatility = stock_returns[ticker].std() * np.sqrt(252)
        
        volatilities[ticker] = volatility
    
    return volatilities

# Function to calculate Value at Risk (VaR)
def calculate_value_at_risk(stock_tickers, start_date, end_date, confidence_level=0.05):
    """
    Calculates the Value at Risk (VaR) for each stock.
    VaR estimates the potential loss over a given time period within a certain confidence interval.

    Parameters:
    - stock_tickers (list): List of stock tickers to calculate VaR for.
    - start_date (str): Start date for data fetching.
    - end_date (str): End date for data fetching.
    - confidence_level (float): The confidence level for calculating VaR (e.g., 0.05 for 95% confidence).

    Returns:
    - dict: Dictionary with stock tickers as keys and their respective VaR values as values.
    """
    # Fetch adjusted close prices and calculate daily returns
    data = fetch_stock_data(stock_tickers, start_date, end_date)
    adj_close = data.xs('Adj Close', level=1, axis=1)
    stock_returns = adj_close.pct_change().dropna()
    
    vars = {}
    for ticker in stock_returns.columns:
        # Calculate the VaR at the specified confidence level
        # VaR is the percentile of the distribution of returns
        var = np.percentile(stock_returns[ticker], 100 * confidence_level)
        
        vars[ticker] = var
    
    return vars

# Function to calculate Efficient Frontier
def calculate_efficient_frontier(stock_tickers, start_date, end_date, num_portfolios=10000, risk_free_rate=0.01):
    """
    Calculates the Efficient Frontier for a given set of stocks.
    The Efficient Frontier represents portfolios that offer the highest expected return for a defined level of risk.

    Parameters:
    - stock_tickers (list): List of stock tickers to include in the portfolios.
    - start_date (str): Start date for data fetching.
    - end_date (str): End date for data fetching.
    - num_portfolios (int): Number of random portfolios to simulate.
    - risk_free_rate (float): Risk-free rate used in the calculation.

    Returns:
    - dict: Dictionary containing lists of portfolio returns, risks, and Sharpe ratios.
    """
    # Fetch adjusted close prices and calculate daily returns
    data = fetch_stock_data(stock_tickers, start_date, end_date)
    adj_close = data.xs('Adj Close', level=1, axis=1)
    stock_returns = adj_close.pct_change().dropna()
    
    # Calculate annualized mean returns and covariance matrix
    mean_returns = stock_returns.mean() * 252
    cov_matrix = stock_returns.cov() * 252
    
    results = {'returns': [], 'risks': [], 'sharpe_ratios': []}
    num_assets = len(stock_tickers)
    
    for _ in range(num_portfolios):
        # Generate random weights that sum to 1
        weights = np.random.random(num_assets)
        weights /= np.sum(weights)
        
        # Calculate expected portfolio return
        portfolio_return = np.dot(weights, mean_returns)
        
        # Calculate expected portfolio risk (standard deviation)
        portfolio_risk = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
        
        # Calculate Sharpe Ratio for the portfolio
        sharpe_ratio = (portfolio_return - risk_free_rate) / portfolio_risk
        
        # Store the results
        results['returns'].append(portfolio_return)
        results['risks'].append(portfolio_risk)
        results['sharpe_ratios'].append(sharpe_ratio)

    # plt.scatter(results['risks'], results['returns'], c=results['sharpe_ratios'], cmap='viridis')
    # plt.xlabel('Risks')
    # plt.ylabel('Return')
    # plt.title('Efficient Frontier')
    # plt.colorbar(label='Sharpe Ratio')
    # plt.show()

    return results

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
