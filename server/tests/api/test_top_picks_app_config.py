import os
from contextlib import closing
import hashlib
import json
from pathlib import Path
import sqlite3
from unittest.mock import Mock
from zipfile import ZipFile

import pytest

from src.composition import top_picks as composition_module
from src.server import create_app
from src.top_picks.batch_analytics import calculate_yearly_metrics
from src.top_picks.history import TopPicksHistoryProvider
from src.top_picks.service import TopPicksService, TopPicksSnapshotCache
from tests.top_picks.test_bootstrap import _write_seed_archive


def test_app_configures_top_picks_service_assumptions(tmp_path):
    response_payload = {
        "data": {"rows": [], "total": 0},
        "metadata": {},
        "warnings": [],
    }
    service = Mock()
    service.get_page.return_value = response_payload
    service_factory = Mock(return_value=service)
    app = create_app(
        {
            "TESTING": True,
            "TOP_PICKS_BENCHMARK": "SPY",
            "TOP_PICKS_RISK_FREE_RATE": 0.025,
            "TOP_PICKS_RISK_FREE_RATE_SOURCE": "Configured source",
            "TOP_PICKS_RISK_FREE_RATE_AS_OF": "2026-07-01",
            "TOP_PICKS_UNIVERSE_LIMIT": 12,
            "TOP_PICKS_CACHE_TTL_SECONDS": 30,
            "TOP_PICKS_REFRESH_INTERVAL_SECONDS": "15",
            "TOP_PICKS_MAX_SUBSCRIBERS": "128",
            "TOP_PICKS_MAX_SUBSCRIBERS_PER_CLIENT": "32",
            "TOP_PICKS_STREAM_LIFETIME_SECONDS": "600",
            "TOP_PICKS_CACHE_PATH": str(tmp_path / "snapshot.json"),
            "TOP_PICKS_HISTORY_PATH": str(tmp_path / "history.sqlite3"),
            "TOP_PICKS_SEED_PATH": "",
        },
        supabase_client=object(),
        top_picks_service_factory=service_factory,
    )

    service_factory.assert_not_called()
    response = app.test_client().post("/api/top-picks", json={})
    second_response = app.test_client().post("/api/top-picks", json={})

    assert response.status_code == 200
    assert second_response.status_code == 200
    service_factory.assert_called_once()
    kwargs = service_factory.call_args.kwargs
    assert kwargs["yearly_metrics_provider"] is calculate_yearly_metrics
    assert isinstance(kwargs["market_data_provider"], TopPicksHistoryProvider)
    assert kwargs["benchmark_ticker"] == "SPY"
    assert kwargs["risk_free_rate"] == 0.025
    assert kwargs["risk_free_rate_source"] == "Configured source"
    assert kwargs["risk_free_rate_as_of"] == "2026-07-01"
    assert kwargs["universe_limit"] == 12
    assert kwargs["cache_ttl_seconds"] == 30
    assert kwargs["refresh_interval_seconds"] == "15"
    assert kwargs["max_subscribers"] == "128"
    assert kwargs["max_subscribers_per_client"] == "32"
    assert kwargs["stream_lifetime_seconds"] == "600"


def test_app_exposes_product_consistent_top_picks_defaults():
    app = create_app({"TESTING": True})

    assert app.config["TOP_PICKS_BENCHMARK"] == "^AXJO"
    assert app.config["TOP_PICKS_RISK_FREE_RATE"] == 0.0435
    assert app.config["TOP_PICKS_RISK_FREE_RATE_SOURCE"] == (
        "RBA cash rate target"
    )
    assert app.config["TOP_PICKS_RISK_FREE_RATE_AS_OF"] == "2026-06-17"
    assert app.config["TOP_PICKS_UNIVERSE_LIMIT"] == 1000
    assert app.config["TOP_PICKS_CACHE_TTL_SECONDS"] == 600
    assert app.config["TOP_PICKS_REFRESH_INTERVAL_SECONDS"] == 60
    assert app.config["TOP_PICKS_MAX_SUBSCRIBERS"] == 64
    assert app.config["TOP_PICKS_MAX_SUBSCRIBERS_PER_CLIENT"] == 16
    assert app.config["TOP_PICKS_STREAM_LIFETIME_SECONDS"] == 300
    assert app.config["TOP_PICKS_CACHE_PATH"].endswith(
        os.path.join("server", ".cache", "top-picks-snapshot-cache.json")
    )
    assert app.config["TOP_PICKS_SEED_PATH"] is None
    assert app.config["TOP_PICKS_SEED_SYNC"] == "true"


