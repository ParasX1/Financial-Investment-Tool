from contextlib import closing
from datetime import date
import hashlib
import json
import os
from pathlib import Path
import sqlite3
from unittest.mock import Mock
from zipfile import ZIP_DEFLATED, ZipFile

import numpy as np
import pandas as pd
import pytest

from src.top_picks.batch_analytics import calculate_yearly_metrics
from src.top_picks import bootstrap as bootstrap_module
from src.top_picks import service as service_module
from src.top_picks.bootstrap import (
    bootstrap_top_picks_cache,
    create_seed_archive,
)
from src.top_picks.contracts import Ticker
from src.top_picks.history import TopPicksHistoryProvider
from src.top_picks.service import (
    TOP_PICKS_WINDOWS,
    TopPicksService,
    TopPicksSnapshotCache,
)


TODAY = date(2026, 10, 4)


def _write_seed_archive(directory):
    directory.mkdir(parents=True, exist_ok=True)
    snapshot_path = directory / "source-snapshot.json"
    history_path = directory / "source-history.sqlite3"
    seed_path = directory / "seed.zip"
    dates = pd.date_range("2025-10-04", "2026-10-04", freq="B")
    steps = np.arange(len(dates))
    frame = pd.DataFrame(
        np.column_stack((
            100 + steps + 2 * np.sin(steps),
            80 + 0.3 * steps + 0.8 * np.sin(steps),
        )),
        index=dates,
        columns=pd.MultiIndex.from_tuples([
            ("AAA", "Adj Close"), ("^AXJO", "Adj Close"),
        ]),
    )
    repository = Mock()
    repository.list_tickers.return_value = (
        Ticker("AAA", "Alpha Ltd", "Technology"),
    )
    cache = TopPicksSnapshotCache(persistence_path=str(snapshot_path))
    service = TopPicksService(
        ticker_repository=repository,
        calculator_provider=Mock(side_effect=AssertionError(
            "Batch calculations must not call legacy calculators.")),
        market_data_provider=Mock(side_effect=AssertionError(
            "The fixture supplies local market data.")),
        yearly_metrics_provider=calculate_yearly_metrics,
        snapshot_cache=cache,
        today_provider=lambda: TODAY,
    )
    keys = {}
    for window in TOP_PICKS_WINDOWS:
        start = service._start_date_for_window(TODAY, window)
        snapshot = service._build_snapshot(
            start, TODAY.isoformat(), window,
            market_data=frame.loc[start:TODAY.isoformat()].copy(),
        )
        key = service._snapshot_cache_key(window, start, TODAY.isoformat())
        cache.set(key, snapshot, 600)
        keys[window] = key
    history = TopPicksHistoryProvider(
        lambda symbols, start, end: frame.loc[start:end].copy(),
        str(history_path),
    )
    history(["AAA", "^AXJO"], "2025-10-04", TODAY.isoformat())
    manifest = create_seed_archive(
        str(snapshot_path), str(history_path), str(seed_path),
    )
    return {
        "seed": seed_path, "snapshot": snapshot_path,
        "history": history_path, "keys": keys,
        "frame": frame, "manifest": manifest,
    }


@pytest.fixture
def seed_archive(tmp_path):
    return _write_seed_archive(tmp_path / "source")


def _rewrite_archive(path, kind):
    with ZipFile(path) as archive:
        contents = {name: archive.read(name) for name in archive.namelist()}
    manifest = json.loads(contents["manifest.json"])
    if kind == "hash":
        contents["snapshot.json"] += b" "
    elif kind == "missing_history":
        contents.pop("history.sqlite3")
    elif kind == "extra_member":
        contents["../outside.txt"] = b"must not be written"
    elif kind == "format_version":
        manifest["format_version"] = 99
    elif kind == "calculation_version":
        manifest["calculation_version"] = 99
    elif kind in {"duplicate_symbol", "window_metadata", "generated_at"}:
        snapshot = json.loads(contents["snapshot.json"])
        value = next(iter(snapshot["entries"].values()))["value"]
        if kind == "duplicate_symbol":
            value["rows"].append(dict(value["rows"][0]))
            value["metadata"]["universeCount"] = len(value["rows"])
        elif kind == "window_metadata":
            value["metadata"]["windowCode"] = "invalid"
        else:
            value["metadata"]["generatedAt"] = "not-a-time"
        contents["snapshot.json"] = json.dumps(snapshot).encode()
        manifest["files"]["snapshot.json"] = {
            "bytes": len(contents["snapshot.json"]),
            "sha256": hashlib.sha256(contents["snapshot.json"]).hexdigest(),
        }
    else:
        raise AssertionError(kind)
    contents["manifest.json"] = json.dumps(manifest).encode()
    with ZipFile(path, "w", compression=ZIP_DEFLATED) as archive:
        for name, content in contents.items():
            archive.writestr(name, content)


