from copy import deepcopy

import pytest

from src.quant_analysis.contracts import validate_quant_run_request
from src.quant_analysis.market_data import MarketDataSnapshot, Observation
from src.quant_analysis.orchestrator import QuantAnalysisOrchestrator
from src.quant_analysis.playbooks import PlaybookRegistry
from src.quant_analysis.provider import DeterministicAnalysisProvider
from src.quant_analysis.service import QuantAnalysisService

from .test_contracts import VALID_PAYLOAD
from .test_service import FixtureMarketAdapter, _complete_snapshot


VALID_CAPABILITY = {
    "id": "configured-provider",
    "label": "Configured provider",
    "version": "2.0.0",
    "enabled": True,
    "remote": False,
    "deterministic": True,
    "stages": ["diagnose", "decide"],
    "structuredOutput": "validated",
}
_DEFAULT_CAPABILITY = object()


class ConfiguredProvider(DeterministicAnalysisProvider):
    id = VALID_CAPABILITY["id"]
    label = VALID_CAPABILITY["label"]
    version = VALID_CAPABILITY["version"]

    def __init__(self, capability=_DEFAULT_CAPABILITY):
        self.capability_payload = (
            deepcopy(VALID_CAPABILITY)
            if capability is _DEFAULT_CAPABILITY
            else capability
        )
        self.capability_calls = 0

    def capability(self):
        self.capability_calls += 1
        return self.capability_payload


class ProviderWithoutCapability:
    id = "missing-capability"
    version = "1.0.0"


class RecordingLogger:
    def __init__(self):
        self.calls = []

    def info(self, message, *, extra):
        self.calls.append((message, deepcopy(extra)))


def _service(provider=None, **kwargs):
    return QuantAnalysisService(
        market_adapter=FixtureMarketAdapter(_complete_snapshot()),
        provider=provider,
        **kwargs,
    )


def test_service_requires_an_explicit_provider_capability_contract():
    with pytest.raises(ValueError, match="capability"):
        _service(provider=ProviderWithoutCapability())


@pytest.mark.parametrize(
    "capability",
    [
        None,
        [],
        {key: value for key, value in VALID_CAPABILITY.items() if key != "id"},
        {**VALID_CAPABILITY, "unexpected": "field"},
        {**VALID_CAPABILITY, "id": ""},
        {**VALID_CAPABILITY, "label": 7},
        {**VALID_CAPABILITY, "version": "bad\x00version"},
        {**VALID_CAPABILITY, "enabled": 1},
        {**VALID_CAPABILITY, "remote": "false"},
        {**VALID_CAPABILITY, "deterministic": 1},
        {**VALID_CAPABILITY, "stages": ("diagnose", "decide")},
        {**VALID_CAPABILITY, "stages": ["decide", "diagnose"]},
        {**VALID_CAPABILITY, "structuredOutput": "native"},
    ],
)
def test_service_rejects_malformed_provider_capability_metadata(capability):
    with pytest.raises(ValueError, match="capability"):
        _service(provider=ConfiguredProvider(capability=capability))


@pytest.mark.parametrize(
    ("attribute", "value"),
    [("id", "ledger-mismatch"), ("version", "ledger-mismatch")],
)
def test_service_rejects_provider_identity_metadata_mismatch(
    attribute,
    value,
):
    provider = ConfiguredProvider()
    setattr(provider, attribute, value)

    with pytest.raises(ValueError, match="capability"):
        _service(provider=provider)


def test_service_validates_capability_once_and_returns_defensive_copies():
    provider = ConfiguredProvider()
    service = _service(provider=provider)

    first = service.capabilities()
    first["providers"][0]["remote"] = True
    second = service.capabilities()

    assert provider.capability_calls == 1
    assert second["providers"] == [VALID_CAPABILITY]
    assert second["remoteGenerationEnabled"] is False


def test_service_rejects_injected_orchestrator_with_another_provider():
    provider = ConfiguredProvider()
    registry = PlaybookRegistry()
    orchestrator = QuantAnalysisOrchestrator(
        provider=ConfiguredProvider(),
        playbook_registry=registry,
    )

    with pytest.raises(ValueError, match="orchestrator"):
        _service(
            provider=provider,
            playbook_registry=registry,
            orchestrator=orchestrator,
        )


