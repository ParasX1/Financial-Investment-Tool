from unittest.mock import Mock

import pandas as pd
import pytest

from src.server import create_app


@pytest.fixture()
def client():
    app = create_app({"TESTING": True})
    return app.test_client()


def test_metrics_route_serializes_series_before_building_metadata():
    drawdown = pd.Series(
        [-0.1, -0.2],
        index=["2026-07-27", "2026-07-28"],
    )

    calculator = Mock(return_value={"AAPL": drawdown})
    app = create_app(
        {"TESTING": True},
        calculator_provider={
            "calculate_drawdown": calculator,
        }.__getitem__,
    )
    response = app.test_client().post(
        "/api/metrics/maxdrawdownanalysis",
        json={
            "stock_tickers": ["AAPL"],
            "start_date": "2025-07-28",
            "end_date": "2026-07-28",
        },
    )

    payload = response.get_json()
    assert response.status_code == 200
    assert payload["data"]["AAPL"] == {
        "2026-07-27": -0.1,
        "2026-07-28": -0.2,
    }
    assert payload["metadata"]["observationsBySymbol"] == {"AAPL": 2}
    assert payload["metadata"]["actualStart"] == "2026-07-27"
    assert payload["metadata"]["actualEnd"] == "2026-07-28"


def test_metrics_route_forwards_value_at_risk_confidence_level():
    calculator = Mock(return_value={"AAPL": 0.08})
    app = create_app(
        {"TESTING": True},
        calculator_provider={
            "calculate_value_at_risk": calculator,
        }.__getitem__,
    )
    response = app.test_client().post(
        "/api/metrics/valueatriskanalysis",
        json={
            "stock_tickers": ["AAPL"],
            "start_date": "2025-07-28",
            "end_date": "2026-07-28",
            "confidence_level": 0.1,
        },
    )

    assert response.status_code == 200
    calculator.assert_called_once_with(
        ["AAPL"],
        "2025-07-28",
        "2026-07-28",
        0.1,
    )


def test_metrics_route_forwards_efficient_frontier_options():
    calculator = Mock(return_value={
        "asset_order": ["AAPL"],
        "returns": [0.12],
        "risks": [0.2],
    })
    app = create_app(
        {"TESTING": True},
        calculator_provider={
            "calculate_efficient_frontier": calculator,
        }.__getitem__,
    )
    response = app.test_client().post(
        "/api/metrics/efficientfrontiervisualization",
        json={
            "stock_tickers": ["AAPL"],
            "start_date": "2025-07-28",
            "end_date": "2026-07-28",
            "num_portfolios": 250,
            "risk_free_rate": 0,
        },
    )

    assert response.status_code == 200
    calculator.assert_called_once_with(
        ["AAPL"],
        "2025-07-28",
        "2026-07-28",
        num_portfolios=250,
        risk_free_rate=0,
    )


def test_metrics_route_rejects_unknown_metric_type(client):
    response = client.post(
        "/api/metrics/not-a-metric",
        json={"stock_tickers": ["AAPL"]},
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "Unknown metric type: not-a-metric"
    }
