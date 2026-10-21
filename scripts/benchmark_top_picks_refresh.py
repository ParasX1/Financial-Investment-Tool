"""Measure cold responses and completed refreshes without touching app snapshots.

Run with the server Python environment. Live mode reads the configured Supabase
universe and Yahoo history; synthetic mode measures local work only, not network.
"""

from dotenv import load_dotenv
import pandas as pd
import numpy as np
import argparse
from datetime import date
import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
from time import perf_counter
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))

from src.top_picks.service import TOP_PICKS_WINDOWS, TopPicksService, TopPicksSnapshotCache  # noqa: E402
from src.top_picks.contracts import Ticker  # noqa: E402
from src.top_picks.batch_analytics import calculate_yearly_metrics  # noqa: E402
from src.metrics import clear_stock_data_cache, fetch_stock_data  # noqa: E402
from src.market_primitives import get_adjusted_close_prices  # noqa: E402
from src.analytics.calculator_registry import get_calculator  # noqa: E402


class SeparateWindowService(TopPicksService):
    """Previous refresh strategy, with the same optimized annual calculator."""

    def _refresh_window_snapshots(self, today, priority_window, force_refresh):
        ordered = [priority_window, *
                   (w for w in TOP_PICKS_WINDOWS if w != priority_window)]
        for window in ordered:
            start, end = self._start_date_for_window(
                today, window), today.isoformat()
            key = self._snapshot_cache_key(window, start, end)
            cached, status = self._snapshot_cache.get(key)
            if not force_refresh and cached is not None and status == "hit":
                continue
            snapshot = self._build_snapshot(start, end, window)
            self._snapshot_cache.set(key, snapshot, self._cache_ttl_seconds)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live", action="store_true")
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--as-of", type=date.fromisoformat, required=True)
    parser.add_argument("--env-file", action="append", default=[])
    parser.add_argument("--windows", nargs="+",
                        choices=TOP_PICKS_WINDOWS, default=["1D", "1Y"])
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if not 1 <= args.limit <= 1000:
        parser.error("limit must be between 1 and 1000")
    for path in args.env_file:
        load_dotenv(path, override=False)
    if args.live:
        from src.server import create_app
        from src.supabase_client import get_supabase_client
        from src.top_picks.repository import SupabaseTickerRepository
        repository = SupabaseTickerRepository(
            get_supabase_client(create_app()))
        tickers = repository.list_tickers(args.limit)
        if not tickers:
            raise RuntimeError("No tickers available for benchmark")
        source = fetch_stock_data
    else:
        tickers = tuple(Ticker(f"S{i}", f"Stock {i}", "Test")
                        for i in range(args.limit))

        class Repository:
            def list_tickers(self, limit):
                return tickers[:limit]

        repository = Repository()
        dates = pd.date_range(end=args.as_of.isoformat(),
                              periods=280, freq="B")
        values = 100 * np.cumprod(1 + np.random.default_rng(42).normal(
            0.0005, 0.012, (len(dates), len(tickers) + 1),
        ), axis=0)
        frame = pd.DataFrame(values, index=dates, columns=pd.MultiIndex.from_tuples(
            [(t.symbol, "Adj Close")
             for t in tickers] + [("^AXJO", "Adj Close")],
        ))

        def source(symbols, start, end):
            return frame.loc[start:end].copy(deep=True)

    report = {"mode": "live" if args.live else "synthetic_no_network",
              "as_of": args.as_of.isoformat(), "symbols": [t.symbol for t in tickers],
              "runs": []}
    jobs = []

    class DeferredThread:
        def __init__(self, target, daemon):
            jobs.append(target)

        def start(self):
            pass

    with TemporaryDirectory(prefix="top-picks-benchmark-") as directory, patch(
        "src.top_picks.service.Thread", DeferredThread,
    ):
        for name, cls in [("separate", SeparateWindowService), ("shared", TopPicksService)]:
            for window in args.windows:
                clear_stock_data_cache()
                jobs.clear()
                calls = []

                def measured_source(symbols, start, end):
                    began = perf_counter()
                    data = source(symbols, start, end)
                    available = get_adjusted_close_prices(data, symbols)
                    calls.append({"start": start, "end": end,
                                  "seconds": perf_counter() - began,
                                  "usable_symbols": len(available.columns)})
                    return data

                service = cls(
                    ticker_repository=repository, calculator_provider=get_calculator,
                    market_data_provider=measured_source,
                    market_cache_clearer=clear_stock_data_cache,
                    yearly_metrics_provider=calculate_yearly_metrics,
                    today_provider=lambda: args.as_of, universe_limit=args.limit,
                    snapshot_cache=TopPicksSnapshotCache(
                        persistence_path=str(
                            Path(directory) / f"{name}-{window}.json"),
                    ),
                )
                run = {"strategy": name, "initial_window": window}
                print(f"Starting {name} / {window} cold", flush=True)
                began = perf_counter()
                snapshot, _, _ = service._get_snapshot(window)
                run["cold_seconds"] = perf_counter() - began
                run["cold_downloads"] = list(calls)
                run["cold_rows_with_return"] = sum(
                    r["ret1y"] is not None for r in snapshot["rows"])
                calls.clear()
                print(
                    f"Cold completed in {run['cold_seconds']:.3f}s; warming other windows", flush=True)
                began = perf_counter()
                jobs.pop(0)()
                run["prewarm_seconds"] = perf_counter() - began
                run["prewarm_downloads"] = list(calls)
                calls.clear()
                before = {}
                for w in TOP_PICKS_WINDOWS:
                    key = service._snapshot_cache_key(
                        w, service._start_date_for_window(args.as_of, w), args.as_of.isoformat())
                    value, _ = service._snapshot_cache.get(key)
                    before[w] = value["metadata"]["generatedAt"] if value else None
                began = perf_counter()
                service._get_snapshot(window, force_refresh=True)
                run["refresh_response_seconds"] = perf_counter() - began
                print(
                    "Starting forced refresh (waiting for completed snapshots)", flush=True)
                began = perf_counter()
                jobs.pop(0)()
                run["refresh_complete_seconds"] = perf_counter() - began
                run["refresh_downloads"] = list(calls)
                completed = []
                for w in TOP_PICKS_WINDOWS:
                    key = service._snapshot_cache_key(
                        w, service._start_date_for_window(args.as_of, w), args.as_of.isoformat())
                    value, _ = service._snapshot_cache.get(key)
                    if value and value["metadata"]["generatedAt"] != before[w]:
                        completed.append(w)
                run["refreshed_windows"] = completed
                report["runs"].append(run)
                args.output.parent.mkdir(parents=True, exist_ok=True)
                args.output.write_text(json.dumps(
                    report, indent=2), encoding="utf-8")
                print(json.dumps(run), flush=True)


if __name__ == "__main__":
    main()
