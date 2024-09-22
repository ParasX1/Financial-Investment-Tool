import pytest
import os
from src.server import create_app

RUNNING_CI = False

# these are to connect to the local instance
# ie. not the production db
DEBUG_URL = "http://127.0.0.1:54321"
DEBUG_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

@pytest.fixture()
def app():
    os.environ["FLASK_SUPABASE_URL"] = DEBUG_URL
    os.environ["FLASK_SUPABASE_KEY"] = DEBUG_KEY
    app = create_app()
    yield app

@pytest.fixture()
def client(app):
    return app.test_client()

@pytest.fixture()
def runner(app):
    return app.test_cli_runner()

"""
{
  "stocks": [
    {
      "symbolID": 0,
      "volume": 69
    }
  ]
}
"""

@pytest.mark.skipif(RUNNING_CI, reason="see README.md")
def test_stocks_get(client):
    uid = "09d81817-63b1-4aac-9e6d-a690e2f3af91"
    response = client.post("/api/stocks/get", json = {"id": uid})
    assert response.status_code == 200
    stock = response.json[0]
    assert stock["volume"] == 69
    assert stock["symbolID"] == 0

@pytest.mark.skipif(RUNNING_CI, reason="see README.md")
def test_stock_notexist(client):
    uid = "does not exist"
    response = client.post("/api/stocks/get", json = {"id": uid})
    assert response.status_code == 404

@pytest.mark.skipif(RUNNING_CI, reason="see README.md")
def test_stock_update(client):
    uid = "e51b448b-b420-4927-805f-b64f2beb2a76"
    json = ({
        "stocks": [
            {"symbolID": 0, "volume": 1}
        ]
    })
    response = client.post("/api/stocks/set", json = {"id": uid,"json": json})
    assert response.status_code == 200

@pytest.mark.skipif(RUNNING_CI, reason="see README.md")
def test_stock_update_noexist_symbol(client):
    uid = "e51b448b-b420-4927-805f-b64f2beb2a76"
    json = ({
        "stocks": [
            {"symbolID": -10, "volume": 1}
        ]
    })
    response = client.post("/api/stocks/set", json = {"id": uid,"json": json})
    assert response.status_code == 200