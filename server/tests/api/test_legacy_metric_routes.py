from unittest.mock import Mock

import pytest

from src.server import create_app


@pytest.fixture()
def client():
    app = create_app({"TESTING": True})
    return app.test_client()


def test_legacy_alpha_route_passes_the_market_ticker_to_calculator():
    calculator = Mock(return_value={"AAPL": 0.04})
    app = create_app(
        {"TESTING": True},
        calculator_provider={"calculate_alpha": calculator}.__getitem__,
    )
    response = app.test_client().get("/api/alphacomparison")

    assert response.status_code == 200
    assert response.get_json() == {"AAPL": 0.04}
    calculator.assert_called_once_with(
        ["AAPL", "GOOGL", "MSFT"],
        "SPY",
        "2023-01-01",
        "2024-01-01",
        0.01,
    )


def test_legacy_correlation_route_returns_calculator_mapping():
    result = {
        "AAPL": {"AAPL": 0.75, "SPY": 0.65},
        "SPY": {"AAPL": 0.65, "SPY": 1.0},
    }
    calculator = Mock(return_value=result)
    app = create_app(
        {"TESTING": True},
        calculator_provider={
            "calculate_correlation_with_market": calculator,
        }.__getitem__,
    )
    response = app.test_client().get("/api/marketcorrelationanalysis")

    assert response.status_code == 200
    assert response.get_json() == result
    calculator.assert_called_once_with(
        ["AAPL", "GOOGL", "MSFT"],
        "SPY",
        "2023-01-01",
        "2024-01-01",
    )
