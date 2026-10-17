from src.server import create_app


class FakeQuery:
    def select(self, column):
        assert column == "MSFT"
        return self

    def execute(self):
        return type("Response", (), {"data": [{"MSFT": 123.45}]})()


class FakeSupabaseClient:
    def table(self, name):
        assert name == "stock_data"
        return FakeQuery()


def test_app_starts_without_supabase_configuration(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_KEY", raising=False)

    app = create_app(
        {
            "TESTING": True,
            "SUPABASE_URL": None,
            "SUPABASE_KEY": None,
        }
    )

    assert app.config["TESTING"] is True


def test_app_loads_supabase_configuration_from_the_process_environment(
    monkeypatch,
):
    monkeypatch.setenv("SUPABASE_URL", "https://project.supabase.co")
    monkeypatch.setenv("SUPABASE_KEY", "test-publishable-key")

    app = create_app({"TESTING": True})

    assert app.config["SUPABASE_URL"] == "https://project.supabase.co"
    assert app.config["SUPABASE_KEY"] == "test-publishable-key"


def test_fetch_data_returns_controlled_error_when_configuration_is_missing():
    app = create_app(
        {
            "TESTING": True,
            "SUPABASE_URL": None,
            "SUPABASE_KEY": None,
        }
    )

    response = app.test_client().get("/api/fetch_data")

    assert response.status_code == 503
    assert response.get_json() == {
        "error": "Market data service is not configured."
    }


def test_fetch_data_uses_an_injected_supabase_client():
    app = create_app(
        {"TESTING": True},
        supabase_client=FakeSupabaseClient(),
    )

    response = app.test_client().get("/api/fetch_data")

    assert response.status_code == 200
    assert response.get_json() == [{"MSFT": 123.45}]
