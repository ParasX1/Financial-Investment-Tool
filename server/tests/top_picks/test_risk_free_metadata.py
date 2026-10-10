from datetime import date

import pandas as pd

from src.top_picks.contracts import TopPicksRequest
from src.top_picks.service import (
    DEFAULT_RISK_FREE_RATE,
    DEFAULT_RISK_FREE_RATE_AS_OF,
    DEFAULT_RISK_FREE_RATE_SOURCE,
    TopPicksService,
)


class EmptyTickerRepository:
    def list_tickers(self, limit):
        return ()


def test_default_risk_free_assumption_discloses_rba_source_and_date():
    service = TopPicksService(
        ticker_repository=EmptyTickerRepository(),
        calculator_provider=lambda name: lambda *args: {},
        market_data_provider=lambda *args: pd.DataFrame(),
        today_provider=lambda: date(2026, 7, 31),
    )

    response = service.get_page(TopPicksRequest(1, 25, "sharpe", "desc"))

    assert DEFAULT_RISK_FREE_RATE == 0.0435
    assert DEFAULT_RISK_FREE_RATE_SOURCE == "RBA cash rate target"
    assert DEFAULT_RISK_FREE_RATE_AS_OF == "2026-06-17"
    assert response["metadata"]["riskFreeRate"] == 0.0435
    assert response["metadata"]["riskFreeRateSource"] == (
        "RBA cash rate target"
    )
    assert response["metadata"]["riskFreeRateAsOf"] == "2026-06-17"
    assert response["metadata"]["assumptions"]["riskFreeRateAnnual"] == (
        0.0435
    )
