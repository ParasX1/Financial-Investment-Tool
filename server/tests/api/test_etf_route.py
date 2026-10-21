from src.server import create_app


def test_etf_route_returns_the_preview_universe():
    app = create_app({"TESTING": True})

    response = app.test_client().get("/api/etfs")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["data"]["total"] == 10
    assert payload["data"]["rows"][0]["symbol"] == "XLK"
    assert payload["metadata"]["source"] == "hardcoded_preview"
    assert payload["warnings"] == [
        "ETF data is a hardcoded preview and is not live market data."
    ]


def test_etf_route_accepts_a_window_query():
    app = create_app({"TESTING": True})

    response = app.test_client().get("/api/etfs?window=1D")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["data"]["rows"][0]["symbol"] == "XLK"
    assert payload["metadata"]["windowCode"] == "1D"
    assert payload["metadata"]["sortKey"] == "priceReturn"


def test_etf_route_rejects_an_invalid_window():
    app = create_app({"TESTING": True})

    response = app.test_client().get("/api/etfs?window=quarter")

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "window must be one of 1D, 1W, 1M, or 1Y."
    }
