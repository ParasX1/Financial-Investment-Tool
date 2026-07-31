from datetime import date, datetime, timezone
import math
import re

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import traceback
from .metrics import (
    fetch_stock_data,
    normalize_tickers,
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


TICKER_PATTERN = re.compile(r"^[A-Z0-9^][A-Z0-9.^=-]{0,14}$")
MAX_STOCK_TICKERS = 5
MAX_PORTFOLIOS = 10000

METRIC_METHODS = {
    "betaanalysis": "Pairwise covariance divided by benchmark variance.",
    "alphacomparison": "Annualised arithmetic CAPM alpha using 252 trading days.",
    "maxdrawdownanalysis": "Adjusted close divided by its running peak, minus one.",
    "cumulativereturncomparison": "Adjusted-close return rebased to each symbol's first valid observation.",
    "sortinoratiovisualization": "Annualised excess return divided by full-sample downside deviation versus the daily target.",
    "marketcorrelationanalysis": "Mean of 21-trading-day rolling Pearson correlations.",
    "sharperatiomatrix": "Annualised arithmetic excess return divided by annualised sample volatility.",
    "volatilityanalysis": "Sample standard deviation of daily returns multiplied by square root of 252.",
    "valueatriskanalysis": "Positive magnitude of the selected lower-tail daily-return percentile.",
    "efficientfrontiervisualization": "Deterministic long-only Dirichlet allocation samples using annualised historical mean and covariance.",
}


def build_metric_response(metric_type, result, metric_request):
    requested = metric_request["stock_tickers"]
    if metric_type == "efficientfrontiervisualization":
        available = [
            symbol
            for symbol in result.get("asset_order", [])
            if symbol in requested
        ] if isinstance(result, dict) else []
    else:
        available = [
            symbol
            for symbol in requested
            if isinstance(result, dict) and symbol in result
        ]

    observations = {}
    actual_dates = []
    if isinstance(result, dict):
        for symbol in available:
            value = result.get(symbol)
            if metric_type in {
                "maxdrawdownanalysis",
                "cumulativereturncomparison",
            } and isinstance(value, dict):
                observations[symbol] = len(value)
                actual_dates.extend(str(item) for item in value.keys())
            elif (
                metric_type == "sortinoratiovisualization"
                and isinstance(value, dict)
                and isinstance(value.get("observations"), int)
            ):
                observations[symbol] = value["observations"]

    missing = [symbol for symbol in requested if symbol not in available]
    metadata = {
        "requestedSymbols": requested,
        "availableSymbols": available,
        "missingSymbols": missing,
        "observationsBySymbol": observations,
        "annualisationDays": 252,
        "priceField": "Adjusted Close, with Close fallback when unavailable",
        "method": METRIC_METHODS.get(metric_type, "Historical market-data calculation."),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "requestedStart": metric_request["start_date"],
        "requestedEnd": metric_request["end_date"],
        "endDateInclusive": True,
    }
    if actual_dates:
        metadata["actualStart"] = min(actual_dates)
        metadata["actualEnd"] = max(actual_dates)
    if metric_type in {
        "betaanalysis",
        "alphacomparison",
        "marketcorrelationanalysis",
    }:
        metadata["benchmark"] = metric_request["market_ticker"]

    return {
        "data": result,
        "metadata": metadata,
        "warnings": [
            f"No usable result for {symbol}."
            for symbol in missing
        ],
    }


class MetricRequestValidationError(ValueError):
    pass


def _validate_date(value, field_name):
    if not isinstance(value, str):
        raise MetricRequestValidationError(
            f"{field_name} must use YYYY-MM-DD format."
        )

    try:
        parsed_date = date.fromisoformat(value)
    except ValueError as error:
        raise MetricRequestValidationError(
            f"{field_name} must use YYYY-MM-DD format."
        ) from error

    if parsed_date.isoformat() != value:
        raise MetricRequestValidationError(
            f"{field_name} must use YYYY-MM-DD format."
        )
    return parsed_date


def _validate_number(value, field_name, minimum, maximum, inclusive=True):
    if (
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or not math.isfinite(value)
    ):
        raise MetricRequestValidationError(
            f"{field_name} must be a finite number."
        )

    if inclusive:
        is_in_range = minimum <= value <= maximum
    else:
        is_in_range = minimum < value < maximum
    if not is_in_range:
        raise MetricRequestValidationError(
            f"{field_name} is outside the supported range."
        )
    return value


def validate_metric_request(payload):
    if not isinstance(payload, dict):
        raise MetricRequestValidationError(
            "Request body must be a JSON object."
        )

    raw_tickers = payload.get("stock_tickers")
    if (
        not isinstance(raw_tickers, list)
        or any(not isinstance(ticker, str) for ticker in raw_tickers)
    ):
        raise MetricRequestValidationError(
            "stock_tickers must be a JSON array of ticker symbols."
        )

    stock_tickers = normalize_tickers(raw_tickers)
    if not 1 <= len(stock_tickers) <= MAX_STOCK_TICKERS:
        raise MetricRequestValidationError(
            "stock_tickers must contain between 1 and 5 unique tickers."
        )
    if any(not TICKER_PATTERN.fullmatch(ticker) for ticker in stock_tickers):
        raise MetricRequestValidationError(
            "stock_tickers contains an invalid ticker symbol."
        )

    start_date = payload.get("start_date", "2023-01-01")
    end_date = payload.get("end_date", "2024-01-01")
    parsed_start_date = _validate_date(start_date, "start_date")
    parsed_end_date = _validate_date(end_date, "end_date")
    if parsed_start_date >= parsed_end_date:
        raise MetricRequestValidationError(
            "start_date must be earlier than end_date."
        )

    raw_market_ticker = payload.get("market_ticker", "SPY")
    if not isinstance(raw_market_ticker, str):
        raise MetricRequestValidationError(
            "market_ticker must be a ticker symbol."
        )
    market_ticker = raw_market_ticker.strip().upper()
    if not TICKER_PATTERN.fullmatch(market_ticker):
        raise MetricRequestValidationError(
            "market_ticker contains an invalid ticker symbol."
        )

    risk_free_rate = _validate_number(
        payload.get("risk_free_rate", 0.01),
        "risk_free_rate",
        -1,
        1,
    )
    confidence_level = _validate_number(
        payload.get("confidence_level", 0.05),
        "confidence_level",
        0,
        1,
        inclusive=False,
    )

    num_portfolios = payload.get("num_portfolios", MAX_PORTFOLIOS)
    if (
        isinstance(num_portfolios, bool)
        or not isinstance(num_portfolios, int)
        or not 1 <= num_portfolios <= MAX_PORTFOLIOS
    ):
        raise MetricRequestValidationError(
            "num_portfolios must be an integer between 1 and 10000."
        )

    return {
        "stock_tickers": stock_tickers,
        "start_date": start_date,
        "end_date": end_date,
        "market_ticker": market_ticker,
        "risk_free_rate": risk_free_rate,
        "confidence_level": confidence_level,
        "num_portfolios": num_portfolios,
    }


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

    @app.route("/api/metrics/<metric_type>", methods=["POST"])
    def get_metric(metric_type):
        try:
            metric_request = validate_metric_request(
                request.get_json(silent=True)
            )
        except MetricRequestValidationError as error:
            return jsonify({"error": str(error)}), 400

        stock_tickers = metric_request["stock_tickers"]
        start_date = metric_request["start_date"]
        end_date = metric_request["end_date"]
        market_ticker = metric_request["market_ticker"]
        risk_free_rate = metric_request["risk_free_rate"]
        confidence_level = metric_request["confidence_level"]
        num_portfolios = metric_request["num_portfolios"]

        try:
            if metric_type == "betaanalysis":
                result = calculate_beta(
                    stock_tickers,
                    market_ticker,
                    start_date,
                    end_date,
                )
            elif metric_type == "alphacomparison":
                result = calculate_alpha(
                    stock_tickers,
                    market_ticker,
                    start_date,
                    end_date,
                    risk_free_rate,
                )
            elif metric_type == "maxdrawdownanalysis":
                calculation = calculate_drawdown(
                    stock_tickers,
                    start_date,
                    end_date,
                )
                result = {
                    ticker: series.to_dict()
                    for ticker, series in calculation.items()
                }
            elif metric_type == "cumulativereturncomparison":
                calculation = calculate_cumulative_return(
                    stock_tickers,
                    start_date,
                    end_date,
                )
                result = {
                    ticker: series.to_dict()
                    for ticker, series in calculation.items()
                }
            elif metric_type == "sortinoratiovisualization":
                result = calculate_sortino_ratio(
                    stock_tickers,
                    start_date,
                    end_date,
                    risk_free_rate,
                )
            elif metric_type == "marketcorrelationanalysis":
                result = calculate_correlation_with_market(
                    stock_tickers,
                    market_ticker,
                    start_date,
                    end_date,
                )
            elif metric_type == "sharperatiomatrix":
                result = calculate_sharpe_ratio(
                    stock_tickers,
                    start_date,
                    end_date,
                    risk_free_rate,
                )
            elif metric_type == "volatilityanalysis":
                result = calculate_volatility(
                    stock_tickers,
                    start_date,
                    end_date,
                )
            elif metric_type == "valueatriskanalysis":
                result = calculate_value_at_risk(
                    stock_tickers,
                    start_date,
                    end_date,
                    confidence_level,
                )
            elif metric_type == "efficientfrontiervisualization":
                result = calculate_efficient_frontier(
                    stock_tickers,
                    start_date,
                    end_date,
                    num_portfolios=num_portfolios,
                    risk_free_rate=risk_free_rate,
                )
            else:
                return jsonify({
                    "error": f"Unknown metric type: {metric_type}"
                }), 400

            return jsonify(build_metric_response(metric_type, result, metric_request))
        except Exception:
            traceback.print_exc()
            return jsonify({
                "error": "Metric calculation failed. Please try again."
            }), 500

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
