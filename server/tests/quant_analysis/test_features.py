import math

import pytest

from src.quant_analysis.features import calculate_feature_set
from src.quant_analysis.market_data import MarketDataSnapshot, Observation


def _snapshot(symbol_prices, benchmark_prices, warnings=()):
    return MarketDataSnapshot(
        source_name="Fixture",
        symbol="AAA",
        benchmark="BBB",
        requested_start_date="2026-01-01",
        requested_end_date="2026-12-31",
        symbol_observations=tuple(
            Observation(date, price) for date, price in symbol_prices
        ),
        benchmark_observations=tuple(
            Observation(date, price) for date, price in benchmark_prices
        ),
        warnings=tuple(warnings),
    )


def _evidence_map(result):
    return {item["key"]: item for item in result.evidence}


def test_feature_engine_uses_documented_simple_return_formulas():
    result = calculate_feature_set(_snapshot(
        [
            ("2026-01-01", 100.0),
            ("2026-01-02", 110.0),
            ("2026-01-03", 99.0),
        ],
        [
            ("2026-01-01", 200.0),
            ("2026-01-03", 202.0),
        ],
    ))
    evidence = _evidence_map(result)

    assert evidence["observation_count"]["value"] == 3
    assert evidence["cumulative_return"]["value"] == pytest.approx(-0.01)
    assert evidence["benchmark_relative_return"]["value"] == pytest.approx(
        -0.02
    )
    expected_volatility = math.sqrt(0.02) * math.sqrt(252)
    assert evidence["annualized_volatility"]["value"] == pytest.approx(
        expected_volatility
    )
    assert evidence["maximum_drawdown"]["value"] == pytest.approx(-0.1)
    assert evidence["downside_frequency"]["value"] == pytest.approx(0.5)
    assert result.aligned_observation_count == 2


def test_feature_engine_enforces_trend_and_mean_window_minimums():
    prices_20 = [
        (f"2026-01-{index:02d}", float(index))
        for index in range(1, 21)
    ]
    result_20 = calculate_feature_set(_snapshot(prices_20, prices_20))
    evidence_20 = _evidence_map(result_20)

    assert evidence_20["trend_20"]["value"] is None
    assert evidence_20["distance_from_20_mean"]["value"] == pytest.approx(
        20 / 10.5 - 1
    )

    prices_61 = [
        (
            f"2026-{((index - 1) // 28) + 1:02d}-"
            f"{((index - 1) % 28) + 1:02d}",
            float(index),
        )
        for index in range(1, 62)
    ]
    result_61 = calculate_feature_set(_snapshot(prices_61, prices_61))
    evidence_61 = _evidence_map(result_61)

    assert evidence_61["trend_20"]["value"] == pytest.approx(61 / 41 - 1)
    assert evidence_61["trend_60"]["value"] == pytest.approx(61 / 1 - 1)


def test_feature_engine_uses_symbol_samples_and_exact_intersection():
    result = calculate_feature_set(_snapshot(
        [
            ("2026-01-01", 100),
            ("2026-01-02", 120),
            ("2026-01-03", 110),
        ],
        [
            ("2026-01-01", 200),
            ("2026-01-03", 220),
            ("2026-01-04", 400),
        ],
    ))
    evidence = _evidence_map(result)

    assert evidence["cumulative_return"]["value"] == pytest.approx(0.1)
    assert evidence["benchmark_relative_return"]["value"] == pytest.approx(0)
    assert result.aligned_observation_count == 2


def test_feature_engine_discloses_missing_features_and_non_finite_values():
    result = calculate_feature_set(_snapshot(
        [("2026-01-01", 100)],
        [],
        warnings=("2 invalid price observations were excluded for AAA.",),
    ))

    assert result.data_quality == "insufficient"
    assert all(
        item["finite"] is (item["value"] is not None)
        for item in result.evidence
    )
    assert any("invalid price" in warning for warning in result.warnings)
    assert any(
        "requires" in warning
        for item in result.evidence
        for warning in item["warnings"]
    )


def test_feature_engine_returns_identical_point_in_time_evidence():
    base = _snapshot(
        [("2026-01-01", 100), ("2026-01-02", 101)],
        [("2026-01-01", 100), ("2026-01-02", 100)],
    )
    same_window_with_future_data = MarketDataSnapshot(
        **{
            **base.__dict__,
            "symbol_observations": base.symbol_observations + (
                Observation("2027-01-01", 9999),
            ),
            "benchmark_observations": base.benchmark_observations + (
                Observation("2027-01-01", 1),
            ),
        }
    )

    assert calculate_feature_set(base).evidence == calculate_feature_set(
        same_window_with_future_data
    ).evidence
