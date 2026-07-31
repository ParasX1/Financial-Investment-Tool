from unittest.mock import Mock

import pytest

from src.server import create_app


@pytest.fixture()
def client():
    app = create_app()
    app.config.update(TESTING=True)
    return app.test_client()


@pytest.mark.parametrize(
    "payload",
    [
        [],
        {
            "stock_tickers": ["AAPL"],
            "start_date": "2026-07-28",
            "end_date": "2026-07-28",
        },
        {
            "stock_tickers": ["AAPL"],
            "start_date": "2026-07-29",
            "end_date": "2026-07-28",
        },
        {"stock_tickers": ["A", "B", "C", "D", "E", "F"]},
    ],
)
def test_metrics_route_rejects_invalid_requests(client, payload):
    response = client.post("/api/metrics/betaanalysis", json=payload)

    assert response.status_code == 400
    assert "error" in response.get_json()


def test_metrics_route_preserves_zero_risk_free_rate():
    calculator = Mock(return_value={"AAPL": 1.25})
    app = create_app(
        {"TESTING": True},
        calculator_provider={
            "calculate_sharpe_ratio": calculator,
        }.__getitem__,
    )
    response = app.test_client().post(
        "/api/metrics/sharperatiomatrix",
        json={
            "stock_tickers": ["AAPL"],
            "start_date": "2025-07-28",
            "end_date": "2026-07-28",
            "risk_free_rate": 0,
        },
    )

    assert response.status_code == 200
    calculator.assert_called_once_with(
        ["AAPL"], "2025-07-28", "2026-07-28", 0
    )


def test_metrics_route_returns_truthful_method_and_coverage_metadata():
    calculator = Mock(return_value={"AAPL": 0.22})
    app = create_app(
        {"TESTING": True},
        calculator_provider={
            "calculate_volatility": calculator,
        }.__getitem__,
    )
    response = app.test_client().post(
        "/api/metrics/volatilityanalysis",
        json={
            "stock_tickers": ["AAPL", "MSFT"],
            "start_date": "2025-07-28",
            "end_date": "2026-07-28",
        },
    )

    payload = response.get_json()
    assert response.status_code == 200
    assert payload["data"] == {"AAPL": 0.22}
    assert payload["metadata"]["requestedSymbols"] == ["AAPL", "MSFT"]
    assert payload["metadata"]["availableSymbols"] == ["AAPL"]
    assert payload["metadata"]["missingSymbols"] == ["MSFT"]
    assert payload["metadata"]["annualisationDays"] == 252
    assert "standard deviation" in payload["metadata"]["method"]
    assert payload["warnings"] == ["No usable result for MSFT."]


def test_metrics_route_redacts_internal_calculation_errors():
    calculator = Mock(
        side_effect=RuntimeError("provider token should not leak")
    )
    app = create_app(
        {"TESTING": True},
        calculator_provider={"calculate_beta": calculator}.__getitem__,
    )
    response = app.test_client().post(
        "/api/metrics/betaanalysis",
        json={
            "stock_tickers": ["AAPL"],
            "start_date": "2025-07-28",
            "end_date": "2026-07-28",
        },
    )

    assert response.status_code == 500
    assert response.get_json() == {
        "error": "Metric calculation failed. Please try again."
    }
    assert "provider token" not in response.get_data(as_text=True)
