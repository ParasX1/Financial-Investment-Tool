import os

from flask import Flask
from flask_cors import CORS

from .analytics.calculator_registry import get_calculator
from .compat.legacy_metrics import (
    configure_legacy_metrics_compatibility,
    register_legacy_metrics_compatibility,
)
from .composition.top_picks import (
    configure_top_picks,
    create_top_picks_service_provider,
)
from .routes.legacy_stocks import create_legacy_stocks_blueprint
from .routes.market_data import create_market_data_blueprint
from .routes.metrics import create_metrics_blueprint
from .routes.top_picks import create_top_picks_blueprint


__all__ = ["create_app"]


def create_app(
    test_config=None,
    supabase_client=None,
    top_picks_service=None,
    calculator_provider=None,
    top_picks_service_factory=None,
):
    app = Flask(__name__)
    app.config.from_mapping(
        SUPABASE_URL=os.getenv("SUPABASE_URL"),
        SUPABASE_KEY=os.getenv("SUPABASE_KEY"),
    )
    configure_top_picks(app)
    configure_legacy_metrics_compatibility(app)
    app.config.from_prefixed_env()
    if test_config is not None:
        app.config.update(test_config)
    if supabase_client is not None:
        app.extensions["supabase"] = supabase_client
    if top_picks_service is not None:
        app.extensions["top_picks_service"] = top_picks_service

    resolved_calculator_provider = (
        get_calculator
        if calculator_provider is None
        else calculator_provider
    )
    top_picks_service_provider = create_top_picks_service_provider(
        resolved_calculator_provider,
        service_factory=top_picks_service_factory,
    )

    CORS(app)
    app.register_blueprint(
        create_metrics_blueprint(resolved_calculator_provider)
    )
    register_legacy_metrics_compatibility(
        app,
        resolved_calculator_provider,
    )
    app.register_blueprint(create_market_data_blueprint())
    app.register_blueprint(create_legacy_stocks_blueprint())
    app.register_blueprint(
        create_top_picks_blueprint(top_picks_service_provider)
    )
    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=8080)
