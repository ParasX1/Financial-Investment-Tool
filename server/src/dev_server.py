from pathlib import Path

from dotenv import load_dotenv


SERVER_ROOT = Path(__file__).resolve().parents[1]


def load_local_environment(dotenv_path=None):
    """Load local development values without replacing process settings."""
    resolved_path = (
        SERVER_ROOT / ".env"
        if dotenv_path is None
        else Path(dotenv_path)
    )
    return load_dotenv(dotenv_path=resolved_path, override=False)


def run_development_server(app_factory):
    load_local_environment()
    app = app_factory()
    app.run(debug=True, port=8080)
