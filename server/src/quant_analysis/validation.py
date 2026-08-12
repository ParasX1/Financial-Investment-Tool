import math
import re

from .rendering import (
    CONTROL_TEXT,
    INVALIDATION_CODES_BY_REGIME,
    RISK_TEXT,
    SCENARIO_CODES,
)


REGIMES = frozenset({
    "bullish",
    "bearish",
    "range_bound",
    "insufficient_data",
})
DIRECTIONS = frozenset({
    "positive",
    "negative",
    "neutral",
    "mixed",
    "unknown",
})
EVIDENCE_DIRECTIONS = frozenset({
    "positive",
    "negative",
    "neutral",
    "unknown",
})
STRENGTHS = frozenset({
    "strong",
    "moderate",
    "weak",
    "unavailable",
})
DATA_QUALITIES = frozenset({"complete", "partial", "insufficient"})
STANCES = frozenset({
    "constructive",
    "neutral",
    "defensive",
    "insufficient_data",
})
SCENARIOS = ("base", "bull", "bear")
_CODE_PATTERN = re.compile(r"^[A-Z][A-Z0-9_]{1,79}$")

_DIAGNOSIS_FIELDS = frozenset({
    "regime",
    "direction",
    "strength",
    "confidence",
    "evidence",
    "riskCodes",
    "dataQuality",
})
_DECISION_FIELDS = frozenset({
    "stance",
    "scenarios",
    "invalidationCodes",
    "riskControlCodes",
    "confidence",
})
_RISK_CODES = frozenset(RISK_TEXT)
_SCENARIO_CODES = frozenset(SCENARIO_CODES.values())
_INVALIDATION_CODES = frozenset(
    code
    for codes in INVALIDATION_CODES_BY_REGIME.values()
    for code in codes
)
_RISK_CONTROL_CODES = frozenset(CONTROL_TEXT)
_STANCE_BY_REGIME = {
    "bullish": "constructive",
    "bearish": "defensive",
    "range_bound": "neutral",
    "insufficient_data": "insufficient_data",
}


class StageOutputValidationError(ValueError):
    def __init__(self, issue_codes):
        super().__init__("Stage output did not pass validation.")
        self.issue_codes = tuple(dict.fromkeys(issue_codes))


def _finite_number(value):
    return (
        not isinstance(value, bool)
        and isinstance(value, (int, float))
        and math.isfinite(value)
    )


def _code_list(value, maximum_items=20):
    return (
        isinstance(value, list)
        and 1 <= len(value) <= maximum_items
        and all(
            isinstance(item, str) and _CODE_PATTERN.fullmatch(item)
            for item in value
        )
        and len(set(value)) == len(value)
    )


def _check_exact_fields(output, expected, issues):
    if not isinstance(output, dict):
        issues.append("STRUCTURE_EXPECTED_OBJECT")
        return False
    if set(output) - expected:
        issues.append("STRUCTURE_UNKNOWN_FIELD")
    if expected - set(output):
        issues.append("STRUCTURE_MISSING_FIELD")
    return True


def _validate_confidence(value, issues):
    if not _finite_number(value):
        issues.append("SEMANTIC_NON_FINITE_CONFIDENCE")
    elif not 0 <= value <= 1:
        issues.append("SEMANTIC_CONFIDENCE_RANGE")


def _validate_evidence(value, known_evidence_ids, issues):
    if not isinstance(value, list) or not 1 <= len(value) <= 20:
        issues.append("STRUCTURE_INVALID_EVIDENCE")
        return

    evidence_ids = []
    for reference in value:
        if (
            not isinstance(reference, dict)
            or set(reference) != {
                "evidenceId",
                "direction",
                "strength",
            }
        ):
            issues.append("STRUCTURE_INVALID_EVIDENCE_REFERENCE")
            continue
        evidence_id = reference.get("evidenceId")
        if (
            not isinstance(evidence_id, str)
            or not 1 <= len(evidence_id) <= 80
        ):
            issues.append("STRUCTURE_INVALID_EVIDENCE_ID")
        else:
            evidence_ids.append(evidence_id)
        if reference.get("direction") not in EVIDENCE_DIRECTIONS:
            issues.append("STRUCTURE_INVALID_DIRECTION")
        if reference.get("strength") not in STRENGTHS:
            issues.append("STRUCTURE_INVALID_STRENGTH")
    if any(item not in known_evidence_ids for item in evidence_ids):
        issues.append("SEMANTIC_UNKNOWN_EVIDENCE")
    if len(evidence_ids) != len(set(evidence_ids)):
        issues.append("SEMANTIC_DUPLICATE_EVIDENCE")


