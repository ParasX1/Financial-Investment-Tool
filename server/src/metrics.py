# Import necessary libraries
import yfinance as yf   # Library to fetch stock data from Yahoo Finance
import numpy as np      
import pandas as pd     
import matplotlib.pyplot as plt 

# Function to fetch stock data
def fetch_stock_data(stock_tickers, start_date, end_date):
    """
    Fetches adjusted closing price for the provided stock tickers over a given date range.

    Parameters:
    - stock_tickers (list): List of stock tickers to fetch data for.
    - start_date (str): The start date for fetching the data (format: 'YYYY-MM-DD').
    - end_date (str): The end date for fetching the data (format: 'YYYY-MM-DD').

    Returns:
    - pd.DataFrame: DataFrame where each column represents the adjusted closing price for each stock.
    """
    stock_data = {}
    for ticker in stock_tickers:
        # Fetch adjusted closing prices for each ticker
        df = yf.download(ticker, start=start_date, end=end_date)['Adj Close']
        stock_data[ticker] = df
    df = pd.DataFrame(stock_data)
    # Convert index (datetime) to string format
    df.index = df.index.strftime('%Y-%m-%d')
    return df

# Function to calculate Beta for stocks
def calculate_beta(stock_tickers, market_ticker, start_date, end_date):
    """
    Calculates the Beta of each stock compared to the market.
    Beta measures a stock's volatility relative to the market.

    Parameters:
    - stock_tickers (list): List of stock tickers to calculate Beta for.
    - market_ticker (str): Market index ticker (e.g., '^GSPC' for S&P 500) to compare against.
    - start_date (str): Start date for the calculation (format: 'YYYY-MM-DD').
    - end_date (str): End date for the calculation (format: 'YYYY-MM-DD').

    Returns:
    - dict: Dictionary with stock tickers as keys and their respective Beta values as values.
    """
    # Fetch stock and market data
    stock_data = fetch_stock_data(stock_tickers + [market_ticker], start_date, end_date)
    # Calculate daily returns
    returns = stock_data.pct_change().dropna()
    market_returns = returns[market_ticker]
    betas = {}
    for ticker in stock_tickers:
        # Calculate covariance between stock and market returns
        cov_matrix = np.cov(returns[ticker], market_returns)
        # Beta = Cov(stock, market) / Var(market)
        beta = cov_matrix[0, 1] / cov_matrix[1, 1]
        betas[ticker] = beta
    return betas

# Function to calculate Alpha for stocks
def calculate_alpha(stock_tickers, benchmark_returns, start_date, end_date, risk_free_rate=0.01):
    """
    Calculates the Alpha of each stock. Alpha measures the stock's performance relative to the benchmark.

    Parameters:
    - stock_tickers (list): List of stock tickers to calculate Alpha for.
    - benchmark_returns (pd.Series): Returns of the benchmark (e.g., market returns).
    - start_date (str): Start date for the calculation (format: 'YYYY-MM-DD').
    - end_date (str): End date for the calculation (format: 'YYYY-MM-DD').
    - risk_free_rate (float): Risk-free rate used in the calculation (default: 0.01).

    Returns:
    - dict: Dictionary with stock tickers as keys and their respective Alpha values as values.
    """
    stock_data = fetch_stock_data(stock_tickers, start_date, end_date)
    returns = stock_data.pct_change().dropna()
    alphas = {}
    for ticker in stock_tickers:
        stock_return = returns[ticker].mean() * 252
        benchmark_return = benchmark_returns.mean() * 252
        beta = calculate_beta([ticker], benchmark_returns.name, start_date, end_date)[ticker]
        alpha = stock_return - (risk_free_rate + beta * (benchmark_return - risk_free_rate))
        alphas[ticker] = alpha
    return alphas

