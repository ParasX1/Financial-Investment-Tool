# server/src/metrics.py

import yfinance as yf
import numpy as np
import pandas as pd

def fetch_stock_data(stock_tickers, start_date, end_date):
    """
    Fetch historical adjusted close price data for a list of stock tickers over a specified date range.

    Parameters:
    - stock_tickers (list of str): List of stock tickers to fetch data for.
    - start_date (str): The start date for the data retrieval in 'YYYY-MM-DD' format.
    - end_date (str): The end date for the data retrieval in 'YYYY-MM-DD' format.

    Returns:
    - list of dict: A list of dictionaries where each dictionary represents a row of stock data with date and adjusted close prices.
    """
    stock_data = {}
    for ticker in stock_tickers:
        # Fetch adjusted close prices for each ticker
        stock_data[ticker] = yf.download(ticker, start=start_date, end=end_date)['Adj Close']
    
    # Convert the stock data into a DataFrame
    df = pd.DataFrame(stock_data)
    df.index = df.index.strftime('%Y-%m-%d')  # Convert index (dates) to string format
    df = df.reset_index()  # Flatten the index into a column
    return df.to_dict(orient='records')  # Convert DataFrame to a list of dictionaries


def calculate_beta(stock_tickers, market_ticker, start_date, end_date):
    """
    Calculate Beta for each stock relative to a market index.

    Parameters:
    - stock_tickers (list of str): List of stock tickers to calculate Beta for.
    - market_ticker (str): The ticker symbol of the market index (benchmark).
    - start_date (str): The start date for the data retrieval in 'YYYY-MM-DD' format.
    - end_date (str): The end date for the data retrieval in 'YYYY-MM-DD' format.

    Returns:
    - dict: A dictionary where the keys are stock tickers and the values are dictionaries with 'x' (dates) and 'y' (Beta values).
    """
    # Fetch data for stocks and market index
    stock_data = fetch_stock_data(stock_tickers + [market_ticker], start_date, end_date)
    returns = pd.DataFrame(stock_data).pct_change().dropna()  # Calculate returns and drop missing values
    market_returns = returns[market_ticker]

    betas = {}
    for ticker in stock_tickers:
        # Compute covariance matrix between stock returns and market returns
        cov_matrix = np.cov(returns[ticker], market_returns)
        beta = cov_matrix[0, 1] / cov_matrix[1, 1]  # Beta calculation
        betas[ticker] = {
            'x': returns.index,  # Time (dates)
            'y': beta  # Beta value
        }
    return betas

def calculate_alpha(stock_tickers, benchmark_returns, start_date, end_date, risk_free_rate=0.01):
    """
    Calculate Alpha for each stock compared to a benchmark index.

    Parameters:
    - stock_tickers (list of str): List of stock tickers to calculate Alpha for.
    - benchmark_returns (pd.Series): Series of benchmark returns.
    - start_date (str): The start date for the data retrieval in 'YYYY-MM-DD' format.
    - end_date (str): The end date for the data retrieval in 'YYYY-MM-DD' format.
    - risk_free_rate (float): The risk-free rate for calculating excess returns (default is 0.01).

    Returns:
    - dict: A dictionary where the keys are stock tickers and the values are dictionaries with 'x' (dates) and 'y' (Alpha values).
    """
    stock_data = fetch_stock_data(stock_tickers, start_date, end_date)
    returns = pd.DataFrame(stock_data).pct_change().dropna()
    
    alphas = {}
    for ticker in stock_tickers:
        stock_return = returns[ticker].mean() * 252  # Annualized stock return
        benchmark_return = benchmark_returns.mean() * 252  # Annualized benchmark return
        beta = calculate_beta([ticker], benchmark_returns.name, start_date, end_date)[ticker]['y']
        alpha = stock_return - (risk_free_rate + beta * (benchmark_return - risk_free_rate))  # Alpha calculation
        alphas[ticker] = {
            'x': returns.index,
            'y': alpha
        }
    return alphas

def calculate_drawdown(stock_tickers, start_date, end_date):
    """
    Calculate drawdown for each stock over a specified date range.

    Parameters:
    - stock_tickers (list of str): List of stock tickers to calculate drawdown for.
    - start_date (str): The start date for the data retrieval in 'YYYY-MM-DD' format.
    - end_date (str): The end date for the data retrieval in 'YYYY-MM-DD' format.

    Returns:
    - dict: A dictionary where the keys are stock tickers and the values are dictionaries with 'x' (dates) and 'y' (drawdown values).
    """
    stock_data = fetch_stock_data(stock_tickers, start_date, end_date)
    drawdowns = {}

    for ticker in stock_tickers:
        # Calculate cumulative returns and drawdown
        cumulative_return = stock_data[ticker] / stock_data[ticker].cummax() - 1
        drawdowns[ticker] = {
            'x': stock_data.index,
            'y': cumulative_return
        }
    return drawdowns

