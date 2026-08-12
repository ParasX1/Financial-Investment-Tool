from src.quant_analysis.contracts import validate_quant_run_request
from src.quant_analysis.playbooks import PlaybookRegistry
from src.quant_analysis.rendering import (
    DIAGNOSIS_TEMPLATE_VERSION,
    DECISION_TEMPLATE_VERSION,
    expected_risk_control_codes,
    render_decision,
    render_diagnosis,
)

from .test_contracts import VALID_PAYLOAD


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
    "riskCodes": ["DRAWDOWN_RISK", "RESEARCH_UNCERTAINTY"],
    "dataQuality": "complete",
}


def test_server_renderer_owns_all_diagnosis_prose():
    request = validate_quant_run_request(VALID_PAYLOAD)

    diagnosis = render_diagnosis(request, DIAGNOSIS_SEMANTICS)

    assert diagnosis["templateVersion"] == DIAGNOSIS_TEMPLATE_VERSION
    assert diagnosis["summary"].startswith("AAPL has a moderate positive")
    assert diagnosis["risks"] == [
        "The observed drawdown remains a material risk.",
        "Historical evidence does not guarantee a future outcome.",
    ]


def test_server_renderer_owns_decision_prose_and_selected_playbook():
    request = validate_quant_run_request(VALID_PAYLOAD)
    playbook = PlaybookRegistry().route("bullish", "signal_scan")
    semantics = {
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

    decision = render_decision(
        request,
        DIAGNOSIS_SEMANTICS,
        semantics,
        playbook,
    )
    assert decision["templateVersion"] == DECISION_TEMPLATE_VERSION
    assert decision["playbook"] == playbook.public_reference()
    assert decision["thesis"].startswith("Use Trend confirmation")
    assert all(item["condition"] for item in decision["scenarios"])
    assert all(item["implication"] for item in decision["scenarios"])
    assert decision["riskControls"][-1] == (
        "Treat this output as research commentary, not an order instruction."
    )