def _mutate_snapshot(path, mutate):
    with ZipFile(path) as archive:
        contents = {name: archive.read(name) for name in archive.namelist()}
    payload = json.loads(contents["snapshot.json"])
    mutate(payload)
    contents["snapshot.json"] = json.dumps(payload).encode()
    manifest = json.loads(contents["manifest.json"])
    manifest["files"]["snapshot.json"] = {
        "bytes": len(contents["snapshot.json"]),
        "sha256": hashlib.sha256(contents["snapshot.json"]).hexdigest(),
    }
    contents["manifest.json"] = json.dumps(manifest).encode()
    with ZipFile(path, "w", compression=ZIP_DEFLATED) as archive:
        for name, content in contents.items():
            archive.writestr(name, content)


def test_seed_import_displays_stale_snapshots_and_reuses_incremental_history(
    seed_archive, tmp_path,
):
    snapshot_path = tmp_path / "runtime" / "snapshot.json"
    history_path = tmp_path / "runtime" / "history.sqlite3"

    result = bootstrap_top_picks_cache(
        str(seed_archive["seed"]), str(snapshot_path), str(history_path),
    )

    assert result == {"snapshot": True, "history": True}
    cache = TopPicksSnapshotCache(persistence_path=str(snapshot_path))
    source = TopPicksSnapshotCache(
        persistence_path=str(seed_archive["snapshot"]),
    )
    for key in seed_archive["keys"].values():
        snapshot, status = cache.get(key)
        assert status == "stale"
        assert snapshot == source.get(key)[0]
    frame = seed_archive["frame"]
    downloader = Mock(side_effect=lambda symbols, start, end:
                      frame.loc[start:end].copy())
    history = TopPicksHistoryProvider(downloader, str(history_path))
    actual = history(["AAA", "^AXJO"], "2025-10-04", TODAY.isoformat())
    assert downloader.call_args.args[1] == "2026-09-27"
    assert history.last_refresh["incremental_symbols"] == 2
    assert history.last_refresh["full_history_symbols"] == 0
    expected = frame.copy()
    expected.index = expected.index.strftime("%Y-%m-%d")
    pd.testing.assert_frame_equal(actual, expected)


@pytest.mark.parametrize("existing", ["snapshot", "history", "both"])
def test_existing_runtime_files_are_never_overwritten(
    seed_archive, tmp_path, existing,
):
    snapshot_path = tmp_path / "snapshot.json"
    history_path = tmp_path / "history.sqlite3"
    original = b"newer local cache must be preserved"
    if existing in {"snapshot", "both"}:
        snapshot_path.write_bytes(original)
    if existing in {"history", "both"}:
        history_path.write_bytes(original)
    if existing == "both":
        # Existing installations must not even need a readable archive.
        seed_archive["seed"].write_bytes(b"broken ZIP")

    result = bootstrap_top_picks_cache(
        str(seed_archive["seed"]), str(snapshot_path), str(history_path),
    )

    assert result == {
        "snapshot": existing == "history",
        "history": existing == "snapshot",
    }
    if existing in {"snapshot", "both"}:
        assert snapshot_path.read_bytes() == original
    if existing in {"history", "both"}:
        assert history_path.read_bytes() == original


@pytest.mark.parametrize("overrides", [
    {"benchmark_ticker": "SPY"},
    {"risk_free_rate": 0.025},
    {"universe_limit": 12},
    {"cache_ttl_seconds": 0},
])
def test_custom_assumptions_or_disabled_cache_import_only_history(
    seed_archive, tmp_path, overrides,
):
    snapshot_path = tmp_path / "snapshot.json"
    history_path = tmp_path / "history.sqlite3"

    result = bootstrap_top_picks_cache(
        str(seed_archive["seed"]), str(snapshot_path), str(history_path),
        **overrides,
    )

    assert result == {"snapshot": False, "history": True}
    assert not snapshot_path.exists()
    assert history_path.exists()


