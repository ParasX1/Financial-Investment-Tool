import pytest

from src.quant_analysis.validation import (
    StageOutputValidationError,
    validate_decision,
    validate_diagnosis,
)


VALID_DIAGNOSIS = {
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

VALID_DECISION = {
    "stance": "constructive",
    "scenarios": [
        {"code": "BASE_CONTINUATION", "name": "base"},
        {"code": "BULL_CONFIRMATION", "name": "bull"},
        {"code": "BEAR_REVERSAL", "name": "bear"},
    ],
    "invalidationCodes": ["POSITIVE_EVIDENCE_REVERSAL"],
    "riskControlCodes": ["RESEARCH_ONLY"],
    "confidence": 0.65,
}


def test_diagnosis_validator_enforces_structure_and_evidence_references():
    with pytest.raises(StageOutputValidationError) as raised:
        validate_diagnosis(
            {**VALID_DIAGNOSIS, "confidence": float("nan"), "raw": "x"},
            known_evidence_ids={"cumulative_return"},
            expected_data_quality="complete",
        )

    assert "STRUCTURE_UNKNOWN_FIELD" in raised.value.issue_codes
    assert "SEMANTIC_NON_FINITE_CONFIDENCE" in raised.value.issue_codes
    assert "SEMANTIC_UNKNOWN_EVIDENCE" in raised.value.issue_codes


def test_diagnosis_validator_requires_insufficient_regime():
    insufficient = {
        **VALID_DIAGNOSIS,
        "riskCodes": ["DATA_GAPS", "RESEARCH_UNCERTAINTY"],
        "dataQuality": "insufficient",
    }

    with pytest.raises(StageOutputValidationError) as raised:
        validate_diagnosis(
            insufficient,
            known_evidence_ids={"trend_20"},
            expected_data_quality="insufficient",
        )

    assert raised.value.issue_codes == (
        "SEMANTIC_INSUFFICIENT_REGIME_REQUIRED",
    )


@pytest.mark.parametrize(
    ("field", "value", "issue_code"),
    [
        (
            "riskCodes",
            ["UNTRUSTED_PROVIDER_CODE"],
            "SEMANTIC_UNKNOWN_RISK_CODE",
        ),
        (
            "invalidationCodes",
            ["UNTRUSTED_PROVIDER_CODE"],
            "SEMANTIC_UNKNOWN_INVALIDATION_CODE",
        ),
        (
            "riskControlCodes",
            ["UNTRUSTED_PROVIDER_CODE"],
            "SEMANTIC_UNKNOWN_RISK_CONTROL_CODE",
        ),
    ],
)
def test_semantic_validators_reject_unknown_codes(
    field,
    value,
    issue_code,
):
    validator = validate_diagnosis if field == "riskCodes" else (
        validate_decision
    )
    payload = {
        **(VALID_DIAGNOSIS if field == "riskCodes" else VALID_DECISION),
        field: value,
    }
    kwargs = (
        {
            "known_evidence_ids": {"trend_20"},
            "expected_data_quality": "complete",
        }
        if field == "riskCodes"
        else {"diagnosis": VALID_DIAGNOSIS}
    )

    with pytest.raises(StageOutputValidationError) as raised:
        validator(payload, **kwargs)

    assert issue_code in raised.value.issue_codes


def test_decision_validator_requires_exact_scenario_names():
    invalid = {
        **VALID_DECISION,
        "scenarios": [
            {**item, "name": "base"}
            for item in VALID_DECISION["scenarios"]
        ],
    }

    with pytest.raises(StageOutputValidationError) as raised:
        validate_decision(invalid, diagnosis=VALID_DIAGNOSIS)

    assert "SEMANTIC_SCENARIO_SET" in raised.value.issue_codes


def test_decision_validator_requires_server_expected_controls():
    with pytest.raises(StageOutputValidationError) as raised:
        validate_decision(
            VALID_DECISION,
            diagnosis=VALID_DIAGNOSIS,
            expected_risk_control_codes=(
                "CONFIRM_MULTI_HORIZON",
                "BALANCED_POSTURE",
                "RESEARCH_ONLY",
            ),
        )

    assert raised.value.issue_codes == (
        "SEMANTIC_RISK_CONTROL_SET",
    )
