"""Metric envelopes must contain strict JSON and meaningful coverage."""

import json
from unittest.mock import Mock

import numpy as np
import pandas as pd
import pytest

from src import metrics
from src.analytics.calculator_registry import get_calculator
from src.server import create_app


def response_for(metric, calculator_name, result, *, legacy=False):
    app = create_app({"TESTING": True}, calculator_provider={
        calculator_name: Mock(return_value=result),
    }.__getitem__)
    client = app.test_client()
    if legacy:
        return client.get(f"/api/{metric}")
    return client.post(f"/api/metrics/{metric}", json={
        "stock_tickers": ["AAA", "BBB"], "market_ticker": "SPY",
        "start_date": "2025-01-01", "end_date": "2025-02-01",
    })


def reject_non_finite(value):
    raise AssertionError(f"Nonstandard JSON constant: {value}")


@pytest.mark.parametrize("legacy", [False, True])
def test_metric_api_converts_non_finite_scalars_to_null(legacy):
    response = response_for("volatilityanalysis", "calculate_volatility", {
        "AAA": np.float64(np.inf), "BBB": np.float64(np.nan),
    }, legacy=legacy)
    assert response.status_code == 200
    payload = json.loads(response.get_data(as_text=True), parse_constant=reject_non_finite)
    assert (payload if legacy else payload["data"]) == {"AAA": None, "BBB": None}
    if not legacy:
        assert payload["metadata"]["availableSymbols"] == []
        assert payload["metadata"]["missingSymbols"] == ["AAA", "BBB"]


def test_finite_json_normalizes_nested_frontier_numbers():
    response = response_for("efficientfrontiervisualization", "calculate_efficient_frontier", {
        "asset_order": ["AAA"], "returns": [np.inf], "risks": [np.nan],
        "weights": [[np.float64(1)]], "sharpe_ratios": [-np.inf],
        "sample_count": np.int64(1),
    })
    assert response.status_code == 200
    payload = json.loads(response.get_data(as_text=True), parse_constant=reject_non_finite)
    assert payload["data"]["returns"] == [None]
    assert payload["data"]["weights"] == [[1.0]]
    assert payload["data"]["sample_count"] == 1


@pytest.mark.parametrize("matrix,available", [
    ({"AAA": {}, "SPY": {"SPY": 1.0}}, []),
    ({"SPY": {"SPY": 1.0}}, []),
    ({"AAA": {"AAA": 1.0}, "SPY": {}}, ["AAA"]),
    ({"AAA": {"SPY": np.nan}, "BBB": {"BBB": 1.0, "SPY": 0.4}}, ["BBB"]),
    ({"AAA": {"AAA": 1.0, "BBB": 0.3}, "BBB": {"AAA": 0.3}}, ["AAA", "BBB"]),
])
def test_correlation_metadata_requires_a_usable_requested_row(matrix, available):
    response = response_for("marketcorrelationanalysis", "calculate_correlation_with_market", matrix)
    payload = json.loads(response.get_data(as_text=True), parse_constant=reject_non_finite)
    assert payload["metadata"]["availableSymbols"] == available
    assert payload["metadata"]["missingSymbols"] == [
        symbol for symbol in ["AAA", "BBB"] if symbol not in available]


def test_requested_benchmark_self_correlation_is_available_in_http_response(monkeypatch):
    frame = pd.DataFrame({("SPY", "Adj Close"): [100 + i + i % 3 for i in range(35)]},
                         index=pd.date_range("2025-01-02", periods=35, freq="B"))
    monkeypatch.setattr(metrics, "fetch_stock_data", lambda *args, **kwargs: frame)
    app = create_app({"TESTING": True}, calculator_provider=get_calculator)
    response = app.test_client().post("/api/metrics/marketcorrelationanalysis", json={
        "stock_tickers": ["SPY"], "market_ticker": "SPY",
        "start_date": "2025-01-01", "end_date": "2025-04-01",
    })
    assert response.status_code == 200
    payload = json.loads(response.get_data(as_text=True), parse_constant=reject_non_finite)
    assert payload["data"] == {"SPY": {"SPY": pytest.approx(1)}}
    assert payload["metadata"]["availableSymbols"] == ["SPY"]
    assert payload["metadata"]["missingSymbols"] == []
    assert payload["warnings"] == []