def test_app_loads_top_picks_configuration_from_process_environment(
    monkeypatch,
):
    monkeypatch.setenv("TOP_PICKS_BENCHMARK", "SPY")
    monkeypatch.setenv("TOP_PICKS_RISK_FREE_RATE", "0.025")
    monkeypatch.setenv(
        "TOP_PICKS_RISK_FREE_RATE_SOURCE",
        "Configured source",
    )
    monkeypatch.setenv("TOP_PICKS_RISK_FREE_RATE_AS_OF", "2026-07-01")
    monkeypatch.setenv("TOP_PICKS_UNIVERSE_LIMIT", "12")
    monkeypatch.setenv("TOP_PICKS_CACHE_TTL_SECONDS", "30")
    monkeypatch.setenv("TOP_PICKS_CACHE_PATH", "custom-cache.json")
    monkeypatch.setenv("TOP_PICKS_SEED_PATH", "custom-seed.zip")
    monkeypatch.setenv("TOP_PICKS_SEED_SYNC", "false")

    app = create_app({"TESTING": True})

    assert app.config["TOP_PICKS_BENCHMARK"] == "SPY"
    assert app.config["TOP_PICKS_RISK_FREE_RATE"] == "0.025"
    assert app.config["TOP_PICKS_RISK_FREE_RATE_SOURCE"] == (
        "Configured source"
    )
    assert app.config["TOP_PICKS_RISK_FREE_RATE_AS_OF"] == "2026-07-01"
    assert app.config["TOP_PICKS_UNIVERSE_LIMIT"] == "12"
    assert app.config["TOP_PICKS_CACHE_TTL_SECONDS"] == "30"
    assert app.config["TOP_PICKS_CACHE_PATH"] == "custom-cache.json"
    assert app.config["TOP_PICKS_SEED_PATH"] == "custom-seed.zip"
    assert app.config["TOP_PICKS_SEED_SYNC"] == "false"


def test_seed_import_is_lazy_and_runs_before_first_service_construction(tmp_path):
    seed = _write_seed_archive(tmp_path / "source")
    snapshot_path = tmp_path / "runtime" / "snapshot.json"
    history_path = tmp_path / "runtime" / "history.sqlite3"
    service = Mock()
    service.get_page.return_value = {
        "data": {"rows": [], "total": 0}, "metadata": {}, "warnings": [],
    }

    def service_factory(**kwargs):
        assert snapshot_path.exists()
        assert history_path.exists()
        assert kwargs["snapshot_cache"].get_latest_stale()[1] == "stale"
        return service

    factory = Mock(side_effect=service_factory)
    app = create_app({
        "TESTING": True,
        "TOP_PICKS_SEED_PATH": str(seed["seed"]),
        "TOP_PICKS_CACHE_PATH": str(snapshot_path),
        "TOP_PICKS_HISTORY_PATH": str(history_path),
    }, supabase_client=object(), top_picks_service_factory=factory)

    assert not snapshot_path.exists()
    assert not history_path.exists()
    client = app.test_client()
    assert client.post("/api/top-picks", json={}).status_code == 200
    original_snapshot = snapshot_path.read_bytes()
    original_history = history_path.read_bytes()
    assert client.post("/api/top-picks", json={}).status_code == 200
    factory.assert_called_once()
    assert snapshot_path.read_bytes() == original_snapshot
    assert history_path.read_bytes() == original_history


