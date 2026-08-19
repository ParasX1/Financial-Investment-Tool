import os

from ..metrics import fetch_stock_data
from ..supabase_client import get_supabase_client
from ..top_picks.repository import SupabaseTickerRepository
from ..top_picks.service import (
    DEFAULT_BENCHMARK_TICKER,
    DEFAULT_CACHE_TTL_SECONDS,
    DEFAULT_RISK_FREE_RATE,
    DEFAULT_RISK_FREE_RATE_AS_OF,
    DEFAULT_RISK_FREE_RATE_SOURCE,
    DEFAULT_UNIVERSE_LIMIT,
    TopPicksSnapshotCache,
    TopPicksService,
)


PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..")
)
DEFAULT_TOP_PICKS_CACHE_PATH = os.path.join(
    PROJECT_ROOT,
    "server",
    ".cache",
    "top-picks-snapshot-cache.json",
)


def configure_top_picks(app, environ=None):
    environment = os.environ if environ is None else environ
    app.config.from_mapping(
        TOP_PICKS_BENCHMARK=environment.get(
            "TOP_PICKS_BENCHMARK",
            DEFAULT_BENCHMARK_TICKER,
        ),
        TOP_PICKS_RISK_FREE_RATE=environment.get(
            "TOP_PICKS_RISK_FREE_RATE",
            DEFAULT_RISK_FREE_RATE,
        ),
        TOP_PICKS_RISK_FREE_RATE_SOURCE=environment.get(
            "TOP_PICKS_RISK_FREE_RATE_SOURCE",
            DEFAULT_RISK_FREE_RATE_SOURCE,
        ),
        TOP_PICKS_RISK_FREE_RATE_AS_OF=environment.get(
            "TOP_PICKS_RISK_FREE_RATE_AS_OF",
            DEFAULT_RISK_FREE_RATE_AS_OF,
        ),
        TOP_PICKS_UNIVERSE_LIMIT=environment.get(
            "TOP_PICKS_UNIVERSE_LIMIT",
            DEFAULT_UNIVERSE_LIMIT,
        ),
        TOP_PICKS_CACHE_TTL_SECONDS=environment.get(
            "TOP_PICKS_CACHE_TTL_SECONDS",
            DEFAULT_CACHE_TTL_SECONDS,
        ),
        TOP_PICKS_CACHE_PATH=environment.get(
            "TOP_PICKS_CACHE_PATH",
            DEFAULT_TOP_PICKS_CACHE_PATH,
        ),
    )


def create_top_picks_service_provider(
    calculator_provider,
    service_factory=None,
    ticker_repository_factory=None,
    supabase_client_provider=None,
    market_data_provider=None,
):
    resolved_service_factory = (
        TopPicksService if service_factory is None else service_factory
    )
    resolved_repository_factory = (
        SupabaseTickerRepository
        if ticker_repository_factory is None
        else ticker_repository_factory
    )
    resolved_supabase_provider = (
        get_supabase_client
        if supabase_client_provider is None
        else supabase_client_provider
    )
    resolved_market_data_provider = (
        fetch_stock_data
        if market_data_provider is None
        else market_data_provider
    )

    def get_service(app):
        existing_service = app.extensions.get("top_picks_service")
        if existing_service is not None:
            return existing_service

        service = resolved_service_factory(
            ticker_repository=resolved_repository_factory(
                resolved_supabase_provider(app)
            ),
            calculator_provider=calculator_provider,
            market_data_provider=resolved_market_data_provider,
            benchmark_ticker=app.config["TOP_PICKS_BENCHMARK"],
            risk_free_rate=app.config["TOP_PICKS_RISK_FREE_RATE"],
            risk_free_rate_source=app.config[
                "TOP_PICKS_RISK_FREE_RATE_SOURCE"
            ],
            risk_free_rate_as_of=app.config[
                "TOP_PICKS_RISK_FREE_RATE_AS_OF"
            ],
            universe_limit=app.config["TOP_PICKS_UNIVERSE_LIMIT"],
            cache_ttl_seconds=app.config["TOP_PICKS_CACHE_TTL_SECONDS"],
            snapshot_cache=TopPicksSnapshotCache(
                persistence_path=app.config["TOP_PICKS_CACHE_PATH"],
            ),
        )
        app.extensions["top_picks_service"] = service
        return service

    return get_service
