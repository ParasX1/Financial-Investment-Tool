import pytest

from src.quant_analysis.provider_capabilities import (
    ProviderCapabilityError,
    validate_provider_capability,
)


CAPABILITY = {
    "id": "configured-provider",
    "label": "Configured provider",
    "version": "2.0.0",
    "enabled": True,
    "remote": False,
    "deterministic": True,
    "stages": ["diagnose", "decide"],
    "structuredOutput": "validated",
}


class RaisingIdentityProvider:
    version = CAPABILITY["version"]

    @property
    def id(self):
        raise RuntimeError("identity getter secret")

    def capability(self):
        return CAPABILITY


class RaisingVersionProvider:
    id = CAPABILITY["id"]

    @property
    def version(self):
        raise RuntimeError("version getter secret")

    def capability(self):
        return CAPABILITY


@pytest.mark.parametrize(
    "provider",
    [RaisingIdentityProvider(), RaisingVersionProvider()],
)
def test_provider_execution_identity_access_fails_with_safe_error(provider):
    with pytest.raises(ProviderCapabilityError) as raised:
        validate_provider_capability(provider)

    assert str(raised.value) == "Provider capability metadata is invalid."
    assert "secret" not in str(raised.value).lower()