@pytest.mark.parametrize("kind", [
    "hash", "missing_history", "extra_member", "format_version",
    "calculation_version", "duplicate_symbol", "window_metadata",
    "generated_at",
])
def test_invalid_seed_is_ignored_without_installing_partial_files(
    seed_archive, tmp_path, kind,
):
    _rewrite_archive(seed_archive["seed"], kind)
    snapshot_path = tmp_path / "runtime" / "snapshot.json"
    history_path = tmp_path / "runtime" / "history.sqlite3"

    result = bootstrap_top_picks_cache(
        str(seed_archive["seed"]), str(snapshot_path), str(history_path),
    )

    assert result == {"snapshot": False, "history": False}
    assert not snapshot_path.exists()
    assert not history_path.exists()
    assert not (tmp_path / "outside.txt").exists()


@pytest.mark.parametrize("seed_content", [None, b"not a ZIP archive"])
def test_missing_or_corrupt_archive_falls_back_to_normal_cold_start(
    tmp_path, seed_content,
):
    seed_path = tmp_path / "seed.zip"
    if seed_content is not None:
        seed_path.write_bytes(seed_content)
    snapshot_path = tmp_path / "snapshot.json"
    history_path = tmp_path / "history.sqlite3"

    assert bootstrap_top_picks_cache(
        str(seed_path), str(snapshot_path), str(history_path),
    ) == {"snapshot": False, "history": False}
    assert not snapshot_path.exists()
    assert not history_path.exists()


def test_import_keeps_market_fields_and_discards_unknown_nested_fields(
    seed_archive, tmp_path,
):
    def add_unknown_fields(payload):
        payload["account"] = "private-account"
        for entry in payload["entries"].values():
            entry["token"] = "private-token"
            value = entry["value"]
            value["account"] = "private-account"
            metadata = value["metadata"]
            metadata["token"] = "private-token"
            for field in ("units", "observationsBySymbol", "assumptions", "methods"):
                metadata[field]["account"] = "private-account"
                metadata[field]["token"] = "private-token"
            for row in value["rows"]:
                row["account"] = "private-account"
                row["metricStatus"]["token"] = "private-token"

    _mutate_snapshot(seed_archive["seed"], add_unknown_fields)
    snapshot_path = tmp_path / "snapshot.json"

    assert bootstrap_top_picks_cache(
        str(seed_archive["seed"]), str(snapshot_path), None,
    ) == {"snapshot": True, "history": False}
    serialized = snapshot_path.read_text()
    assert "private-account" not in serialized
    assert "private-token" not in serialized
    cache = TopPicksSnapshotCache(persistence_path=str(snapshot_path))
    for key in seed_archive["keys"].values():
        snapshot, status = cache.get(key)
        assert status == "stale"
        assert snapshot["rows"][0]["symbol"] == "AAA"
        assert snapshot["metadata"]["observationsBySymbol"]["AAA"] >= 1


def test_non_object_snapshot_metadata_falls_back_without_creating_files(
    seed_archive, tmp_path,
):
    def invalidate_metadata(payload):
        next(iter(payload["entries"].values()))["value"]["metadata"] = None

    _mutate_snapshot(seed_archive["seed"], invalidate_metadata)
    snapshot_path = tmp_path / "snapshot.json"
    history_path = tmp_path / "history.sqlite3"

    assert bootstrap_top_picks_cache(
        str(seed_archive["seed"]), str(snapshot_path), str(history_path),
    ) == {"snapshot": False, "history": False}
    assert not snapshot_path.exists()
    assert not history_path.exists()


def test_another_writer_wins_atomic_publication_without_being_overwritten(
    monkeypatch, seed_archive, tmp_path,
):
    snapshot_path = tmp_path / "runtime" / "snapshot.json"
    newer = b"a concurrently created local snapshot"

    def concurrent_write(source, target):
        Path(target).write_bytes(newer)
        raise FileExistsError("Another process already created the target.")

    monkeypatch.setattr(bootstrap_module.os, "link", concurrent_write)

    assert bootstrap_top_picks_cache(
        str(seed_archive["seed"]), str(snapshot_path), None,
    ) == {"snapshot": False, "history": False}
    assert snapshot_path.read_bytes() == newer
    assert list(tmp_path.rglob(".top-picks-seed-*")) == []


