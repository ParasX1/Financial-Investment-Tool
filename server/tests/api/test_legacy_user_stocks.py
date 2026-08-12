import pytest

from src.server import create_app


@pytest.fixture()
def client():
    app = create_app()
    app.config.update(TESTING=True)
    return app.test_client()


@pytest.mark.parametrize("path", ["/api/stocks/get", "/api/stocks/set"])
def test_legacy_user_stock_routes_are_explicitly_retired(client, path):
    response = client.post(path, json={"id": "another-user", "json": {"stocks": []}})

    assert response.status_code == 410
    assert response.get_json() == {
        "error": "This legacy portfolio endpoint is no longer available."
    }
