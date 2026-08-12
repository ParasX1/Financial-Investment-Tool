from datetime import date

import pandas as pd
import pytest

from src.top_picks.contracts import Ticker, TopPicksRequest
from src.top_picks.service import (
    DEFAULT_BENCHMARK_TICKER,
    DEFAULT_CACHE_TTL_SECONDS,
    DEFAULT_RISK_FREE_RATE,
    DEFAULT_UNIVERSE_LIMIT,
    TopPicksConfigurationError,
    TopPicksService,
)


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