@pytest.mark.parametrize("phase", ["write", "flush"])
def test_installation_io_failure_removes_temporary_files(
    monkeypatch, seed_archive, tmp_path, phase,
):
    original_temporary_file = bootstrap_module.NamedTemporaryFile

    def failing_temporary_file(*args, **kwargs):
        handle = original_temporary_file(*args, **kwargs)
        setattr(handle, phase, Mock(side_effect=OSError("Test disk failure.")))
        return handle

    monkeypatch.setattr(
        bootstrap_module, "NamedTemporaryFile", failing_temporary_file,
    )
    snapshot_path = tmp_path / "runtime" / "snapshot.json"

    assert bootstrap_top_picks_cache(
        str(seed_archive["seed"]), str(snapshot_path), None,
    ) == {"snapshot": False, "history": False}
    assert not snapshot_path.exists()
    assert list(tmp_path.rglob(".top-picks-seed-*")) == []


@pytest.mark.parametrize("empty_path", [None, ""])
def test_disabled_persistence_does_not_create_runtime_files(
    seed_archive, empty_path,
):
    assert bootstrap_top_picks_cache(
        str(seed_archive["seed"]), empty_path, empty_path,
    ) == {"snapshot": False, "history": False}


@pytest.mark.parametrize("probe", ["exists", "is_file"])
def test_optional_seed_path_probe_permission_failure_preserves_normal_startup(
    monkeypatch, seed_archive, tmp_path, probe,
):
    snapshot_path = tmp_path / "runtime" / "snapshot.json"
    history_path = tmp_path / "runtime" / "history.sqlite3"
    denied_path = snapshot_path if probe == "exists" else seed_archive["seed"]
    original_probe = getattr(Path, probe)

    def denied_probe(path):
        if path == denied_path:
            raise PermissionError("Test path cannot be inspected.")
        return original_probe(path)

    monkeypatch.setattr(Path, probe, denied_probe)

    assert bootstrap_top_picks_cache(
        str(seed_archive["seed"]), str(snapshot_path), str(history_path),
    ) == {"snapshot": False, "history": False}
    assert not snapshot_path.is_file()
    assert not history_path.is_file()


def test_export_manifest_describes_verified_complete_package(seed_archive):
    manifest = seed_archive["manifest"]
    assert manifest["format_version"] == 1
    assert manifest["calculation_version"] == 2
    assert manifest["assumptions"] == {
        "benchmark": "^AXJO", "riskFreeRate": 0.0435,
        "universeLimit": 1000,
    }
    assert set(manifest["windows"]) == set(TOP_PICKS_WINDOWS)
    assert all(window["rows"] == 1 for window in manifest["windows"].values())
    assert manifest["history"] == {
        "symbols": 2, "start": "2025-10-04", "end": "2026-10-04",
    }
    with ZipFile(seed_archive["seed"]) as archive:
        assert set(archive.namelist()) == {
            "snapshot.json", "history.sqlite3", "manifest.json",
        }
        for name, details in manifest["files"].items():
            content = archive.read(name)
            assert details["bytes"] == len(content)
            assert details["sha256"] == hashlib.sha256(content).hexdigest()


def test_export_ignores_old_formats_and_retains_latest_complete_results(
    seed_archive, tmp_path,
):
    payload = json.loads(seed_archive["snapshot"].read_text())
    latest_key = seed_archive["keys"]["1Y"]
    latest = payload["entries"][json.dumps(list(latest_key), separators=(",", ":"))]
    older = json.loads(json.dumps(latest))
    older["value"]["metadata"].update({
        "generatedAt": "2025-10-04T00:00:00+00:00",
        "requestedStart": "2024-10-04", "requestedEnd": "2025-10-04",
    })
    old_key = (*latest_key[:-2], "2024-10-04", "2025-10-04")
    payload["entries"][json.dumps(old_key)] = older
    payload["entries"][json.dumps(["top-picks-snapshot", "1Y"])] = {
        "value": {"obsolete_field": "legacy entries must not be exported"},
    }
    latest["value"]["rows"][0]["unrelated_field"] = "omit from release"
    latest["value"]["metadata"]["unrelated_field"] = "omit from release"
    seed_archive["snapshot"].write_text(json.dumps(payload))
    output_path = tmp_path / "filtered.zip"
    before_snapshot = seed_archive["snapshot"].read_bytes()
    before_history = seed_archive["history"].read_bytes()

    create_seed_archive(
        str(seed_archive["snapshot"]), str(seed_archive["history"]),
        str(output_path),
    )

    with ZipFile(output_path) as archive:
        exported = json.loads(archive.read("snapshot.json"))
    assert len(exported["entries"]) == 4
    newest = exported["entries"][json.dumps(list(latest_key), separators=(",", ":"))]["value"]
    assert newest["metadata"]["generatedAt"] != older["value"]["metadata"]["generatedAt"]
    assert "unrelated_field" not in newest["metadata"]
    assert "unrelated_field" not in newest["rows"][0]
    assert seed_archive["snapshot"].read_bytes() == before_snapshot
    assert seed_archive["history"].read_bytes() == before_history


