from copy import deepcopy
from datetime import datetime, timezone
import logging
from time import monotonic
from uuid import uuid4

from .contracts import INTERVALS, OBJECTIVES, PERIODS, RISK_PROFILES
from .features import (
    FEATURE_SET_ID,
    FEATURE_SET_VERSION,
    calculate_feature_set,
)
from .orchestrator import MAX_VALIDATION_RETRIES, QuantAnalysisOrchestrator
from .playbooks import PlaybookRegistry
from .provider import DeterministicAnalysisProvider
from .provider_capabilities import (
    validate_provider_capability,
    validate_provider_execution_identity,
)


SCHEMA_VERSION = "1.0"
ENGINE_VERSION = "1.0.0"
MAX_BODY_BYTES = 4096
MAX_SESSION_RUNS = 20
RUN_RATE_LIMIT = 20
RUN_RATE_WINDOW_SECONDS = 60
LOGGER = logging.getLogger(__name__)


class ProviderUnavailableError(RuntimeError):
    def __init__(self):
        super().__init__("Configured analysis provider is not enabled.")


def _iso_timestamp(value):
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace(
        "+00:00",
        "Z",
    )


class QuantAnalysisService:
    def __init__(
        self,
        market_adapter,
        provider=None,
        playbook_registry=None,
        orchestrator=None,
        run_id_factory=uuid4,
        created_at_provider=None,
        logger=None,
        timer=monotonic,
    ):
        self._market_adapter = market_adapter
        self._provider = (
            DeterministicAnalysisProvider() if provider is None else provider
        )
        self._provider_capability = validate_provider_capability(
            self._provider
        )
        self._playbook_registry = (
            PlaybookRegistry()
            if playbook_registry is None
            else playbook_registry
        )
        if orchestrator is None:
            self._orchestrator = QuantAnalysisOrchestrator(
                provider=self._provider,
                playbook_registry=self._playbook_registry,
                max_validation_retries=MAX_VALIDATION_RETRIES,
            )
        else:
            if (
                orchestrator.provider is not self._provider
                or orchestrator.playbook_registry
                is not self._playbook_registry
            ):
                raise ValueError(
                    "Injected orchestrator must use the service provider "
                    "and playbook registry."
                )
            self._orchestrator = orchestrator
        self._run_id_factory = run_id_factory
        self._created_at_provider = (
            (lambda: datetime.now(timezone.utc))
            if created_at_provider is None
            else created_at_provider
        )
        self._logger = LOGGER if logger is None else logger
        self._timer = timer

    def capabilities(self):
        provider_capability = deepcopy(self._provider_capability)
        return {
            "schemaVersion": SCHEMA_VERSION,
            "enums": {
                "periods": list(PERIODS),
                "intervals": list(INTERVALS),
                "objectives": list(OBJECTIVES),
                "riskProfiles": list(RISK_PROFILES),
            },
            "defaults": {
                "symbol": "AAPL",
                "benchmark": "^AXJO",
                "period": "6mo",
                "interval": "1d",
                "objective": "signal_scan",
                "riskProfile": "balanced",
            },
            "limits": {
                "maxBodyBytes": MAX_BODY_BYTES,
                "maxSymbolLength": 15,
                "maxValidationRetries": MAX_VALIDATION_RETRIES,
                "maxSessionRuns": MAX_SESSION_RUNS,
                "runRateLimit": RUN_RATE_LIMIT,
                "runRateWindowSeconds": RUN_RATE_WINDOW_SECONDS,
            },
            "providers": [provider_capability],
            "featureSet": {
                "id": FEATURE_SET_ID,
                "version": FEATURE_SET_VERSION,
            },
            "playbooks": self._playbook_registry.capabilities(),
            "persistence": {
                "serverHistory": False,
                "clientMode": "session_storage",
            },
            "remoteGenerationEnabled": bool(
                provider_capability.get("enabled")
                and provider_capability.get("remote")
            ),
            "cache": {"policy": "no-store"},
        }

    def run(self, request, trace_id):
        validate_provider_execution_identity(
            self._provider,
            self._provider_capability,
        )
        if not self._provider_capability["enabled"]:
            raise ProviderUnavailableError()
        started_timer = float(self._timer())
        snapshot = self._market_adapter.fetch(request)
        features = calculate_feature_set(snapshot)
        workflow = self._orchestrator.run(request, features)
        validate_provider_execution_identity(
            self._provider,
            self._provider_capability,
        )
        artifact = {
            "schemaVersion": SCHEMA_VERSION,
            "runId": str(self._run_id_factory()),
            "clientRunId": request.client_run_id,
            "traceId": trace_id,
            "status": (
                "succeeded"
                if features.data_quality == "complete"
                else "partial"
            ),
            "request": request.to_dict(),
            "evidence": [deepcopy(item) for item in features.evidence],
            "diagnosis": deepcopy(workflow.diagnosis),
            "decision": deepcopy(workflow.decision),
            "versions": {
                "engine": ENGINE_VERSION,
                "featureSet": FEATURE_SET_VERSION,
                "provider": self._provider_capability["version"],
                "playbook": workflow.playbook.version,
            },
            "stages": deepcopy(workflow.stages),
            "validationAttempts": [
                deepcopy(item) for item in workflow.validation_attempts
            ],
            "warnings": list(features.warnings),
            "dataSource": {
                "name": snapshot.source_name,
                "symbol": snapshot.symbol,
                "benchmark": snapshot.benchmark,
                "requestedStartDate": snapshot.requested_start_date,
                "requestedEndDate": snapshot.requested_end_date,
                "actualStartDate": (
                    snapshot.symbol_observations[0].date
                    if snapshot.symbol_observations
                    else None
                ),
                "actualEndDate": (
                    snapshot.symbol_observations[-1].date
                    if snapshot.symbol_observations
                    else None
                ),
                "observationCount": features.symbol_observation_count,
                "benchmarkObservationCount": (
                    features.benchmark_observation_count
                ),
                "alignedObservationCount": features.aligned_observation_count,
            },
            "createdAt": _iso_timestamp(self._created_at_provider()),
        }
        if request.compare_to_run_id is not None:
            artifact["sourceRunId"] = request.compare_to_run_id
        duration_ms = max(
            0,
            int(round((float(self._timer()) - started_timer) * 1000)),
        )
        stage_retry_counts = {
            name: max(0, int(stage["validationAttemptCount"]) - 1)
            for name, stage in workflow.stages.items()
        }
        self._logger.info(
            "quant_analysis.run_completed",
            extra={
                "quant_analysis": {
                    "trace_id": trace_id,
                    "status": artifact["status"],
                    "provider_id": self._provider_capability["id"],
                    "provider_version": self._provider_capability["version"],
                    "stage_retry_counts": stage_retry_counts,
                    "duration_ms": duration_ms,
                    "observation_counts": {
                        "primary": features.symbol_observation_count,
                        "reference": features.benchmark_observation_count,
                        "aligned": features.aligned_observation_count,
                    },
                },
            },
        )
        return artifact
