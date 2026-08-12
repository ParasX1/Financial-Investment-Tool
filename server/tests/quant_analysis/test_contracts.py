from uuid import UUID

import pytest

from src.quant_analysis.contracts import (
    QuantRunRequestValidationError,
    validate_quant_run_request,
)


VALID_PAYLOAD = {
    "clientRunId": "79F2F12A-7612-463C-9679-C3B2168E3DB2",
    "symbol": " aapl ",
    "benchmark": " ^axjo ",
    "period": "6mo",
    "interval": "1d",
    "objective": "signal_scan",
    "riskProfile": "balanced",
}


def test_validate_quant_run_request_normalizes_typed_input():
    request = validate_quant_run_request(VALID_PAYLOAD)

    assert request.symbol == "AAPL"
    assert request.benchmark == "^AXJO"
    assert request.client_run_id == str(UUID(VALID_PAYLOAD["clientRunId"]))
    assert request.period == "6mo"
    assert request.interval == "1d"
    assert request.objective == "signal_scan"
    assert request.risk_profile == "balanced"
    assert request.compare_to_run_id is None


def test_validate_quant_run_request_accepts_a_compare_run_uuid():
    payload = {
        **VALID_PAYLOAD,
        "compareToRunId": "C03BED0A-84D0-4DF4-A20D-C0B34DA8598B",
    }

    request = validate_quant_run_request(payload)

    assert request.compare_to_run_id == (
        "c03bed0a-84d0-4df4-a20d-c0b34da8598b"
    )
    assert request.to_dict()["compareToRunId"] == request.compare_to_run_id


@pytest.mark.parametrize(
    ("payload", "field"),
    [
        (None, "body"),
        ([], "body"),
        ({}, "clientRunId"),
        ({**VALID_PAYLOAD, "clientRunId": "not-a-uuid"}, "clientRunId"),
        ({
            **VALID_PAYLOAD,
            "clientRunId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        }, "clientRunId"),
        ({**VALID_PAYLOAD, "symbol": "bad symbol"}, "symbol"),
        ({**VALID_PAYLOAD, "benchmark": ""}, "benchmark"),
        ({**VALID_PAYLOAD, "period": "5y"}, "period"),
        ({**VALID_PAYLOAD, "interval": "1h"}, "interval"),
        ({**VALID_PAYLOAD, "objective": "trade_now"}, "objective"),
        ({**VALID_PAYLOAD, "riskProfile": "maximum"}, "riskProfile"),
        ({**VALID_PAYLOAD, "compareToRunId": "bad"}, "compareToRunId"),
    ],
)
def test_validate_quant_run_request_reports_field_errors(payload, field):
    with pytest.raises(QuantRunRequestValidationError) as raised:
        validate_quant_run_request(payload)

    assert field in raised.value.fields


@pytest.mark.parametrize(
    "field",
    ["prompt", "model", "provider", "url", "tool", "extra"],
)
def test_validate_quant_run_request_rejects_every_unknown_field(field):
    with pytest.raises(QuantRunRequestValidationError) as raised:
        validate_quant_run_request({**VALID_PAYLOAD, field: "untrusted"})

    assert raised.value.fields == {field: "Unknown field."}


def test_validate_quant_run_request_rejects_equal_symbol_and_benchmark():
    with pytest.raises(QuantRunRequestValidationError) as raised:
        validate_quant_run_request({
            **VALID_PAYLOAD,
            "symbol": "SPY",
            "benchmark": "spy",
        })

    assert "benchmark" in raised.value.fields
