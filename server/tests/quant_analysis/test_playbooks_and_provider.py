import re

from src.quant_analysis.contracts import validate_quant_run_request
from src.quant_analysis.features import FeatureSetResult
from src.quant_analysis.playbooks import PlaybookRegistry
from src.quant_analysis.provider import DeterministicAnalysisProvider

from .test_contracts import VALID_PAYLOAD


def _features(quality="complete", cumulative=0.12, relative=0.04):
    values = {
        "observation_count": 61,
        "cumulative_return": cumulative,
        "benchmark_relative_return": relative,
        "annualized_volatility": 0.2,
        "maximum_drawdown": -0.08,
        "trend_20": 0.05,
        "trend_60": 0.12,
        "downside_frequency": 0.4,
        "distance_from_20_mean": 0.03,
    }
    evidence = tuple({
        "key": key,
        "label": key.replace("_", " ").title(),
        "value": value,
        "unit": "observations" if key == "observation_count" else "decimal",
        "finite": value is not None,
        "warnings": [],
    } for key, value in values.items())
    return FeatureSetResult(
        evidence=evidence,
        warnings=(),
        data_quality=quality,
        symbol_observation_count=61,
        benchmark_observation_count=61,
        aligned_observation_count=61,
    )


def test_playbook_registry_is_server_owned_clean_room_metadata():
    registry = PlaybookRegistry()

    playbook = registry.route("bullish", "signal_scan")
    capabilities = registry.capabilities()

    assert playbook.id == "trend-confirmation"
    assert playbook.origin == "clean_room"
    assert playbook.authorship_attestation
    assert re.fullmatch(r"sha256:[0-9a-f]{64}", playbook.content_hash)
    assert playbook.public_reference()["origin"] == "clean_room"
    assert playbook.public_reference()["contentHash"] == playbook.content_hash
    assert all(item["origin"] == "clean_room" for item in capabilities)
    assert all("contentHash" in item for item in capabilities)
    assert all("authorshipAttestation" not in item for item in capabilities)


def test_playbook_registry_routes_by_regime_and_objective():
    registry = PlaybookRegistry()

    assert registry.route("bullish", "signal_scan").id == (
        "trend-confirmation"
    )
    assert registry.route("bearish", "signal_scan").id == (
        "downside-defense"
    )
    assert registry.route("range_bound", "signal_scan").id == (
        "range-observation"
    )
    assert registry.route("bullish", "risk_review").id == (
        "risk-review"
    )
    assert registry.route("bearish", "scenario_plan").id == (
        "scenario-branches"
    )
    assert registry.route("insufficient_data", "signal_scan").id == (
        "data-readiness"
    )


def test_deterministic_provider_emits_semantics_without_prose():
    provider = DeterministicAnalysisProvider()
    request = validate_quant_run_request(VALID_PAYLOAD)
    features = _features()

    first = provider.generate_diagnosis(request, features)
    second = provider.generate_diagnosis(request, features)

    assert first == second
    assert first["regime"] == "bullish"
    assert first["direction"] == "positive"
    assert first["strength"] in {"weak", "moderate", "strong"}
    assert set(first) == {
        "regime",
        "direction",
        "strength",
        "confidence",
        "evidence",
        "riskCodes",
        "dataQuality",
    }
    assert all(
        set(reference) == {"evidenceId", "direction", "strength"}
        for reference in first["evidence"]
    )
    assert "prompt" not in repr(first).lower()


def test_deterministic_provider_decision_emits_policy_codes_only():
    provider = DeterministicAnalysisProvider()
    registry = PlaybookRegistry()
    request = validate_quant_run_request(VALID_PAYLOAD)
    features = _features()
    diagnosis = provider.generate_diagnosis(request, features)
    playbook = registry.route(diagnosis["regime"], request.objective)

    decision = provider.generate_decision(
        request,
        features,
        diagnosis,
        playbook,
    )

    assert set(decision) == {
        "stance",
        "scenarios",
        "invalidationCodes",
        "riskControlCodes",
        "confidence",
    }
    assert [scenario["name"] for scenario in decision["scenarios"]] == [
        "base",
        "bull",
        "bear",
    ]
    assert [scenario["code"] for scenario in decision["scenarios"]] == [
        "BASE_CONTINUATION",
        "BULL_CONFIRMATION",
        "BEAR_REVERSAL",
    ]
    assert decision["riskControlCodes"]
    assert all(
        code in decision["riskControlCodes"]
        for code in playbook.policy_codes
    )
    assert decision["riskControlCodes"][-1] == "RESEARCH_ONLY"
