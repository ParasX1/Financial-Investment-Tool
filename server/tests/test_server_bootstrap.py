import os

from src import dev_server


def test_load_local_environment_reads_dotenv_without_overriding_process(
    tmp_path,
    monkeypatch,
):
    dotenv_path = tmp_path / ".env"
    dotenv_path.write_text(
        "SUPABASE_URL=https://local-project.supabase.co\n"
        "SUPABASE_KEY=dotenv-publishable-key\n",
        encoding="utf-8",
    )
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.setenv("SUPABASE_KEY", "process-publishable-key")

    loaded = dev_server.load_local_environment(dotenv_path)

    assert loaded is True
    assert os.environ["SUPABASE_URL"] == (
        "https://local-project.supabase.co"
    )
    assert os.environ["SUPABASE_KEY"] == "process-publishable-key"


def test_development_server_loads_environment_before_creating_app(
    monkeypatch,
):
    calls = []

    class FakeApp:
        def run(self, **options):
            calls.append(("run", options))

    def fake_load_local_environment():
        calls.append("load_environment")

    def fake_create_app():
        calls.append("create_app")
        return FakeApp()

    monkeypatch.setattr(
        dev_server,
        "load_local_environment",
        fake_load_local_environment,
    )

    dev_server.run_development_server(fake_create_app)

    assert calls == [
        "load_environment",
        "create_app",
        (
            "run",
            {
                "debug": True,
                "host": "127.0.0.1",
                "port": 8080,
                "threaded": True,
            },
        ),
    ]
