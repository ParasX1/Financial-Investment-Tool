import pytest

from src.quant_analysis.composition import create_quant_analysis_service
from src.quant_analysis.provider import DeterministicAnalysisProvider
from src.quant_analysis.validation import (
    StageOutputValidationError,
    validate_decision,
    validate_diagnosis,
)

from .test_validation import VALID_DECISION, VALID_DIAGNOSIS


def test_composition_supports_defaults_and_injected_dependencies():
    default_service = create_quant_analysis_service()
    adapter = object()
    provider = DeterministicAnalysisProvider()
    injected_service = create_quant_analysis_service(
        market_adapter=adapter,
        provider=provider,
    )

    assert default_service.capabilities()["remoteGenerationEnabled"] is False
    assert injected_service.capabilities()["providers"] == [
        provider.capability()
    ]


@pytest.mark.parametrize(
    ("output", "issue_code"),
    [
        (None, "STRUCTURE_EXPECTED_OBJECT"),
        (
            {**VALID_DIAGNOSIS, "evidence": "not-a-list"},
            "STRUCTURE_INVALID_EVIDENCE",
        ),
        (
            {
                **VALID_DIAGNOSIS,
                "riskCodes": ["DUPLICATE", "DUPLICATE"],
            },
            "STRUCTURE_INVALID_RISK_CODES",
        ),
        ({**VALID_DIAGNOSIS, "riskCodes": []}, "STRUCTURE_INVALID_RISK_CODES"),
        (
            {**VALID_DIAGNOSIS, "dataQuality": "partial"},
            "SEMANTIC_DATA_QUALITY_MISMATCH",
        ),
    ],
)
def test_diagnosis_validator_rejects_additional_malformed_outputs(
    output,
    issue_code,
):
    with pytest.raises(StageOutputValidationError) as raised:
        validate_diagnosis(
            output,
            known_evidence_ids={"trend_20"},
            expected_data_quality="complete",
        )

    assert issue_code in raised.value.issue_codes


@pytest.mark.parametrize(
    ("output", "issue_code"),
    [
        (None, "STRUCTURE_EXPECTED_OBJECT"),
        ({**VALID_DECISION, "thesis": "untrusted"}, "STRUCTURE_UNKNOWN_FIELD"),
        (
            {**VALID_DECISION, "scenarios": "untrusted"},
            "STRUCTURE_INVALID_SCENARIOS",
        ),
        (
            {**VALID_DECISION, "riskControlCodes": []},
            "STRUCTURE_INVALID_RISKCONTROLCODES",
        ),
        (
            {**VALID_DECISION, "confidence": -1},
            "SEMANTIC_CONFIDENCE_RANGE",
        ),
    ],
)
def test_decision_validator_rejects_additional_malformed_outputs(
    output,
    issue_code,
):
    with pytest.raises(StageOutputValidationError) as raised:
        validate_decision(
            output,
            diagnosis=VALID_DIAGNOSIS,
        )

    assert issue_code in raised.value.issue_codes
