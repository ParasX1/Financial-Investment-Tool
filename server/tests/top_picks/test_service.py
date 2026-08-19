from datetime import date
import json

import pandas as pd

from src.top_picks import service as service_module
from src.top_picks.contracts import Ticker, TopPicksRequest
from src.top_picks.service import (
    TopPicksService,
    TopPicksSnapshotCache,
    sort_top_pick_rows,
)


class FakeTickerRepository:
    def list_tickers(self, limit):
        return (
            Ticker("AAA", "Alpha Ltd", "Technology"),
            Ticker("BBB", "Beta Ltd", "Financials"),
            Ticker("CCC", "Gamma Ltd", "Industrials"),
        )[:limit]


def calculator_provider(name):
    results = {
        "calculate_cumulative_return": {
            "AAA": pd.Series([0.0, 0.25]),
            "BBB": pd.Series([0.0, 0.10]),
        },
        "calculate_sharpe_ratio": {"AAA": 1.2, "BBB": 1.2},
        "calculate_sortino_ratio": {
            "AAA": {"value": 1.8, "status": "ok", "observations": 250},
            "BBB": {
                "value": None,
                "status": "infinite",
                "observations": 250,
            },
        },
        "calculate_volatility": {"AAA": 0.22, "BBB": 0.18},
        "calculate_drawdown": {
            "AAA": pd.Series([0.0, -0.20, -0.05]),
            "BBB": pd.Series([0.0, -0.10]),
        },
        "calculate_beta": {"AAA": 1.05, "BBB": 0.85},
        "calculate_alpha": {"AAA": 0.04, "BBB": -0.01},
    }

    def calculate(*args, **kwargs):
        return results[name]

    return calculate


def create_service():
    return TopPicksService(
        ticker_repository=FakeTickerRepository(),
        calculator_provider=calculator_provider,
        market_data_provider=lambda *args: pd.DataFrame(),
        information_ratio_provider=lambda *args: {
            "AAA": 0.65,
            "BBB": 0.30,
        },
        observation_count_provider=lambda *args: {
            "AAA": 252,
            "BBB": 252,
        },
        today_provider=lambda: date(2026, 7, 31),
    )


def test_service_computes_decimal_metrics_and_stable_pagination():
    response = create_service().get_page(
        TopPicksRequest(
            page=1,
            page_size=2,
            sort_key="sharpe",
            sort_dir="desc",
        )
    )

    assert response["data"]["total"] == 3
    assert [row["symbol"] for row in response["data"]["rows"]] == [
        "AAA",
        "BBB",
    ]
    assert response["data"]["rows"][0] == {
        "symbol": "AAA",
        "name": "Alpha Ltd",
        "industry": "Technology",
        "ret1y": 0.25,
        "sharpe": 1.2,
        "sortino": 1.8,
        "volatility": 0.22,
        "maxDD": -0.2,
        "beta": 1.05,
        "alpha": 0.04,
        "infoRatio": 0.65,
        "metricStatus": {"sortino": "ok"},
    }
    assert response["metadata"]["units"] == {
        "ret1y": "decimal_return",
        "sharpe": "ratio",
        "sortino": "ratio",
        "volatility": "decimal_annualized",
        "maxDD": "decimal_drawdown",
        "beta": "ratio",
        "alpha": "decimal_annualized",
        "infoRatio": "ratio",
    }
    assert response["metadata"]["requestedStart"] == "2025-07-31"
    assert response["metadata"]["requestedEnd"] == "2026-07-31"
    assert response["warnings"] == [
        "No usable market data for 1 symbol: CCC.",
    ]


def test_service_keeps_missing_sort_values_last_in_both_directions():
    rows = [
        {"symbol": "AAA", "sharpe": 1.0},
        {"symbol": "BBB", "sharpe": None},
        {"symbol": "CCC", "sharpe": 0.5},
        {"symbol": "DDD", "sharpe": None},
    ]

    ascending = sort_top_pick_rows(rows, "sharpe", "asc")
    descending = sort_top_pick_rows(rows, "sharpe", "desc")

    assert [row["symbol"] for row in ascending] == [
        "CCC",
        "AAA",
        "BBB",
        "DDD",
    ]
    assert [row["symbol"] for row in descending] == [
        "AAA",
        "CCC",
        "BBB",
        "DDD",
    ]