def test_first_http_request_uses_seed_and_queues_refresh_without_downloading(
    monkeypatch, tmp_path,
):
    seed = _write_seed_archive(tmp_path / "source")
    downloader = Mock(side_effect=AssertionError("No foreground download."))
    calculator = Mock(side_effect=AssertionError("No foreground calculation."))
    supabase = Mock()
    supabase.table.side_effect = AssertionError("No foreground universe query.")
    refresh = Mock()
    monkeypatch.setattr(composition_module, "fetch_stock_data", downloader)
    monkeypatch.setattr(TopPicksService, "_refresh_windows_in_background", refresh)
    snapshot_path = tmp_path / "runtime" / "snapshot.json"
    history_path = tmp_path / "runtime" / "history.sqlite3"
    app = create_app({
        "TESTING": True,
        "TOP_PICKS_SEED_PATH": str(seed["seed"]),
        "TOP_PICKS_CACHE_PATH": str(snapshot_path),
        "TOP_PICKS_HISTORY_PATH": str(history_path),
    }, supabase_client=supabase, calculator_provider=calculator)

    response = app.test_client().post("/api/top-picks", json={})

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["data"]["total"] == 1
    assert payload["data"]["rows"][0]["symbol"] == "AAA"
    assert payload["metadata"]["cacheStatus"] == "stale"
    assert payload["metadata"]["snapshotRefreshing"] is True
    original, _ = TopPicksSnapshotCache(
        persistence_path=str(seed["snapshot"]),
    ).get(seed["keys"]["1Y"])
    assert payload["metadata"]["generatedAt"] == original["metadata"]["generatedAt"]
    refresh.assert_called_once_with("1Y", force_refresh=False)
    downloader.assert_not_called()
    calculator.assert_not_called()
    supabase.table.assert_not_called()
    assert snapshot_path.exists()
    assert history_path.exists()


def test_custom_cache_paths_do_not_automatically_load_default_seed(tmp_path):
    service = Mock()
    service.get_page.return_value = {
        "data": {"rows": [], "total": 0}, "metadata": {}, "warnings": [],
    }
    snapshot_path = tmp_path / "snapshot.json"
    history_path = tmp_path / "history.sqlite3"
    app = create_app({
        "TESTING": True,
        "TOP_PICKS_SEED_PATH": None,
        "TOP_PICKS_CACHE_PATH": str(snapshot_path),
        "TOP_PICKS_HISTORY_PATH": str(history_path),
    }, supabase_client=object(), top_picks_service_factory=Mock(return_value=service))

    assert app.test_client().post("/api/top-picks", json={}).status_code == 200

    assert not snapshot_path.exists()
    with closing(sqlite3.connect(history_path)) as connection:
        assert connection.execute("SELECT COUNT(*) FROM adjusted_history").fetchone()[0] == 0


def test_injected_service_bypasses_seed_and_history_initialization(tmp_path):
    seed = _write_seed_archive(tmp_path / "source")
    snapshot_path = tmp_path / "snapshot.json"
    history_path = tmp_path / "history.sqlite3"
    service = Mock()
    service.get_page.return_value = {
        "data": {"rows": [], "total": 0}, "metadata": {}, "warnings": [],
    }
    app = create_app({
        "TESTING": True,
        "TOP_PICKS_SEED_PATH": str(seed["seed"]),
        "TOP_PICKS_CACHE_PATH": str(snapshot_path),
        "TOP_PICKS_HISTORY_PATH": str(history_path),
    }, top_picks_service=service)

    assert app.test_client().post("/api/top-picks", json={}).status_code == 200
    assert not snapshot_path.exists()
    assert not history_path.exists()


def test_missing_supabase_configuration_does_not_import_seed(tmp_path):
    seed = _write_seed_archive(tmp_path / "source")
    snapshot_path = tmp_path / "snapshot.json"
    history_path = tmp_path / "history.sqlite3"
    app = create_app({
        "TESTING": True, "SUPABASE_URL": None, "SUPABASE_KEY": None,
        "TOP_PICKS_SEED_PATH": str(seed["seed"]),
        "TOP_PICKS_CACHE_PATH": str(snapshot_path),
        "TOP_PICKS_HISTORY_PATH": str(history_path),
    })

    assert app.test_client().post("/api/top-picks", json={}).status_code == 503
    assert not snapshot_path.exists()
    assert not history_path.exists()


