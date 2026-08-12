from copy import deepcopy

import pytest

from src.quant_analysis.validation import (
    StageOutputValidationError,
    validate_decision,
    validate_diagnosis,
)

from .test_owned_rendering_boundary import (
    DIAGNOSIS_SEMANTICS,
    _decision_semantics,
)
from .test_contracts import VALID_PAYLOAD
from src.quant_analysis.contracts import validate_quant_run_request


@pytest.mark.parametrize(
    "field_value",
    [
        [{"not": "hashable"}],
        ["RESEARCH_UNCERTAINTY", {"not": "hashable"}],
    ],
)
def test_diagnosis_validator_fails_closed_for_unhashable_codes(field_value):
    output = {**DIAGNOSIS_SEMANTICS, "riskCodes": field_value}

    with pytest.raises(StageOutputValidationError):
        validate_diagnosis(
            output,
            known_evidence_ids={"trend_20"},
            expected_data_quality="complete",
        )


def test_diagnosis_validator_fails_closed_for_unhashable_evidence_id():
    output = deepcopy(DIAGNOSIS_SEMANTICS)
    output["evidence"][0]["evidenceId"] = {"not": "hashable"}

    with pytest.raises(StageOutputValidationError):
        validate_diagnosis(
            output,
            known_evidence_ids={"trend_20"},
            expected_data_quality="complete",
        )


@pytest.mark.parametrize(
    "field",
    ["invalidationCodes", "riskControlCodes"],
)
def test_decision_validator_fails_closed_for_unhashable_codes(field):
    request = validate_quant_run_request(VALID_PAYLOAD)
    output = _decision_semantics(request)
    output[field] = [{"not": "hashable"}]

    with pytest.raises(StageOutputValidationError):
        validate_decision(
            output,
            diagnosis=DIAGNOSIS_SEMANTICS,
            expected_risk_control_codes=output.get("riskControlCodes"),
        )


def test_decision_validator_fails_closed_for_unhashable_scenario_code():
    request = validate_quant_run_request(VALID_PAYLOAD)
    output = _decision_semantics(request)
    output["scenarios"][0]["code"] = {"not": "hashable"}

    with pytest.raises(StageOutputValidationError):
        validate_decision(
            output,
            diagnosis=DIAGNOSIS_SEMANTICS,
            expected_risk_control_codes=output["riskControlCodes"],
        )
