from unittest.mock import patch

from src.server import create_app


def test_app_configures_top_picks_service_assumptions():
    response_payload = {
        "data": {"rows": [], "total": 0},
        "metadata": {},
        "warnings": [],
    }
    with patch("src.server.TopPicksService") as service_class:
        service_class.return_value.get_page.return_value = response_payload
        app = create_app(
            {
                "TESTING": True,
                "TOP_PICKS_BENCHMARK": "SPY",
                "TOP_PICKS_RISK_FREE_RATE": 0.025,
                "TOP_PICKS_RISK_FREE_RATE_SOURCE": "Configured source",
                "TOP_PICKS_RISK_FREE_RATE_AS_OF": "2026-07-01",
                "TOP_PICKS_UNIVERSE_LIMIT": 12,
            },
            supabase_client=object(),
        )

        response = app.test_client().post("/api/top-picks", json={})

    assert response.status_code == 200
    service_class.assert_called_once()
    kwargs = service_class.call_args.kwargs
    assert kwargs["benchmark_ticker"] == "SPY"
    assert kwargs["risk_free_rate"] == 0.025
    assert kwargs["risk_free_rate_source"] == "Configured source"
    assert kwargs["risk_free_rate_as_of"] == "2026-07-01"
    assert kwargs["universe_limit"] == 12


def test_app_exposes_product_consistent_top_picks_defaults():
    app = create_app({"TESTING": True})

    assert app.config["TOP_PICKS_BENCHMARK"] == "^AXJO"
    assert app.config["TOP_PICKS_RISK_FREE_RATE"] == 0.0435
    assert app.config["TOP_PICKS_RISK_FREE_RATE_SOURCE"] == (
        "RBA cash rate target"
    )
    assert app.config["TOP_PICKS_RISK_FREE_RATE_AS_OF"] == "2026-06-17"
    assert app.config["TOP_PICKS_UNIVERSE_LIMIT"] == 50
