from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, timezone
from time import monotonic

from .playbooks import PlaybookRegistry
from .rendering import (
    expected_risk_control_codes,
    render_decision,
    render_diagnosis,
)
from .validation import (
    StageOutputValidationError,
    validate_decision,
    validate_diagnosis,
)


MAX_VALIDATION_RETRIES = 1


def _iso_timestamp(value):
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    value = value.astimezone(timezone.utc)
    return value.isoformat().replace("+00:00", "Z")


def _empty_stage(status="skipped"):
    return {
        "status": status,
        "durationMs": None,
        "startedAt": None,
        "completedAt": None,
        "providerVersion": None,
        "validationAttemptCount": 0,
        "issueCodes": [],
    }


class StageValidationExhausted(RuntimeError):
    def __init__(self, stage, validation_attempts, stages):
        super().__init__("A stage output could not be validated.")
        self.stage = stage
        self.validation_attempts = tuple(deepcopy(validation_attempts))
        self.stages = deepcopy(stages)


@dataclass(frozen=True)
class OrchestrationResult:
    diagnosis: dict
    decision: dict
    playbook: object
    stages: dict
    validation_attempts: tuple[dict, ...]


class QuantAnalysisOrchestrator:
    def __init__(
        self,
        provider,
        playbook_registry=None,
        max_validation_retries=MAX_VALIDATION_RETRIES,
        wall_clock=None,
        timer=monotonic,
    ):
        if (
            isinstance(max_validation_retries, bool)
            or not isinstance(max_validation_retries, int)
            or not 0 <= max_validation_retries <= 3
        ):
            raise ValueError("Validation retry count is invalid.")
        self.provider = provider
        self.playbook_registry = (
            PlaybookRegistry()
            if playbook_registry is None
            else playbook_registry
        )
        self.max_validation_retries = max_validation_retries
        self._wall_clock = wall_clock or (
            lambda: datetime.now(timezone.utc)
        )
        self._timer = timer

    def _run_validated_stage(
        self,
        stage,
        generate,
        validate,
        stages,
        attempts,
    ):
        started_at = self._wall_clock()
        started_timer = self._timer()
        issue_codes = []
        total_attempts = self.max_validation_retries + 1
        for attempt_number in range(1, total_attempts + 1):
            candidate = generate()
            try:
                validate(candidate)
            except StageOutputValidationError as error:
                attempt_issues = list(error.issue_codes)
                issue_codes.extend(attempt_issues)
                attempts.append({
                    "stage": stage,
                    "attempt": attempt_number,
                    "outcome": "failed",
                    "issueCodes": attempt_issues,
                })
                if attempt_number < total_attempts:
                    continue
                completed_at = self._wall_clock()
                stages[stage] = {
                    "status": "failed",
                    "durationMs": max(
                        0,
                        int(round((self._timer() - started_timer) * 1000)),
                    ),
                    "startedAt": _iso_timestamp(started_at),
                    "completedAt": _iso_timestamp(completed_at),
                    "providerVersion": str(self.provider.version),
                    "validationAttemptCount": attempt_number,
                    "issueCodes": list(dict.fromkeys(issue_codes)),
                }
                raise StageValidationExhausted(
                    stage=stage,
                    validation_attempts=attempts,
                    stages=stages,
                ) from None

            attempts.append({
                "stage": stage,
                "attempt": attempt_number,
                "outcome": "succeeded",
                "issueCodes": [],
            })
            completed_at = self._wall_clock()
            stages[stage] = {
                "status": "succeeded",
                "durationMs": max(
                    0,
                    int(round((self._timer() - started_timer) * 1000)),
                ),
                "startedAt": _iso_timestamp(started_at),
                "completedAt": _iso_timestamp(completed_at),
                "providerVersion": str(self.provider.version),
                "validationAttemptCount": attempt_number,
                "issueCodes": list(dict.fromkeys(issue_codes)),
            }
            return deepcopy(candidate)

        raise AssertionError("Validated stage loop exited unexpectedly.")

    def run(self, request, features):
        stages = {
            "diagnose": _empty_stage("pending"),
            "decide": _empty_stage(),
        }
        attempts = []
        known_evidence_ids = {
            item["key"] for item in features.evidence
        }
        diagnosis_semantics = self._run_validated_stage(
            "diagnose",
            lambda: self.provider.generate_diagnosis(request, features),
            lambda output: validate_diagnosis(
                output,
                known_evidence_ids=known_evidence_ids,
                expected_data_quality=features.data_quality,
            ),
            stages,
            attempts,
        )

        playbook = self.playbook_registry.route(
            diagnosis_semantics["regime"],
            request.objective,
        )
        expected_controls = expected_risk_control_codes(
            playbook,
            request.risk_profile,
        )
        decision_semantics = self._run_validated_stage(
            "decide",
            lambda: self.provider.generate_decision(
                request,
                features,
                diagnosis_semantics,
                playbook,
            ),
            lambda output: validate_decision(
                output,
                diagnosis=diagnosis_semantics,
                expected_risk_control_codes=expected_controls,
            ),
            stages,
            attempts,
        )

        diagnosis = render_diagnosis(request, diagnosis_semantics)
        decision = render_decision(
            request,
            diagnosis_semantics,
            decision_semantics,
            playbook,
        )

        if features.data_quality != "complete":
            stages["diagnose"]["status"] = "partial"
            stages["decide"]["status"] = "partial"

        return OrchestrationResult(
            diagnosis=diagnosis,
            decision=decision,
            playbook=playbook,
            stages=deepcopy(stages),
            validation_attempts=tuple(deepcopy(attempts)),
        )