# Function to calculate Drawdown
def calculate_drawdown(stock_tickers, start_date, end_date):
    """
    Calculates the drawdown for each stock. Drawdown is the decline from the stock's peak.

    Parameters:
    - stock_tickers (list): List of stock tickers to calculate drawdown for.
    - start_date (str): Start date for the calculation (format: 'YYYY-MM-DD').
    - end_date (str): End date for the calculation (format: 'YYYY-MM-DD').

    Returns:
    - dict: Dictionary with stock tickers as keys and their respective drawdown values as values.
    """
    stock_data = fetch_stock_data(stock_tickers, start_date, end_date)
    drawdowns = {}
    for ticker in stock_tickers:
        # Drawdown = (Stock price / Maximum price up to that point) - 1
        cumulative_return = (stock_data[ticker] / stock_data[ticker].cummax() - 1).dropna()
        drawdowns[ticker] = cumulative_return
    return drawdowns

# Function to calculate Cumulative Return
def calculate_cumulative_return(stock_tickers, start_date, end_date):
    """
    Calculates the cumulative return for each stock over the date range.

    Parameters:
    - stock_tickers (list): List of stock tickers to calculate cumulative return for.
    - start_date (str): Start date for the calculation (format: 'YYYY-MM-DD').
    - end_date (str): End date for the calculation (format: 'YYYY-MM-DD').

    Returns:
    - dict: Dictionary with stock tickers as keys and their respective cumulative returns as values.
    """
    stock_data = fetch_stock_data(stock_tickers, start_date, end_date)
    cumulative_returns = {}
    for ticker in stock_tickers:
        # Cumulative return = (Current price / Initial price) - 1
        cumulative_return = (stock_data[ticker] / stock_data[ticker].iloc[0]) - 1
        cumulative_returns[ticker] = cumulative_return
    return cumulative_returns

# Function to calculate Sortino Ratio
def calculate_sortino_ratio(stock_tickers, start_date, end_date, risk_free_rate=0.01):
    """
    Calculates the Sortino Ratio for each stock. The Sortino Ratio is a variation of the Sharpe Ratio
    but focuses on downside risk.

    Parameters:
    - stock_tickers (list): List of stock tickers to calculate Sortino Ratio for.
    - start_date (str): Start date for the calculation (format: 'YYYY-MM-DD').
    - end_date (str): End date for the calculation (format: 'YYYY-MM-DD').
    - risk_free_rate (float): Risk-free rate used in the calculation (default: 0.01).

    Returns:
    - dict: Dictionary with stock tickers as keys and their respective Sortino Ratio values as values.
    """
    stock_data = fetch_stock_data(stock_tickers, start_date, end_date)
    returns = stock_data.pct_change().dropna()
    sortino_ratios = {}
    for ticker in stock_tickers:
        # Calculate downside deviation (standard deviation of negative returns)
        negative_returns = returns[returns[ticker] < 0][ticker]
        downside_deviation = negative_returns.std() * np.sqrt(252)
        # Excess return = Annualized return - Risk-free rate
        excess_return = returns[ticker].mean() * 252 - risk_free_rate
        sortino_ratios[ticker] = excess_return / downside_deviation
    return sortino_ratios

# Function to calculate correlation with the market
def calculate_correlation_with_market(stock_tickers, market_ticker, start_date, end_date):
    """
    Calculates the correlation between each stock and the market.

    Parameters:
    - stock_tickers (list): List of stock tickers to calculate correlation for.
    - market_ticker (str): Market index ticker to compare against.
    - start_date (str): Start date for the calculation (format: 'YYYY-MM-DD').
    - end_date (str): End date for the calculation (format: 'YYYY-MM-DD').

    Returns:
    - dict: Dictionary with stock tickers as keys and their rolling correlations with the market as values.
    """
    stock_data = fetch_stock_data(stock_tickers + [market_ticker], start_date, end_date)
    returns = stock_data.pct_change().dropna()
    market_returns = returns[market_ticker]
    correlations = {}
    for ticker in stock_tickers:
        # Calculate rolling correlation between stock and market
        correlation = returns[ticker].rolling(window=21).corr(market_returns).dropna()
        correlations[ticker] = correlation
    return correlations

