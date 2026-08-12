from datetime import datetime, timezone
from uuid import UUID

from src.quant_analysis.contracts import validate_quant_run_request
from src.quant_analysis.market_data import MarketDataSnapshot, Observation
from src.quant_analysis.service import QuantAnalysisService

from .test_contracts import VALID_PAYLOAD


class FixtureMarketAdapter:
    def __init__(self, snapshot):
        self.snapshot = snapshot
        self.requests = []

    def fetch(self, request):
        self.requests.append(request)
        return self.snapshot


def _complete_snapshot():
    dates = [
        f"2026-{((index - 1) // 28) + 1:02d}-{((index - 1) % 28) + 1:02d}"
        for index in range(1, 62)
    ]
    return MarketDataSnapshot(
        source_name="Fixture adjusted close",
        symbol="AAPL",
        benchmark="^AXJO",
        requested_start_date="2026-01-01",
        requested_end_date="2026-03-05",
        symbol_observations=tuple(
            Observation(day, 100 + index) for index, day in enumerate(dates)
        ),
        benchmark_observations=tuple(
            Observation(day, 200 + index * 0.5)
            for index, day in enumerate(dates)
        ),
        warnings=(),
    )


def test_service_returns_complete_immutable_run_artifact_shape():
    adapter = FixtureMarketAdapter(_complete_snapshot())
    run_ids = iter([
        UUID("14d8d9ce-17cc-45c2-a8c4-f28a35c57e19"),
        UUID("706fa28f-3707-4b32-8833-92b9dac37967"),
    ])
    service = QuantAnalysisService(
        market_adapter=adapter,
        run_id_factory=lambda: next(run_ids),
        created_at_provider=lambda: datetime(
            2026, 8, 12, 1, 2, 3, tzinfo=timezone.utc
        ),
    )
    request = validate_quant_run_request(VALID_PAYLOAD)

    first = service.run(request, trace_id="trace-one")
    first_snapshot = repr(first)
    second = service.run(request, trace_id="trace-two")

    assert set(first) == {
        "schemaVersion",
        "runId",
        "clientRunId",
        "traceId",
        "status",
        "request",
        "evidence",
        "diagnosis",
        "decision",
        "versions",
        "stages",
        "validationAttempts",
        "warnings",
        "dataSource",
        "createdAt",
    }
    assert first["schemaVersion"] == "1.0"
    assert first["status"] == "succeeded"
    assert first["runId"] == "14d8d9ce-17cc-45c2-a8c4-f28a35c57e19"
    assert first["clientRunId"] == request.client_run_id
    assert first["request"]["clientRunId"] == request.client_run_id
    assert first["traceId"] == "trace-one"
    assert first["createdAt"] == "2026-08-12T01:02:03Z"
    assert first["decision"]["playbook"]["origin"] == "clean_room"
    assert first["decision"]["playbook"]["contentHash"].startswith(
        "sha256:",
    )
    assert first["dataSource"] == {
        "name": "Fixture adjusted close",
        "symbol": "AAPL",
        "benchmark": "^AXJO",
        "requestedStartDate": "2026-01-01",
        "requestedEndDate": "2026-03-05",
        "actualStartDate": "2026-01-01",
        "actualEndDate": "2026-03-05",
        "observationCount": 61,
        "benchmarkObservationCount": 61,
        "alignedObservationCount": 61,
    }
    assert set(first["versions"]) == {
        "engine",
        "featureSet",
        "provider",
        "playbook",
    }
    assert set(first["stages"]) == {"diagnose", "decide"}
    assert first_snapshot == repr(first)
    assert second["runId"] != first["runId"]
    forbidden_keys = {
        "raw",
        "rawProviderResponse",
        "prompt",
        "chainOfThought",
        "credential",
    }

    def assert_safe_keys(value):
        if isinstance(value, dict):
            assert forbidden_keys.isdisjoint(value)
            for child in value.values():
                assert_safe_keys(child)
        elif isinstance(value, (list, tuple)):
            for child in value:
                assert_safe_keys(child)

    assert_safe_keys(first)
    assert "prompt" not in repr(first).lower()


def test_service_marks_insufficient_data_as_partial_instead_of_inventing():
    snapshot = MarketDataSnapshot(
        source_name="Fixture adjusted close",
        symbol="AAPL",
        benchmark="^AXJO",
        requested_start_date="2026-01-01",
        requested_end_date="2026-01-02",
        symbol_observations=(Observation("2026-01-02", 100),),
        benchmark_observations=(),
        warnings=("Adjusted close data is unavailable for ^AXJO.",),
    )
    service = QuantAnalysisService(
        market_adapter=FixtureMarketAdapter(snapshot),
    )

    artifact = service.run(
        validate_quant_run_request(VALID_PAYLOAD),
        trace_id="trace-partial",
    )

    assert artifact["status"] == "partial"
    assert artifact["diagnosis"]["regime"] == "insufficient_data"
    assert artifact["decision"]["stance"] == "insufficient_data"
    assert artifact["warnings"]
    assert artifact["dataSource"]["actualStartDate"] == "2026-01-02"
    assert artifact["dataSource"]["actualEndDate"] == "2026-01-02"


def test_service_echoes_compare_target_as_source_run_id():
    service = QuantAnalysisService(
        market_adapter=FixtureMarketAdapter(_complete_snapshot()),
    )
    request = validate_quant_run_request({
        **VALID_PAYLOAD,
        "compareToRunId": "c03bed0a-84d0-4df4-a20d-c0b34da8598b",
    })

    artifact = service.run(request, trace_id="trace-compare")

    assert artifact["sourceRunId"] == request.compare_to_run_id
    assert artifact["request"]["compareToRunId"] == request.compare_to_run_id


def test_capabilities_are_typed_and_truthful_for_v1():
    capabilities = QuantAnalysisService(
        market_adapter=FixtureMarketAdapter(_complete_snapshot())
    ).capabilities()

    assert set(capabilities) == {
        "schemaVersion",
        "enums",
        "defaults",
        "limits",
        "providers",
        "featureSet",
        "playbooks",
        "persistence",
        "remoteGenerationEnabled",
        "cache",
    }
    assert capabilities["schemaVersion"] == "1.0"
    assert capabilities["enums"]["intervals"] == ["1d"]
    assert capabilities["defaults"] == {
        "symbol": "AAPL",
        "benchmark": "^AXJO",
        "period": "6mo",
        "interval": "1d",
        "objective": "signal_scan",
        "riskProfile": "balanced",
    }
    assert capabilities["limits"] == {
        "maxBodyBytes": 4096,
        "maxSymbolLength": 15,
        "maxValidationRetries": 1,
        "maxSessionRuns": 20,
        "runRateLimit": 20,
        "runRateWindowSeconds": 60,
    }
    assert capabilities["providers"] == [{
        "id": "deterministic",
        "label": "Deterministic baseline",
        "version": "1.0.0",
        "enabled": True,
        "remote": False,
        "deterministic": True,
        "stages": ["diagnose", "decide"],
        "structuredOutput": "validated",
    }]
    assert capabilities["persistence"] == {
        "serverHistory": False,
        "clientMode": "session_storage",
    }
    assert capabilities["remoteGenerationEnabled"] is False
    assert capabilities["cache"] == {"policy": "no-store"}
