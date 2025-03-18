import json

from flask import Flask, jsonify, request
from flask_cors import CORS
from src.stocks import sanitiseStockJson

from supabase import create_client, Client

def create_app():
    # app instance
    app = Flask(__name__)
    app.config.from_prefixed_env()
    CORS(app)

    supabase: Client = create_client(app.config["SUPABASE_URL"], app.config["SUPABASE_KEY"])

    # returns a list of stocks the user holds
    # takes the user id as input
    @app.route("/api/stocks/get", methods=["POST"])
    def stocks_get():
        try:
            data = request.json
            # Prevent KeyErrors (code won't crash if id is missing in data)
            if not data or "id" not in data:
                return jsonify({"error": "Missing 'id' in request"}), 400

            userid = data["id"]
            response = (
                supabase.table("Users")
                .select("stock_ids")
                .eq("id", userid)
                .single()
                .execute()
            )

            if response.data is None or "stock_ids" not in response.data:
                return jsonify({"error": f"No user found with ID {userid}"}), 404

            return jsonify(response.data["stock_ids"]["stocks"]), 200

        except Exception as e:
            return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500
    # update columns in user stock entries for a single user
    # each update can only target one column at a time
    @app.route("/api/stocks/set", methods=["POST"])
    def stocks_set():
        try:
            data = request.json
            if not data or "id" not in data or "json" not in data:
                return jsonify({"error": "Missing 'id' or 'json' in request"}), 400

            userid = data["id"]
            stock_json = data["json"]

            if not sanitiseStockJson(stock_json):
                return jsonify({"error": "Invalid stock JSON format"}), 400

            response = (
                supabase.table("Users")
                .update({"stock_ids": stock_json})
                .eq("id", userid)
                .execute()
            )

            if not response.data:
                return jsonify({"error": "User not found or update failed"}), 404

            return jsonify({"message": "OK"}), 200

        except Exception as e:
            return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=8080)

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

# Example stock tickers, market index for testing
stock_tickers = ['AAPL', 'GOOGL', 'MSFT']
market_ticker = 'SPY'
risk_free_rate = 0.01
# Default date range if none is provided by the user
DEFAULT_START_DATE = '2023-01-01'
DEFAULT_END_DATE = '2024-01-01'

@app.route("/api/fetch_data", methods=['GET'])
def get_stock_data():
    try:
        start_date = request.args.get("start_date", DEFAULT_START_DATE)
        end_date = request.args.get("end_date", DEFAULT_END_DATE)
        stock_data = fetch_stock_data(stock_tickers, start_date, end_date)
        stock_data_json = stock_data.to_dict()
        return jsonify(stock_data_json)
    except Exception as e:
        return jsonify({"error": f"Failed to fetch stock data: {str(e)}"}), 500

@app.route("/api/beta", methods=['GET'])
def get_beta():
    # Allow the user to pass start_date and end_date
    try:
        # If no arguments are passed by the user, the default is 2023-01-01 to 2024-01-01
        # Example input: GET /api/beta?start_date=2022-01-01&end_date=2022-12-31
        start_date = request.args.get("start_date", "2023-01-01")
        end_date = request.args.get("end_date", "2024-01-01")
        betas = calculate_beta(stock_tickers, market_ticker, start_date, end_date)
        return jsonify(betas)
    except Exception as e:
        return jsonify({"error": f"Failed to calculate beta: {str(e)}"}), 500

def get_alpha():
    try:
        start_date = request.args.get("start_date", DEFAULT_START_DATE)
        end_date = request.args.get("end_date", DEFAULT_END_DATE)
        benchmark_data = fetch_stock_data([market_ticker], start_date, end_date)
        benchmark_returns = benchmark_data.pct_change().dropna()[market_ticker]
        alphas = calculate_alpha(stock_tickers, benchmark_returns, start_date, end_date, risk_free_rate)
        return jsonify(alphas)
    except Exception as e:
        return jsonify({"error": f"Failed to calculate alpha: {str(e)}"}), 500