# Function to calculate Sharpe Ratio
def calculate_sharpe_ratio(stock_tickers, start_date, end_date, risk_free_rate=0.01):
    """
    Calculates the Sharpe Ratio for each stock. The Sharpe Ratio measures risk-adjusted returns.

    Parameters:
    - stock_tickers (list): List of stock tickers to calculate Sharpe Ratio for.
    - start_date (str): Start date for the calculation (format: 'YYYY-MM-DD').
    - end_date (str): End date for the calculation (format: 'YYYY-MM-DD').
    - risk_free_rate (float): Risk-free rate used in the calculation (default: 0.01).

    Returns:
    - dict: Dictionary with stock tickers as keys and their respective Sharpe Ratios as values.
    """
    stock_data = fetch_stock_data(stock_tickers, start_date, end_date)
    returns = stock_data.pct_change().dropna()
    sharpe_ratios = {}
    for ticker in stock_tickers:
        # Calculate annualized return and annualized standard deviation
        excess_return = returns[ticker].mean() * 252 - risk_free_rate
        annualized_std = returns[ticker].std() * np.sqrt(252)
        sharpe_ratios[ticker] = excess_return / annualized_std
    return sharpe_ratios

# Function to calculate Volatility
def calculate_volatility(stock_tickers, start_date, end_date):
    """
    Calculates the annualized volatility for each stock. Volatility measures the price fluctuations of the stock.

    Parameters:
    - stock_tickers (list): List of stock tickers to calculate volatility for.
    - start_date (str): Start date for the calculation (format: 'YYYY-MM-DD').
    - end_date (str): End date for the calculation (format: 'YYYY-MM-DD').

    Returns:
    - dict: Dictionary with stock tickers as keys and their respective annualized volatility values as values.
    """
    stock_data = fetch_stock_data(stock_tickers, start_date, end_date)
    returns = stock_data.pct_change().dropna()
    volatilities = {}
    for ticker in stock_tickers:
        # Annualized volatility = standard deviation of daily returns * sqrt(252)
        volatilities[ticker] = returns[ticker].std() * np.sqrt(252)
    return volatilities

# Function to calculate Value at Risk (VaR)
def calculate_value_at_risk(stock_tickers, start_date, end_date, confidence_level=0.05):
    """
    Calculates the Value at Risk (VaR) for each stock at a given confidence level. 
    VaR measures the maximum potential loss over a period within a given confidence level.

    Parameters:
    - stock_tickers (list): List of stock tickers to calculate VaR for.
    - start_date (str): Start date for the calculation (format: 'YYYY-MM-DD').
    - end_date (str): End date for the calculation (format: 'YYYY-MM-DD').
    - confidence_level (float): The confidence level for calculating VaR (default: 0.05).

    Returns:
    - dict: Dictionary with stock tickers as keys and their respective VaR values as values.
    """
    stock_data = fetch_stock_data(stock_tickers, start_date, end_date)
    returns = stock_data.pct_change().dropna()
    vars = {}
    for ticker in stock_tickers:
        # Calculate the VaR at the specified confidence level
        sorted_returns = returns[ticker].sort_values()
        var = np.percentile(sorted_returns, confidence_level * 100)
        vars[ticker] = var
    return vars

# Function to calculate the Efficient Frontier
def calculate_efficient_frontier(stock_tickers, start_date, end_date):
    """
    Calculates the Efficient Frontier for a given set of stocks. The Efficient Frontier shows the best possible return
    for a given level of risk, or the lowest risk for a given return.

    Parameters:
    - stock_tickers (list): List of stock tickers to calculate the Efficient Frontier for.
    - start_date (str): Start date for fetching the stock data (format: 'YYYY-MM-DD').
    - end_date (str): End date for fetching the stock data (format: 'YYYY-MM-DD').

    Returns:
    - list: List of tuples where each tuple contains expected return and risk for a particular portfolio weight combination.
    """
    stock_data = fetch_stock_data(stock_tickers, start_date, end_date)
    returns = stock_data.pct_change().dropna()
    mean_returns = returns.mean() * 252  # Annualized mean returns
    cov_matrix = returns.cov() * 252  # Annualized covariance matrix

    num_portfolios = 10000
    results = np.zeros((3, num_portfolios))
    
    for i in range(num_portfolios):
        weights = np.random.random(len(stock_tickers))
        weights /= np.sum(weights)
        
        portfolio_return = np.dot(weights, mean_returns)
        portfolio_stddev = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
        
        results[0, i] = portfolio_return
        results[1, i] = portfolio_stddev
        results[2, i] = results[0, i] / results[1, i]  # Sharpe ratio
    
    return results
