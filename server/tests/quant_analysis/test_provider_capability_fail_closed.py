import pytest

from src.quant_analysis.provider_capabilities import (
    ProviderCapabilityError,
    validate_provider_capability,
)


class RaisingCapabilityProperty:
    @property
    def capability(self):
        raise RuntimeError("provider configuration secret")


class RaisingCapabilityMethod:
    def capability(self):
        raise RuntimeError("provider configuration secret")


@pytest.mark.parametrize(
    "provider",
    [RaisingCapabilityProperty(), RaisingCapabilityMethod()],
)
def test_provider_capability_access_fails_with_a_stable_safe_error(provider):
    with pytest.raises(ProviderCapabilityError) as raised:
        validate_provider_capability(provider)

    assert str(raised.value) == "Provider capability metadata is invalid."
    assert "secret" not in str(raised.value).lower()
