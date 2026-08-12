import pytest

from src.quant_analysis.contracts import validate_quant_run_request
from src.quant_analysis.service import QuantAnalysisService

from .test_contracts import VALID_PAYLOAD
from .test_service import FixtureMarketAdapter, _complete_snapshot
from .test_service_safety_contracts import ConfiguredProvider


@pytest.mark.parametrize("attribute", ["id", "version"])
def test_provider_identity_drift_fails_before_market_execution(attribute):
    adapter = FixtureMarketAdapter(_complete_snapshot())
    provider = ConfiguredProvider()
    service = QuantAnalysisService(
        market_adapter=adapter,
        provider=provider,
    )
    setattr(provider, attribute, "runtime-ledger-drift")

    with pytest.raises(ValueError, match="capability"):
        service.run(
            validate_quant_run_request(VALID_PAYLOAD),
            trace_id="trace-identity-drift",
        )

    assert provider.capability_calls == 1
    assert adapter.requests == []