def calculate_cumulative_return(stock_tickers, start_date, end_date):
    """
    Calculate cumulative return for each stock over a specified date range.

    Parameters:
    - stock_tickers (list of str): List of stock tickers to calculate cumulative return for.
    - start_date (str): The start date for the data retrieval in 'YYYY-MM-DD' format.
    - end_date (str): The end date for the data retrieval in 'YYYY-MM-DD' format.

    Returns:
    - dict: A dictionary where the keys are stock tickers and the values are dictionaries with 'x' (dates) and 'y' (cumulative return values).
    """
    stock_data = fetch_stock_data(stock_tickers, start_date, end_date)
    cumulative_returns = {}

    for ticker in stock_tickers:
        # Calculate cumulative return from initial value
        cumulative_returns[ticker] = {
            'x': stock_data.index,
            'y': (stock_data[ticker] / stock_data[ticker].iloc[0]) - 1
        }
    return cumulative_returns

def calculate_sortino_ratio(stock_tickers, start_date, end_date, risk_free_rate=0.01):
    """
    Calculate Sortino Ratio for each stock over a specified date range.

    Parameters:
    - stock_tickers (list of str): List of stock tickers to calculate Sortino Ratio for.
    - start_date (str): The start date for the data retrieval in 'YYYY-MM-DD' format.
    - end_date (str): The end date for the data retrieval in 'YYYY-MM-DD' format.
    - risk_free_rate (float): The risk-free rate for calculating excess returns (default is 0.01).

    Returns:
    - dict: A dictionary where the keys are stock tickers and the values are dictionaries with 'x' (dates) and 'y' (Sortino Ratio values).
    """
    stock_data = fetch_stock_data(stock_tickers, start_date, end_date)
    returns = pd.DataFrame(stock_data).pct_change().dropna()

    sortino_ratios = {}
    for ticker in stock_tickers:
        # Calculate downside deviation for negative returns
        negative_returns = returns[returns[ticker] < 0][ticker]
        downside_deviation = negative_returns.std() * np.sqrt(252)
        excess_return = returns[ticker].mean() * 252 - risk_free_rate  # Excess return over risk-free rate
        sortino_ratios[ticker] = {
            'x': returns.index,
            'y': excess_return / downside_deviation  # Sortino Ratio calculation
        }
    return sortino_ratios

def calculate_correlation_with_market(stock_tickers, market_ticker, start_date, end_date):
    """
    Calculate the correlation between each stock and the market index over a specified date range.

    Parameters:
    - stock_tickers (list of str): List of stock tickers to calculate correlation for.
    - market_ticker (str): The ticker symbol of the market index (benchmark).
    - start_date (str): The start date for the data retrieval in 'YYYY-MM-DD' format.
    - end_date (str): The end date for the data retrieval in 'YYYY-MM-DD' format.

    Returns:
    - dict: A dictionary where the keys are stock tickers and the values are dictionaries with 'x' (dates) and 'y' (correlation values).
    """
    stock_data = fetch_stock_data(stock_tickers + [market_ticker], start_date, end_date)
    returns = pd.DataFrame(stock_data).pct_change().dropna()
    market_returns = returns[market_ticker]

    correlations = {}
    for ticker in stock_tickers:
        # Calculate rolling correlation with the market index
        correlation = returns[ticker].rolling(window=21).corr(market_returns)
        correlations[ticker] = {
            'x': returns.index,
            'y': correlation
        }
    return correlations

def calculate_sharpe_ratio(stock_tickers, start_date, end_date, risk_free_rate=0.01):
    """
    Calculate Sharpe Ratio for each stock over a specified date range.

    Parameters:
    - stock_tickers (list of str): List of stock tickers to calculate Sharpe Ratio for.
    - start_date (str): The start date for the data retrieval in 'YYYY-MM-DD' format.
    - end_date (str): The end date for the data retrieval in 'YYYY-MM-DD' format.
    - risk_free_rate (float): The risk-free rate for calculating excess returns (default is 0.01).

    Returns:
    - dict: A dictionary where the keys are stock tickers and the values are dictionaries with 'x' (dates) and 'y' (Sharpe Ratio values).
    """
    stock_data = fetch_stock_data(stock_tickers, start_date, end_date)
    returns = pd.DataFrame(stock_data).pct_change().dropna()

    # Sharpe Ratio = (Mean Return - Risk Free Rate) / Std Dev of Returns
    sharpe_ratios = {}
    for ticker in stock_tickers:
        excess_returns = returns[ticker] - (risk_free_rate / 252)  # Adjust returns by risk-free rate
        sharpe_ratios[ticker] = {
            'x': returns.index,  # Time (dates)
            'y': (excess_returns.mean() / excess_returns.std()) * np.sqrt(252)  # Sharpe Ratio calculation
        }
    return sharpe_ratios

