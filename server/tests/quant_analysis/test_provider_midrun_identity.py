import pytest

from src.quant_analysis.contracts import validate_quant_run_request
from src.quant_analysis.service import QuantAnalysisService

from .test_contracts import VALID_PAYLOAD
from .test_service import FixtureMarketAdapter, _complete_snapshot
from .test_service_safety_contracts import (
    ConfiguredProvider,
    RecordingLogger,
)


class MidRunIdentityDriftProvider(ConfiguredProvider):
    def generate_diagnosis(self, request, features):
        output = super().generate_diagnosis(request, features)
        self.version = "midrun-ledger-drift"
        return output


def test_midrun_provider_identity_drift_prevents_success_artifact_and_log():
    adapter = FixtureMarketAdapter(_complete_snapshot())
    provider = MidRunIdentityDriftProvider()
    logger = RecordingLogger()
    service = QuantAnalysisService(
        market_adapter=adapter,
        provider=provider,
        logger=logger,
    )

    with pytest.raises(ValueError, match="capability"):
        service.run(
            validate_quant_run_request(VALID_PAYLOAD),
            trace_id="trace-midrun-drift",
        )

    assert len(adapter.requests) == 1
    assert logger.calls == []
