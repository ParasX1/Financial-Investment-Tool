# import json

# from flask import Flask, jsonify, request
# from flask_cors import CORS
# from src.stocks import sanitiseStockJson

# from supabase import create_client, Client

# def create_app():
#     # app instance
#     app = Flask(__name__)
#     app.config.from_prefixed_env()
#     CORS(app)

#     supabase: Client = create_client(app.config["SUPABASE_URL"], app.config["SUPABASE_KEY"])

#     # returns a list of stocks the user holds
#     # takes the user id as input
#     @app.route("/api/stocks/get", methods=["POST"])
#     def stocks_get():
#         data = request.json
#         userid = data["id"]
#         try:
#             response = (supabase.table("Users")
#                         .select("stock_ids")
#                         .eq("id", userid)
#                         .single()
#                         .execute()
#             )
#             if response:
#                 return response.data["stock_ids"]["stocks"], 200
#             else:
#                 raise KeyError()
#         except:
#             return jsonify({
#                 "error": "No such user with ID " + userid
#             }), 404
#     # update columns in user stock entries for a single user
#     # each update can only target one column at a time
#     @app.route("/api/stocks/set", methods=["POST"])
#     def stocks_set():
#         try:
#             data = request.json
#             userid = data["id"]
#             json = data["json"]
#             if not sanitiseStockJson(json):
#                 raise KeyError("Invalid JSON")
#             resp = (supabase.table("Users")
#                         .update({"stock_ids": json})
#                         .eq("id", userid)
#                         .execute()
#             )
#             if not resp:
#                 raise KeyError("Couldn't find table entry")
#             return jsonify({"message": "OK"}), 200
#         except KeyError as e:
#            return jsonify({
#                "error": f"Something went wrong: {e}"
#            }), 500

#     return app

# if __name__ == "__main__":
#     app = create_app()
#     app.run(debug=True, port=8080)

from flask import Flask, jsonify, request
from flask_cors import CORS
from metrics import (
    calculate_beta,
    calculate_alpha,
    calculate_drawdown,
    calculate_cumulative_return,
    calculate_sortino_ratio,
    calculate_correlation_with_market,
    calculate_sharpe_ratio,
    calculate_volatility,
    calculate_value_at_risk,
    calculate_efficient_frontier,
    calculate_treynor_ratio,
    calculate_jensens_alpha,
    calculate_information_ratio
)

app = Flask(__name__)
CORS(app)

# Endpoint to calculate Beta
@app.route("/api/beta", methods=['GET'])
def get_beta():
    stock_tickers = request.args.getlist('stocks')  # List of stock tickers
    market_ticker = request.args.get('market')      # Market index ticker
    start_date = request.args.get('start_date')     # Start date in 'YYYY-MM-DD' format
    end_date = request.args.get('end_date')         # End date in 'YYYY-MM-DD' format
    
    # Validate inputs
    if not stock_tickers or not market_ticker or not start_date or not end_date:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    # Calculate Beta
    betas = calculate_beta(stock_tickers, market_ticker, start_date, end_date)
    return jsonify(betas)

# Endpoint to calculate Alpha
@app.route("/api/alpha", methods=['GET'])
def get_alpha():
    stock_tickers = request.args.getlist('stocks')
    market_ticker = request.args.get('market')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    risk_free_rate = float(request.args.get('risk_free_rate', 0.01))  # Default to 0.01 if not provided
    
    if not stock_tickers or not market_ticker or not start_date or not end_date:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    alphas = calculate_alpha(stock_tickers, market_ticker, start_date, end_date, risk_free_rate)
    return jsonify(alphas)

# Endpoint to calculate Drawdown
@app.route("/api/drawdown", methods=['GET'])
def get_drawdown():
    stock_tickers = request.args.getlist('stocks')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    if not stock_tickers or not start_date or not end_date:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    drawdowns = calculate_drawdown(stock_tickers, start_date, end_date)
    # Convert Series to dict for JSON serialization
    drawdowns_json = {ticker: drawdowns[ticker].dropna().to_dict() for ticker in drawdowns}
    return jsonify(drawdowns_json)

