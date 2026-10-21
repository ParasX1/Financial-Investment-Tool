import pytest

from src.top_picks.contracts import (
    TopPicksRequestValidationError,
    validate_top_picks_request,
)


def test_validate_top_picks_request_applies_safe_defaults():
    request = validate_top_picks_request({})

    assert request.page == 1
    assert request.page_size == 25
    assert request.sort_key == "sharpe"
    assert request.sort_dir == "desc"


@pytest.mark.parametrize(
    "payload",
    [
        [],
        {"page": True},
        {"page": 0},
        {"page": 10_001},
        {"page_size": 0},
        {"page_size": 101},
        {"sort_key": "symbol"},
        {"sort_key": 7},
        {"sort_dir": "sideways"},
        {"sort_dir": None},
    ],
)
def test_validate_top_picks_request_rejects_invalid_values(payload):
    with pytest.raises(TopPicksRequestValidationError):
        validate_top_picks_request(payload)


def test_validate_top_picks_request_accepts_all_metric_sort_keys():
    sort_keys = {
        "ret1y",
        "sharpe",
        "sortino",
        "volatility",
        "maxDD",
        "beta",
        "alpha",
        "infoRatio",
    }

    assert {
        validate_top_picks_request({"sort_key": key}).sort_key
        for key in sort_keys
    } == sort_keys
