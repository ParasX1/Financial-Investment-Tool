from types import MappingProxyType

from ..metrics import (
    calculate_alpha,
    calculate_beta,
    calculate_correlation_with_market,
    calculate_cumulative_return,
    calculate_drawdown,
    calculate_efficient_frontier,
    calculate_sharpe_ratio,
    calculate_sortino_ratio,
    calculate_value_at_risk,
    calculate_volatility,
)


CALCULATOR_REGISTRY = MappingProxyType({
    "calculate_alpha": calculate_alpha,
    "calculate_beta": calculate_beta,
    "calculate_correlation_with_market": (
        calculate_correlation_with_market
    ),
    "calculate_cumulative_return": calculate_cumulative_return,
    "calculate_drawdown": calculate_drawdown,
    "calculate_efficient_frontier": calculate_efficient_frontier,
    "calculate_sharpe_ratio": calculate_sharpe_ratio,
    "calculate_sortino_ratio": calculate_sortino_ratio,
    "calculate_value_at_risk": calculate_value_at_risk,
    "calculate_volatility": calculate_volatility,
})


def get_calculator(calculator_name):
    return CALCULATOR_REGISTRY[calculator_name]