def test_default_cache_paths_automatically_import_versioned_seed(
    monkeypatch, tmp_path,
):
    seed = _write_seed_archive(tmp_path / "source")
    snapshot_path = tmp_path / "default" / "snapshot.json"
    history_path = tmp_path / "default" / "snapshot.json.history.sqlite3"
    monkeypatch.setattr(
        composition_module, "DEFAULT_TOP_PICKS_CACHE_PATH", str(snapshot_path),
    )
    monkeypatch.setattr(
        composition_module, "DEFAULT_TOP_PICKS_SEED_PATH", str(seed["seed"]),
    )
    service = Mock()
    service.get_page.return_value = {
        "data": {"rows": [], "total": 0}, "metadata": {}, "warnings": [],
    }
    app = create_app({
        "TESTING": True,
        "TOP_PICKS_CACHE_PATH": str(snapshot_path),
        "TOP_PICKS_HISTORY_PATH": None,
        "TOP_PICKS_SEED_PATH": None,
    }, supabase_client=object(), top_picks_service_factory=Mock(return_value=service))

    assert app.test_client().post("/api/top-picks", json={}).status_code == 200
    assert snapshot_path.exists()
    assert history_path.exists()
    assert TopPicksSnapshotCache(
        persistence_path=str(snapshot_path),
    ).get_latest_stale()[0]["rows"][0]["symbol"] == "AAA"


def test_explicit_empty_seed_path_disables_initial_import(monkeypatch, tmp_path):
    bootstrap = Mock(side_effect=AssertionError("Seed import was disabled."))
    monkeypatch.setattr(composition_module, "bootstrap_top_picks_cache", bootstrap)
    service = Mock()
    service.get_page.return_value = {
        "data": {"rows": [], "total": 0}, "metadata": {}, "warnings": [],
    }
    snapshot_path = tmp_path / "snapshot.json"
    app = create_app({
        "TESTING": True,
        "TOP_PICKS_CACHE_PATH": str(snapshot_path),
        "TOP_PICKS_HISTORY_PATH": str(tmp_path / "history.sqlite3"),
        "TOP_PICKS_SEED_PATH": "",
    }, supabase_client=object(), top_picks_service_factory=Mock(return_value=service))

    assert app.test_client().post("/api/top-picks", json={}).status_code == 200
    bootstrap.assert_not_called()
    assert not snapshot_path.exists()


def test_injected_market_provider_does_not_install_history(tmp_path):
    seed = _write_seed_archive(tmp_path / "source")
    snapshot_path = tmp_path / "snapshot.json"
    history_path = tmp_path / "history.sqlite3"
    downloader = Mock()
    service = Mock()
    factory = Mock(return_value=service)
    app = create_app({
        "TESTING": True,
        "TOP_PICKS_CACHE_PATH": str(snapshot_path),
        "TOP_PICKS_HISTORY_PATH": str(history_path),
        "TOP_PICKS_SEED_PATH": str(seed["seed"]),
    }, supabase_client=object())
    provider = composition_module.create_top_picks_service_provider(
        Mock(), service_factory=factory, market_data_provider=downloader,
    )

    assert provider(app) is service
    assert factory.call_args.kwargs["market_data_provider"] is downloader
    assert snapshot_path.exists()
    assert not history_path.exists()
    downloader.assert_not_called()


def _create_seed_sync_service(monkeypatch, tmp_path, overrides=None, downloader=None):
    snapshot_path = tmp_path / "runtime" / "snapshot.json"
    history_path = Path(f"{snapshot_path}.history.sqlite3")
    export_path = tmp_path / "release" / "seed.zip"
    monkeypatch.setattr(
        composition_module, "DEFAULT_TOP_PICKS_CACHE_PATH", str(snapshot_path),
    )
    monkeypatch.setattr(
        composition_module, "DEFAULT_TOP_PICKS_SEED_PATH", str(export_path),
    )
    configuration = {
        "TESTING": False,
        "TOP_PICKS_CACHE_PATH": str(snapshot_path),
        "TOP_PICKS_HISTORY_PATH": None,
        "TOP_PICKS_SEED_PATH": "",
        "TOP_PICKS_SEED_SYNC": "true",
    }
    configuration.update(overrides or {})
    service = Mock()
    factory = Mock(return_value=service)
    app = create_app(configuration, supabase_client=object())
    provider = composition_module.create_top_picks_service_provider(
        Mock(), service_factory=factory,
        supabase_client_provider=Mock(return_value=object()),
        market_data_provider=downloader,
    )
    assert provider(app) is service
    return factory.call_args.kwargs, snapshot_path, history_path, export_path


@pytest.mark.parametrize("enabled", [True, "true", "1", "yes", "on"])
def test_default_production_cache_enables_seed_sync_callback(
    monkeypatch, tmp_path, enabled,
):
    kwargs, _, _, export_path = _create_seed_sync_service(
        monkeypatch, tmp_path, {"TOP_PICKS_SEED_SYNC": enabled},
    )

    assert callable(kwargs["round_complete_callback"])
    # Service construction must not export an empty database before a round.
    assert not export_path.exists()


