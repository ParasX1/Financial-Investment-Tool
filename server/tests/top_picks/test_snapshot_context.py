from datetime import date
import json

import pytest

from src.top_picks import service as service_module
from src.top_picks.contracts import TopPicksRequest
from src.top_picks.service import TopPicksService, TopPicksSnapshotCache


class DeferredThread:
    def __init__(self, target, daemon):
        self.target = target

    def start(self):
        pass


class RecordingService(TopPicksService):
    def __init__(self, cache, today, **configuration):
        super().__init__(
            ticker_repository=None,
            calculator_provider=None,
            market_data_provider=None,
            snapshot_cache=cache,
            today_provider=lambda: today,
            **configuration,
        )
        self.built_windows = []

    def _build_snapshot(self, start_date, end_date, window="1Y"):
        self.built_windows.append(window)
        rows = [{"symbol": f"{window}-{end_date}", "ret1y": 0.1}]
        return {
            "rows": rows,
            "metadata": self._build_snapshot_metadata(
                start_date, end_date, window, rows, {},
            ),
            "warnings": [],
        }


@pytest.mark.parametrize("cached_window", ["1D", "1W", "1M"])
@pytest.mark.parametrize("force_refresh", [False, True])
def test_annual_request_never_falls_back_to_another_window(
    monkeypatch, cached_window, force_refresh,
):
    monkeypatch.setattr(service_module, "Thread", DeferredThread)
    cache = TopPicksSnapshotCache()
    service = RecordingService(cache, date(2026, 7, 31))
    service.get_page(TopPicksRequest(1, 25, "ret1y", "desc", cached_window))

    response = service.get_page(TopPicksRequest(
        1, 25, "ret1y", "desc", "1Y", force_refresh=force_refresh,
    ))

    assert response["metadata"]["windowCode"] == "1Y"
    assert response["data"]["rows"][0]["symbol"] == "1Y-2026-07-31"
    assert response["metadata"]["cacheStatus"] == "miss"
    assert service.built_windows == [cached_window, "1Y"]


@pytest.mark.parametrize("configuration", [
    {"benchmark_ticker": "^GSPC"},
    {"risk_free_rate": 0.01},
    {"universe_limit": 10},
])
@pytest.mark.parametrize("window", ["1D", "1Y"])
@pytest.mark.parametrize("force_refresh", [False, True])
def test_stale_fallback_never_changes_calculation_assumptions(
    monkeypatch, configuration, window, force_refresh,
):
    monkeypatch.setattr(service_module, "Thread", DeferredThread)
    cache = TopPicksSnapshotCache()
    original = RecordingService(cache, date(2026, 7, 31))
    original.get_page(TopPicksRequest(1, 25, "ret1y", "desc", window))
    changed = RecordingService(cache, date(2026, 8, 1), **configuration)

    response = changed.get_page(TopPicksRequest(
        1, 25, "ret1y", "desc", window, force_refresh=force_refresh,
    ))

    assert response["metadata"]["cacheStatus"] == "miss"
    assert response["data"]["rows"][0]["symbol"] == f"{window}-2026-08-01"
    assert changed.built_windows == [window]


@pytest.mark.parametrize("restart", [False, True])
@pytest.mark.parametrize("window", ["1D", "1Y"])
@pytest.mark.parametrize("force_refresh", [False, True])
def test_same_context_snapshot_survives_date_change_and_restart(
    monkeypatch, tmp_path, restart, window, force_refresh,
):
    monkeypatch.setattr(service_module, "Thread", DeferredThread)
    cache_path = str(tmp_path / "snapshots.json")
    cache = TopPicksSnapshotCache(persistence_path=cache_path)
    original = RecordingService(cache, date(2026, 7, 31))
    original_response = original.get_page(
        TopPicksRequest(1, 25, "ret1y", "desc", window)
    )
    if restart:
        cache = TopPicksSnapshotCache(persistence_path=cache_path)
    changed = RecordingService(cache, date(2026, 8, 1))

    response = changed.get_page(TopPicksRequest(
        1, 25, "ret1y", "desc", window, force_refresh=force_refresh,
    ))

    assert response["data"] == original_response["data"]
    assert response["metadata"]["generatedAt"] == (
        original_response["metadata"]["generatedAt"]
    )
    assert response["metadata"]["requestedEnd"] == "2026-07-31"
    assert response["metadata"]["cacheStatus"] == "stale"
    assert response["metadata"]["snapshotRefreshing"] is True
    assert changed.built_windows == []


def test_restart_keeps_latest_fallback_for_each_calculation_context(
    monkeypatch, tmp_path,
):
    monkeypatch.setattr(service_module, "Thread", DeferredThread)
    cache_path = str(tmp_path / "snapshots.json")
    cache = TopPicksSnapshotCache(persistence_path=cache_path)
    original = RecordingService(cache, date(2026, 7, 31))
    original.get_page(TopPicksRequest(1, 25, "ret1y", "desc"))
    other_context = RecordingService(
        cache, date(2026, 8, 1), benchmark_ticker="^GSPC",
    )
    other_response = other_context.get_page(
        TopPicksRequest(1, 25, "ret1y", "desc")
    )
    assert other_response["metadata"]["benchmark"] == "^GSPC"
    restarted = RecordingService(
        TopPicksSnapshotCache(persistence_path=cache_path), date(2026, 8, 2),
    )

    response = restarted.get_page(TopPicksRequest(1, 25, "ret1y", "desc"))

    assert response["metadata"]["benchmark"] == "^AXJO"
    assert response["metadata"]["requestedEnd"] == "2026-07-31"
    assert response["data"]["rows"][0]["symbol"] == "1Y-2026-07-31"
    assert restarted.built_windows == []


@pytest.mark.parametrize("force_refresh", [False, True])
def test_previous_calculation_cache_key_requires_recalculation(
    monkeypatch, tmp_path, force_refresh,
):
    monkeypatch.setattr(service_module, "Thread", DeferredThread)
    cache_path = tmp_path / "snapshots.json"
    legacy_key = json.dumps([
        "top-picks-snapshot", "1Y", "^AXJO", 0.0435, 1000,
        "2025-07-31", "2026-07-31",
    ], separators=(",", ":"))
    cache_path.write_text(json.dumps({
        "latest_key": legacy_key,
        "entries": {
            legacy_key: {
                "value": {
                    "rows": [{"symbol": "LEGACY", "ret1y": 0.1}],
                    "metadata": {
                        "windowCode": "1Y", "benchmark": "^AXJO",
                        "requestedEnd": "2026-07-31",
                    },
                    "warnings": [],
                },
            },
        },
    }), encoding="utf-8")
    restarted = RecordingService(
        TopPicksSnapshotCache(persistence_path=str(cache_path)),
        date(2026, 8, 1),
    )

    response = restarted.get_page(TopPicksRequest(
        1, 25, "ret1y", "desc", force_refresh=force_refresh,
    ))

    assert response["data"]["rows"][0]["symbol"] == "1Y-2026-08-01"
    assert response["metadata"]["requestedEnd"] == "2026-08-01"
    assert response["metadata"]["calculationVersion"] == 2
    assert response["metadata"]["cacheStatus"] == "miss"
    assert restarted.built_windows == ["1Y"]
