from datetime import date

import pandas as pd

from src.top_picks.contracts import Ticker, TopPicksRequest
from src.top_picks.service import TopPicksService, sort_top_pick_rows


class FakeTickerRepository:
    def list_tickers(self, limit):
        return (
            Ticker("AAA", "Alpha Ltd", "Technology"),
            Ticker("BBB", "Beta Ltd", "Financials"),
            Ticker("CCC", "Gamma Ltd", "Industrials"),
        )[:limit]


def calculator_provider(name):
    results = {
        "calculate_cumulative_return": {
            "AAA": pd.Series([0.0, 0.25]),
            "BBB": pd.Series([0.0, 0.10]),
        },
        "calculate_sharpe_ratio": {"AAA": 1.2, "BBB": 1.2},
        "calculate_sortino_ratio": {
            "AAA": {"value": 1.8, "status": "ok", "observations": 250},
            "BBB": {
                "value": None,
                "status": "infinite",
                "observations": 250,
            },
        },
        "calculate_volatility": {"AAA": 0.22, "BBB": 0.18},
        "calculate_drawdown": {
            "AAA": pd.Series([0.0, -0.20, -0.05]),
            "BBB": pd.Series([0.0, -0.10]),
        },
        "calculate_beta": {"AAA": 1.05, "BBB": 0.85},
        "calculate_alpha": {"AAA": 0.04, "BBB": -0.01},
    }

    def calculate(*args, **kwargs):
        return results[name]

    return calculate


def create_service():
    return TopPicksService(
        ticker_repository=FakeTickerRepository(),
        calculator_provider=calculator_provider,
        market_data_provider=lambda *args: pd.DataFrame(),
        information_ratio_provider=lambda *args: {
            "AAA": 0.65,
            "BBB": 0.30,
        },
        observation_count_provider=lambda *args: {
            "AAA": 252,
            "BBB": 252,
        },
        today_provider=lambda: date(2026, 7, 31),
    )


def test_service_computes_decimal_metrics_and_stable_pagination():
    response = create_service().get_page(
        TopPicksRequest(
            page=1,
            page_size=2,
            sort_key="sharpe",
            sort_dir="desc",
        )
    )

    assert response["data"]["total"] == 3
    assert [row["symbol"] for row in response["data"]["rows"]] == [
        "AAA",
        "BBB",
    ]
    assert response["data"]["rows"][0] == {
        "symbol": "AAA",
        "name": "Alpha Ltd",
        "industry": "Technology",
        "ret1y": 0.25,
        "sharpe": 1.2,
        "sortino": 1.8,
        "volatility": 0.22,
        "maxDD": -0.2,
        "beta": 1.05,
        "alpha": 0.04,
        "infoRatio": 0.65,
        "metricStatus": {"sortino": "ok"},
    }
    assert response["metadata"]["units"] == {
        "ret1y": "decimal_return",
        "sharpe": "ratio",
        "sortino": "ratio",
        "volatility": "decimal_annualized",
        "maxDD": "decimal_drawdown",
        "beta": "ratio",
        "alpha": "decimal_annualized",
        "infoRatio": "ratio",
    }
    assert response["metadata"]["requestedStart"] == "2025-07-31"
    assert response["metadata"]["requestedEnd"] == "2026-07-31"
    assert response["warnings"] == [
        "No usable market data for 1 symbol: CCC.",
    ]


def test_service_keeps_missing_sort_values_last_in_both_directions():
    rows = [
        {"symbol": "AAA", "sharpe": 1.0},
        {"symbol": "BBB", "sharpe": None},
        {"symbol": "CCC", "sharpe": 0.5},
        {"symbol": "DDD", "sharpe": None},
    ]

    ascending = sort_top_pick_rows(rows, "sharpe", "asc")
    descending = sort_top_pick_rows(rows, "sharpe", "desc")

    assert [row["symbol"] for row in ascending] == [
        "CCC",
        "AAA",
        "BBB",
        "DDD",
    ]
    assert [row["symbol"] for row in descending] == [
        "AAA",
        "CCC",
        "BBB",
        "DDD",
    ]


def test_service_paginates_after_sorting_the_whole_universe():
    response = create_service().get_page(
        TopPicksRequest(
            page=2,
            page_size=2,
            sort_key="ret1y",
            sort_dir="desc",
        )
    )

    assert [row["symbol"] for row in response["data"]["rows"]] == [
        "CCC"
    ]
    assert response["data"]["total"] == 3


def test_service_reuses_cached_snapshot_across_sort_and_page_requests():
    class CountingTickerRepository:
        def __init__(self):
            self.calls = 0

        def list_tickers(self, limit):
            self.calls += 1
            return FakeTickerRepository().list_tickers(limit)

    calls = []

    def counting_calculator_provider(name):
        calls.append(name)
        return calculator_provider(name)

    repository = CountingTickerRepository()
    service = TopPicksService(
        ticker_repository=repository,
        calculator_provider=counting_calculator_provider,
        market_data_provider=lambda *args: pd.DataFrame(),
        information_ratio_provider=lambda *args: {
            "AAA": 0.65,
            "BBB": 0.30,
        },
        observation_count_provider=lambda *args: {
            "AAA": 252,
            "BBB": 252,
        },
        today_provider=lambda: date(2026, 7, 31),
    )

    first = service.get_page(TopPicksRequest(1, 2, "sharpe", "desc"))
    second = service.get_page(TopPicksRequest(2, 2, "ret1y", "asc"))

    assert repository.calls == 1
    assert calls.count("calculate_sharpe_ratio") == 1
    assert first["metadata"]["cacheStatus"] == "miss"
    assert second["metadata"]["cacheStatus"] == "hit"
    assert second["metadata"]["sortKey"] == "ret1y"
    assert second["metadata"]["page"] == 2


def test_service_can_disable_snapshot_cache_with_zero_ttl():
    class CountingTickerRepository:
        def __init__(self):
            self.calls = 0

        def list_tickers(self, limit):
            self.calls += 1
            return FakeTickerRepository().list_tickers(limit)

    repository = CountingTickerRepository()
    service = TopPicksService(
        ticker_repository=repository,
        calculator_provider=calculator_provider,
        market_data_provider=lambda *args: pd.DataFrame(),
        information_ratio_provider=lambda *args: {
            "AAA": 0.65,
            "BBB": 0.30,
        },
        observation_count_provider=lambda *args: {
            "AAA": 252,
            "BBB": 252,
        },
        cache_ttl_seconds=0,
        today_provider=lambda: date(2026, 7, 31),
    )

    service.get_page(TopPicksRequest(1, 2, "sharpe", "desc"))
    service.get_page(TopPicksRequest(1, 2, "sharpe", "desc"))

    assert repository.calls == 2
