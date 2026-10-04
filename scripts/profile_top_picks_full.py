"""Time the configured full-universe refresh through production source code.

Instrumentation wraps calls but leaves downloads, retries, calculation and
background scheduling unchanged. Snapshots are written to a temporary directory.
"""

import argparse
from datetime import date
import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
from time import perf_counter, sleep

from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "server"))

from src import metrics  # noqa: E402
from src.analytics.calculator_registry import get_calculator  # noqa: E402
from src.composition.top_picks import create_top_picks_service_provider  # noqa: E402
from src.server import create_app  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", action="append", default=[])
    parser.add_argument("--as-of", type=date.fromisoformat, required=True)
    parser.add_argument("--rounds", type=int, default=2)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    for path in args.env_file:
        load_dotenv(path, override=False)
    report = {"as_of": str(args.as_of), "mode": "full_universe_production_refresh", "rounds": []}

    with TemporaryDirectory(prefix="top-picks-full-profile-") as directory:
        app = create_app({
            "TOP_PICKS_CACHE_PATH": str(Path(directory) / "snapshot.json"),
            "TOP_PICKS_HISTORY_PATH": str(Path(directory) / "history.sqlite3"),
        })
        service = create_top_picks_service_provider(get_calculator)(app)
        service._today_provider = lambda: args.as_of
        report["configured_universe_limit"] = service._universe_limit
        report["benchmark"] = service._benchmark_ticker
        original_repository = service._ticker_repository.list_tickers
        original_download = metrics.download_stock_data
        original_market = service._market_data_provider
        original_build = service._build_snapshot
        original_set = service._snapshot_cache.set
        current = {}
        round_start = 0

        def repository(*a, **kw):
            start = perf_counter()
            tickers = original_repository(*a, **kw)
            current["repository_seconds"] = perf_counter() - start
            current["universe_count"] = len(tickers)
            print(f"Universe: {len(tickers)} stocks; no sampling", flush=True)
            return tickers

        def download(symbols, start_date, end_date):
            start = perf_counter()
            stage = "bulk_download" if len(symbols) > 1 else "retry_download"
            current["active_stage"] = stage
            data = original_download(symbols, start_date, end_date)
            duration = perf_counter() - start
            record = {"kind": stage, "symbol_count": len(symbols), "seconds": duration,
                      "start_date": start_date, "end_date": end_date,
                      "rows": len(data), "empty": data.empty}
            if len(symbols) == 1:
                record["symbol"] = symbols[0]
            current["downloads"].append(record)
            print(f"{stage}: {len(symbols)} symbols, {duration:.3f}s, {len(data)} rows", flush=True)
            return data

        def market(*a, **kw):
            start = perf_counter()
            data = original_market(*a, **kw)
            current["market_total_seconds"] = perf_counter() - start
            current["history_refresh"] = getattr(original_market, "last_refresh", {})
            current["missing_after_retry"] = metrics.get_missing_adjusted_close_tickers(data, a[0])
            print(f"Market data complete: {current['market_total_seconds']:.3f}s", flush=True)
            return data

        class TimedMarketProvider:
            def __call__(self, *a, **kw):
                return market(*a, **kw)

            def prune(self, *a, **kw):
                return original_market.prune(*a, **kw)

        def build(start_date, end_date, window="1Y", **kw):
            current["active_stage"] = f"calculate_{window}"
            start = perf_counter()
            snapshot = original_build(start_date, end_date, window, **kw)
            current["calculations"].append({"window": window, "seconds": perf_counter() - start,
                                            "rows": len(snapshot["rows"]),
                                            "rows_with_return": sum(row["ret1y"] is not None for row in snapshot["rows"]),
                                            "warnings": snapshot["warnings"]})
            return snapshot

        def save(key, value, ttl, **kw):
            start = perf_counter()
            original_set(key, value, ttl, **kw)
            current["published"].append({"window": key[1], "save_seconds": perf_counter() - start,
                                         "elapsed_seconds": perf_counter() - round_start,
                                         "generated_at": value["metadata"]["generatedAt"]})
            print(f"Published {key[1]} at +{perf_counter() - round_start:.3f}s", flush=True)

        service._ticker_repository.list_tickers = repository
        metrics.download_stock_data = download
        service._market_data_provider = TimedMarketProvider()
        service._build_snapshot = build
        service._snapshot_cache.set = save
        try:
            for number in range(1, args.rounds + 1):
                current = {"round": number, "downloads": [], "calculations": [], "published": [], "active_stage": "starting"}
                print(f"ROUND {number} starting production forced refresh", flush=True)
                round_start = perf_counter()
                service._refresh_windows_in_background("1Y", force_refresh=True)
                last_progress = round_start
                while True:
                    with service._refresh_lock:
                        running = service._refreshing_all_windows
                    if not running:
                        break
                    if perf_counter() - last_progress >= 20:
                        print(f"Progress +{perf_counter() - round_start:.1f}s: {current['active_stage']}", flush=True)
                        last_progress = perf_counter()
                    sleep(0.1)
                current["worker_complete_seconds"] = perf_counter() - round_start
                current["success"] = {p["window"] for p in current["published"]} == {"1D", "1W", "1M", "1Y"}
                current.pop("active_stage", None)
                report["rounds"].append(current)
                args.output.parent.mkdir(parents=True, exist_ok=True)
                args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")
                print(f"ROUND {number} completed: {current['worker_complete_seconds']:.3f}s; success={current['success']}", flush=True)
                if not current["success"]:
                    raise RuntimeError("Refresh did not publish all four windows; see report")
        finally:
            metrics.download_stock_data = original_download


if __name__ == "__main__":
    main()