def test_export_includes_committed_wal_updates_from_running_history_database(
    seed_archive, tmp_path,
):
    output_path = tmp_path / "wal-seed.zip"
    with closing(sqlite3.connect(seed_archive["history"])) as live:
        live.execute("PRAGMA journal_mode=WAL")
        payload = json.loads(live.execute(
            "SELECT payload FROM adjusted_history WHERE symbol='AAA'",
        ).fetchone()[0])
        payload["values"][-1] = 999.0
        live.execute(
            "UPDATE adjusted_history SET payload=? WHERE symbol='AAA'",
            (json.dumps(payload),),
        )
        live.commit()
        # Keep the writer open: copying just the main .sqlite3 file loses WAL.
        create_seed_archive(
            str(seed_archive["snapshot"]), str(seed_archive["history"]),
            str(output_path),
        )
        imported_path = tmp_path / "wal-imported.sqlite3"
        assert bootstrap_top_picks_cache(
            str(output_path), None, str(imported_path),
        ) == {"snapshot": False, "history": True}
        with closing(sqlite3.connect(imported_path)) as imported:
            actual = json.loads(imported.execute(
                "SELECT payload FROM adjusted_history WHERE symbol='AAA'",
            ).fetchone()[0])
            assert actual["values"][-1] == 999.0
            assert imported.execute("PRAGMA integrity_check").fetchone()[0] == "ok"


@pytest.mark.parametrize("invalid_source", ["incomplete", "legacy", "history"])
def test_export_rejects_incomplete_or_incompatible_cache_sources(
    seed_archive, tmp_path, invalid_source,
):
    if invalid_source == "history":
        with closing(sqlite3.connect(seed_archive["history"])) as db, db:
            db.execute("CREATE TABLE private_accounts (secret TEXT)")
    else:
        payload = json.loads(seed_archive["snapshot"].read_text())
        if invalid_source == "incomplete":
            payload["entries"].pop(next(iter(payload["entries"])))
        else:
            entries = {}
            for raw_key, entry in payload["entries"].items():
                key = json.loads(raw_key)
                entries[json.dumps([key[0], key[1], key[-2], key[-1]])] = entry
            payload["entries"] = entries
        seed_archive["snapshot"].write_text(json.dumps(payload))
    output_path = tmp_path / "bad-seed.zip"

    with pytest.raises(ValueError):
        create_seed_archive(
            str(seed_archive["snapshot"]), str(seed_archive["history"]),
            str(output_path),
        )
    assert not output_path.exists()


@pytest.mark.parametrize("invalid_payload", ["unknown_field", "date", "non_finite"])
def test_export_rejects_history_with_non_market_fields_or_invalid_prices(
    seed_archive, tmp_path, invalid_payload,
):
    with closing(sqlite3.connect(seed_archive["history"])) as db, db:
        payload = json.loads(db.execute(
            "SELECT payload FROM adjusted_history WHERE symbol='AAA'",
        ).fetchone()[0])
        if invalid_payload == "unknown_field":
            payload["account"] = "must not enter release data"
        elif invalid_payload == "date":
            payload["dates"][-1] = "not-a-date"
        else:
            payload["values"][-1] = float("nan")
        db.execute(
            "UPDATE adjusted_history SET payload=? WHERE symbol='AAA'",
            (json.dumps(payload),),
        )
    output_path = tmp_path / "invalid-history.zip"

    with pytest.raises(ValueError):
        create_seed_archive(
            str(seed_archive["snapshot"]), str(seed_archive["history"]),
            str(output_path),
        )
    assert not output_path.exists()


@pytest.mark.parametrize("target", ["snapshot", "history", "alias"])
def test_export_cannot_replace_either_source_cache_even_through_hard_link(
    seed_archive, tmp_path, target,
):
    if target == "alias":
        output_path = tmp_path / "source-alias.zip"
        os.link(seed_archive["snapshot"], output_path)
    else:
        output_path = seed_archive[target]
    before_snapshot = seed_archive["snapshot"].read_bytes()
    before_history = seed_archive["history"].read_bytes()

    with pytest.raises(ValueError):
        create_seed_archive(
            str(seed_archive["snapshot"]), str(seed_archive["history"]),
            str(output_path),
        )

    assert seed_archive["snapshot"].read_bytes() == before_snapshot
    assert seed_archive["history"].read_bytes() == before_history


