from copy import deepcopy
import re


PROVIDER_CAPABILITY_FIELDS = frozenset({
    "id",
    "label",
    "version",
    "enabled",
    "remote",
    "deterministic",
    "stages",
    "structuredOutput",
})
PROVIDER_STAGES = ("diagnose", "decide")
PROVIDER_STRUCTURED_OUTPUT = "validated"

_IDENTIFIER_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._-]{0,79}$")


class ProviderCapabilityError(ValueError):
    def __init__(self):
        super().__init__("Provider capability metadata is invalid.")


def _metadata_text(value, maximum):
    return (
        isinstance(value, str)
        and 1 <= len(value) <= maximum
        and value == value.strip()
        and value.isprintable()
    )


def _identifier(value):
    return (
        _metadata_text(value, maximum=80)
        and _IDENTIFIER_PATTERN.fullmatch(value) is not None
    )


def validate_provider_execution_identity(provider, capability):
    try:
        execution_id = getattr(provider, "id", None)
        execution_version = getattr(provider, "version", None)
    except Exception as error:
        raise ProviderCapabilityError() from error

    if (
        execution_id != capability["id"]
        or execution_version != capability["version"]
    ):
        raise ProviderCapabilityError()


def validate_provider_capability(provider):
    try:
        capability_method = getattr(provider, "capability", None)
        if not callable(capability_method):
            raise ProviderCapabilityError()
        capability = capability_method()
    except Exception as error:
        if isinstance(error, ProviderCapabilityError):
            raise
        raise ProviderCapabilityError() from error

    if (
        not isinstance(capability, dict)
        or set(capability) != PROVIDER_CAPABILITY_FIELDS
    ):
        raise ProviderCapabilityError()

    if not _identifier(capability.get("id")):
        raise ProviderCapabilityError()
    if not _metadata_text(capability.get("label"), maximum=120):
        raise ProviderCapabilityError()
    if not _metadata_text(capability.get("version"), maximum=80):
        raise ProviderCapabilityError()
    if any(
        type(capability.get(field)) is not bool
        for field in ("enabled", "remote", "deterministic")
    ):
        raise ProviderCapabilityError()
    if capability.get("stages") != list(PROVIDER_STAGES):
        raise ProviderCapabilityError()
    if capability.get("structuredOutput") != PROVIDER_STRUCTURED_OUTPUT:
        raise ProviderCapabilityError()

    validate_provider_execution_identity(provider, capability)

    return deepcopy(capability)
