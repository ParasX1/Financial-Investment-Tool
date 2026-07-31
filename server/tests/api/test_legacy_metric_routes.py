from unittest.mock import patch

import pytest

from src.server import create_app


@pytest.fixture()
def client():
    app = create_app({"TESTING": True})
    return app.test_client()


def test_legacy_alpha_route_passes_the_market_ticker_to_calculator(client):
    with patch(
        "src.server.calculate_alpha",
        return_value={"AAPL": 0.04},
    ) as calculator:
        response = client.get("/api/alphacomparison")

    assert response.status_code == 200
    assert response.get_json() == {"AAPL": 0.04}
    calculator.assert_called_once_with(
        ["AAPL", "GOOGL", "MSFT"],
        "SPY",
        "2023-01-01",
        "2024-01-01",
        0.01,
    )


def test_legacy_correlation_route_returns_calculator_mapping(client):
    result = {
        "AAPL": {"AAPL": 0.75, "SPY": 0.65},
        "SPY": {"AAPL": 0.65, "SPY": 1.0},
    }
    with patch(
        "src.server.calculate_correlation_with_market",
        return_value=result,
    ) as calculator:
        response = client.get("/api/marketcorrelationanalysis")

    assert response.status_code == 200
    assert response.get_json() == result
    calculator.assert_called_once_with(
        ["AAPL", "GOOGL", "MSFT"],
        "SPY",
        "2023-01-01",
        "2024-01-01",
    )
