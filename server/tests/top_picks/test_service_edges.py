from datetime import date
from unittest.mock import Mock

import pandas as pd

from src.top_picks.contracts import Ticker, TopPicksRequest
from src.top_picks.service import TopPicksService


def test_empty_universe_returns_safe_empty_page_without_market_calls():
    repository = Mock()
    repository.list_tickers.return_value = ()
    calculator_provider = Mock(
        side_effect=AssertionError("calculators must not run")
    )
    market_data_provider = Mock(
        side_effect=AssertionError("market data must not run")
    )
    service = TopPicksService(
        ticker_repository=repository,
        calculator_provider=calculator_provider,
        market_data_provider=market_data_provider,
        today_provider=lambda: date(2026, 7, 31),
    )

    response = service.get_page(TopPicksRequest(1, 25, "sharpe", "desc"))

    repository.list_tickers.assert_called_once_with(1000)
    calculator_provider.assert_not_called()
    market_data_provider.assert_not_called()
    assert response["data"] == {"rows": [], "total": 0}
    assert response["warnings"] == ["No ticker universe is available."]


def test_injected_benchmark_and_rate_reach_market_calculations():
    repository = Mock()
    repository.list_tickers.return_value = (
        Ticker("BHP.AX", "BHP", "Materials"),
    )
    calls = []

    def calculator_provider(name):
        def calculate(*args, **kwargs):
            calls.append((name, args, kwargs))
            return {}

        return calculate

    market_calls = []
    information_calls = []

    def market_data_provider(*args):
        market_calls.append(args)
        return pd.DataFrame()

    def information_ratio_provider(*args):
        information_calls.append(args)
        return {}

    service = TopPicksService(
        ticker_repository=repository,
        calculator_provider=calculator_provider,
        market_data_provider=market_data_provider,
        information_ratio_provider=information_ratio_provider,
        benchmark_ticker="SPY",
        risk_free_rate=0.025,
        universe_limit=12,
        today_provider=lambda: date(2026, 7, 31),
    )

    service.get_page(TopPicksRequest(1, 25, "sharpe", "desc"))

    repository.list_tickers.assert_called_once_with(12)
    assert market_calls == [
        ((["BHP.AX", "SPY"], "2025-07-31", "2026-07-31"))
    ]
    assert information_calls[0][2] == "SPY"
    calls_by_name = {name: args for name, args, _ in calls}
    assert calls_by_name["calculate_cumulative_return"][0] == [
        "BHP.AX",
        "SPY",
    ]
    assert calls_by_name["calculate_drawdown"][0] == ["BHP.AX", "SPY"]
    assert calls_by_name["calculate_volatility"][0] == ["BHP.AX", "SPY"]
    assert calls_by_name["calculate_beta"][1] == "SPY"
    assert calls_by_name["calculate_alpha"][1] == "SPY"
    assert calls_by_name["calculate_alpha"][-1] == 0.025
    assert calls_by_name["calculate_sharpe_ratio"][-1] == 0.025
    assert calls_by_name["calculate_sortino_ratio"][-1] == 0.025
