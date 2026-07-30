from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import traceback
from .metrics import (
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

from .supabase_client import (
    SupabaseConfigurationError,
    get_supabase_client,
)


def create_app(test_config=None, supabase_client=None):
    # app instance
    app = Flask(__name__)
    app.config.from_mapping(
        SUPABASE_URL=os.getenv("SUPABASE_URL"),
        SUPABASE_KEY=os.getenv("SUPABASE_KEY"),
    )
    app.config.from_prefixed_env()
    if test_config is not None:
        app.config.update(test_config)
    if supabase_client is not None:
        app.extensions["supabase"] = supabase_client
    CORS(app)


    # These routes trusted a caller-supplied user id and accessed Users with a
    # publishable key. Keep an explicit response for old clients, but never
    # bypass the Users RLS policy.
    @app.route("/api/stocks/get", methods=["POST"])
    @app.route("/api/stocks/set", methods=["POST"])
    def legacy_user_stocks():
        return jsonify({
            "error": "This legacy portfolio endpoint is no longer available."
        }), 410

    # Example stock tickers, market index, and date range for testing
    start_date = '2023-01-01'
    end_date = '2024-01-01'
    stock_tickers = ['AAPL', 'GOOGL', 'MSFT']
    market_ticker = 'SPY'
    risk_free_rate = 0.01

    @app.route("/api/fetch_data", methods=['GET'])
    def get_stock_data():
        # stock_data = fetch_stock_data(stock_tickers, start_date, end_date)
        # stock_data_json = stock_data.to_dict()
        # fixed_data = [
        #         {'symbol': k[0], 'date': k[1], 'value': v}
        #         for k, v in stock_data_json.items()
        #     ]
        # print(stock_data_json)
        
        try:
            supabase = get_supabase_client(app)
        except SupabaseConfigurationError:
            return jsonify({
                "error": "Market data service is not configured."
            }), 503

        try:
            response = (
                supabase.table("stock_data")
                .select("MSFT")
                .execute()
            )
            return jsonify(response.data)
        except Exception:
            traceback.print_exc()
            return jsonify({
                "error": "Market data is temporarily unavailable."
            }), 502
        # return jsonify(fixed_data)
        # return jsonify(stock_data_json)

    @app.route("/api/metrics/<metric_type>", methods=['POST'])
    def get_metric(metric_type):
        try:
            data = request.json
            stock_tickers = data.get('stock_tickers', [])
            start_date = data.get('start_date', '2023-01-01')
            end_date = data.get('end_date', '2024-01-01')
            market_ticker = data.get('market_ticker', 'SPY')
            risk_free_rate = data.get('risk_free_rate', 0.01)
            confidence_level = data.get('confidence_level', 0.05)
            
            # Add catch for less than 21 days when data isnt missing days

            if not stock_tickers:
                return jsonify({"error": "stock_tickers is required"}), 400
                
            elif metric_type == 'betaanalysis':
                result = calculate_beta(stock_tickers, market_ticker, start_date, end_date)
                return jsonify(result)
                
            elif metric_type == 'alphacomparison':
                result = calculate_alpha(stock_tickers, market_ticker, start_date, end_date, risk_free_rate)
                return jsonify(result)
                
            elif metric_type == 'maxdrawdownanalysis':
                result = calculate_drawdown(stock_tickers, start_date, end_date)
                result_json = {ticker: result[ticker].to_dict() for ticker in result}
                return jsonify(result_json)
                
            elif metric_type == 'cumulativereturncomparison':
                result = calculate_cumulative_return(stock_tickers, start_date, end_date)
                result_json = {ticker: result[ticker].to_dict() for ticker in result}
                return jsonify(result_json)
                
            elif metric_type == 'sortinoratiovisualization':
                result = calculate_sortino_ratio(stock_tickers, start_date, end_date, risk_free_rate)
                return jsonify(result)
                
            elif metric_type == 'marketcorrelationanalysis':
                result = calculate_correlation_with_market(stock_tickers, market_ticker, start_date, end_date)
                return jsonify(result)
                
            elif metric_type == 'sharperatiomatrix':
                result = calculate_sharpe_ratio(stock_tickers, start_date, end_date, risk_free_rate)
                return jsonify(result)
                
            elif metric_type == 'volatilityanalysis':
                result = calculate_volatility(stock_tickers, start_date, end_date)
                return jsonify(result)
                
            elif metric_type == 'valueatriskanalysis':
                result = calculate_value_at_risk(stock_tickers, start_date, end_date, confidence_level)
                return jsonify(result)
                
            elif metric_type == 'efficientfrontiervisualization':
                result = calculate_efficient_frontier(stock_tickers, start_date, end_date, risk_free_rate=risk_free_rate)
                return jsonify(result)

            else:
                return jsonify({"error": f"Unknown metric type: {metric_type}"}), 400
                
        except Exception as e:
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @app.route("/api/betaanalysis", methods=['GET'])
    def get_beta():
        betas = calculate_beta(stock_tickers, market_ticker, start_date, end_date)
        return jsonify(betas)

    @app.route("/api/alphacomparison", methods=['GET'])
    def get_alpha():
        benchmark_data = fetch_stock_data([market_ticker], start_date, end_date)
        benchmark_returns = benchmark_data.pct_change().dropna()[market_ticker]
        alphas = calculate_alpha(stock_tickers, benchmark_returns, start_date, end_date, risk_free_rate)
        return jsonify(alphas)

    @app.route("/api/maxdrawdownanalysis", methods=['GET'])
    def get_drawdown():
        drawdowns = calculate_drawdown(stock_tickers, start_date, end_date)
        drawdowns_json = {ticker: drawdowns[ticker].to_dict() for ticker in drawdowns}
        return jsonify(drawdowns_json)

    @app.route("/api/cumulativereturncomparison", methods=['GET'])
    def get_cumulative_return():
        cumulative_returns = calculate_cumulative_return(stock_tickers, start_date, end_date)
        cumulative_returns_json = {ticker: cumulative_returns[ticker].to_dict() for ticker in cumulative_returns}
        return jsonify(cumulative_returns_json)

    @app.route("/api/sortinoratiovisualization", methods=['GET'])
    def get_sortino_ratio():
        sortino_ratios = calculate_sortino_ratio(stock_tickers, start_date, end_date, risk_free_rate)
        return jsonify(sortino_ratios)

    @app.route("/api/marketcorrelationanalysis", methods=['GET'])
    def get_correlation():
        correlations = calculate_correlation_with_market(stock_tickers, market_ticker, start_date, end_date)
        correlations_json = {ticker: correlations[ticker].to_dict() for ticker in correlations}
        return jsonify(correlations_json)

    @app.route("/api/sharperatiomatrix", methods=['GET'])
    def get_sharpe_ratio():
        sharpe_ratios = calculate_sharpe_ratio(stock_tickers, start_date, end_date, risk_free_rate)
        return jsonify(sharpe_ratios)

    @app.route("/api/volatilityanalysis", methods=['GET'])
    def get_volatility():
        volatilities = calculate_volatility(stock_tickers, start_date, end_date)
        volatilities_json = {ticker: volatilities[ticker] for ticker in volatilities}
        return jsonify(volatilities_json)

    @app.route("/api/valueatriskanalysis", methods=['GET'])
    def get_value_at_risk():
        value_at_risk = calculate_value_at_risk(stock_tickers, start_date, end_date)
        value_at_risk_json = {ticker: value_at_risk[ticker] for ticker in value_at_risk}
        return jsonify(value_at_risk_json)

    @app.route("/api/efficientfrontiervisualization", methods=['GET'])
    def get_efficient_frontier():
        efficient_frontier = calculate_efficient_frontier(stock_tickers, start_date, end_date)
        return jsonify(efficient_frontier)


    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=8080)