@pytest.mark.parametrize("guard", [
    "testing", "false", "zero", "off", "boolean_false", "custom_snapshot",
    "custom_history", "no_snapshot", "no_history", "disabled_cache",
    "injected_downloader",
])
def test_seed_sync_does_not_export_for_testing_or_custom_cache_configuration(
    monkeypatch, tmp_path, guard,
):
    overrides = {}
    downloader = None
    if guard == "testing":
        overrides["TESTING"] = True
    elif guard in {"false", "zero", "off", "boolean_false"}:
        overrides["TOP_PICKS_SEED_SYNC"] = {
            "false": "false", "zero": "0", "off": "off", "boolean_false": False,
        }[guard]
    elif guard == "custom_snapshot":
        overrides["TOP_PICKS_CACHE_PATH"] = str(tmp_path / "custom-snapshot.json")
    elif guard == "custom_history":
        overrides["TOP_PICKS_HISTORY_PATH"] = str(tmp_path / "custom-history.sqlite3")
    elif guard == "no_snapshot":
        overrides["TOP_PICKS_CACHE_PATH"] = None
    elif guard == "no_history":
        overrides["TOP_PICKS_HISTORY_PATH"] = ""
    elif guard == "disabled_cache":
        overrides["TOP_PICKS_CACHE_TTL_SECONDS"] = 0
    else:
        downloader = Mock(side_effect=AssertionError("No test downloads."))

    kwargs, _, _, export_path = _create_seed_sync_service(
        monkeypatch, tmp_path, overrides, downloader,
    )

    assert kwargs.get("round_complete_callback") is None
    assert not export_path.exists()
    if downloader is not None:
        downloader.assert_not_called()


def test_seed_sync_updates_default_package_without_writing_custom_import_source(
    monkeypatch, tmp_path,
):
    seed = _write_seed_archive(tmp_path / "source")
    import_bytes = seed["seed"].read_bytes()
    kwargs, snapshot_path, history_path, export_path = _create_seed_sync_service(
        monkeypatch, tmp_path, {"TOP_PICKS_SEED_PATH": str(seed["seed"])},
    )
    callback = kwargs["round_complete_callback"]
    assert callable(callback)
    before_snapshot = snapshot_path.read_bytes()
    before_history = history_path.read_bytes()

    callback()

    assert export_path.exists()
    assert seed["seed"].read_bytes() == import_bytes
    assert snapshot_path.read_bytes() == before_snapshot
    assert history_path.read_bytes() == before_history
    with ZipFile(export_path) as archive:
        assert set(archive.namelist()) == {
            "manifest.json", "snapshot.json", "history.sqlite3",
        }
        first_manifest = json.loads(archive.read("manifest.json"))
        assert first_manifest["windows"] == seed["manifest"]["windows"]

    payload = json.loads(snapshot_path.read_text())
    for entry in payload["entries"].values():
        entry["value"]["rows"][0]["name"] = "Updated Alpha Ltd"
    snapshot_path.write_text(json.dumps(payload), encoding="utf-8")
    with closing(sqlite3.connect(history_path)) as connection, connection:
        stored = json.loads(connection.execute(
            "SELECT payload FROM adjusted_history WHERE symbol='AAA'",
        ).fetchone()[0])
        stored["values"][-1] = 999.0
        connection.execute(
            "UPDATE adjusted_history SET payload=? WHERE symbol='AAA'",
            (json.dumps(stored),),
        )

    callback()

    with ZipFile(export_path) as archive:
        latest_snapshot = json.loads(archive.read("snapshot.json"))
        assert all(
            entry["value"]["rows"][0]["name"] == "Updated Alpha Ltd"
            for entry in latest_snapshot["entries"].values()
        )
        latest_manifest = json.loads(archive.read("manifest.json"))
        assert latest_manifest["files"]["history.sqlite3"]["sha256"] != (
            first_manifest["files"]["history.sqlite3"]["sha256"]
        )
        assert hashlib.sha256(archive.read("history.sqlite3")).hexdigest() == (
            latest_manifest["files"]["history.sqlite3"]["sha256"]
        )
    assert seed["seed"].read_bytes() == import_bytes
