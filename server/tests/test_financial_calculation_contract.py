"""Independent numerical fixtures for the shared price/return policy."""

import math

import numpy as np
import pandas as pd
import pytest

from src import metrics
from src.market_primitives import calculate_returns, get_adjusted_close_prices
from src.top_picks.analytics import count_return_observations
from src.top_picks.batch_analytics import calculate_yearly_metrics
from src.top_picks.service import TopPicksService


def market_frame(values, dates=None):
    dates = dates if dates is not None else pd.date_range(
        "2025-01-02", periods=len(next(iter(values.values()))), freq="B")
    return pd.concat({symbol: pd.DataFrame({"Adj Close": prices}, index=dates)
                      for symbol, prices in values.items()}, axis=1)


@pytest.mark.parametrize("missing", [None, "bad", 0, -1, np.inf, -np.inf])
def test_missing_endpoint_is_never_bridged_by_daily_statistics(monkeypatch, missing):
    frame = market_frame({"AAA": [100, 110, missing, 99, 118.8, 95.04]})
    monkeypatch.setattr(metrics, "fetch_stock_data", lambda *args, **kwargs: frame)
    # Only 100 -> 110, 99 -> 118.8 and 118.8 -> 95.04 are adjacent
    # supplied observations. Their returns are 10%, 20%, and -20%.
    expected_volatility = math.sqrt(10.92)
    expected_sortino = 8.4 / math.sqrt(3.36)
    standalone_volatility = metrics.calculate_volatility(["AAA"], "2025-01-01", "2025-02-01")
    standalone_sortino = metrics.calculate_sortino_ratio(["AAA"], "2025-01-01", "2025-02-01", 0)
    batch, statuses, counts = calculate_yearly_metrics(frame, ["AAA"], "SPY", 0)
    short, short_counts = TopPicksService._calculate_short_window_metric_maps(frame, ["AAA"], "1W")

    assert standalone_volatility == {"AAA": pytest.approx(expected_volatility)}
    assert standalone_sortino["AAA"] == {
        "value": pytest.approx(expected_sortino), "status": "ok", "observations": 3,
    }
    assert batch["volatility"]["AAA"] == pytest.approx(expected_volatility)
    assert batch["sortino"]["AAA"] == pytest.approx(expected_sortino)
    assert batch["sharpe"]["AAA"] == pytest.approx(8.4 / expected_volatility)
    assert counts == short_counts == count_return_observations(frame, ["AAA"]) == {"AAA": 3}
    assert statuses["sortino"] == {"AAA": "ok"}
    assert short["volatility"]["AAA"] == pytest.approx(expected_volatility)
    # Price-level metrics still describe the observed end points and peak.
    assert batch["ret1y"]["AAA"] == pytest.approx(-0.0496)
    assert batch["maxDD"]["AAA"] == pytest.approx(-0.2)


def test_missing_rows_in_all_symbols_remain_in_the_return_index():
    frame = pd.DataFrame({"AAA": [100, 110, None, 99, 108.9],
                          "BBB": [50, 55, None, 49.5, 54.45]})
    returns = calculate_returns(frame)
    assert returns.index.tolist() == frame.index.tolist()
    assert returns.loc[2:3].isna().all().all()
    assert returns.notna().sum().to_dict() == {"AAA": 2, "BBB": 2}


def test_complete_history_has_independently_derived_annual_statistics(monkeypatch):
    frame = market_frame({"AAA": [100, 110, 132, 105.6]})
    monkeypatch.setattr(metrics, "fetch_stock_data", lambda *args, **kwargs: frame)
    batch, _, counts = calculate_yearly_metrics(frame, ["AAA"], "SPY", 0)
    assert counts == {"AAA": 3}
    assert batch["ret1y"]["AAA"] == pytest.approx(0.056)
    assert batch["maxDD"]["AAA"] == pytest.approx(-0.2)
    assert batch["volatility"]["AAA"] == pytest.approx(math.sqrt(10.92))
    assert metrics.calculate_sharpe_ratio(["AAA"], "2025-01-01", "2025-02-01", 0)["AAA"] == pytest.approx(8.4 / math.sqrt(10.92))


def test_omitted_calendar_day_does_not_invent_a_missing_observation():
    frame = market_frame({"AAA": [100, 110, 99]}, dates=pd.to_datetime(
        ["2025-01-02", "2025-01-06", "2025-01-07"]))
    assert count_return_observations(frame, ["AAA"]) == {"AAA": 2}
    prices = get_adjusted_close_prices(frame, ["AAA"])
    assert calculate_returns(prices)["AAA"].dropna().tolist() == pytest.approx([0.1, -0.1])


def test_leading_ipo_gaps_do_not_remove_other_symbols_observations():
    frame = market_frame({"IPO": [None, None, 100, 110, 99, 108.9],
                          "OLD": [10, 11, 9.9, 10.89, 9.801, 10.7811]})
    assert count_return_observations(frame, ["IPO", "OLD"]) == {"IPO": 3, "OLD": 5}