@app.route("/api/drawdown", methods=['GET'])
def get_drawdown():
    try:
        start_date = request.args.get("start_date", DEFAULT_START_DATE)
        end_date = request.args.get("end_date", DEFAULT_END_DATE)
        drawdowns = calculate_drawdown(stock_tickers, start_date, end_date)
        # Convert each drawdown series to a dictionary for JSON serialization
        drawdowns_json = {ticker: drawdowns[ticker].to_dict() for ticker in drawdowns}
        return jsonify(drawdowns_json)
    except Exception as e:
        return jsonify({"error": f"Failed to calculate drawdown: {str(e)}"}), 500

@app.route("/api/cumulative_return", methods=['GET'])
def get_cumulative_return():
    try:
        start_date = request.args.get("start_date", DEFAULT_START_DATE)
        end_date = request.args.get("end_date", DEFAULT_END_DATE)
        cumulative_returns = calculate_cumulative_return(stock_tickers, start_date, end_date)
        cumulative_returns_json = {ticker: cumulative_returns[ticker].to_dict() for ticker in cumulative_returns}
        return jsonify(cumulative_returns_json)
    except Exception as e:
        return jsonify({"error": f"Failed to calculate cumulative return: {str(e)}"}), 500

@app.route("/api/sortino_ratio", methods=['GET'])
def get_sortino_ratio():
    try:
        start_date = request.args.get("start_date", DEFAULT_START_DATE)
        end_date = request.args.get("end_date", DEFAULT_END_DATE)
        sortino_ratios = calculate_sortino_ratio(stock_tickers, start_date, end_date, risk_free_rate)
        return jsonify(sortino_ratios)
    except Exception as e:
        return jsonify({"error": f"Failed to calculate sortino ratio: {str(e)}"}), 500

@app.route("/api/correlation", methods=['GET'])
def get_correlation():
    try:
        start_date = request.args.get("start_date", DEFAULT_START_DATE)
        end_date = request.args.get("end_date", DEFAULT_END_DATE)
        correlations = calculate_correlation_with_market(stock_tickers, market_ticker, start_date, end_date)
        correlations_json = {ticker: correlations[ticker].to_dict() for ticker in correlations}
        return jsonify(correlations_json)
    except Exception as e:
        return jsonify({"error": f"Failed to calculate correlation: {str(e)}"}), 500

@app.route("/api/sharpe_ratio", methods=['GET'])
def get_sharpe_ratio():
    try:
        start_date = request.args.get("start_date", DEFAULT_START_DATE)
        end_date = request.args.get("end_date", DEFAULT_END_DATE)
        sharpe_ratios = calculate_sharpe_ratio(stock_tickers, start_date, end_date, risk_free_rate)
        return jsonify(sharpe_ratios)
    except Exception as e:
        return jsonify({"error": f"Failed to calculate sharpe ratio: {str(e)}"}), 500

@app.route("/api/volatility", methods=['GET'])
def get_volatility():
    try:
        start_date = request.args.get("start_date", DEFAULT_START_DATE)
        end_date = request.args.get("end_date", DEFAULT_END_DATE)
        volatilities = calculate_volatility(stock_tickers, start_date, end_date)
        volatilities_json = {ticker: volatilities[ticker] for ticker in volatilities}
        return jsonify(volatilities_json)
    except Exception as e:
        return jsonify({"error": f"Failed to calculate volatility: {str(e)}"}), 500

@app.route("/api/value_at_risk", methods=['GET'])
def get_value_at_risk():
    try:
        start_date = request.args.get("start_date", DEFAULT_START_DATE)
        end_date = request.args.get("end_date", DEFAULT_END_DATE)
        value_at_risk = calculate_value_at_risk(stock_tickers, start_date, end_date)
        value_at_risk_json = {ticker: value_at_risk[ticker] for ticker in value_at_risk}
        return jsonify(value_at_risk_json)
    except Exception as e:
        return jsonify({"error": f"Failed to calculate value at risk: {str(e)}"}), 500

@app.route("/api/efficient_frontier", methods=['GET'])
def get_efficient_frontier():
    try:
        start_date = request.args.get("start_date", DEFAULT_START_DATE)
        end_date = request.args.get("end_date", DEFAULT_END_DATE)
        efficient_frontier = calculate_efficient_frontier(stock_tickers, start_date, end_date)
        return jsonify(efficient_frontier)
    except Exception as e:
        return jsonify({"error": f"Failed to calculate efficient frontier: {str(e)}"}), 500
