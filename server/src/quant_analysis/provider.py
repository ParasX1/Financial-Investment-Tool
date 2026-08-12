import math

from .rendering import (
    INVALIDATION_CODES_BY_REGIME,
    SCENARIO_CODES,
    expected_risk_control_codes,
)


def _direction(value, tolerance=1e-12):
    if value is None or not math.isfinite(value):
        return "unknown"
    if value > tolerance:
        return "positive"
    if value < -tolerance:
        return "negative"
    return "neutral"


def _strength(value):
    if value is None or not math.isfinite(value):
        return "unavailable"
    magnitude = abs(value)
    if magnitude >= 0.1:
        return "strong"
    if magnitude >= 0.03:
        return "moderate"
    return "weak"


def _diagnosis_semantics(features):
    if features.data_quality == "insufficient":
        return "insufficient_data", "unknown", "unavailable", 0.1

    signal_ids = (
        "cumulative_return",
        "benchmark_relative_return",
        "trend_20",
        "trend_60",
        "distance_from_20_mean",
    )
    directions = [
        _direction(features.value(key))
        for key in signal_ids
        if features.value(key) is not None
    ]
    score = sum(
        1 if direction == "positive" else -1
        if direction == "negative" else 0
        for direction in directions
    )
    if score >= 2:
        regime = "bullish"
        direction = "positive"
    elif score <= -2:
        regime = "bearish"
        direction = "negative"
    else:
        regime = "range_bound"
        direction = "mixed"

    ratio = abs(score) / max(1, len(directions))
    if ratio >= 0.75:
        strength = "strong"
    elif ratio >= 0.4:
        strength = "moderate"
    else:
        strength = "weak"
    quality_factor = 1.0 if features.data_quality == "complete" else 0.75
    confidence = round(
        min(0.9, (0.35 + 0.5 * ratio) * quality_factor),
        6,
    )
    return regime, direction, strength, confidence


def _risk_codes(features):
    codes = []
    if features.data_quality != "complete":
        codes.append("DATA_GAPS")
    drawdown = features.value("maximum_drawdown")
    if drawdown is not None and drawdown <= -0.1:
        codes.append("DRAWDOWN_RISK")
    volatility = features.value("annualized_volatility")
    if volatility is not None and volatility >= 0.35:
        codes.append("VOLATILITY_RISK")
    codes.append("RESEARCH_UNCERTAINTY")
    return list(dict.fromkeys(codes))


class DeterministicAnalysisProvider:
    id = "deterministic"
    label = "Deterministic baseline"
    version = "1.0.0"

    def capability(self):
        return {
            "id": self.id,
            "label": self.label,
            "version": self.version,
            "enabled": True,
            "remote": False,
            "deterministic": True,
            "stages": ["diagnose", "decide"],
            "structuredOutput": "validated",
        }

    def generate_diagnosis(self, request, features):
        del request
        regime, direction, strength, confidence = _diagnosis_semantics(
            features
        )
        reference_ids = (
            "cumulative_return",
            "benchmark_relative_return",
            "trend_20",
            "trend_60",
            "maximum_drawdown",
        )
        evidence = []
        for evidence_id in reference_ids:
            value = features.value(evidence_id)
            if value is None:
                continue
            evidence.append({
                "evidenceId": evidence_id,
                "direction": _direction(value),
                "strength": _strength(value),
            })
        if not evidence:
            evidence.append({
                "evidenceId": "observation_count",
                "direction": "neutral",
                "strength": "unavailable",
            })

        return {
            "regime": regime,
            "direction": direction,
            "strength": strength,
            "confidence": confidence,
            "evidence": evidence,
            "riskCodes": _risk_codes(features),
            "dataQuality": features.data_quality,
        }

    def generate_decision(
        self,
        request,
        features,
        diagnosis,
        playbook,
    ):
        stance = {
            "bullish": "constructive",
            "bearish": "defensive",
            "range_bound": "neutral",
            "insufficient_data": "insufficient_data",
        }[diagnosis["regime"]]
        quality_factor = {
            "complete": 1.0,
            "partial": 0.85,
            "insufficient": 0.5,
        }[features.data_quality]
        confidence = round(
            min(float(diagnosis["confidence"]), 0.9) * quality_factor,
            6,
        )
        return {
            "stance": stance,
            "scenarios": [
                {"code": SCENARIO_CODES[name], "name": name}
                for name in ("base", "bull", "bear")
            ],
            "invalidationCodes": list(
                INVALIDATION_CODES_BY_REGIME[diagnosis["regime"]]
            ),
            "riskControlCodes": list(expected_risk_control_codes(
                playbook,
                request.risk_profile,
            )),
            "confidence": confidence,
        }
