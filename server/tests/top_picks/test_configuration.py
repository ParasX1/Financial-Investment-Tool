from datetime import date

import pandas as pd
import pytest

from src.top_picks import configuration
from src.top_picks.contracts import Ticker, TopPicksRequest
from src.top_picks.service import (
    DEFAULT_BENCHMARK_TICKER,
    DEFAULT_CACHE_TTL_SECONDS,
    DEFAULT_RISK_FREE_RATE,
    DEFAULT_UNIVERSE_LIMIT,
    TopPicksConfigurationError,
    TopPicksService,
)
from src.top_picks.snapshot_cache import TopPicksSnapshotCache


@pytest.mark.parametrize("name,value,expected", [
    ("benchmark", " spy ", "SPY"),
    ("risk_free_rate", "0.025", 0.025),
    ("risk_free_rate", -1, -1.0),
    ("risk_free_rate", 1, 1.0),
    ("universe_limit", " 1000 ", 1000),
    ("cache_ttl", " 0 ", 0),
    ("cache_ttl", 86_400, 86_400),
    ("source", " Test source ", "Test source"),
    ("source", "x" * 121, "x" * 120),
    ("as_of", None, None),
    ("as_of", "2026-07-31", "2026-07-31"),
])
def test_public_configuration_validation_preserves_normalization(name, value, expected):
    assert getattr(configuration, f"normalize_{name}")(value) == expected


@pytest.mark.parametrize("name,value", [
    ("benchmark", None),
    ("benchmark", "bad ticker"),
    ("risk_free_rate", True),
    ("risk_free_rate", "NaN"),
    ("risk_free_rate", "Infinity"),
    ("risk_free_rate", 1.001),
    ("universe_limit", True),
    ("universe_limit", 1001),
    ("cache_ttl", True),
    ("cache_ttl", 86_401),
    ("source", "  "),
    ("as_of", "20260731"),
])
def test_public_configuration_validation_retains_bounded_errors(name, value):
    with pytest.raises(TopPicksConfigurationError):
        getattr(configuration, f"normalize_{name}")(value)


def test_refresh_setting_normalization_and_existing_imports_remain_compatible():
    from src.top_picks import service

    assert configuration.normalize_refresh_setting(" 5 ", "refresh interval", 5, 3600) == 5
    with pytest.raises(TopPicksConfigurationError):
        configuration.normalize_refresh_setting(True, "refresh interval", 5, 3600)
    assert service.TopPicksConfigurationError is configuration.TopPicksConfigurationError
    assert service.TopPicksSnapshotCache is TopPicksSnapshotCache


class RecordingTickerRepository:
    def __init__(self):
        self.limit = None

    def list_tickers(self, limit):
        self.limit = limit
        return (Ticker("BHP.AX", "BHP", "Materials"),)


def empty_calculator_provider(name):
    return lambda *args, **kwargs: {}


def test_service_defaults_are_product_consistent_and_explicit_in_metadata():
    repository = RecordingTickerRepository()
    service = TopPicksService(
        ticker_repository=repository,
        calculator_provider=empty_calculator_provider,
        market_data_provider=lambda *args: pd.DataFrame(),
        today_provider=lambda: date(2026, 7, 31),
    )

    response = service.get_page(TopPicksRequest(1, 25, "sharpe", "desc"))

    assert DEFAULT_BENCHMARK_TICKER == "^AXJO"
    assert DEFAULT_RISK_FREE_RATE == 0.0435
    assert DEFAULT_UNIVERSE_LIMIT == 1000
    assert DEFAULT_CACHE_TTL_SECONDS == 600
    assert repository.limit == 1000
    assert response["metadata"]["benchmark"] == "^AXJO"
    assert response["metadata"]["riskFreeRate"] == 0.0435
    assert response["metadata"]["universeLimit"] == 1000
    assert response["metadata"]["cacheTtlSeconds"] == 600
    assert response["metadata"]["assumptions"] == {
        "benchmark": "^AXJO",
        "riskFreeRateAnnual": 0.0435,
        "universeLimit": 1000,
        "window": "trailing_one_year",
    }


def test_service_accepts_bounded_injected_assumptions():
    repository = RecordingTickerRepository()
    service = TopPicksService(
        ticker_repository=repository,
        calculator_provider=empty_calculator_provider,
        market_data_provider=lambda *args: pd.DataFrame(),
        benchmark_ticker="SPY",
        risk_free_rate=0.025,
        universe_limit=12,
        today_provider=lambda: date(2026, 7, 31),
    )

    response = service.get_page(TopPicksRequest(1, 25, "sharpe", "desc"))

    assert repository.limit == 12
    assert response["metadata"]["assumptions"] == {
        "benchmark": "SPY",
        "riskFreeRateAnnual": 0.025,
        "universeLimit": 12,
        "window": "trailing_one_year",
    }
    assert response["metadata"]["riskFreeRateSource"] == (
        "Application configuration"
    )
    assert response["metadata"]["riskFreeRateAsOf"] is None


@pytest.mark.parametrize(
    "overrides",
    [
        {"benchmark_ticker": "bad ticker"},
        {"risk_free_rate": True},
        {"risk_free_rate": 2},
        {"universe_limit": 0},
        {"universe_limit": 1001},
        {"cache_ttl_seconds": True},
        {"cache_ttl_seconds": -1},
        {"cache_ttl_seconds": 86_401},
        {"refresh_interval_seconds": 4},
        {"refresh_interval_seconds": 3601},
        {"refresh_interval_seconds": True},
        {"max_subscribers": 0},
        {"max_subscribers": 1025},
        {"max_subscribers_per_client": 0},
        {"max_subscribers_per_client": 129},
        {"stream_lifetime_seconds": 29},
        {"stream_lifetime_seconds": 3601},
    ],
)
def test_service_rejects_invalid_assumptions(overrides):
    with pytest.raises(TopPicksConfigurationError):
        TopPicksService(
            ticker_repository=RecordingTickerRepository(),
            calculator_provider=empty_calculator_provider,
            market_data_provider=lambda *args: pd.DataFrame(),
            **overrides,
        )


def test_service_aggregates_partial_and_missing_metric_warnings():
    class ManyTickerRepository:
        def list_tickers(self, limit):
            return tuple(
                Ticker(f"T{index}", f"Ticker {index}", "Unknown")
                for index in range(15)
            )

    service = TopPicksService(
        ticker_repository=ManyTickerRepository(),
        calculator_provider=empty_calculator_provider,
        market_data_provider=lambda *args: pd.DataFrame(),
        today_provider=lambda: date(2026, 7, 31),
    )

    response = service.get_page(TopPicksRequest(1, 25, "sharpe", "desc"))

    assert response["warnings"] == [
        "No usable market data for 15 symbols: "
        "T0, T1, T2, T3, T4, T5, T6, T7, T8, T9, and 5 more."
    ]
