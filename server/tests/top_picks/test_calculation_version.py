"""A new calculation policy cannot serve or re-export old derived results."""

import json
from datetime import date
from pathlib import Path
import sqlite3
from unittest.mock import Mock
from zipfile import ZipFile

import pytest
import pandas as pd

from src.top_picks.bootstrap import _prepare_snapshots, bootstrap_top_picks_cache
from src.top_picks.service import TopPicksService, TopPicksSnapshotCache
from src.top_picks.history import TopPicksHistoryProvider
from src.top_picks.analytics import count_return_observations
from src.top_picks.contracts import TopPicksRequest
from src.top_picks import service as service_module
from tests.top_picks.test_snapshot_context import DeferredThread, RecordingService


SEED = Path(__file__).resolve().parents[3] / "data" / "top-picks-seed.zip"


def test_old_persisted_snapshot_does_not_load_under_new_calculation_policy(tmp_path):
    path = tmp_path / "snapshots.json"
    key = ("top-picks-snapshot", "1Y", "^AXJO", 0.0435, 1000,
           "2025-10-07", "2026-10-07")
    cache = TopPicksSnapshotCache(persistence_path=str(path))
    cache.set(key, {"rows": [{"symbol": "AAA", "volatility": 123.0}]}, 600)
    loaded = TopPicksSnapshotCache(persistence_path=str(path))
    assert loaded.get(key) == (None, "miss")
    assert loaded.get_latest_stale() == (None, "miss")


def test_new_snapshot_key_and_metadata_identify_calculation_policy():
    service = TopPicksService(
        ticker_repository=Mock(), calculator_provider=Mock(), market_data_provider=Mock(),
    )
    key = service._snapshot_cache_key("1Y", "2025-10-07", "2026-10-07")
    assert key == ("top-picks-snapshot", "1Y", "^AXJO", 0.0435, 1000,
                   2, "2025-10-07", "2026-10-07")
    metadata = service._build_snapshot_metadata("2025-10-07", "2026-10-07", "1Y", [], {})
    assert metadata["calculationVersion"] == 2


def test_shipped_version_one_seed_installs_history_without_obsolete_snapshots(tmp_path):
    with ZipFile(SEED) as archive:
        assert json.loads(archive.read("manifest.json"))["calculation_version"] == 1
        expected_history = archive.read("history.sqlite3")
    snapshot = tmp_path / "snapshots.json"
    history = tmp_path / "history.sqlite3"
    result = bootstrap_top_picks_cache(str(SEED), str(snapshot), str(history))
    assert result == {"snapshot": False, "history": True}
    assert not snapshot.exists()
    assert history.read_bytes() == expected_history


def test_export_rejects_old_results_instead_of_relabeling_as_version_two():
    with ZipFile(SEED) as archive:
        old_snapshots = json.loads(archive.read("snapshot.json"))
    with pytest.raises(ValueError):
        _prepare_snapshots(old_snapshots)


def test_history_round_trip_preserves_missing_endpoints_and_cleans_old_prices(tmp_path):
    path = tmp_path / "history.sqlite3"
    dates = pd.date_range("2025-10-01", periods=6, freq="B")
    frame = pd.DataFrame({("AAA", "Adj Close"): [100, 110, 0, 99, 118.8, 95.04]}, index=dates)
    provider = TopPicksHistoryProvider(lambda *args: frame.copy(), str(path), clock=lambda: 100)
    actual = provider(["AAA"], "2025-10-01", "2025-10-08")
    assert count_return_observations(actual, ["AAA"]) == {"AAA": 3}
    with sqlite3.connect(path) as connection:
        payload = json.loads(connection.execute("SELECT payload FROM adjusted_history").fetchone()[0])
    assert payload["dates"] == dates.strftime("%Y-%m-%d").tolist()
    assert payload["values"] == [100, 110, None, 99, 118.8, 95.04]
    restarted = TopPicksHistoryProvider(lambda *args: frame.copy(), str(path), clock=lambda: 101)
    restored = restarted(["AAA"], "2025-10-01", "2025-10-08")
    pd.testing.assert_frame_equal(actual, restored)


