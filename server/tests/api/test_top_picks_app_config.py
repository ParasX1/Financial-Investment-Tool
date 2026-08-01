from unittest.mock import Mock

from src.server import create_app


def test_app_configures_top_picks_service_assumptions():
    response_payload = {
        "data": {"rows": [], "total": 0},
        "metadata": {},
        "warnings": [],
    }
    service = Mock()
    service.get_page.return_value = response_payload
    service_factory = Mock(return_value=service)
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
        top_picks_service_factory=service_factory,
    )

    service_factory.assert_not_called()
    response = app.test_client().post("/api/top-picks", json={})
    second_response = app.test_client().post("/api/top-picks", json={})

    assert response.status_code == 200
    assert second_response.status_code == 200
    service_factory.assert_called_once()
    kwargs = service_factory.call_args.kwargs
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


def test_app_loads_top_picks_configuration_from_process_environment(
    monkeypatch,
):
    monkeypatch.setenv("TOP_PICKS_BENCHMARK", "SPY")
    monkeypatch.setenv("TOP_PICKS_RISK_FREE_RATE", "0.025")
    monkeypatch.setenv(
        "TOP_PICKS_RISK_FREE_RATE_SOURCE",
        "Configured source",
    )
    monkeypatch.setenv("TOP_PICKS_RISK_FREE_RATE_AS_OF", "2026-07-01")
    monkeypatch.setenv("TOP_PICKS_UNIVERSE_LIMIT", "12")

    app = create_app({"TESTING": True})

    assert app.config["TOP_PICKS_BENCHMARK"] == "SPY"
    assert app.config["TOP_PICKS_RISK_FREE_RATE"] == "0.025"
    assert app.config["TOP_PICKS_RISK_FREE_RATE_SOURCE"] == (
        "Configured source"
    )
    assert app.config["TOP_PICKS_RISK_FREE_RATE_AS_OF"] == "2026-07-01"
    assert app.config["TOP_PICKS_UNIVERSE_LIMIT"] == "12"
