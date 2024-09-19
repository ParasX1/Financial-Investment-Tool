from flask import Flask, jsonify, request
from flask_cors import CORS
from metrics import (
    fetch_stock_data,
    calculate_beta,
    calculate_alpha,
    calculate_drawdown,
    calculate_cumulative_return,
    calculate_sortino_ratio,
    calculate_correlation_with_market,
    calculate_sharpe_ratio,
    calculate_volatility,
    calculate_value_at_risk,
    calculate_efficient_frontier
)

app = Flask(__name__)
CORS(app)

# Example stock tickers, market index, and date range for testing
start_date = '2023-01-01'
end_date = '2024-01-01'
stock_tickers = ['AAPL', 'GOOGL']
market_ticker = 'SPY'
risk_free_rate = 0.01

@app.route("/api/stock_data", methods=['GET'])
def get_stock_data():
    stock_data = fetch_stock_data(stock_tickers, start_date, end_date)
    stock_data_json = stock_data.to_dict()
    return jsonify(stock_data_json)

@app.route("/api/beta", methods=['GET'])
def get_beta():
    betas = calculate_beta(stock_tickers, market_ticker, start_date, end_date)
    return jsonify(betas)

@app.route("/api/alpha", methods=['GET'])
def get_alpha():
    benchmark_data = fetch_stock_data([market_ticker], start_date, end_date)
    benchmark_returns = benchmark_data.pct_change().dropna()[market_ticker]
    alphas = calculate_alpha(stock_tickers, benchmark_returns, start_date, end_date, risk_free_rate)
    return jsonify(alphas)

@app.route("/api/drawdown", methods=['GET'])
def get_drawdown():
    drawdowns = calculate_drawdown(stock_tickers, start_date, end_date)
    drawdowns_json = {ticker: drawdowns[ticker].to_dict() for ticker in drawdowns}
    return jsonify(drawdowns_json)

@app.route("/api/cumulative_return", methods=['GET'])
def get_cumulative_return():
    cumulative_returns = calculate_cumulative_return(stock_tickers, start_date, end_date)
    cumulative_returns_json = {ticker: cumulative_returns[ticker].to_dict() for ticker in cumulative_returns}
    return jsonify(cumulative_returns_json)

@app.route("/api/sortino_ratio", methods=['GET'])
def get_sortino_ratio():
    sortino_ratios = calculate_sortino_ratio(stock_tickers, start_date, end_date, risk_free_rate)
    return jsonify(sortino_ratios)

@app.route("/api/correlation", methods=['GET'])
def get_correlation():
    correlations = calculate_correlation_with_market(stock_tickers, market_ticker, start_date, end_date)
    correlations_json = {ticker: correlations[ticker].to_dict() for ticker in correlations}
    return jsonify(correlations_json)

@app.route("/api/sharpe_ratio", methods=['GET'])
def get_sharpe_ratio():
    sharpe_ratios = calculate_sharpe_ratio(stock_tickers, start_date, end_date, risk_free_rate)
    return jsonify(sharpe_ratios)

@app.route("/api/volatility", methods=['GET'])
def get_volatility():
    volatilities = calculate_volatility(stock_tickers, start_date, end_date)
    volatilities_json = {ticker: volatilities[ticker] for ticker in volatilities}
    return jsonify(volatilities_json)

@app.route("/api/value_at_risk", methods=['GET'])
def get_value_at_risk():
    value_at_risk = calculate_value_at_risk(stock_tickers, start_date, end_date)
    value_at_risk_json = {ticker: value_at_risk[ticker] for ticker in value_at_risk}
    return jsonify(value_at_risk_json)

@app.route("/api/efficient_frontier", methods=['GET'])
def get_efficient_frontier():
    efficient_frontier = calculate_efficient_frontier(stock_tickers, start_date, end_date)
    return jsonify(efficient_frontier)

if __name__ == '__main__':
    app.run(debug=True)
