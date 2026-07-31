import os

from flask import Flask
from flask_cors import CORS

from .analytics.metric_contract import (
    METRIC_METHODS,
    MAX_PORTFOLIOS,
    MAX_STOCK_TICKERS,
    TICKER_PATTERN,
    MetricRequestValidationError,
    build_metric_response,
    validate_metric_request,
)
from .metrics import (
    calculate_alpha,
    calculate_beta,
    calculate_correlation_with_market,
    calculate_cumulative_return,
    calculate_drawdown,
    calculate_efficient_frontier,
    calculate_sharpe_ratio,
    calculate_sortino_ratio,
    calculate_value_at_risk,
    calculate_volatility,
    fetch_stock_data,
    normalize_tickers,
)
from .routes.legacy_metrics import create_legacy_metrics_blueprint
from .routes.legacy_stocks import create_legacy_stocks_blueprint
from .routes.market_data import create_market_data_blueprint
from .routes.metrics import create_metrics_blueprint


__all__ = [
    "METRIC_METHODS",
    "MAX_PORTFOLIOS",
    "MAX_STOCK_TICKERS",
    "TICKER_PATTERN",
    "MetricRequestValidationError",
    "build_metric_response",
    "calculate_alpha",
    "calculate_beta",
    "calculate_correlation_with_market",
    "calculate_cumulative_return",
    "calculate_drawdown",
    "calculate_efficient_frontier",
    "calculate_sharpe_ratio",
    "calculate_sortino_ratio",
    "calculate_value_at_risk",
    "calculate_volatility",
    "create_app",
    "fetch_stock_data",
    "normalize_tickers",
    "validate_metric_request",
]


def _get_calculator(calculator_name):
    """Resolve server exports late so existing test patches keep working."""
    return globals()[calculator_name]


def create_app(test_config=None, supabase_client=None):
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
    app.register_blueprint(create_metrics_blueprint(_get_calculator))
    app.register_blueprint(
        create_legacy_metrics_blueprint(_get_calculator)
    )
    app.register_blueprint(create_market_data_blueprint())
    app.register_blueprint(create_legacy_stocks_blueprint())
    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=8080)