def calculate_volatility(stock_tickers, start_date, end_date):
    """
    Calculate the volatility for each stock over a specified date range.

    Parameters:
    - stock_tickers (list of str): List of stock tickers to calculate volatility for.
    - start_date (str): The start date for the data retrieval in 'YYYY-MM-DD' format.
    - end_date (str): The end date for the data retrieval in 'YYYY-MM-DD' format.

    Returns:
    - dict: A dictionary where the keys are stock tickers and the values are dictionaries with 'x' (dates) and 'y' (volatility values).
    """
    stock_data = fetch_stock_data(stock_tickers, start_date, end_date)
    returns = pd.DataFrame(stock_data).pct_change().dropna()

    volatilities = {}
    for ticker in stock_tickers:
        # Calculate 21-day rolling volatility and annualize it
        volatilities[ticker] = {
            'x': returns.index,  # Time (dates)
            'y': returns[ticker].rolling(window=21).std() * np.sqrt(252)  # Volatility calculation
        }
    return volatilities

def calculate_value_at_risk(stock_tickers, start_date, end_date, confidence_level=0.95):
    """
    Calculate Value at Risk (VaR) for each stock over a specified date range.

    Parameters:
    - stock_tickers (list of str): List of stock tickers to calculate VaR for.
    - start_date (str): The start date for the data retrieval in 'YYYY-MM-DD' format.
    - end_date (str): The end date for the data retrieval in 'YYYY-MM-DD' format.
    - confidence_level (float): Confidence level for VaR calculation (default is 0.95).

    Returns:
    - dict: A dictionary where the keys are stock tickers and the values are dictionaries with 'x' (dates) and 'y' (VaR values).
    """
    stock_data = fetch_stock_data(stock_tickers, start_date, end_date)
    returns = pd.DataFrame(stock_data).pct_change().dropna()

    vars = {}
    for ticker in stock_tickers:
        # Calculate rolling VaR with a 21-day window
        vars[ticker] = {
            'x': returns.index,  # Time (dates)
            'y': returns[ticker].rolling(window=21).apply(
                lambda x: np.percentile(x, (1 - confidence_level) * 100), raw=True
            )  # VaR calculation
        }
    return vars

def calculate_efficient_frontier(stock_tickers, start_date, end_date):
    """
    Calculate the Efficient Frontier for a set of stocks over a specified date range.

    Parameters:
    - stock_tickers (list of str): List of stock tickers to include in the efficient frontier calculation.
    - start_date (str): The start date for the data retrieval in 'YYYY-MM-DD' format.
    - end_date (str): The end date for the data retrieval in 'YYYY-MM-DD' format.

    Returns:
    - dict: A dictionary with 'x' (volatility values) and 'y' (return values) for the efficient frontier.
    """
    stock_data = fetch_stock_data(stock_tickers, start_date, end_date)
    returns = pd.DataFrame(stock_data).pct_change().dropna()

    mean_returns = returns.mean() * 252  # Annualized returns
    cov_matrix = returns.cov() * 252     # Annualized covariance matrix

    # Simulate random portfolios to estimate the efficient frontier
    num_portfolios = 10000
    results = np.zeros((3, num_portfolios))  # 3 rows: volatility, return, Sharpe ratio
    for i in range(num_portfolios):
        weights = np.random.random(len(stock_tickers))
        weights /= np.sum(weights)  # Normalize weights to sum to 1
        
        portfolio_return = np.dot(weights, mean_returns)  # Portfolio return
        portfolio_volatility = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))  # Portfolio volatility

        results[0, i] = portfolio_volatility  # Volatility
        results[1, i] = portfolio_return  # Return
        results[2, i] = results[1, i] / results[0, i]  # Sharpe Ratio

    return {
        'x': results[0],  # Volatility (Risk)
        'y': results[1]   # Return (Reward)
    }