@pytest.mark.parametrize("field_first", [False, True])
def test_close_fallback_is_per_symbol_and_never_spliced_into_adjusted_prices(field_first):
    frame = pd.DataFrame({
        ("AAA", "Adj Close"): [50, None, 55], ("AAA", "Close"): [100, 110, 120],
        ("BBB", "Adj Close"): [0, np.inf, None], ("BBB", "Close"): [10, 11, 12],
        ("CCC", "Close"): [20, 21, 22],
    })
    if field_first:
        frame = frame.swaplevel(axis=1)
    original = frame.copy(deep=True)
    prices = get_adjusted_close_prices(frame, ["AAA", "BBB", "CCC"])
    assert prices["AAA"].iloc[[0, 2]].tolist() == [50, 55]
    assert pd.isna(prices["AAA"].iloc[1])
    assert prices["BBB"].tolist() == [10, 11, 12]
    assert prices["CCC"].tolist() == [20, 21, 22]
    assert calculate_returns(prices).notna().sum().to_dict() == {"AAA": 0, "BBB": 2, "CCC": 2}
    pd.testing.assert_frame_equal(frame, original)


def test_single_symbol_close_fallback_masks_unusable_values():
    prices = get_adjusted_close_prices(pd.DataFrame({
        "Adj Close": [0, -1, np.inf, "bad"], "Close": [10, 11, 12, 13],
    }), ["AAA"])
    assert prices["AAA"].tolist() == [10, 11, 12, 13]


def test_var_requires_twenty_adjacent_valid_returns_after_a_gap(monkeypatch):
    frame = market_frame({"AAA": [100 + i + (i % 3) for i in range(22)]})
    frame.iloc[10, 0] = np.nan
    monkeypatch.setattr(metrics, "fetch_stock_data", lambda *args, **kwargs: frame)
    assert count_return_observations(frame, ["AAA"]) == {"AAA": 19}
    assert metrics.calculate_value_at_risk(["AAA"], "2025-01-01", "2025-02-01") == {}


@pytest.mark.parametrize("values,rate,status,reason", [
    ([100, 100, 100], 0, "invalid", "Zero excess return and zero downside deviation."),
    ([100, 101, 102], 0, "infinite", None),
    ([100, 100, 100], -0.0252, "infinite", None),
    ([100, 100, 100], 0.0252, "ok", None),
    ([100, None, 101], 0, "limited_data", None),
])
def test_sortino_distinguishes_target_flat_positive_and_insufficient_samples(
    monkeypatch, values, rate, status, reason,
):
    frame = market_frame({"AAA": values})
    monkeypatch.setattr(metrics, "fetch_stock_data", lambda *args, **kwargs: frame)
    actual = metrics.calculate_sortino_ratio(["AAA"], "2025-01-01", "2025-02-01", rate)["AAA"]
    batch, statuses, counts = calculate_yearly_metrics(frame, ["AAA"], "SPY", rate)
    assert actual["status"] == statuses["sortino"]["AAA"] == status
    assert actual["observations"] == counts["AAA"]
    if reason:
        assert actual["reason"] == reason
    if status == "ok":
        assert actual["value"] == batch["sortino"]["AAA"] == pytest.approx(-math.sqrt(252))
    else:
        assert actual["value"] is None
        assert "AAA" not in batch["sortino"]


def test_overflowed_returns_are_not_daily_observations():
    frame = pd.DataFrame({"AAA": [1e-300, 1e300, 1e300]})
    returns = calculate_returns(frame)
    assert returns["AAA"].dropna().tolist() == [0.0]


def test_rolling_correlation_does_not_compact_supplied_missing_rows(monkeypatch):
    count = 45
    frame = market_frame({
        "AAA": [100 + i + i % 3 for i in range(count)],
        "SPY": [300 + i + i % 4 for i in range(count)],
    })
    # There is never a contiguous 21-return interval for AAA, though compacting
    # these missing rows would manufacture several qualifying windows.
    frame.iloc[::10, 0] = np.nan
    monkeypatch.setattr(metrics, "fetch_stock_data", lambda *args, **kwargs: frame)
    correlation = metrics.calculate_correlation_with_market(["AAA"], "SPY", "2025-01-01", "2025-04-01")
    assert "AAA" not in correlation
    assert correlation["SPY"]["SPY"] == pytest.approx(1)


@pytest.mark.parametrize("symbols", [["AAA"], ["AAA", "BBB"]])
def test_correlation_keeps_available_diagonal_with_flat_benchmark(monkeypatch, symbols):
    frame = market_frame({
        "AAA": [100 + i + i % 3 for i in range(35)],
        "BBB": [100 + i + i % 3 for i in range(35)],
        "SPY": [100] * 35,
    })
    monkeypatch.setattr(metrics, "fetch_stock_data", lambda *args, **kwargs: frame)
    correlation = metrics.calculate_correlation_with_market(symbols, "SPY", "2025-01-01", "2025-04-01")
    assert set(correlation) == set(symbols)
    assert correlation["AAA"]["AAA"] == pytest.approx(1)
    if len(symbols) == 2:
        assert correlation["AAA"]["BBB"] == pytest.approx(1)
        assert correlation["BBB"]["AAA"] == pytest.approx(1)


def test_requested_benchmark_self_correlation_is_available(monkeypatch):
    frame = market_frame({"SPY": [100 + i + i % 3 for i in range(35)]})
    monkeypatch.setattr(metrics, "fetch_stock_data", lambda *args, **kwargs: frame)
    correlation = metrics.calculate_correlation_with_market(["SPY"], "SPY", "2025-01-01", "2025-04-01")
    assert correlation == {"SPY": {"SPY": pytest.approx(1)}}
