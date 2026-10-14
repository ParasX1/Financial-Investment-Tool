"""Short-window metadata and gates describe the exact calculated sample."""

from unittest.mock import Mock

import pandas as pd
import pytest

from src.top_picks.contracts import Ticker
from src.top_picks.service import TopPicksService


def snapshot(values, window):
    frame = pd.DataFrame({("AAA", "Adj Close"): values}, index=pd.date_range(
        "2025-01-02", periods=len(values), freq="B"))
    service = TopPicksService(
        ticker_repository=Mock(), calculator_provider=Mock(),
        market_data_provider=Mock(),
    )
    return service._build_snapshot(
        "2025-01-01", "2025-12-31", window,
        tickers=[Ticker("AAA", "Alpha", "Technology")], market_data=frame,
    )


@pytest.mark.parametrize("window,count,expected_return", [
    ("1D", 1, 1 / 148), ("1W", 5, 5 / 144), ("1M", 21, 21 / 128),
])
def test_complete_short_window_reports_its_own_sample(window, count, expected_return):
    result = snapshot(list(range(100, 150)), window)
    assert result["metadata"]["observationsBySymbol"] == {"AAA": count}
    row = result["rows"][0]
    assert row["ret1y"] == pytest.approx(expected_return)
    if window != "1D":
        assert row["volatility"] is not None
        assert row["maxDD"] == 0
    else:
        assert row["volatility"] is None


@pytest.mark.parametrize("window,values,count,return_available,volatility_available", [
    ("1D", [100, 110, None, 120], 0, False, False),
    ("1W", [50, 55, 100, 110, None, 99, 118.8, 95.04], 4, True, True),
    ("1W", [100, None, 110, None, 120, None, 130], 0, False, False),
    ("1M", [100, 110, 121], 2, True, False),
    ("1M", [100, None, 110, 121], 1, False, False),
])
def test_short_window_counts_missing_endpoints_and_preserves_sample_gates(
    window, values, count, return_available, volatility_available,
):
    result = snapshot(values, window)
    assert result["metadata"]["observationsBySymbol"] == {"AAA": count}
    row = result["rows"][0]
    assert (row["ret1y"] is not None) is return_available
    assert (row["volatility"] is not None) is volatility_available
