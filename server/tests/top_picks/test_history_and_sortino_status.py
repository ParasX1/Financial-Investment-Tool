from datetime import date

import pandas as pd

from src.top_picks.contracts import Ticker, TopPicksRequest
from src.top_picks.service import (
    MIN_TRAILING_RETURN_OBSERVATIONS,
    TopPicksService,
)


class StaticTickerRepository:
    def __init__(self, tickers):
        self.tickers = tickers

    def list_tickers(self, limit):
        return tuple(self.tickers[:limit])


def full_calculator_provider(sortino_results):
    def provider(name):
        results = {
            "calculate_cumulative_return": {
                "AAA": pd.Series([0.0, 0.2]),
                "BBB": pd.Series([0.0, 0.1]),
            },
            "calculate_sharpe_ratio": {"AAA": 1.0, "BBB": 0.8},
            "calculate_sortino_ratio": sortino_results,
            "calculate_volatility": {"AAA": 0.2, "BBB": 0.18},
            "calculate_drawdown": {
                "AAA": pd.Series([0.0, -0.2]),
                "BBB": pd.Series([0.0, -0.1]),
            },
            "calculate_beta": {"AAA": 1.0, "BBB": 0.9},
            "calculate_alpha": {"AAA": 0.03, "BBB": 0.02},
        }
        return lambda *args, **kwargs: results[name]

    return provider


def test_short_history_symbol_is_not_presented_as_one_year_candidate():
    service = TopPicksService(
        ticker_repository=StaticTickerRepository([
            Ticker("AAA", "Alpha", "Technology")
        ]),
        calculator_provider=full_calculator_provider({
            "AAA": {"value": 2.0, "status": "ok", "observations": 21}
        }),
        market_data_provider=lambda *args: pd.DataFrame(),
        information_ratio_provider=lambda *args: {"AAA": 0.5},
        observation_count_provider=lambda *args: {"AAA": 21},
        today_provider=lambda: date(2026, 7, 31),
    )

    response = service.get_page(TopPicksRequest(1, 25, "sharpe", "desc"))

    row = response["data"]["rows"][0]
    assert MIN_TRAILING_RETURN_OBSERVATIONS == 200
    assert all(
        row[key] is None
        for key in (
            "ret1y",
            "sharpe",
            "sortino",
            "volatility",
            "maxDD",
            "beta",
            "alpha",
            "infoRatio",
        )
    )
    assert response["metadata"]["observationsBySymbol"] == {"AAA": 21}
    assert response["warnings"] == [
        "Insufficient trailing history for 1 symbol: AAA."
    ]


def test_unbounded_sortino_is_preserved_sorted_and_not_warned_as_missing():
    service = TopPicksService(
        ticker_repository=StaticTickerRepository([
            Ticker("AAA", "Alpha", "Technology"),
            Ticker("BBB", "Beta", "Financials"),
        ]),
        calculator_provider=full_calculator_provider({
            "AAA": {
                "value": None,
                "status": "infinite",
                "observations": 252,
            },
            "BBB": {"value": 3.0, "status": "ok", "observations": 252},
        }),
        market_data_provider=lambda *args: pd.DataFrame(),
        information_ratio_provider=lambda *args: {"AAA": 0.5, "BBB": 0.4},
        observation_count_provider=lambda *args: {"AAA": 252, "BBB": 252},
        today_provider=lambda: date(2026, 7, 31),
    )

    response = service.get_page(TopPicksRequest(1, 25, "sortino", "desc"))

    rows = response["data"]["rows"]
    assert [row["symbol"] for row in rows] == ["AAA", "BBB"]
    assert rows[0]["sortino"] is None
    assert rows[0]["metricStatus"]["sortino"] == "infinite"
    assert rows[1]["metricStatus"]["sortino"] == "ok"
    assert response["warnings"] == []
