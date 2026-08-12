import pytest

from src.quant_analysis.service import QuantAnalysisService

from .test_service import FixtureMarketAdapter, _complete_snapshot


class CapabilityProvider:
    id = "configured-provider"
    label = "Configured provider"
    version = "test"

    def __init__(self, enabled, remote):
        self.enabled = enabled
        self.remote = remote

    def capability(self):
        return {
            "id": self.id,
            "label": self.label,
            "version": self.version,
            "enabled": self.enabled,
            "remote": self.remote,
            "deterministic": False,
            "stages": ["diagnose", "decide"],
            "structuredOutput": "validated",
        }


@pytest.mark.parametrize(
    ("enabled", "remote", "expected"),
    [
        (True, True, True),
        (True, False, False),
        (False, True, False),
        (False, False, False),
    ],
)
def test_remote_generation_flag_reflects_provider_capability(
    enabled,
    remote,
    expected,
):
    service = QuantAnalysisService(
        market_adapter=FixtureMarketAdapter(_complete_snapshot()),
        provider=CapabilityProvider(enabled=enabled, remote=remote),
    )

    capabilities = service.capabilities()

    assert capabilities["remoteGenerationEnabled"] is expected
    assert capabilities["providers"][0]["enabled"] is enabled
    assert capabilities["providers"][0]["remote"] is remote
