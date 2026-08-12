from datetime import date

import numpy as np
import pandas as pd

from src.quant_analysis.contracts import validate_quant_run_request
from src.quant_analysis.market_data import (
    YahooFinanceMarketDataAdapter,
    normalize_observations,
)

from .test_contracts import VALID_PAYLOAD


def test_normalize_observations_is_point_in_time_and_canonical():
    observations, exclusions = normalize_observations(
        [
            ("2026-01-03", 103),
            ("2026-01-01", 100),
            ("2026-01-02", np.inf),
            ("2026-01-01", 101),
            ("not-a-date", 99),
            ("2026-01-04", 104),
            ("2026-01-03", -1),
        ],
        start_date="2026-01-01",
        end_date="2026-01-03",
    )

    assert [(item.date, item.adjusted_close) for item in observations] == [
        ("2026-01-03", 103.0),
    ]
    assert exclusions == {
        "duplicate": 2,
        "invalidDate": 1,
        "invalidPrice": 2,
        "outsideWindow": 1,
    }


def test_normalize_observations_rejects_duplicate_dates_independent_of_order():
    forward = [("2026-01-01", 100), ("2026-01-01", 101)]
    reverse = list(reversed(forward))

    first = normalize_observations(
        forward,
        start_date="2026-01-01",
        end_date="2026-01-01",
    )
    second = normalize_observations(
        reverse,
        start_date="2026-01-01",
        end_date="2026-01-01",
    )

    assert first == second == ((), {"duplicate": 2})


def test_yahoo_adapter_uses_only_adjusted_close_and_an_inclusive_window():
    calls = []
    columns = pd.MultiIndex.from_tuples([
        ("AAPL", "Adj Close"),
        ("AAPL", "Close"),
        ("SPY", "Adj Close"),
        ("SPY", "Close"),
    ])
    frame = pd.DataFrame(
        [[100, 900, 200, 800], [110, 901, 204, 801]],
        index=pd.to_datetime(["2025-02-28", "2026-02-28"]),
        columns=columns,
    )

    def fetcher(symbols, start_date, end_date):
        calls.append((symbols, start_date, end_date))
        return frame

    adapter = YahooFinanceMarketDataAdapter(
        fetcher=fetcher,
        today_provider=lambda: date(2026, 2, 28),
    )
    request = validate_quant_run_request({
        **VALID_PAYLOAD,
        "benchmark": "SPY",
        "period": "1y",
    })

    snapshot = adapter.fetch(request)

    assert calls == [(["AAPL", "SPY"], "2025-02-28", "2026-02-28")]
    assert [item.adjusted_close for item in snapshot.symbol_observations] == [
        100.0,
        110.0,
    ]
    benchmark_prices = [
        item.adjusted_close
        for item in snapshot.benchmark_observations
    ]
    assert benchmark_prices == [
        200.0,
        204.0,
    ]


def test_yahoo_adapter_does_not_fall_back_to_unadjusted_close():
    frame = pd.DataFrame(
        {"AAPL": [100, 101], "SPY": [200, 202]},
        index=pd.to_datetime(["2026-01-01", "2026-01-02"]),
    )
    adapter = YahooFinanceMarketDataAdapter(
        fetcher=lambda *_: frame,
        today_provider=lambda: date(2026, 1, 2),
    )
    request = validate_quant_run_request({
        **VALID_PAYLOAD,
        "benchmark": "SPY",
        "period": "1mo",
    })

    snapshot = adapter.fetch(request)

    assert snapshot.symbol_observations == ()
    assert snapshot.benchmark_observations == ()
    assert "Adjusted close data is unavailable for AAPL." in snapshot.warnings