def test_service_paginates_after_sorting_the_whole_universe():
    response = create_service().get_page(
        TopPicksRequest(
            page=2,
            page_size=2,
            sort_key="ret1y",
            sort_dir="desc",
        )
    )

    assert [row["symbol"] for row in response["data"]["rows"]] == [
        "CCC"
    ]
    assert response["data"]["total"] == 3


def test_service_reuses_cached_snapshot_across_sort_and_page_requests():
    class CountingTickerRepository:
        def __init__(self):
            self.calls = 0

        def list_tickers(self, limit):
            self.calls += 1
            return FakeTickerRepository().list_tickers(limit)

    calls = []

    def counting_calculator_provider(name):
        calls.append(name)
        return calculator_provider(name)

    repository = CountingTickerRepository()
    service = TopPicksService(
        ticker_repository=repository,
        calculator_provider=counting_calculator_provider,
        market_data_provider=lambda *args: pd.DataFrame(),
        information_ratio_provider=lambda *args: {
            "AAA": 0.65,
            "BBB": 0.30,
        },
        observation_count_provider=lambda *args: {
            "AAA": 252,
            "BBB": 252,
        },
        today_provider=lambda: date(2026, 7, 31),
    )

    first = service.get_page(TopPicksRequest(1, 2, "sharpe", "desc"))
    second = service.get_page(TopPicksRequest(2, 2, "ret1y", "asc"))

    assert repository.calls == 1
    assert calls.count("calculate_sharpe_ratio") == 1
    assert first["metadata"]["cacheStatus"] == "miss"
    assert second["metadata"]["cacheStatus"] == "hit"
    assert second["metadata"]["sortKey"] == "ret1y"
    assert second["metadata"]["page"] == 2


def test_snapshot_cache_keeps_stale_values_for_revalidation():
    now = [100.0]
    cache = TopPicksSnapshotCache(clock=lambda: now[0])

    cache.set(
        ("top-picks",),
        {"rows": [{"symbol": "AAA"}]},
        ttl_seconds=10,
        stale_ttl_seconds=100,
    )

    now[0] = 115.0
    stale_value, stale_status = cache.get(("top-picks",))

    assert stale_status == "stale"
    assert stale_value == {"rows": [{"symbol": "AAA"}]}

    now[0] = 205.0
    expired_value, expired_status = cache.get(("top-picks",))

    assert expired_status == "miss"
    assert expired_value is None


def test_snapshot_cache_persists_complete_values_as_stale_after_restart(
    tmp_path,
    monkeypatch,
):
    now = [100.0]
    monkeypatch.setattr("src.top_picks.service.time.time", lambda: now[0])
    cache_path = tmp_path / "top-picks-cache.json"
    first_cache = TopPicksSnapshotCache(
        clock=lambda: 100.0,
        persistence_path=str(cache_path),
        stale_ttl_seconds=600,
    )

    first_cache.set(
        ("top-picks", "full"),
        {"rows": [{"symbol": "AAA"}]},
        ttl_seconds=600,
    )
    now[0] = 200.0
    restarted_cache = TopPicksSnapshotCache(
        clock=lambda: 200.0,
        persistence_path=str(cache_path),
        stale_ttl_seconds=600,
    )

    value, status = restarted_cache.get(("top-picks", "full"))

    assert status == "stale"
    assert value == {"rows": [{"symbol": "AAA"}]}


def test_snapshot_cache_keeps_expired_persisted_values_as_startup_fallback(
    tmp_path,
    monkeypatch,
):
    now = [100.0]
    monkeypatch.setattr("src.top_picks.service.time.time", lambda: now[0])
    cache_path = tmp_path / "top-picks-cache.json"
    first_cache = TopPicksSnapshotCache(
        clock=lambda: 100.0,
        persistence_path=str(cache_path),
        stale_ttl_seconds=10,
    )

    first_cache.set(
        ("top-picks", "full"),
        {"rows": [{"symbol": "AAA"}]},
        ttl_seconds=1,
    )
    now[0] = 111.0
    restarted_cache = TopPicksSnapshotCache(
        clock=lambda: 200.0,
        persistence_path=str(cache_path),
        stale_ttl_seconds=10,
    )

    value, status = restarted_cache.get(("top-picks", "full"))

    assert status == "stale"
    assert value == {"rows": [{"symbol": "AAA"}]}


