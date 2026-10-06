"""Export and install versioned initial market data without replacing caches."""

from contextlib import closing
from datetime import date, datetime, timezone
from hashlib import sha256
import json
import logging
import math
import os
from pathlib import Path
import sqlite3
from tempfile import NamedTemporaryFile, TemporaryDirectory
from zipfile import BadZipFile, ZIP_DEFLATED, ZipFile

from ..market_primitives import TICKER_PATTERN
from .service import (
    DEFAULT_BENCHMARK_TICKER,
    DEFAULT_CACHE_TTL_SECONDS,
    DEFAULT_RISK_FREE_RATE,
    DEFAULT_UNIVERSE_LIMIT,
    METRIC_KEYS,
    TOP_PICKS_WINDOWS,
    _normalize_benchmark,
    _normalize_cache_ttl,
    _normalize_risk_free_rate,
    _normalize_universe_limit,
)


LOGGER = logging.getLogger(__name__)
SEED_FORMAT_VERSION = 1
# Bump when calculation rules change enough to invalidate bundled results.
SEED_CALCULATION_VERSION = 1
SNAPSHOT_MEMBER = "snapshot.json"
HISTORY_MEMBER = "history.sqlite3"
MANIFEST_MEMBER = "manifest.json"
ROW_FIELDS = {"symbol", "name", "industry", "metricStatus", *METRIC_KEYS}
METADATA_FIELDS = {
    "benchmark", "generatedAt", "requestedStart", "requestedEnd",
    "endDateInclusive", "annualisationDays", "riskFreeRate",
    "riskFreeRateSource", "riskFreeRateAsOf", "universeLimit", "universeCount",
    "availableCount", "minimumTrailingReturnObservations", "observationsBySymbol",
    "units", "window", "windowCode", "availableMetrics", "assumptions", "methods",
}


def _json_bytes(value):
    return json.dumps(
        value, ensure_ascii=False, separators=(",", ":"), allow_nan=False,
    ).encode("utf-8")