@pytest.mark.parametrize("primary_key", ["none", "composite"])
def test_export_rejects_history_schema_without_exclusive_symbol_primary_key(
    seed_archive, tmp_path, primary_key,
):
    with closing(sqlite3.connect(seed_archive["history"])) as db, db:
        extra_constraint = ", PRIMARY KEY(symbol, start)" if primary_key == "composite" else ""
        db.execute(
            "CREATE TABLE replacement (symbol TEXT, start TEXT NOT NULL, "
            "end TEXT NOT NULL, reconciled_at REAL NOT NULL, payload TEXT NOT NULL"
            + extra_constraint + ")",
        )
        db.execute("INSERT INTO replacement SELECT * FROM adjusted_history")
        db.execute("DROP TABLE adjusted_history")
        db.execute("ALTER TABLE replacement RENAME TO adjusted_history")
    output_path = tmp_path / "invalid-schema.zip"

    with pytest.raises(ValueError):
        create_seed_archive(
            str(seed_archive["snapshot"]), str(seed_archive["history"]),
            str(output_path),
        )
    assert not output_path.exists()


def test_snapshot_persistence_replaces_only_with_complete_json(monkeypatch, tmp_path):
    snapshot_path = tmp_path / "snapshot.json"
    cache = TopPicksSnapshotCache(persistence_path=str(snapshot_path))
    key = ("top-picks-snapshot", "1D")
    cache.set(key, {"rows": ["old"]}, 600)
    original_bytes = snapshot_path.read_bytes()
    original_replace = service_module.os.replace
    replacements = []

    def checked_replace(source, target):
        source_path, target_path = Path(source), Path(target)
        assert source_path.parent == snapshot_path.parent
        assert target_path == snapshot_path
        assert snapshot_path.read_bytes() == original_bytes
        pending = json.loads(source_path.read_text())
        assert pending["entries"][cache._serialize_key(key)]["value"] == {
            "rows": ["new"],
        }
        replacements.append(source_path)
        original_replace(source, target)

    monkeypatch.setattr(service_module.os, "replace", checked_replace)

    cache.set(key, {"rows": ["new"]}, 600)

    assert len(replacements) == 1
    assert TopPicksSnapshotCache(
        persistence_path=str(snapshot_path),
    ).get(key)[0] == {"rows": ["new"]}
    assert list(tmp_path.iterdir()) == [snapshot_path]


@pytest.mark.parametrize("phase", ["write", "replace"])
def test_failed_snapshot_persistence_preserves_old_file_and_cleans_temp(
    monkeypatch, tmp_path, phase,
):
    snapshot_path = tmp_path / "snapshot.json"
    cache = TopPicksSnapshotCache(persistence_path=str(snapshot_path))
    key = ("top-picks-snapshot", "1D")
    cache.set(key, {"rows": ["old"]}, 600)
    original_bytes = snapshot_path.read_bytes()
    if phase == "write":
        def failed_write(payload, handle, **kwargs):
            handle.write('{"incomplete":')
            raise OSError("Test JSON write failure.")

        monkeypatch.setattr(service_module.json, "dump", failed_write)
    else:
        monkeypatch.setattr(
            service_module.os, "replace",
            Mock(side_effect=OSError("Test atomic replace failure.")),
        )

    cache.set(key, {"rows": ["new"]}, 600)

    assert snapshot_path.read_bytes() == original_bytes
    assert TopPicksSnapshotCache(
        persistence_path=str(snapshot_path),
    ).get(key)[0] == {"rows": ["old"]}
    assert cache.get(key)[0] == {"rows": ["new"]}
    assert list(tmp_path.iterdir()) == [snapshot_path]


def test_export_failure_preserves_previous_seed_package(
    monkeypatch, seed_archive,
):
    original_bytes = seed_archive["seed"].read_bytes()
    monkeypatch.setattr(
        bootstrap_module.os, "replace",
        Mock(side_effect=OSError("Test release disk failure.")),
    )

    with pytest.raises(OSError, match="Test release disk failure"):
        create_seed_archive(
            str(seed_archive["snapshot"]), str(seed_archive["history"]),
            str(seed_archive["seed"]),
        )

    assert seed_archive["seed"].read_bytes() == original_bytes
    assert set(seed_archive["seed"].parent.iterdir()) == {
        seed_archive["seed"], seed_archive["snapshot"], seed_archive["history"],
    }