def test_version_two_cold_snapshot_restarts_as_same_context_stale_fallback(tmp_path, monkeypatch):
    monkeypatch.setattr(service_module, "Thread", DeferredThread)
    path = str(tmp_path / "snapshots.json")
    cold = RecordingService(TopPicksSnapshotCache(persistence_path=path), date(2026, 7, 31))
    first = cold.get_page(TopPicksRequest(1, 25, "ret1y", "desc"))
    assert first["metadata"]["cacheStatus"] == "miss"
    assert first["metadata"]["calculationVersion"] == 2
    restarted = RecordingService(TopPicksSnapshotCache(persistence_path=path), date(2026, 8, 1))
    fallback = restarted.get_page(TopPicksRequest(1, 25, "ret1y", "desc"))
    assert fallback["data"] == first["data"]
    assert fallback["metadata"]["requestedEnd"] == "2026-07-31"
    assert fallback["metadata"]["cacheStatus"] == "stale"
    assert fallback["metadata"]["snapshotRefreshing"] is True
    assert restarted.built_windows == []
    other_context = RecordingService(
        TopPicksSnapshotCache(persistence_path=path), date(2026, 8, 1), benchmark_ticker="^GSPC",
    )
    other = other_context.get_page(TopPicksRequest(1, 25, "ret1y", "desc"))
    assert other["metadata"]["cacheStatus"] == "miss"
    assert other["metadata"]["benchmark"] == "^GSPC"
    assert other_context.built_windows == ["1Y"]


@pytest.mark.parametrize("version", [None, 1, 3, "2"])
def test_current_key_cannot_relabel_incompatible_snapshot_metadata(tmp_path, monkeypatch, caplog, version):
    monkeypatch.setattr(service_module, "Thread", DeferredThread)
    path = str(tmp_path / "snapshots.json")
    cold = RecordingService(TopPicksSnapshotCache(persistence_path=path), date(2026, 7, 31))
    snapshot = cold._build_snapshot("2025-07-31", "2026-07-31")
    if version is None:
        snapshot["metadata"].pop("calculationVersion")
    else:
        snapshot["metadata"]["calculationVersion"] = version
    key = cold._snapshot_cache_key("1Y", "2025-07-31", "2026-07-31")
    cold._snapshot_cache.set(key, snapshot, 600)
    restarted = RecordingService(TopPicksSnapshotCache(persistence_path=path), date(2026, 8, 1))
    response = restarted.get_page(TopPicksRequest(1, 25, "ret1y", "desc"))
    assert response["metadata"]["cacheStatus"] == "miss"
    assert response["metadata"]["calculationVersion"] == 2
    assert response["metadata"]["requestedEnd"] == "2026-08-01"
    assert restarted.built_windows == ["1Y"]
    assert "invalid" in caplog.text.lower()


@pytest.mark.parametrize("version", [1, 3, "2"])
def test_incompatible_key_version_cannot_hide_current_same_context_snapshot(tmp_path, caplog, version):
    path = str(tmp_path / "snapshots.json")
    service = RecordingService(TopPicksSnapshotCache(persistence_path=path), date(2026, 7, 31))
    valid_key = service._snapshot_cache_key("1Y", "2025-07-31", "2026-07-31")
    valid = service._build_snapshot("2025-07-31", "2026-07-31")
    wrong_key = (*valid_key[:5], version, *valid_key[-2:])
    wrong = {**valid, "metadata": {**valid["metadata"], "calculationVersion": version}}
    service._snapshot_cache.set(valid_key, valid, 600)
    service._snapshot_cache.set(wrong_key, wrong, 600)
    loaded = TopPicksSnapshotCache(persistence_path=path)
    assert loaded.get(wrong_key) == (None, "miss")
    assert loaded.get_latest_stale(prefix=valid_key[:-2]) == (valid, "stale")
    assert loaded.get_latest_stale() == (valid, "stale")
    assert "invalid" in caplog.text.lower()
