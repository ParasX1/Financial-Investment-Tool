from dataclasses import dataclass
from hashlib import sha256
import json


PLAYBOOK_VERSION = "1.0.0"
AUTHORSHIP_ATTESTATION = "FIT-QAS-CLEANROOM-2026-08-12"


@dataclass(frozen=True)
class Playbook:
    id: str
    version: str
    title: str
    origin: str
    authorship_attestation: str
    policy_codes: tuple[str, ...]
    content_hash: str

    def public_reference(self):
        return {
            "id": self.id,
            "version": self.version,
            "title": self.title,
            "origin": self.origin,
            "contentHash": self.content_hash,
        }

    def capability(self):
        return self.public_reference()


def _create_playbook(playbook_id, title, policy_codes):
    authored_content = {
        "id": playbook_id,
        "version": PLAYBOOK_VERSION,
        "title": title,
        "origin": "clean_room",
        "authorshipAttestation": AUTHORSHIP_ATTESTATION,
        "policyCodes": list(policy_codes),
    }
    canonical = json.dumps(
        authored_content,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return Playbook(
        id=playbook_id,
        version=PLAYBOOK_VERSION,
        title=title,
        origin="clean_room",
        authorship_attestation=AUTHORSHIP_ATTESTATION,
        policy_codes=tuple(policy_codes),
        content_hash=f"sha256:{sha256(canonical).hexdigest()}",
    )


_PLAYBOOKS = {
    "trend-confirmation": _create_playbook(
        "trend-confirmation",
        "Trend confirmation",
        ("CONFIRM_MULTI_HORIZON", "RESEARCH_ONLY"),
    ),
    "downside-defense": _create_playbook(
        "downside-defense",
        "Downside defense",
        ("REQUIRE_RECOVERY", "LIMIT_DOWNSIDE_ASSUMPTIONS", "RESEARCH_ONLY"),
    ),
    "range-observation": _create_playbook(
        "range-observation",
        "Range observation",
        ("WAIT_FOR_RANGE_BREAK", "RESEARCH_ONLY"),
    ),
    "risk-review": _create_playbook(
        "risk-review",
        "Risk review",
        ("REVIEW_DRAWDOWN", "REVIEW_VOLATILITY", "RESEARCH_ONLY"),
    ),
    "scenario-branches": _create_playbook(
        "scenario-branches",
        "Scenario branches",
        ("TRACK_SCENARIO_TRIGGERS", "RESEARCH_ONLY"),
    ),
    "data-readiness": _create_playbook(
        "data-readiness",
        "Data readiness",
        ("REQUIRE_MORE_DATA", "NO_DIRECTIONAL_INFERENCE", "RESEARCH_ONLY"),
    ),
}


class PlaybookRegistry:
    def route(self, regime, objective):
        if regime == "insufficient_data":
            playbook_id = "data-readiness"
        elif objective == "risk_review":
            playbook_id = "risk-review"
        elif objective == "scenario_plan":
            playbook_id = "scenario-branches"
        else:
            playbook_id = {
                "bullish": "trend-confirmation",
                "bearish": "downside-defense",
                "range_bound": "range-observation",
            }[regime]
        return _PLAYBOOKS[playbook_id]

    def capabilities(self):
        return [
            _PLAYBOOKS[key].capability()
            for key in sorted(_PLAYBOOKS)
        ]
