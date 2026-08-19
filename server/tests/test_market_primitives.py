from src import market_primitives, metrics
from src.analytics import metric_contract


def test_metrics_preserves_shared_primitive_exports():
    shared_exports = (
        "calculate_returns",
        "get_adjusted_close_prices",
        "normalize_tickers",
    )

    for export in shared_exports:
        assert getattr(metrics, export) is getattr(market_primitives, export)


def test_metric_contract_preserves_ticker_pattern_export():
    assert metric_contract.TICKER_PATTERN is market_primitives.TICKER_PATTERN
