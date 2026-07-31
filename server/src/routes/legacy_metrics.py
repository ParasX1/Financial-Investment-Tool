from flask import Blueprint, jsonify


START_DATE = "2023-01-01"
END_DATE = "2024-01-01"
STOCK_TICKERS = ["AAPL", "GOOGL", "MSFT"]
MARKET_TICKER = "SPY"
RISK_FREE_RATE = 0.01


def create_legacy_metrics_blueprint(calculator_provider):
    blueprint = Blueprint("legacy_metrics", __name__)

    @blueprint.get("/api/betaanalysis")
    def get_beta():
        betas = calculator_provider("calculate_beta")(
            STOCK_TICKERS,
            MARKET_TICKER,
            START_DATE,
            END_DATE,
        )
        return jsonify(betas)

    @blueprint.get("/api/alphacomparison")
    def get_alpha():
        alphas = calculator_provider("calculate_alpha")(
            STOCK_TICKERS,
            MARKET_TICKER,
            START_DATE,
            END_DATE,
            RISK_FREE_RATE,
        )
        return jsonify(alphas)

    @blueprint.get("/api/maxdrawdownanalysis")
    def get_drawdown():
        drawdowns = calculator_provider("calculate_drawdown")(
            STOCK_TICKERS,
            START_DATE,
            END_DATE,
        )
        return jsonify({
            ticker: drawdown.to_dict()
            for ticker, drawdown in drawdowns.items()
        })

    @blueprint.get("/api/cumulativereturncomparison")
    def get_cumulative_return():
        cumulative_returns = calculator_provider(
            "calculate_cumulative_return"
        )(STOCK_TICKERS, START_DATE, END_DATE)
        return jsonify({
            ticker: cumulative_return.to_dict()
            for ticker, cumulative_return in cumulative_returns.items()
        })

    @blueprint.get("/api/sortinoratiovisualization")
    def get_sortino_ratio():
        sortino_ratios = calculator_provider("calculate_sortino_ratio")(
            STOCK_TICKERS,
            START_DATE,
            END_DATE,
            RISK_FREE_RATE,
        )
        return jsonify(sortino_ratios)

    @blueprint.get("/api/marketcorrelationanalysis")
    def get_correlation():
        correlations = calculator_provider(
            "calculate_correlation_with_market"
        )(STOCK_TICKERS, MARKET_TICKER, START_DATE, END_DATE)
        return jsonify(correlations)

    @blueprint.get("/api/sharperatiomatrix")
    def get_sharpe_ratio():
        sharpe_ratios = calculator_provider("calculate_sharpe_ratio")(
            STOCK_TICKERS,
            START_DATE,
            END_DATE,
            RISK_FREE_RATE,
        )
        return jsonify(sharpe_ratios)

    @blueprint.get("/api/volatilityanalysis")
    def get_volatility():
        volatilities = calculator_provider("calculate_volatility")(
            STOCK_TICKERS,
            START_DATE,
            END_DATE,
        )
        return jsonify({
            ticker: volatilities[ticker] for ticker in volatilities
        })

    @blueprint.get("/api/valueatriskanalysis")
    def get_value_at_risk():
        values_at_risk = calculator_provider(
            "calculate_value_at_risk"
        )(STOCK_TICKERS, START_DATE, END_DATE)
        return jsonify({
            ticker: values_at_risk[ticker] for ticker in values_at_risk
        })

    @blueprint.get("/api/efficientfrontiervisualization")
    def get_efficient_frontier():
        efficient_frontier = calculator_provider(
            "calculate_efficient_frontier"
        )(STOCK_TICKERS, START_DATE, END_DATE)
        return jsonify(efficient_frontier)

    return blueprint
