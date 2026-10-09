import os
from threading import RLock

from ..metrics import clear_stock_data_cache, fetch_stock_data
from ..supabase_client import get_supabase_client
from ..top_picks.batch_analytics import calculate_yearly_metrics
from ..top_picks.bootstrap import bootstrap_top_picks_cache, create_seed_archive
from ..top_picks.history import TopPicksHistoryProvider
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
    _normalize_cache_ttl,
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
DEFAULT_TOP_PICKS_SEED_PATH = os.path.join(PROJECT_ROOT, "data", "top-picks-seed.zip")


def _is_default_cache_path(path, default):
    return bool(path) and os.path.normcase(os.path.realpath(path)) == os.path.normcase(
        os.path.realpath(default)
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
        TOP_PICKS_HISTORY_PATH=environment.get("TOP_PICKS_HISTORY_PATH"),
        TOP_PICKS_SEED_PATH=environment.get("TOP_PICKS_SEED_PATH"),
        TOP_PICKS_SEED_SYNC=environment.get("TOP_PICKS_SEED_SYNC", "true"),
    )


def create_top_picks_service_provider(
    calculator_provider,
    service_factory=None,
    ticker_repository_factory=None,
    supabase_client_provider=None,
    market_data_provider=None,
    market_cache_clearer=None,
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
    resolved_market_cache_clearer = (
        clear_stock_data_cache
        if market_cache_clearer is None
        else market_cache_clearer
    )

    service_creation_lock = RLock()

    def get_service_locked(app):
        existing_service = app.extensions.get("top_picks_service")
        if existing_service is not None:
            return existing_service

        snapshot_path = app.config["TOP_PICKS_CACHE_PATH"]
        history_path = app.config.get("TOP_PICKS_HISTORY_PATH")
        if history_path is None:
            history_path = f"{snapshot_path}.history.sqlite3" if snapshot_path else None
        # Validate the external dependency before writing any initial files.
        supabase = resolved_supabase_provider(app)
        configured_seed = app.config.get("TOP_PICKS_SEED_PATH")
        if configured_seed != "":
            automatic_seed = configured_seed is None
            seed_snapshot_path = snapshot_path
            seed_history_path = history_path if market_data_provider is None else None
            if automatic_seed:
                if not _is_default_cache_path(snapshot_path, DEFAULT_TOP_PICKS_CACHE_PATH):
                    seed_snapshot_path = None
                if not _is_default_cache_path(
                    history_path, f"{DEFAULT_TOP_PICKS_CACHE_PATH}.history.sqlite3",
                ):
                    seed_history_path = None
            bootstrap_top_picks_cache(
                DEFAULT_TOP_PICKS_SEED_PATH if automatic_seed else configured_seed,
                seed_snapshot_path,
                seed_history_path,
                benchmark_ticker=app.config["TOP_PICKS_BENCHMARK"],
                risk_free_rate=app.config["TOP_PICKS_RISK_FREE_RATE"],
                universe_limit=app.config["TOP_PICKS_UNIVERSE_LIMIT"],
                cache_ttl_seconds=app.config["TOP_PICKS_CACHE_TTL_SECONDS"],
            )
        history_provider = (
            TopPicksHistoryProvider(resolved_market_data_provider, history_path)
            if market_data_provider is None else resolved_market_data_provider
        )

        round_complete_callback = None
        if (not app.testing and market_data_provider is None
                and str(app.config["TOP_PICKS_SEED_SYNC"]).strip().lower()
                in {"true", "1", "yes", "on"}
                and _is_default_cache_path(snapshot_path, DEFAULT_TOP_PICKS_CACHE_PATH)
                and _is_default_cache_path(
                    history_path, f"{DEFAULT_TOP_PICKS_CACHE_PATH}.history.sqlite3",
                )
                and _normalize_cache_ttl(app.config["TOP_PICKS_CACHE_TTL_SECONDS"]) > 0):
            def update_seed_archive():
                create_seed_archive(snapshot_path, history_path, DEFAULT_TOP_PICKS_SEED_PATH)

            round_complete_callback = update_seed_archive

        service = resolved_service_factory(
            ticker_repository=resolved_repository_factory(
                supabase
            ),
            calculator_provider=calculator_provider,
            yearly_metrics_provider=calculate_yearly_metrics,
            market_data_provider=history_provider,
            market_cache_clearer=resolved_market_cache_clearer,
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
            round_complete_callback=round_complete_callback,
        )
        app.extensions["top_picks_service"] = service
        return service

    def get_service(app):
        with service_creation_lock:
            return get_service_locked(app)

    return get_service