def _prepare_snapshots(payload):
    if not isinstance(payload, dict) or not isinstance(payload.get("entries"), dict):
        raise ValueError("Initial snapshot entries are missing.")
    latest = {}
    for raw_key, entry in payload["entries"].items():
        key = json.loads(raw_key)
        # Old cache formats are not part of the current initial package.
        if (not isinstance(key, list) or len(key) != 7
                or key[0] != "top-picks-snapshot" or key[1] not in TOP_PICKS_WINDOWS):
            continue
        window = key[1]
        if not isinstance(entry, dict) or not isinstance(entry.get("value"), dict):
            raise ValueError("Initial snapshot value is invalid.")
        value = entry["value"]
        metadata = value.get("metadata")
        rows = value.get("rows")
        if not isinstance(metadata, dict):
            raise ValueError("Initial snapshot metadata is invalid.")
        if not isinstance(rows, list) or not rows:
            raise ValueError("Initial snapshots must contain stock rows.")
        if any(not isinstance(row, dict) for row in rows):
            raise ValueError("Initial snapshot rows are invalid.")
        symbols = [row["symbol"] for row in rows]
        if (any(not isinstance(symbol, str) or not TICKER_PATTERN.fullmatch(symbol) for symbol in symbols)
                or len(set(symbols)) != len(symbols)):
            raise ValueError("Initial snapshot symbols must be unique.")
        if (_normalize_benchmark(key[2]) != key[2]
                or _normalize_risk_free_rate(key[3]) != key[3]
                or _normalize_universe_limit(key[4]) != key[4]):
            raise ValueError("Initial snapshot calculation settings are invalid.")
        if (metadata.get("windowCode") != window
                or metadata.get("benchmark") != key[2]
                or metadata.get("riskFreeRate") != key[3]
                or metadata.get("universeLimit") != key[4]
                or metadata.get("universeCount") != len(rows)
                or metadata.get("requestedStart") != key[5]
                or metadata.get("requestedEnd") != key[6]
                or len(rows) > key[4]):
            raise ValueError("Initial snapshot metadata does not match its key.")
        if date.fromisoformat(key[5]) > date.fromisoformat(key[6]):
            raise ValueError("Initial snapshot date range is invalid.")
        generated_at = datetime.fromisoformat(metadata["generatedAt"])
        if generated_at.tzinfo is None:
            raise ValueError("Initial snapshot timestamps require a timezone.")
        warnings = value.get("warnings", [])
        if not isinstance(warnings, list) or any(not isinstance(item, str) for item in warnings):
            raise ValueError("Initial snapshot warnings are invalid.")
        clean_rows = []
        for row in rows:
            clean = {field: value for field, value in row.items() if field in ROW_FIELDS}
            for field in ("name", "industry"):
                if clean.get(field) is not None and not isinstance(clean[field], str):
                    raise ValueError("Initial stock descriptions must be text.")
            statuses = clean.get("metricStatus", {})
            if not isinstance(statuses, dict):
                raise ValueError("Initial metric statuses are invalid.")
            clean["metricStatus"] = {
                metric: status for metric, status in statuses.items()
                if metric in METRIC_KEYS and isinstance(status, str)
            }
            for metric in METRIC_KEYS:
                number = clean.get(metric)
                if number is not None and (
                    isinstance(number, bool) or not isinstance(number, (int, float))
                    or not math.isfinite(number)
                ):
                    raise ValueError("Initial snapshot metrics must be finite numbers.")
            clean_rows.append(clean)
        clean_metadata = {field: value for field, value in metadata.items()
                          if field in METADATA_FIELDS}
        map_fields = {
            "assumptions": {"benchmark", "riskFreeRateAnnual", "universeLimit", "window"},
            "methods": set(METRIC_KEYS),
            "units": set(METRIC_KEYS),
            "observationsBySymbol": set(symbols),
        }
        for field, allowed_keys in map_fields.items():
            if field not in clean_metadata:
                continue
            mapping = clean_metadata[field]
            if not isinstance(mapping, dict):
                raise ValueError("Initial metric metadata is invalid.")
            projected = {key: value for key, value in mapping.items() if key in allowed_keys}
            if any(not isinstance(item, (str, int, float, bool, type(None)))
                   for item in projected.values()):
                raise ValueError("Initial metric metadata contains non-market records.")
            clean_metadata[field] = projected
        if "availableMetrics" in clean_metadata:
            if not isinstance(clean_metadata["availableMetrics"], list):
                raise ValueError("Initial available metrics are invalid.")
            clean_metadata["availableMetrics"] = [
                metric for metric in clean_metadata["availableMetrics"]
                if isinstance(metric, str) and metric in METRIC_KEYS
            ]
        for field, item in clean_metadata.items():
            if field not in {*map_fields, "availableMetrics"} and not isinstance(
                item, (str, int, float, bool, type(None)),
            ):
                raise ValueError("Initial metadata contains non-market records.")
        clean_value = {
            "rows": clean_rows,
            "metadata": clean_metadata,
            "warnings": warnings,
        }
        canonical_key = json.dumps(key, separators=(",", ":"))
        current = latest.get(window)
        if current is None or generated_at > current[0]:
            latest[window] = (generated_at, canonical_key, {"value": clean_value})
    if set(latest) != set(TOP_PICKS_WINDOWS):
        raise ValueError("Initial data requires all four Top Picks windows.")
    assumptions = {
        (item[2]["value"]["metadata"]["benchmark"],
         item[2]["value"]["metadata"]["riskFreeRate"],
         item[2]["value"]["metadata"]["universeLimit"])
        for item in latest.values()
    }
    if len(assumptions) != 1:
        raise ValueError("Initial snapshots use different calculation settings.")
    benchmark, risk_free_rate, universe_limit = assumptions.pop()
    prepared = {
        "latest_key": latest["1Y"][1],
        "entries": {latest[window][1]: latest[window][2] for window in TOP_PICKS_WINDOWS},
    }
    windows = {
        window: {
            "rows": len(latest[window][2]["value"]["rows"]),
            "generatedAt": latest[window][2]["value"]["metadata"]["generatedAt"],
        }
        for window in TOP_PICKS_WINDOWS
    }
    return prepared, windows, {
        "benchmark": benchmark,
        "riskFreeRate": risk_free_rate,
        "universeLimit": universe_limit,
    }


