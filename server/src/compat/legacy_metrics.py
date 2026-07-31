import os

from ..routes.legacy_metrics import create_legacy_metrics_blueprint


LEGACY_METRICS_COMPATIBILITY_ENABLED = (
    "LEGACY_METRICS_COMPATIBILITY_ENABLED"
)
_DEFAULT_COMPATIBILITY_ENABLED = True
_TRUE_BOOLEAN_STRINGS = frozenset({"1", "true", "yes", "on"})
_FALSE_BOOLEAN_STRINGS = frozenset({"0", "false", "no", "off"})


def _parse_boolean(value):
    if isinstance(value, bool):
        return value

    if isinstance(value, str):
        normalised_value = value.strip().lower()
        if normalised_value in _TRUE_BOOLEAN_STRINGS:
            return True
        if normalised_value in _FALSE_BOOLEAN_STRINGS:
            return False

    raise ValueError(
        f"{LEGACY_METRICS_COMPATIBILITY_ENABLED} must be a boolean"
    )


def configure_legacy_metrics_compatibility(app, environ=None):
    environment = os.environ if environ is None else environ
    configured_value = environment.get(
        LEGACY_METRICS_COMPATIBILITY_ENABLED,
        _DEFAULT_COMPATIBILITY_ENABLED,
    )
    app.config.from_mapping({
        LEGACY_METRICS_COMPATIBILITY_ENABLED: _parse_boolean(
            configured_value
        ),
    })


def register_legacy_metrics_compatibility(app, calculator_provider):
    enabled = _parse_boolean(
        app.config.get(
            LEGACY_METRICS_COMPATIBILITY_ENABLED,
            _DEFAULT_COMPATIBILITY_ENABLED,
        )
    )
    if not enabled:
        return

    app.register_blueprint(
        create_legacy_metrics_blueprint(calculator_provider)
    )
