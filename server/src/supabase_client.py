from flask import Flask
from supabase import create_client


class SupabaseConfigurationError(RuntimeError):
    """Raised when a route needs Supabase but it is not configured."""


def get_supabase_client(app: Flask):
    """Return the injected/cached client, creating it only when first needed."""
    existing_client = app.extensions.get("supabase")
    if existing_client is not None:
        return existing_client

    url = app.config.get("SUPABASE_URL")
    key = app.config.get("SUPABASE_KEY")
    if not url or not key:
        raise SupabaseConfigurationError(
            "SUPABASE_URL and SUPABASE_KEY are required."
        )

    client = create_client(url, key)
    app.extensions["supabase"] = client
    return client