# Endpoint to calculate Cumulative Return
@app.route("/api/cumulative_return", methods=['GET'])
def get_cumulative_return():
    stock_tickers = request.args.getlist('stocks')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    if not stock_tickers or not start_date or not end_date:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    cumulative_returns = calculate_cumulative_return(stock_tickers, start_date, end_date)
    cumulative_returns_json = {ticker: cumulative_returns[ticker].dropna().to_dict() for ticker in cumulative_returns}
    return jsonify(cumulative_returns_json)

# Endpoint to calculate Sortino Ratio
@app.route("/api/sortino_ratio", methods=['GET'])
def get_sortino_ratio():
    stock_tickers = request.args.getlist('stocks')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    risk_free_rate = float(request.args.get('risk_free_rate', 0.01))
    
    if not stock_tickers or not start_date or not end_date:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    sortino_ratios = calculate_sortino_ratio(stock_tickers, start_date, end_date, risk_free_rate)
    return jsonify(sortino_ratios)

# Endpoint to calculate Correlation with Market
@app.route("/api/correlation", methods=['GET'])
def get_correlation():
    stock_tickers = request.args.getlist('stocks')
    market_ticker = request.args.get('market')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    if not stock_tickers or not market_ticker or not start_date or not end_date:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    correlations = calculate_correlation_with_market(stock_tickers, market_ticker, start_date, end_date)
    # Convert Series to dict for JSON serialization
    correlations_json = {ticker: correlations[ticker].dropna().to_dict() for ticker in correlations}
    return jsonify(correlations_json)

# Endpoint to calculate Sharpe Ratio
@app.route("/api/sharpe_ratio", methods=['GET'])
def get_sharpe_ratio():
    stock_tickers = request.args.getlist('stocks')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    risk_free_rate = float(request.args.get('risk_free_rate', 0.01))
    
    if not stock_tickers or not start_date or not end_date:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    sharpe_ratios = calculate_sharpe_ratio(stock_tickers, start_date, end_date, risk_free_rate)
    return jsonify(sharpe_ratios)

# Endpoint to calculate Volatility
@app.route("/api/volatility", methods=['GET'])
def get_volatility():
    stock_tickers = request.args.getlist('stocks')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    if not stock_tickers or not start_date or not end_date:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    volatilities = calculate_volatility(stock_tickers, start_date, end_date)
    return jsonify(volatilities)

# Endpoint to calculate Value at Risk (VaR)
@app.route("/api/value_at_risk", methods=['GET'])
def get_value_at_risk():
    stock_tickers = request.args.getlist('stocks')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    confidence_level = float(request.args.get('confidence_level', 0.05))
    
    if not stock_tickers or not start_date or not end_date:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    value_at_risk = calculate_value_at_risk(stock_tickers, start_date, end_date, confidence_level)
    return jsonify(value_at_risk)

# Endpoint to calculate Efficient Frontier
@app.route("/api/efficient_frontier", methods=['GET'])
def get_efficient_frontier():
    stock_tickers = request.args.getlist('stocks')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    num_portfolios = int(request.args.get('num_portfolios', 10000))
    risk_free_rate = float(request.args.get('risk_free_rate', 0.01))
    
    if not stock_tickers or not start_date or not end_date:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    efficient_frontier = calculate_efficient_frontier(
        stock_tickers, start_date, end_date, num_portfolios, risk_free_rate
    )
    return jsonify(efficient_frontier)

# Endpoint to calculate Treynor Ratio
@app.route("/api/treynor_ratio", methods=['GET'])
def get_treynor_ratio():
    stock_tickers = request.args.getlist('stocks')
    market_ticker = request.args.get('market')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    risk_free_rate = float(request.args.get('risk_free_rate', 0.01))
    
    if not stock_tickers or not market_ticker or not start_date or not end_date:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    treynor_ratios = calculate_treynor_ratio(
        stock_tickers, market_ticker, start_date, end_date, risk_free_rate
    )
    return jsonify(treynor_ratios)