def test_service_rejects_injected_orchestrator_with_another_registry():
    provider = ConfiguredProvider()
    registry = PlaybookRegistry()
    orchestrator = QuantAnalysisOrchestrator(
        provider=provider,
        playbook_registry=PlaybookRegistry(),
    )

    with pytest.raises(ValueError, match="orchestrator"):
        _service(
            provider=provider,
            playbook_registry=registry,
            orchestrator=orchestrator,
        )


def test_service_accepts_an_injected_orchestrator_with_matching_objects():
    provider = ConfiguredProvider()
    registry = PlaybookRegistry()
    orchestrator = QuantAnalysisOrchestrator(
        provider=provider,
        playbook_registry=registry,
    )

    service = _service(
        provider=provider,
        playbook_registry=registry,
        orchestrator=orchestrator,
    )

    assert service.capabilities()["providers"] == [VALID_CAPABILITY]


def _partial_snapshot():
    return MarketDataSnapshot(
        source_name="Fixture adjusted close",
        symbol="AAPL",
        benchmark="^AXJO",
        requested_start_date="2026-01-01",
        requested_end_date="2026-01-02",
        symbol_observations=(Observation("2026-01-02", 100),),
        benchmark_observations=(),
        warnings=("Adjusted close data is unavailable for ^AXJO.",),
    )


@pytest.mark.parametrize(
    ("snapshot", "expected_status", "expected_counts"),
    [
        (
            _complete_snapshot(),
            "succeeded",
            {"primary": 61, "reference": 61, "aligned": 61},
        ),
        (
            _partial_snapshot(),
            "partial",
            {"primary": 1, "reference": 0, "aligned": 0},
        ),
    ],
)
def test_service_emits_one_redacted_structured_completion_event(
    snapshot,
    expected_status,
    expected_counts,
):
    logger = RecordingLogger()
    times = iter((10.0, 10.125))
    provider = ConfiguredProvider()
    service = QuantAnalysisService(
        market_adapter=FixtureMarketAdapter(snapshot),
        provider=provider,
        logger=logger,
        timer=lambda: next(times),
    )

    artifact = service.run(
        validate_quant_run_request(VALID_PAYLOAD),
        trace_id="trace-safe-completion",
    )

    assert artifact["status"] == expected_status
    assert logger.calls == [(
        "quant_analysis.run_completed",
        {
            "quant_analysis": {
                "trace_id": "trace-safe-completion",
                "status": expected_status,
                "provider_id": VALID_CAPABILITY["id"],
                "provider_version": VALID_CAPABILITY["version"],
                "stage_retry_counts": {"diagnose": 0, "decide": 0},
                "duration_ms": 125,
                "observation_counts": expected_counts,
            },
        },
    )]
    serialized_event = repr(logger.calls).lower()
    for forbidden in (
        "aapl",
        "^axjo",
        "clientrunid",
        "symbol",
        "benchmark",
        "request",
        "user",
        "raw",
    ):
        assert forbidden not in serialized_event


class RetryOnceProvider(ConfiguredProvider):
    def __init__(self):
        super().__init__()
        self.diagnosis_calls = 0

    def generate_diagnosis(self, request, features):
        self.diagnosis_calls += 1
        output = super().generate_diagnosis(request, features)
        if self.diagnosis_calls == 1:
            return {**output, "providerProse": "must be rejected"}
        return output


def test_completion_event_counts_bounded_stage_retries():
    logger = RecordingLogger()
    provider = RetryOnceProvider()
    service = _service(
        provider=provider,
        logger=logger,
        timer=iter((5.0, 5.001)).__next__,
    )

    service.run(
        validate_quant_run_request(VALID_PAYLOAD),
        trace_id="trace-retry",
    )

    event = logger.calls[0][1]["quant_analysis"]
    assert event["stage_retry_counts"] == {"diagnose": 1, "decide": 0}
    assert event["duration_ms"] == 1
