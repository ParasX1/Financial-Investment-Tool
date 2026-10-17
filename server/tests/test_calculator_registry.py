import pytest

from src.analytics.calculator_registry import (
    CALCULATOR_REGISTRY,
    get_calculator,
)


EXPECTED_CALCULATORS = {
    "calculate_alpha",
    "calculate_beta",
    "calculate_correlation_with_market",
    "calculate_cumulative_return",
    "calculate_drawdown",
    "calculate_efficient_frontier",
    "calculate_sharpe_ratio",
    "calculate_sortino_ratio",
    "calculate_value_at_risk",
    "calculate_volatility",
}


def test_default_calculator_registry_is_complete_and_read_only():
    assert set(CALCULATOR_REGISTRY) == EXPECTED_CALCULATORS

    with pytest.raises(TypeError):
        CALCULATOR_REGISTRY["replacement"] = object()


def test_calculator_provider_resolves_registered_calculators():
    for name in EXPECTED_CALCULATORS:
        assert get_calculator(name) is CALCULATOR_REGISTRY[name]


def test_calculator_provider_rejects_unknown_names():
    with pytest.raises(KeyError):
        get_calculator("unknown")
