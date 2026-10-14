from datetime import date
import json
import logging
from unittest.mock import Mock

import pytest

from src.top_picks import service as service_module
from src.top_picks import snapshot_cache as snapshot_cache_module
from src.top_picks.contracts import TopPicksRequest
from src.top_picks.service import TopPicksSnapshotCache
from src.server import create_app
from tests.top_picks.test_snapshot_context import DeferredThread, RecordingService


KEY = ("top-picks-snapshot", "1Y", "^AXJO", 0.0435, 1000, 2,
       "2025-07-31", "2026-07-31")
SNAPSHOT = {
    "rows": [{"symbol": "AAA", "ret1y": 0.1}],
    "metadata": {"windowCode": "1Y", "benchmark": "^AXJO", "calculationVersion": 2,
                 "requestedStart": "2025-07-31", "requestedEnd": "2026-07-31"},
    "warnings": [],
}


def write_cache(tmp_path, payload):
    path = tmp_path / "snapshot.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    return str(path)


@pytest.mark.parametrize("phase", ["temporary_file", "write", "replace"])
def test_failed_persistence_is_diagnosed_without_losing_memory_snapshot(
    tmp_path, monkeypatch, caplog, phase,
):
    path = tmp_path / "private-cache-location.json"
    cache = TopPicksSnapshotCache(persistence_path=str(path))
    cache.set(KEY, SNAPSHOT, 600)
    previous_bytes = path.read_bytes()
    updated = {**SNAPSHOT, "warnings": ["private-snapshot-payload"]}
    failure = PermissionError("private-error-detail", str(path))
    if phase == "temporary_file":
        monkeypatch.setattr(
            snapshot_cache_module, "NamedTemporaryFile", Mock(side_effect=failure),
        )
    elif phase == "write":
        def failed_write(payload, handle, **kwargs):
            handle.write('{"incomplete":')
            raise failure

        monkeypatch.setattr(snapshot_cache_module.json, "dump", failed_write)
    else:
        monkeypatch.setattr(
            snapshot_cache_module.os, "replace", Mock(side_effect=failure),
        )

    with caplog.at_level(logging.WARNING):
        cache.set(KEY, updated, 600)

    assert cache.get(KEY) == (updated, "hit")
    assert cache.get_latest_stale(prefix=KEY[:-2]) == (updated, "stale")
    assert path.read_bytes() == previous_bytes
    assert list(tmp_path.iterdir()) == [path]
    assert len(caplog.records) == 1
    record = caplog.records[0]
    assert record.levelno == logging.WARNING
    assert record.getMessage() == (
        "Top Picks snapshot persistence failed; continuing with the in-memory cache."
    )
    assert record.exc_info is None
    assert "private-" not in caplog.text


@pytest.mark.parametrize("persist", [False, True])
def test_successful_or_disabled_persistence_has_no_failure_warning(
    tmp_path, caplog, persist,
):
    path = tmp_path / "snapshot.json"
    cache = TopPicksSnapshotCache(
        persistence_path=str(path) if persist else None,
    )

    with caplog.at_level(logging.WARNING):
        cache.set(KEY, SNAPSHOT, 600)

    assert cache.get(KEY) == (SNAPSHOT, "hit")
    assert path.exists() is persist
    assert caplog.records == []


@pytest.mark.parametrize("payload", [None, [], 7, "private-broken-payload", {"entries": []}])
def test_invalid_cache_root_is_diagnosed_and_rebuilt(tmp_path, monkeypatch, caplog, payload):
    monkeypatch.setattr(service_module, "Thread", DeferredThread)
    cache = TopPicksSnapshotCache(persistence_path=write_cache(tmp_path, payload))
    service = RecordingService(cache, date(2026, 8, 1))

    response = service.get_page(TopPicksRequest(1, 25, "ret1y", "desc"))

    assert response["metadata"]["cacheStatus"] == "miss"
    assert service.built_windows == ["1Y"]
    assert "invalid" in caplog.text.lower()
    assert "private-broken-payload" not in caplog.text