def _history_summary(connection):
    tables = {row[0] for row in connection.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    )}
    schema = list(connection.execute("PRAGMA table_info(adjusted_history)"))
    columns = [row[1] for row in schema]
    extra_objects = connection.execute(
        "SELECT name FROM sqlite_master WHERE type IN ('view', 'trigger')"
    ).fetchall()
    if tables != {"adjusted_history"} or extra_objects or columns != [
        "symbol", "start", "end", "reconciled_at", "payload",
    ]:
        raise ValueError("Initial history must contain only adjusted market history.")
    if ([row[2].upper() for row in schema] != ["TEXT", "TEXT", "TEXT", "REAL", "TEXT"]
            or [row[5] for row in schema] != [1, 0, 0, 0, 0]
            or any(row[3] != 1 for row in schema[1:])):
        raise ValueError("Initial history database schema is unsupported.")
    if connection.execute("PRAGMA quick_check").fetchone()[0] != "ok":
        raise ValueError("Initial history database is damaged.")
    count, start, end = connection.execute(
        "SELECT COUNT(*), MIN(start), MAX(end) FROM adjusted_history"
    ).fetchone()
    if not count:
        raise ValueError("Initial history is empty.")
    for symbol, covered_start, covered_end, reconciled_at, payload in connection.execute(
        "SELECT symbol, start, end, reconciled_at, payload FROM adjusted_history"
    ):
        if (not isinstance(symbol, str) or not TICKER_PATTERN.fullmatch(symbol)
                or not math.isfinite(reconciled_at)
                or date.fromisoformat(covered_start) > date.fromisoformat(covered_end)):
            raise ValueError("Initial history record is invalid.")
        prices = json.loads(payload)
        if not isinstance(prices, dict) or set(prices) != {"dates", "values"}:
            raise ValueError("Initial history payload is invalid.")
        dates, values = prices["dates"], prices["values"]
        if (not isinstance(dates, list) or not isinstance(values, list)
                or not dates or len(dates) != len(values)
                or any(not isinstance(item, str) for item in dates)
                or dates != sorted(set(dates))):
            raise ValueError("Initial history price arrays are invalid.")
        for price_date in dates:
            date.fromisoformat(price_date)
        if dates[0] < covered_start or dates[-1] > covered_end:
            raise ValueError("Initial history dates exceed their coverage.")
        if any(value is not None and (
            isinstance(value, bool) or not isinstance(value, (int, float))
            or not math.isfinite(value)
        ) for value in values):
            raise ValueError("Initial history prices must be finite numbers.")
    return {"symbols": count, "start": start, "end": end}


