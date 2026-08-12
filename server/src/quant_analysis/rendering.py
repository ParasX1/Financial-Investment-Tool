from copy import deepcopy


DIAGNOSIS_TEMPLATE_VERSION = "diagnosis-template@1.0.0"
DECISION_TEMPLATE_VERSION = "decision-template@1.0.0"

RISK_TEXT = {
    "DATA_GAPS": (
        "Missing evidence reduces the reliability of this research view."
    ),
    "DRAWDOWN_RISK": "The observed drawdown remains a material risk.",
    "VOLATILITY_RISK": (
        "Observed volatility can produce wide outcome ranges."
    ),
    "RESEARCH_UNCERTAINTY": (
        "Historical evidence does not guarantee a future outcome."
    ),
}
CONTROL_TEXT = {
    "CONFIRM_MULTI_HORIZON": (
        "Require short- and long-horizon evidence to remain aligned."
    ),
    "REQUIRE_RECOVERY": (
        "Require recovery evidence before adopting a constructive view."
    ),
    "LIMIT_DOWNSIDE_ASSUMPTIONS": (
        "Keep downside assumptions explicit in each review."
    ),
    "WAIT_FOR_RANGE_BREAK": (
        "Wait for evidence of a sustained range break."
    ),
    "REVIEW_DRAWDOWN": (
        "Review drawdown before increasing research confidence."
    ),
    "REVIEW_VOLATILITY": (
        "Review volatility before increasing research confidence."
    ),
    "TRACK_SCENARIO_TRIGGERS": (
        "Track each scenario trigger independently."
    ),
    "REQUIRE_MORE_DATA": (
        "Collect at least 20 valid observations before a directional view."
    ),
    "NO_DIRECTIONAL_INFERENCE": (
        "Do not infer direction from an insufficient sample."
    ),
    "CONSERVATIVE_POSTURE": (
        "Apply the conservative research posture to ambiguous evidence."
    ),
    "BALANCED_POSTURE": (
        "Balance upside evidence against the named downside risks."
    ),
    "AGGRESSIVE_POSTURE": (
        "Do not let an aggressive posture override invalidation evidence."
    ),
    "RESEARCH_ONLY": (
        "Treat this output as research commentary, not an order instruction."
    ),
}
SCENARIO_CODES = {
    "base": "BASE_CONTINUATION",
    "bull": "BULL_CONFIRMATION",
    "bear": "BEAR_REVERSAL",
}
INVALIDATION_CODES_BY_REGIME = {
    "bullish": ("POSITIVE_EVIDENCE_REVERSAL",),
    "bearish": ("DOWNSIDE_EVIDENCE_RECOVERY",),
    "range_bound": ("SUSTAINED_RANGE_BREAK",),
    "insufficient_data": ("MINIMUM_SAMPLE_NOT_MET",),
}
_INVALIDATION_TEXT = {
    "POSITIVE_EVIDENCE_REVERSAL": (
        "Positive trend and relative evidence no longer agree."
    ),
    "DOWNSIDE_EVIDENCE_RECOVERY": (
        "Trend and drawdown evidence show a sustained recovery."
    ),
    "SUSTAINED_RANGE_BREAK": (
        "Multiple trend horizons support the same direction."
    ),
    "MINIMUM_SAMPLE_NOT_MET": (
        "Fewer than 20 valid observations remain available."
    ),
}
_POSTURE_CODES = {
    "conservative": "CONSERVATIVE_POSTURE",
    "balanced": "BALANCED_POSTURE",
    "aggressive": "AGGRESSIVE_POSTURE",
}


def expected_risk_control_codes(playbook, risk_profile):
    playbook_codes = tuple(
        code for code in playbook.policy_codes
        if code != "RESEARCH_ONLY"
    )
    return tuple(dict.fromkeys((
        *playbook_codes,
        _POSTURE_CODES[risk_profile],
        "RESEARCH_ONLY",
    )))


def _summary(request, diagnosis):
    templates = {
        "bullish": (
            "{symbol} has a {strength} positive historical evidence balance "
            "within the selected window."
        ),
        "bearish": (
            "{symbol} has a {strength} negative historical evidence balance "
            "within the selected window."
        ),
        "range_bound": (
            "{symbol} has a {strength} mixed historical evidence balance "
            "within the selected window."
        ),
        "insufficient_data": (
            "{symbol} does not have enough valid adjusted-close observations "
            "for a directional diagnosis."
        ),
    }
    return templates[diagnosis["regime"]].format(
        symbol=request.symbol,
        strength=diagnosis["strength"],
    )


def render_diagnosis(request, semantics):
    return {
        "regime": semantics["regime"],
        "direction": semantics["direction"],
        "strength": semantics["strength"],
        "summary": _summary(request, semantics),
        "templateVersion": DIAGNOSIS_TEMPLATE_VERSION,
        "confidence": semantics["confidence"],
        "evidence": deepcopy(semantics["evidence"]),
        "riskCodes": list(semantics["riskCodes"]),
        "risks": [RISK_TEXT[code] for code in semantics["riskCodes"]],
        "dataQuality": semantics["dataQuality"],
    }


def _scenario_text(regime, name):
    condition_templates = {
        "base": "The current {regime} evidence balance persists.",
        "bull": (
            "Positive trend and relative-return evidence strengthen together."
        ),
        "bear": "Trend or drawdown evidence deteriorates materially.",
    }
    implication_templates = {
        "base": (
            "Maintain the current research stance and monitor invalidation "
            "conditions."
        ),
        "bull": "The constructive research scenario gains support.",
        "bear": "The defensive research scenario gains support.",
    }
    return (
        condition_templates[name].format(regime=regime.replace("_", " ")),
        implication_templates[name],
    )


def _thesis(request, diagnosis, decision, playbook):
    templates = {
        "constructive": (
            "Use {playbook} to monitor whether positive evidence for "
            "{symbol} remains confirmed."
        ),
        "defensive": (
            "Use {playbook} to monitor whether downside evidence for "
            "{symbol} begins to recover."
        ),
        "neutral": (
            "Use {playbook} to monitor {symbol} for a supported change "
            "in regime."
        ),
        "insufficient_data": (
            "Use {playbook} to resolve the evidence gap for {symbol} "
            "before forming a directional view."
        ),
    }
    return templates[decision["stance"]].format(
        playbook=playbook.title,
        symbol=request.symbol,
        regime=diagnosis["regime"],
    )


def render_decision(request, diagnosis, semantics, playbook):
    scenarios = []
    for scenario in semantics["scenarios"]:
        condition, implication = _scenario_text(
            diagnosis["regime"],
            scenario["name"],
        )
        scenarios.append({
            "code": scenario["code"],
            "name": scenario["name"],
            "condition": condition,
            "implication": implication,
        })

    return {
        "stance": semantics["stance"],
        "playbook": playbook.public_reference(),
        "thesis": _thesis(request, diagnosis, semantics, playbook),
        "templateVersion": DECISION_TEMPLATE_VERSION,
        "scenarios": scenarios,
        "invalidationCodes": list(semantics["invalidationCodes"]),
        "invalidationConditions": [
            _INVALIDATION_TEXT[code]
            for code in semantics["invalidationCodes"]
        ],
        "riskControlCodes": list(semantics["riskControlCodes"]),
        "riskControls": [
            CONTROL_TEXT[code] for code in semantics["riskControlCodes"]
        ],
        "confidence": semantics["confidence"],
    }
