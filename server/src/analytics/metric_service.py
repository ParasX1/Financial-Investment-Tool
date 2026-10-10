from dataclasses import dataclass
from types import MappingProxyType

from .metric_contract import (
    build_metric_response,
    validate_metric_request,
)


class UnknownMetricTypeError(ValueError):
    pass


@dataclass(frozen=True)
class MetricDefinition:
    calculator_name: str
    positional_fields: tuple
    keyword_fields: tuple = ()
    serialise_series: bool = False


METRIC_DEFINITIONS = MappingProxyType({
    "betaanalysis": MetricDefinition(
        "calculate_beta",
        ("stock_tickers", "market_ticker", "start_date", "end_date"),
    ),
    "alphacomparison": MetricDefinition(
        "calculate_alpha",
        (
            "stock_tickers",
            "market_ticker",
            "start_date",
            "end_date",
            "risk_free_rate",
        ),
    ),
    "maxdrawdownanalysis": MetricDefinition(
        "calculate_drawdown",
        ("stock_tickers", "start_date", "end_date"),
        serialise_series=True,
    ),
    "cumulativereturncomparison": MetricDefinition(
        "calculate_cumulative_return",
        ("stock_tickers", "start_date", "end_date"),
        serialise_series=True,
    ),
    "sortinoratiovisualization": MetricDefinition(
        "calculate_sortino_ratio",
        ("stock_tickers", "start_date", "end_date", "risk_free_rate"),
    ),
    "marketcorrelationanalysis": MetricDefinition(
        "calculate_correlation_with_market",
        ("stock_tickers", "market_ticker", "start_date", "end_date"),
    ),
    "sharperatiomatrix": MetricDefinition(
        "calculate_sharpe_ratio",
        ("stock_tickers", "start_date", "end_date", "risk_free_rate"),
    ),
    "volatilityanalysis": MetricDefinition(
        "calculate_volatility",
        ("stock_tickers", "start_date", "end_date"),
    ),
    "valueatriskanalysis": MetricDefinition(
        "calculate_value_at_risk",
        (
            "stock_tickers",
            "start_date",
            "end_date",
            "confidence_level",
        ),
    ),
    "efficientfrontiervisualization": MetricDefinition(
        "calculate_efficient_frontier",
        ("stock_tickers", "start_date", "end_date"),
        ("num_portfolios", "risk_free_rate"),
    ),
})


def calculate_metric(metric_type, metric_request, calculator_provider):
    definition = METRIC_DEFINITIONS.get(metric_type)
    if definition is None:
        raise UnknownMetricTypeError(metric_type)

    calculator = calculator_provider(definition.calculator_name)
    positional_arguments = tuple(
        metric_request[field]
        for field in definition.positional_fields
    )
    keyword_arguments = {
        field: metric_request[field]
        for field in definition.keyword_fields
    }
    result = calculator(*positional_arguments, **keyword_arguments)

    if definition.serialise_series:
        return {
            ticker: series.to_dict()
            for ticker, series in result.items()
        }
    return result


def process_metric_request(metric_type, payload, calculator_provider):
    metric_request = validate_metric_request(payload)
    result = calculate_metric(
        metric_type,
        metric_request,
        calculator_provider,
    )
    return build_metric_response(metric_type, result, metric_request)