@pytest.mark.parametrize("raw_key", [
    '[["private-broken-key"]]', '[{"private-broken-key": 1}]',
    '[NaN]', '[]', '"scalar"', 'not json',
])
def test_invalid_entry_or_latest_key_does_not_hide_compatible_snapshot(tmp_path, caplog, raw_key):
    valid_key = json.dumps(KEY)
    cache = TopPicksSnapshotCache(persistence_path=write_cache(tmp_path, {
        "latest_key": raw_key,
        "entries": {raw_key: {"value": SNAPSHOT}, valid_key: {"value": SNAPSHOT}},
    }))

    assert cache.get(KEY) == (SNAPSHOT, "stale")
    assert cache.get_latest_stale(prefix=KEY[:-2]) == (SNAPSHOT, "stale")
    assert set(cache._entries) == {KEY}
    assert "invalid" in caplog.text.lower()
    assert "private-broken-key" not in caplog.text


@pytest.mark.parametrize("value", [
    None, 7, [], {},
    {**SNAPSHOT, "rows": [None]},
    {**SNAPSHOT, "rows": {}},
    {**SNAPSHOT, "rows": [{"symbol": "AAA", "metricStatus": []}]},
    {**SNAPSHOT, "rows": [{"symbol": "AAA", "ret1y": "private-broken-value"}]},
    {**SNAPSHOT, "rows": [{"symbol": "AAA", "ret1y": 10 ** 1000}]},
    {**SNAPSHOT, "metadata": []},
    {**SNAPSHOT, "metadata": {"windowCode": "1D"}},
    {**SNAPSHOT, "metadata": {"window": "trailing_day"}},
    {**SNAPSHOT, "metadata": {"assumptions": {"benchmark": "^GSPC"}}},
    {**SNAPSHOT, "metadata": {"assumptions": {"riskFreeRateAnnual": 0.8}}},
    {**SNAPSHOT, "metadata": {"assumptions": {"universeLimit": 1}}},
    {**SNAPSHOT, "metadata": {"assumptions": {"window": "trailing_day"}}},
    {**SNAPSHOT, "metadata": {"assumptions": []}},
    {**SNAPSHOT, "warnings": "private-broken-value"},
])
def test_invalid_snapshot_value_is_rebuilt_instead_of_served(tmp_path, monkeypatch, caplog, value):
    monkeypatch.setattr(service_module, "Thread", DeferredThread)
    raw_key = json.dumps(KEY)
    cache = TopPicksSnapshotCache(persistence_path=write_cache(tmp_path, {
        "latest_key": raw_key, "entries": {raw_key: {"value": value}},
    }))
    service = RecordingService(cache, date(2026, 8, 1))

    response = service.get_page(TopPicksRequest(1, 25, "sortino", "desc"))

    assert response["metadata"]["cacheStatus"] == "miss"
    assert service.built_windows == ["1Y"]
    assert "invalid" in caplog.text.lower()
    assert "private-broken-value" not in caplog.text


def test_matching_assumptions_only_versioned_snapshot_keeps_stale_fallback(tmp_path):
    value = {**SNAPSHOT, "metadata": {"calculationVersion": 2, "assumptions": {
        "benchmark": "^AXJO", "riskFreeRateAnnual": 0.0435,
        "universeLimit": 1000, "window": "trailing_one_year",
    }}}
    raw_key = json.dumps(KEY)
    cache = TopPicksSnapshotCache(persistence_path=write_cache(tmp_path, {
        "latest_key": raw_key, "entries": {raw_key: {"value": value}},
    }))

    assert cache.get(KEY) == (value, "stale")


def test_generic_legacy_cache_namespace_keeps_dictionary_values(tmp_path):
    key = ("top-picks", "1D", "legacy-cache-client")
    value = {"cached": "generic legacy value"}
    raw_key = json.dumps(key)
    cache = TopPicksSnapshotCache(persistence_path=write_cache(tmp_path, {
        "latest_key": raw_key, "entries": {raw_key: {"value": value}},
    }))
    assert cache.get(key) == (value, "stale")


@pytest.mark.parametrize("payload", [None, [], 7])
def test_corrupt_persistence_does_not_block_first_lazy_http_request(tmp_path, payload):
    service = Mock()
    service.get_page.return_value = {"data": {"rows": [], "total": 0}, "metadata": {}, "warnings": []}
    factory = Mock(return_value=service)
    app = create_app({
        "TESTING": True, "TOP_PICKS_CACHE_PATH": write_cache(tmp_path, payload),
        "TOP_PICKS_HISTORY_PATH": "", "TOP_PICKS_SEED_PATH": "",
    }, supabase_client=object(), top_picks_service_factory=factory)
    factory.assert_not_called()

    response = app.test_client().post("/api/top-picks", json={})

    assert response.status_code == 200
    factory.assert_called_once()
    assert factory.call_args.kwargs["snapshot_cache"].get_latest_stale() == (None, "miss")
