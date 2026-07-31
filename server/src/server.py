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
from .routes.top_picks import create_top_picks_blueprint
from .supabase_client import get_supabase_client
from .top_picks.repository import SupabaseTickerRepository
from .top_picks.service import (
    DEFAULT_BENCHMARK_TICKER,
    DEFAULT_RISK_FREE_RATE,
    DEFAULT_RISK_FREE_RATE_AS_OF,
    DEFAULT_RISK_FREE_RATE_SOURCE,
    DEFAULT_UNIVERSE_LIMIT,
    TopPicksService,
)


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


def _get_top_picks_service(app):
    existing_service = app.extensions.get("top_picks_service")
    if existing_service is not None:
        return existing_service

    service = TopPicksService(
        ticker_repository=SupabaseTickerRepository(
            get_supabase_client(app)
        ),
        calculator_provider=_get_calculator,
        market_data_provider=lambda tickers, start_date, end_date: (
            fetch_stock_data(tickers, start_date, end_date)
        ),
        benchmark_ticker=app.config["TOP_PICKS_BENCHMARK"],
        risk_free_rate=app.config["TOP_PICKS_RISK_FREE_RATE"],
        risk_free_rate_source=app.config[
            "TOP_PICKS_RISK_FREE_RATE_SOURCE"
        ],
        risk_free_rate_as_of=app.config[
            "TOP_PICKS_RISK_FREE_RATE_AS_OF"
        ],
        universe_limit=app.config["TOP_PICKS_UNIVERSE_LIMIT"],
    )
    app.extensions["top_picks_service"] = service
    return service


def create_app(
    test_config=None,
    supabase_client=None,
    top_picks_service=None,
):
    app = Flask(__name__)
    app.config.from_mapping(
        SUPABASE_URL=os.getenv("SUPABASE_URL"),
        SUPABASE_KEY=os.getenv("SUPABASE_KEY"),
        TOP_PICKS_BENCHMARK=os.getenv(
            "TOP_PICKS_BENCHMARK",
            DEFAULT_BENCHMARK_TICKER,
        ),
        TOP_PICKS_RISK_FREE_RATE=os.getenv(
            "TOP_PICKS_RISK_FREE_RATE",
            DEFAULT_RISK_FREE_RATE,
        ),
        TOP_PICKS_RISK_FREE_RATE_SOURCE=os.getenv(
            "TOP_PICKS_RISK_FREE_RATE_SOURCE",
            DEFAULT_RISK_FREE_RATE_SOURCE,
        ),
        TOP_PICKS_RISK_FREE_RATE_AS_OF=os.getenv(
            "TOP_PICKS_RISK_FREE_RATE_AS_OF",
            DEFAULT_RISK_FREE_RATE_AS_OF,
        ),
        TOP_PICKS_UNIVERSE_LIMIT=os.getenv(
            "TOP_PICKS_UNIVERSE_LIMIT",
            DEFAULT_UNIVERSE_LIMIT,
        ),
    )
    app.config.from_prefixed_env()
    if test_config is not None:
        app.config.update(test_config)
    if supabase_client is not None:
        app.extensions["supabase"] = supabase_client
    if top_picks_service is not None:
        app.extensions["top_picks_service"] = top_picks_service

    CORS(app)
    app.register_blueprint(create_metrics_blueprint(_get_calculator))
    app.register_blueprint(
        create_legacy_metrics_blueprint(_get_calculator)
    )
    app.register_blueprint(create_market_data_blueprint())
    app.register_blueprint(create_legacy_stocks_blueprint())
    app.register_blueprint(
        create_top_picks_blueprint(_get_top_picks_service)
    )
    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=8080)