def test_snapshot_cache_returns_latest_persisted_snapshot_for_new_key(
    tmp_path,
    monkeypatch,
):
    now = [100.0]
    monkeypatch.setattr("src.top_picks.service.time.time", lambda: now[0])
    cache_path = tmp_path / "top-picks-cache.json"
    first_cache = TopPicksSnapshotCache(
        clock=lambda: 100.0,
        persistence_path=str(cache_path),
        stale_ttl_seconds=10,
    )

    first_cache.set(
        ("top-picks", "2026-07-31"),
        {"rows": [{"symbol": "AAA"}]},
        ttl_seconds=1,
    )
    now[0] = 200_000.0
    restarted_cache = TopPicksSnapshotCache(
        clock=lambda: 200_000.0,
        persistence_path=str(cache_path),
        stale_ttl_seconds=10,
    )

    exact_value, exact_status = restarted_cache.get(
        ("top-picks", "2026-08-01")
    )
    latest_value, latest_status = restarted_cache.get_latest_stale(
        excluded_key=("top-picks", "2026-08-01")
    )

    assert exact_status == "miss"
    assert exact_value is None
    assert latest_status == "stale"
    assert latest_value == {"rows": [{"symbol": "AAA"}]}


def test_snapshot_cache_persists_only_latest_fallbacks_by_prefix(
    tmp_path,
):
    cache_path = tmp_path / "top-picks-cache.json"
    cache = TopPicksSnapshotCache(
        clock=lambda: 100.0,
        persistence_path=str(cache_path),
        stale_ttl_seconds=10,
    )

    cache.set(
        ("top-picks-snapshot", "1Y", "2026-07-31"),
        {"rows": [{"symbol": "OLD"}]},
        ttl_seconds=10,
    )
    cache.set(
        ("top-picks-snapshot", "1Y", "2026-08-01"),
        {"rows": [{"symbol": "NEW"}]},
        ttl_seconds=10,
    )
    cache.set(
        ("top-picks-snapshot", "1D", "2026-08-01"),
        {"rows": [{"symbol": "DAY"}]},
        ttl_seconds=10,
    )

    payload = json.loads(cache_path.read_text(encoding="utf-8"))
    persisted_values = [
        entry["value"]["rows"][0]["symbol"]
        for entry in payload["entries"].values()
    ]

    assert sorted(persisted_values) == ["DAY", "NEW"]


def test_service_refreshes_other_windows_after_cache_miss(monkeypatch):
    class ImmediateThread:
        def __init__(self, target, daemon):
            self._target = target
            self.daemon = daemon

        def start(self):
            self._target()

    class RecordingService(TopPicksService):
        def __init__(self):
            super().__init__(
                ticker_repository=FakeTickerRepository(),
                calculator_provider=calculator_provider,
                market_data_provider=lambda *args: pd.DataFrame(),
                today_provider=lambda: date(2026, 7, 31),
            )
            self.built_windows = []

        def _build_snapshot(self, start_date, end_date, window="1Y"):
            self.built_windows.append(window)
            return {
                "rows": [{
                    "symbol": "AAA",
                    "name": "Alpha Ltd",
                    "industry": "Technology",
                    "ret1y": 0.1,
                    "sharpe": None,
                    "sortino": None,
                    "volatility": None,
                    "maxDD": None,
                    "beta": None,
                    "alpha": None,
                    "infoRatio": None,
                    "metricStatus": {"sortino": "unavailable"},
                }],
                "metadata": {
                    "window": service_module.WINDOW_METHODS[window],
                    "windowCode": window,
                },
                "warnings": [],
            }

    monkeypatch.setattr(service_module, "Thread", ImmediateThread)
    service = RecordingService()

    service.get_page(TopPicksRequest(1, 25, "ret1y", "desc", "1D"))

    assert service.built_windows == ["1D", "1W", "1M", "1Y"]


def test_service_can_disable_snapshot_cache_with_zero_ttl():
    class CountingTickerRepository:
        def __init__(self):
            self.calls = 0

        def list_tickers(self, limit):
            self.calls += 1
            return FakeTickerRepository().list_tickers(limit)

    repository = CountingTickerRepository()
    service = TopPicksService(
        ticker_repository=repository,
        calculator_provider=calculator_provider,
        market_data_provider=lambda *args: pd.DataFrame(),
        information_ratio_provider=lambda *args: {
            "AAA": 0.65,
            "BBB": 0.30,
        },
        observation_count_provider=lambda *args: {
            "AAA": 252,
            "BBB": 252,
        },
        cache_ttl_seconds=0,
        today_provider=lambda: date(2026, 7, 31),
    )

    service.get_page(TopPicksRequest(1, 2, "sharpe", "desc"))
    service.get_page(TopPicksRequest(1, 2, "sharpe", "desc"))

    assert repository.calls == 2
