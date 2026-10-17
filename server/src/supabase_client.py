from urllib.parse import urlparse

from flask import Flask
from supabase import create_client


class SupabaseConfigurationError(RuntimeError):
    """Raised when a route needs Supabase but it is not configured."""


SUPABASE_CONFIGURATION_PLACEHOLDERS = frozenset({
    "your_supabase_project_url",
    "your_supabase_publishable_key",
})


def _validate_supabase_configuration(url, key):
    if not isinstance(url, str) or not isinstance(key, str):
        raise SupabaseConfigurationError(
            "SUPABASE_URL and SUPABASE_KEY are required."
        )

    normalized_url = url.strip()
    normalized_key = key.strip()
    parsed_url = urlparse(normalized_url)
    has_placeholder = any(
        value.casefold() in SUPABASE_CONFIGURATION_PLACEHOLDERS
        for value in (normalized_url, normalized_key)
    )
    if (
        not normalized_url
        or not normalized_key
        or has_placeholder
        or parsed_url.scheme not in {"http", "https"}
        or not parsed_url.netloc
    ):
        raise SupabaseConfigurationError(
            "SUPABASE_URL and SUPABASE_KEY are invalid."
        )
    return normalized_url, normalized_key


def get_supabase_client(app: Flask):
    """Return the injected/cached client, creating it only when first needed."""
    existing_client = app.extensions.get("supabase")
    if existing_client is not None:
        return existing_client

    url, key = _validate_supabase_configuration(
        app.config.get("SUPABASE_URL"),
        app.config.get("SUPABASE_KEY"),
    )

    client = create_client(url, key)
    app.extensions["supabase"] = client
    return client