def validate_diagnosis(
    output,
    known_evidence_ids,
    expected_data_quality,
):
    issues = []
    if not _check_exact_fields(output, _DIAGNOSIS_FIELDS, issues):
        raise StageOutputValidationError(issues)

    if output.get("regime") not in REGIMES:
        issues.append("STRUCTURE_INVALID_REGIME")
    if output.get("direction") not in DIRECTIONS:
        issues.append("STRUCTURE_INVALID_DIRECTION")
    if output.get("strength") not in STRENGTHS:
        issues.append("STRUCTURE_INVALID_STRENGTH")
    _validate_confidence(output.get("confidence"), issues)
    _validate_evidence(output.get("evidence"), known_evidence_ids, issues)

    risk_codes = output.get("riskCodes")
    if not _code_list(risk_codes):
        issues.append("STRUCTURE_INVALID_RISK_CODES")
    elif any(code not in _RISK_CODES for code in risk_codes):
        issues.append("SEMANTIC_UNKNOWN_RISK_CODE")
    elif "RESEARCH_UNCERTAINTY" not in risk_codes:
        issues.append("SEMANTIC_RESEARCH_UNCERTAINTY_REQUIRED")

    data_quality = output.get("dataQuality")
    if data_quality not in DATA_QUALITIES:
        issues.append("STRUCTURE_INVALID_DATA_QUALITY")
    elif data_quality != expected_data_quality:
        issues.append("SEMANTIC_DATA_QUALITY_MISMATCH")
    if (
        expected_data_quality == "insufficient"
        and output.get("regime") != "insufficient_data"
    ):
        issues.append("SEMANTIC_INSUFFICIENT_REGIME_REQUIRED")
    if (
        expected_data_quality != "insufficient"
        and output.get("regime") == "insufficient_data"
    ):
        issues.append("SEMANTIC_UNEXPECTED_INSUFFICIENT_REGIME")
    if (
        expected_data_quality != "complete"
        and isinstance(risk_codes, list)
        and "DATA_GAPS" not in risk_codes
    ):
        issues.append("SEMANTIC_DATA_GAP_RISK_REQUIRED")

    if issues:
        raise StageOutputValidationError(issues)
    return output


def _validate_scenarios(value, issues):
    if not isinstance(value, list) or len(value) != len(SCENARIOS):
        issues.append("STRUCTURE_INVALID_SCENARIOS")
        return

    names = []
    codes = []
    for scenario in value:
        if not isinstance(scenario, dict) or set(scenario) != {"code", "name"}:
            issues.append("STRUCTURE_INVALID_SCENARIO")
            continue
        name = scenario.get("name")
        code = scenario.get("code")
        names.append(name)
        codes.append(code)
        if name not in SCENARIOS:
            issues.append("STRUCTURE_INVALID_SCENARIO_NAME")
        if not isinstance(code, str) or not _CODE_PATTERN.fullmatch(code):
            issues.append("STRUCTURE_INVALID_SCENARIO_CODE")
    if names != list(SCENARIOS):
        issues.append("SEMANTIC_SCENARIO_SET")
    if all(isinstance(code, str) for code in codes):
        if len(codes) != len(set(codes)):
            issues.append("SEMANTIC_DUPLICATE_SCENARIO_CODE")
        if any(code not in _SCENARIO_CODES for code in codes):
            issues.append("SEMANTIC_UNKNOWN_SCENARIO_CODE")
        elif codes != [SCENARIO_CODES[name] for name in SCENARIOS]:
            issues.append("SEMANTIC_SCENARIO_CODE_MISMATCH")


def _validate_semantic_codes(
    value,
    structural_issue,
    allowed,
    unknown_issue,
    issues,
):
    if not _code_list(value):
        issues.append(structural_issue)
        return False
    if any(code not in allowed for code in value):
        issues.append(unknown_issue)
        return False
    return True


def validate_decision(
    output,
    diagnosis,
    expected_risk_control_codes=None,
):
    issues = []
    if not _check_exact_fields(output, _DECISION_FIELDS, issues):
        raise StageOutputValidationError(issues)

    stance = output.get("stance")
    if stance not in STANCES:
        issues.append("STRUCTURE_INVALID_STANCE")
    else:
        expected_stance = _STANCE_BY_REGIME.get(diagnosis.get("regime"))
        if expected_stance is not None and stance != expected_stance:
            issues.append("SEMANTIC_STANCE_MISMATCH")

    _validate_scenarios(output.get("scenarios"), issues)

    invalidation_codes = output.get("invalidationCodes")
    if _validate_semantic_codes(
        invalidation_codes,
        "STRUCTURE_INVALID_INVALIDATIONCODES",
        _INVALIDATION_CODES,
        "SEMANTIC_UNKNOWN_INVALIDATION_CODE",
        issues,
    ):
        expected_invalidations = list(
            INVALIDATION_CODES_BY_REGIME.get(diagnosis.get("regime"), ())
        )
        if invalidation_codes != expected_invalidations:
            issues.append("SEMANTIC_INVALIDATION_SET")

    risk_control_codes = output.get("riskControlCodes")
    if _validate_semantic_codes(
        risk_control_codes,
        "STRUCTURE_INVALID_RISKCONTROLCODES",
        _RISK_CONTROL_CODES,
        "SEMANTIC_UNKNOWN_RISK_CONTROL_CODE",
        issues,
    ):
        if expected_risk_control_codes is not None and (
            risk_control_codes != list(expected_risk_control_codes)
        ):
            issues.append("SEMANTIC_RISK_CONTROL_SET")
        if risk_control_codes[-1] != "RESEARCH_ONLY":
            issues.append("SEMANTIC_RESEARCH_ONLY_CONTROL_REQUIRED")

    confidence = output.get("confidence")
    _validate_confidence(confidence, issues)
    diagnosis_confidence = diagnosis.get("confidence")
    if (
        _finite_number(confidence)
        and _finite_number(diagnosis_confidence)
        and confidence > diagnosis_confidence
    ):
        issues.append("SEMANTIC_CONFIDENCE_EXCEEDS_DIAGNOSIS")

    if issues:
        raise StageOutputValidationError(issues)
    return output
