from copy import deepcopy

import pytest

from src.quant_analysis.contracts import validate_quant_run_request
from src.quant_analysis.provider import DeterministicAnalysisProvider
from src.quant_analysis.service import QuantAnalysisService

from .test_contracts import VALID_PAYLOAD
from .test_service import FixtureMarketAdapter, _complete_snapshot


class DisabledProvider(DeterministicAnalysisProvider):
    def __init__(self):
        self.execution_calls = 0

    def capability(self):
        capability = deepcopy(super().capability())
        capability["enabled"] = False
        return capability

    def generate_diagnosis(self, request, features):
        self.execution_calls += 1
        return super().generate_diagnosis(request, features)


def test_disabled_provider_fails_before_market_or_provider_execution():
    adapter = FixtureMarketAdapter(_complete_snapshot())
    provider = DisabledProvider()
    service = QuantAnalysisService(
        market_adapter=adapter,
        provider=provider,
    )

    assert service.capabilities()["providers"][0]["enabled"] is False

    with pytest.raises(RuntimeError, match="enabled"):
        service.run(
            validate_quant_run_request(VALID_PAYLOAD),
            trace_id="trace-disabled",
        )

    assert adapter.requests == []
    assert provider.execution_calls == 0
