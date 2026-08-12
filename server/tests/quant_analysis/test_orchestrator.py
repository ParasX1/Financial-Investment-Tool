from copy import deepcopy

import pytest

from src.quant_analysis.contracts import validate_quant_run_request
from src.quant_analysis.orchestrator import (
    QuantAnalysisOrchestrator,
    StageValidationExhausted,
)
from src.quant_analysis.playbooks import PlaybookRegistry
from src.quant_analysis.rendering import (
    INVALIDATION_CODES_BY_REGIME,
    expected_risk_control_codes,
)

from .test_contracts import VALID_PAYLOAD
from .test_playbooks_and_provider import _features
from .test_validation import VALID_DECISION, VALID_DIAGNOSIS


class ScriptedProvider:
    id = "scripted"
    version = "test"

    def __init__(self, diagnoses, decisions):
        self.diagnoses = list(diagnoses)
        self.decisions = list(decisions)
        self.calls = []

    def generate_diagnosis(self, request, features):
        self.calls.append("diagnose")
        return deepcopy(self.diagnoses.pop(0))

    def generate_decision(
        self,
        request,
        features,
        diagnosis,
        playbook,
    ):
        self.calls.append(("decide", playbook.id))
        return deepcopy(self.decisions.pop(0))


def _valid_outputs(regime="bullish", quality="complete"):
    diagnosis = {
        **VALID_DIAGNOSIS,
        "regime": regime,
        "dataQuality": quality,
        "riskCodes": (
            ["RESEARCH_UNCERTAINTY"]
            if quality == "complete"
            else ["DATA_GAPS", "RESEARCH_UNCERTAINTY"]
        ),
    }
    if regime == "insufficient_data":
        diagnosis.update(direction="unknown", strength="unavailable")
    registry = PlaybookRegistry()
    playbook = registry.route(regime, "signal_scan")
    decision = {
        **VALID_DECISION,
        "stance": (
            "insufficient_data"
            if regime == "insufficient_data"
            else "constructive"
        ),
        "invalidationCodes": list(
            INVALIDATION_CODES_BY_REGIME[regime]
        ),
        "riskControlCodes": list(expected_risk_control_codes(
            playbook,
            "balanced",
        )),
    }
    return diagnosis, decision


def test_orchestrator_validates_diagnose_before_decide_and_records_retry():
    diagnosis, decision = _valid_outputs()
    invalid = {**diagnosis, "confidence": 2}
    provider = ScriptedProvider([invalid, diagnosis], [decision])
    orchestrator = QuantAnalysisOrchestrator(
        provider=provider,
        max_validation_retries=1,
    )

    result = orchestrator.run(
        validate_quant_run_request(VALID_PAYLOAD),
        _features(),
    )

    assert provider.calls == [
        "diagnose",
        "diagnose",
        ("decide", "trend-confirmation"),
    ]
    assert result.validation_attempts[0] == {
        "stage": "diagnose",
        "attempt": 1,
        "outcome": "failed",
        "issueCodes": ["SEMANTIC_CONFIDENCE_RANGE"],
    }
    assert result.validation_attempts[1]["outcome"] == "succeeded"
    assert result.stages["diagnose"]["validationAttemptCount"] == 2
    assert result.stages["diagnose"]["issueCodes"] == [
        "SEMANTIC_CONFIDENCE_RANGE"
    ]
    assert result.stages["decide"]["status"] == "succeeded"


def test_orchestrator_fails_closed_after_bounded_retries_without_decide():
    diagnosis, _ = _valid_outputs()
    invalid = {**diagnosis, "confidence": 9}
    provider = ScriptedProvider([invalid, invalid], [])
    orchestrator = QuantAnalysisOrchestrator(
        provider=provider,
        max_validation_retries=1,
    )

    with pytest.raises(StageValidationExhausted) as raised:
        orchestrator.run(
            validate_quant_run_request(VALID_PAYLOAD),
            _features(),
        )

    assert provider.calls == ["diagnose", "diagnose"]
    assert len(raised.value.validation_attempts) == 2
    assert raised.value.stage == "diagnose"
    assert raised.value.stages["diagnose"]["status"] == "failed"
    assert raised.value.stages["decide"]["status"] == "skipped"
    assert "confidence" not in str(raised.value).lower()


def test_orchestrator_marks_completed_insufficient_stages_partial():
    diagnosis, decision = _valid_outputs(
        regime="insufficient_data",
        quality="insufficient",
    )
    provider = ScriptedProvider([diagnosis], [decision])
    result = QuantAnalysisOrchestrator(provider=provider).run(
        validate_quant_run_request(VALID_PAYLOAD),
        _features(quality="insufficient"),
    )

    assert result.stages["diagnose"]["status"] == "partial"
    assert result.stages["decide"]["status"] == "partial"
