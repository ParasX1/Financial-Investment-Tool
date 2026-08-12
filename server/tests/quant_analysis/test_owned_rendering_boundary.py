from copy import deepcopy

import pytest

from src.quant_analysis.contracts import validate_quant_run_request
from src.quant_analysis.orchestrator import (
    QuantAnalysisOrchestrator,
    StageValidationExhausted,
)
from src.quant_analysis.playbooks import PlaybookRegistry
from src.quant_analysis.rendering import expected_risk_control_codes

from .test_contracts import VALID_PAYLOAD
from .test_playbooks_and_provider import _features


DIAGNOSIS_SEMANTICS = {
    "regime": "bullish",
    "direction": "positive",
    "strength": "moderate",
    "confidence": 0.7,
    "evidence": [{
        "evidenceId": "trend_20",
        "direction": "positive",
        "strength": "moderate",
    }],
    "riskCodes": ["RESEARCH_UNCERTAINTY"],
    "dataQuality": "complete",
}


def _decision_semantics(request):
    playbook = PlaybookRegistry().route("bullish", request.objective)
    return {
        "stance": "constructive",
        "scenarios": [
            {"code": "BASE_CONTINUATION", "name": "base"},
            {"code": "BULL_CONFIRMATION", "name": "bull"},
            {"code": "BEAR_REVERSAL", "name": "bear"},
        ],
        "invalidationCodes": ["POSITIVE_EVIDENCE_REVERSAL"],
        "riskControlCodes": list(expected_risk_control_codes(
            playbook,
            request.risk_profile,
        )),
        "confidence": 0.65,
    }


class SemanticProvider:
    id = "semantic-test"
    version = "test"

    def __init__(self, diagnosis, decision):
        self.diagnosis = diagnosis
        self.decision = decision
        self.decision_calls = 0

    def generate_diagnosis(self, request, features):
        return deepcopy(self.diagnosis)

    def generate_decision(
        self,
        request,
        features,
        diagnosis,
        playbook,
    ):
        self.decision_calls += 1
        return deepcopy(self.decision)


def test_orchestrator_renders_valid_semantics_with_owned_templates():
    request = validate_quant_run_request(VALID_PAYLOAD)
    provider = SemanticProvider(
        DIAGNOSIS_SEMANTICS,
        _decision_semantics(request),
    )

    result = QuantAnalysisOrchestrator(provider=provider).run(
        request,
        _features(),
    )

    assert result.diagnosis["summary"].startswith(
        "AAPL has a moderate positive"
    )
    assert result.diagnosis["templateVersion"] == (
        "diagnosis-template@1.0.0"
    )
    assert result.decision["thesis"].startswith("Use Trend confirmation")
    assert result.decision["templateVersion"] == "decision-template@1.0.0"


def test_orchestrator_rejects_provider_diagnosis_prose_before_decide():
    request = validate_quant_run_request(VALID_PAYLOAD)
    provider = SemanticProvider(
        {**DIAGNOSIS_SEMANTICS, "summary": "untrusted provider prose"},
        _decision_semantics(request),
    )

    with pytest.raises(StageValidationExhausted) as raised:
        QuantAnalysisOrchestrator(
            provider=provider,
            max_validation_retries=0,
        ).run(request, _features())

    assert raised.value.stage == "diagnose"
    assert raised.value.validation_attempts[0]["issueCodes"] == [
        "STRUCTURE_UNKNOWN_FIELD"
    ]
    assert provider.decision_calls == 0


def test_orchestrator_rejects_unknown_provider_codes():
    request = validate_quant_run_request(VALID_PAYLOAD)
    provider = SemanticProvider(
        {
            **DIAGNOSIS_SEMANTICS,
            "riskCodes": ["UNTRUSTED_PROVIDER_CODE"],
        },
        _decision_semantics(request),
    )

    with pytest.raises(StageValidationExhausted) as raised:
        QuantAnalysisOrchestrator(
            provider=provider,
            max_validation_retries=0,
        ).run(request, _features())

    assert raised.value.validation_attempts[0]["issueCodes"] == [
        "SEMANTIC_UNKNOWN_RISK_CODE"
    ]

def test_orchestrator_rejects_provider_decision_prose():
    request = validate_quant_run_request(VALID_PAYLOAD)
    provider = SemanticProvider(
        DIAGNOSIS_SEMANTICS,
        {
            **_decision_semantics(request),
            "thesis": "untrusted provider prose",
        },
    )

    with pytest.raises(StageValidationExhausted) as raised:
        QuantAnalysisOrchestrator(
            provider=provider,
            max_validation_retries=0,
        ).run(request, _features())

    assert raised.value.stage == "decide"
    assert raised.value.validation_attempts[-1]["issueCodes"] == [
        "STRUCTURE_UNKNOWN_FIELD"
    ]
