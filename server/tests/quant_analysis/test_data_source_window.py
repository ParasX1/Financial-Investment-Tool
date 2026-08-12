from src.quant_analysis.contracts import validate_quant_run_request
from src.quant_analysis.market_data import MarketDataSnapshot
from src.quant_analysis.service import QuantAnalysisService

from .test_contracts import VALID_PAYLOAD
from .test_service import FixtureMarketAdapter, _complete_snapshot


def test_data_source_distinguishes_requested_and_actual_windows():
    service = QuantAnalysisService(
        market_adapter=FixtureMarketAdapter(_complete_snapshot())
    )

    artifact = service.run(
        validate_quant_run_request(VALID_PAYLOAD),
        trace_id="trace-window",
    )

    assert artifact["dataSource"]["requestedStartDate"] == "2026-01-01"
    assert artifact["dataSource"]["requestedEndDate"] == "2026-03-05"
    assert artifact["dataSource"]["actualStartDate"] == "2026-01-01"
    assert artifact["dataSource"]["actualEndDate"] == "2026-03-05"
    assert "startDate" not in artifact["dataSource"]
    assert "endDate" not in artifact["dataSource"]


def test_data_source_actual_window_is_null_without_symbol_observations():
    snapshot = MarketDataSnapshot(
        source_name="Fixture adjusted close",
        symbol="AAPL",
        benchmark="^AXJO",
        requested_start_date="2026-01-01",
        requested_end_date="2026-01-31",
        symbol_observations=(),
        benchmark_observations=(),
        warnings=("Adjusted close data is unavailable for AAPL.",),
    )
    service = QuantAnalysisService(
        market_adapter=FixtureMarketAdapter(snapshot)
    )

    artifact = service.run(
        validate_quant_run_request(VALID_PAYLOAD),
        trace_id="trace-empty-window",
    )

    assert artifact["dataSource"]["actualStartDate"] is None
    assert artifact["dataSource"]["actualEndDate"] is None
