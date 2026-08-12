from src.server import create_app


def test_invalid_top_picks_configuration_returns_safe_error():
    app = create_app(
        {
            "TESTING": True,
            "TOP_PICKS_BENCHMARK": "bad ticker",
        },
        supabase_client=object(),
    )

    response = app.test_client().post("/api/top-picks", json={})

    assert response.status_code == 503
    assert response.get_json() == {
        "error": "Top Picks service is not configured."
    }
    assert "bad ticker" not in response.get_data(as_text=True)
