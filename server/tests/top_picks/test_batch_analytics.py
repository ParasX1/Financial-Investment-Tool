"""Parity with the established calculators, including their gap semantics."""

from unittest.mock import Mock

import numpy as np
import pandas as pd
import pytest

from src import metrics
from src.analytics.calculator_registry import get_calculator
from src.top_picks.batch_analytics import calculate_yearly_metrics
from src.top_picks.service import METRIC_KEYS, TopPicksService


def market_frame(count=260, assets=8):
    random = np.random.default_rng(42)
    values = 100 * np.cumprod(
        1 + random.normal(0.0005, 0.012, (count, assets + 1)), axis=0,
    )
    columns = [f"S{index}" for index in range(assets)] + ["SPY"]
    prices = pd.DataFrame(
        values, index=pd.date_range("2025-01-01", periods=count, freq="B"),
        columns=columns,
    )
    return pd.concat({symbol: prices[[symbol]].rename(
        columns={symbol: "Adj Close"},
    ) for symbol in columns}, axis=1)


def make_service(frame, optimized=False):
    return TopPicksService(
        ticker_repository=Mock(), calculator_provider=get_calculator,
        market_data_provider=Mock(return_value=frame), benchmark_ticker="SPY",
        yearly_metrics_provider=calculate_yearly_metrics if optimized else None,
    )


@pytest.mark.parametrize("count", [0, 1, 2, 3, 20, 21, 22, 200, 260])
@pytest.mark.parametrize("scenario", ["complete", "gaps", "constant", "missing_benchmark"])
def test_yearly_batch_matches_existing_calculators(monkeypatch, count, scenario):
    frame = market_frame(count)
    if scenario == "gaps":
        frame.iloc[::7, 0] = np.nan
        frame.iloc[:min(count, 30), 1] = np.nan
        frame.iloc[::11, -1] = np.nan
        frame.iloc[:, 2] = np.nan
    elif scenario == "constant":
        frame.iloc[:, 0] = 100.0
        frame.iloc[:, -1] = 100.0
        frame.iloc[:, 1] = 100 * 1.001 ** np.arange(count)
    elif scenario == "missing_benchmark":
        frame = frame.drop(columns="SPY", level=0)
    original = frame.copy(deep=True)
    monkeypatch.setattr(metrics, "fetch_stock_data",
                        lambda *a, **kw: frame.copy(deep=True))
    symbols = [f"S{index}" for index in range(8)] + ["ABSENT", "SPY"]
    expected, expected_status, expected_counts = make_service(frame)._calculate_metric_maps(
        symbols, "2025-01-01", "2026-01-01", "1Y",
    )
    actual, statuses, counts = calculate_yearly_metrics(
        frame, symbols, "SPY", 0.0435)
    assert counts == expected_counts
    assert statuses == expected_status
    for metric in METRIC_KEYS:
        for symbol in symbols:
            left, right = actual[metric].get(
                symbol), expected[metric].get(symbol)
            if right is None or not np.isfinite(right):
                assert left is None, (metric, symbol)
            else:
                assert left == pytest.approx(
                    right, rel=1e-10, abs=1e-12), (metric, symbol)
    pd.testing.assert_frame_equal(frame, original)


def test_yearly_batch_reuses_one_download_without_calling_individual_calculators():
    service = make_service(market_frame(), optimized=True)
    service._calculator_provider = Mock(
        side_effect=AssertionError("redundant calculator"))
    service._observation_count_provider = Mock(
        side_effect=AssertionError("redundant returns"))
    result, _, counts = service._calculate_metric_maps(
        ["S0", "S1"], "2025-01-01", "2026-01-01", "1Y",
    )
    service._market_data_provider.assert_called_once_with(
        ["S0", "S1", "SPY"], "2025-01-01", "2026-01-01",
    )
    assert all("S0" in result[key] for key in METRIC_KEYS)
    assert counts == {"S0": 259, "S1": 259}


def test_field_first_columns_and_close_fallback_match():
    frame = market_frame()
    expected = calculate_yearly_metrics(frame, ["S0", "S1"], "SPY", 0.0435)
    field_first = frame.swaplevel(axis=1)
    assert calculate_yearly_metrics(
        field_first, ["S0", "S1"], "SPY", 0.0435) == expected
    close_only = frame.rename(columns={"Adj Close": "Close"}, level=1)
    assert calculate_yearly_metrics(
        close_only, ["S0", "S1"], "SPY", 0.0435) == expected