# Endpoint to calculate Jensen's Alpha
@app.route("/api/jensens_alpha", methods=['GET'])
def get_jensens_alpha():
    stock_tickers = request.args.getlist('stocks')
    market_ticker = request.args.get('market')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    risk_free_rate = float(request.args.get('risk_free_rate', 0.01))
    
    if not stock_tickers or not market_ticker or not start_date or not end_date:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    jensens_alphas = calculate_jensens_alpha(
        stock_tickers, market_ticker, start_date, end_date, risk_free_rate
    )
    return jsonify(jensens_alphas)

# Endpoint to calculate Information Ratio
@app.route("/api/information_ratio", methods=['GET'])
def get_information_ratio():
    stock_tickers = request.args.getlist('stocks')
    benchmark_ticker = request.args.get('benchmark')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    if not stock_tickers or not benchmark_ticker or not start_date or not end_date:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    information_ratios = calculate_information_ratio(
        stock_tickers, benchmark_ticker, start_date, end_date
    )
    return jsonify(information_ratios)

if __name__ == "__main__":
    stock_tickers = ['AAPL', 'GOOGL', 'MSFT', 'TSLA']
    market_ticker = '^GSPC'
    start_date = '2020-01-01'
    end_date = '2023-10-01'
    risk_free_rate = 0.01
    confidence_level = 0.05
    num_portfolios = 10000

    # Example: Calculate Beta
    betas = calculate_beta(stock_tickers, market_ticker, start_date, end_date)
    print("Beta values:", betas)

    # Example: Calculate Alpha
    alphas = calculate_alpha(stock_tickers, market_ticker, start_date, end_date, risk_free_rate)
    print("Alpha values:", alphas)

    # Example: Calculate Drawdown
    drawdowns = calculate_drawdown(stock_tickers, start_date, end_date)
    drawdown_json = {ticker: drawdowns[ticker].dropna().to_dict() for ticker in drawdowns}
    print("Drawdown values:", drawdown_json)

    # Example: Calculate Cumulative Return
    cumulative_returns = calculate_cumulative_return(stock_tickers, start_date, end_date)
    cumulative_returns_json = {ticker: cumulative_returns[ticker].dropna().to_dict() for ticker in cumulative_returns}
    print("Cumulative Return values:", cumulative_returns_json)

    # Example: Calculate Sortino Ratio
    sortino_ratios = calculate_sortino_ratio(stock_tickers, start_date, end_date, risk_free_rate)
    print("Sortino Ratio values:", sortino_ratios)

    # Example: Calculate Correlation with Market
    correlations = calculate_correlation_with_market(stock_tickers, market_ticker, start_date, end_date)
    correlation_json = {ticker: correlations[ticker].dropna().to_dict() for ticker in correlations}
    # print("Correlation with Market values:", correlation_json)

    # Example: Calculate Sharpe Ratio
    sharpe_ratios = calculate_sharpe_ratio(stock_tickers, start_date, end_date, risk_free_rate)
    # print("Sharpe Ratio values:", sharpe_ratios)

    # Example: Calculate Volatility
    volatilities = calculate_volatility(stock_tickers, start_date, end_date)
    print("Volatility values:", volatilities)

    # Example: Calculate Value at Risk (VaR)
    value_at_risk = calculate_value_at_risk(stock_tickers, start_date, end_date, confidence_level)
    print("Value at Risk (VaR) values:", value_at_risk)

    # Example: Calculate Efficient Frontier
    efficient_frontier = calculate_efficient_frontier(stock_tickers, start_date, end_date, num_portfolios, risk_free_rate)
    # print("Efficient Frontier values:", efficient_frontier)

    # Example: Calculate Treynor Ratio
    treynor_ratios = calculate_treynor_ratio(stock_tickers, market_ticker, start_date, end_date, risk_free_rate)
    print("Treynor Ratio values:", treynor_ratios)

    # Example: Calculate Jensen's Alpha
    jensens_alphas = calculate_jensens_alpha(stock_tickers, market_ticker, start_date, end_date, risk_free_rate)
    print("Jensen's Alpha values:", jensens_alphas)

    # Example: Calculate Information Ratio
    benchmark_ticker = '^GSPC'  # Assume benchmark is the same as market_ticker
    information_ratios = calculate_information_ratio(stock_tickers, benchmark_ticker, start_date, end_date)
    print("Information Ratio values:", information_ratios)