def create_seed_archive(snapshot_path, history_path, output_path):
    """Read local caches and export only market data to a release archive."""
    output = Path(output_path)
    sources = (Path(snapshot_path), Path(history_path))
    if any(output.resolve() == source.resolve()
           or (output.exists() and source.exists() and os.path.samefile(output, source))
           for source in sources):
        raise ValueError("Initial package output must not replace a source cache.")
    with open(snapshot_path, encoding="utf-8") as handle:
        prepared, windows, assumptions = _prepare_snapshots(json.load(handle))
    snapshot_data = _json_bytes(prepared)
    # SQLite backup includes committed data even when the source uses WAL.
    # Opening the source read-only leaves the live cache untouched.
    with TemporaryDirectory(prefix="top-picks-seed-export-") as temporary:
        backup_path = Path(temporary) / HISTORY_MEMBER
        source_uri = Path(history_path).resolve().as_uri() + "?mode=ro"
        with closing(sqlite3.connect(source_uri, uri=True, timeout=30)) as source:
            _history_summary(source)
            with closing(sqlite3.connect(backup_path)) as backup:
                source.backup(backup)
                backup.execute("VACUUM")
                history_summary = _history_summary(backup)
        history_data = backup_path.read_bytes()
    files = {SNAPSHOT_MEMBER: snapshot_data, HISTORY_MEMBER: history_data}
    manifest = {
        "format_version": SEED_FORMAT_VERSION,
        "calculation_version": SEED_CALCULATION_VERSION,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "assumptions": assumptions,
        "windows": windows,
        "history": history_summary,
        "files": {
            name: {"bytes": len(data), "sha256": sha256(data).hexdigest()}
            for name, data in files.items()
        },
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile(dir=output.parent, prefix=".top-picks-seed-", delete=False) as handle:
        temporary_output = Path(handle.name)
    try:
        with ZipFile(temporary_output, "w", ZIP_DEFLATED, compresslevel=9) as archive:
            for name, data in files.items():
                archive.writestr(name, data)
            archive.writestr(MANIFEST_MEMBER, _json_bytes(manifest))
        os.replace(temporary_output, output)
    finally:
        temporary_output.unlink(missing_ok=True)
    return manifest


def _read_seed(seed_path):
    with ZipFile(seed_path) as archive:
        names = archive.namelist()
        if len(names) != 3 or set(names) != {SNAPSHOT_MEMBER, HISTORY_MEMBER, MANIFEST_MEMBER}:
            raise ValueError("Initial package members are invalid.")
        manifest = json.loads(archive.read(MANIFEST_MEMBER))
        if (manifest["format_version"] != SEED_FORMAT_VERSION
                or manifest["calculation_version"] != SEED_CALCULATION_VERSION):
            raise ValueError("Initial package version is unsupported.")
        files = {name: archive.read(name) for name in (SNAPSHOT_MEMBER, HISTORY_MEMBER)}
    for name, data in files.items():
        expected = manifest["files"][name]
        if expected["bytes"] != len(data) or expected["sha256"] != sha256(data).hexdigest():
            raise ValueError("Initial package checksum does not match.")
    prepared, windows, assumptions = _prepare_snapshots(json.loads(files[SNAPSHOT_MEMBER]))
    if windows != manifest["windows"] or assumptions != manifest["assumptions"]:
        raise ValueError("Initial package metadata does not match its snapshots.")
    if not files[HISTORY_MEMBER].startswith(b"SQLite format 3\x00"):
        raise ValueError("Initial history is not a SQLite database.")
    with TemporaryDirectory(prefix="top-picks-seed-check-") as temporary:
        history_path = Path(temporary) / HISTORY_MEMBER
        history_path.write_bytes(files[HISTORY_MEMBER])
        with closing(sqlite3.connect(history_path.as_uri() + "?mode=ro", uri=True)) as connection:
            if _history_summary(connection) != manifest["history"]:
                raise ValueError("Initial package history metadata does not match.")
    files[SNAPSHOT_MEMBER] = _json_bytes(prepared)
    return manifest, files


def _install_missing_file(target_path, data):
    target = Path(target_path)
    if target.exists():
        return False
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with NamedTemporaryFile(dir=target.parent, prefix=".top-picks-seed-", delete=False) as handle:
            temporary = Path(handle.name)
            handle.write(data)
            handle.flush()
        # Publishing a complete file by hard link is atomic and cannot replace
        # a file another process created after the existence check.
        try:
            os.link(temporary, target)
        except FileExistsError:
            return False
        return True
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def bootstrap_top_picks_cache(
    seed_path, snapshot_path, history_path, *,
    benchmark_ticker=DEFAULT_BENCHMARK_TICKER,
    risk_free_rate=DEFAULT_RISK_FREE_RATE,
    universe_limit=DEFAULT_UNIVERSE_LIMIT,
    cache_ttl_seconds=DEFAULT_CACHE_TTL_SECONDS,
):
    """Install missing caches; existing files always belong to the running app."""
    installed = {"snapshot": False, "history": False}
    targets = {
        "snapshot": snapshot_path if _normalize_cache_ttl(cache_ttl_seconds) > 0 else None,
        "history": history_path,
    }
    try:
        targets = {name: path for name, path in targets.items()
                   if path and not Path(path).exists()}
        if not targets or not seed_path or not Path(seed_path).is_file():
            return installed
    except OSError:
        LOGGER.warning("Top Picks initial paths unavailable; using normal refresh.")
        return installed
    expected = {
        "benchmark": _normalize_benchmark(benchmark_ticker),
        "riskFreeRate": _normalize_risk_free_rate(risk_free_rate),
        "universeLimit": _normalize_universe_limit(universe_limit),
    }
    try:
        manifest, files = _read_seed(seed_path)
    except (OSError, ValueError, TypeError, KeyError, RuntimeError, sqlite3.Error, BadZipFile):
        LOGGER.warning("Top Picks initial package unavailable; using normal refresh.")
        return installed
    if manifest["assumptions"] != expected:
        targets.pop("snapshot", None)
    for name, target in targets.items():
        try:
            member = SNAPSHOT_MEMBER if name == "snapshot" else HISTORY_MEMBER
            installed[name] = _install_missing_file(target, files[member])
        except OSError:
            LOGGER.warning("Top Picks initial %s could not be installed; using normal refresh.", name)
    return installed
