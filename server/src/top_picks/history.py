"""Persistent adjusted-price history for Top Picks' incremental downloads."""

from contextlib import closing
from dataclasses import dataclass
import json
import logging
import os
import sqlite3
from threading import RLock
from time import time

import numpy as np
import pandas as pd

from ..market_primitives import clean_prices, get_adjusted_close_prices, normalize_tickers
from .repository import TopPicksDataSourceError


LOGGER = logging.getLogger(__name__)
OVERLAP_DAYS = 7
RECONCILE_SECONDS = 7 * 24 * 60 * 60


@dataclass
class HistoryEntry:
    prices: pd.Series
    # Bounds describe the request accepted by the provider, not a trading calendar
    # completeness guarantee. Observed dates remain explicit in prices/last_refresh.
    start: str
    end: str
    reconciled_at: float
    needs_reconciliation: bool = False


class TopPicksHistoryProvider:
    """Reuse history across rounds; the ordinary market-cache clear is separate.

    Download seven overlapping calendar days, expanding across downtime. Closed
    overlap revisions trigger a full replacement for the affected symbol. Weekly
    full reconciliation also covers revisions outside the overlap. Keep the
    longest supported window across short-window reads; trim expired dates even
    when downloading fails. Failed symbols are omitted from this calculation.
    """

    def __init__(self, downloader, persistence_path=None, clock=time):
        self._downloader = downloader
        self._path = persistence_path
        self._clock = clock
        self._entries = {}
        self._lock = RLock()
        self.last_refresh = {}
        if self._path:
            try:
                directory = os.path.dirname(self._path)
                if directory:
                    os.makedirs(directory, exist_ok=True)
                with closing(sqlite3.connect(self._path, timeout=30)) as connection, connection:
                    vacuum_mode = connection.execute(
                        "PRAGMA auto_vacuum").fetchone()[0]
                    if vacuum_mode != 1:
                        connection.execute("PRAGMA auto_vacuum = FULL")
                        if vacuum_mode == 0:
                            # Existing databases need this once to add page maps.
                            # Later commits reclaim freed pages automatically.
                            connection.execute("VACUUM")
                    connection.execute(
                        "CREATE TABLE IF NOT EXISTS adjusted_history ("
                        "symbol TEXT PRIMARY KEY, start TEXT NOT NULL, "
                        "end TEXT NOT NULL, reconciled_at REAL NOT NULL, "
                        "payload TEXT NOT NULL)"
                    )
            except (OSError, sqlite3.Error):
                LOGGER.warning(
                    "Top Picks history persistence unavailable; using memory.")
                self._path = None

    def _load(self, symbols):
        missing = [symbol for symbol in symbols if symbol not in self._entries]
        if not self._path or not missing:
            return
        try:
            with closing(sqlite3.connect(self._path, timeout=30)) as connection, connection:
                for offset in range(0, len(missing), 400):
                    chunk = missing[offset:offset + 400]
                    placeholders = ",".join("?" for _ in chunk)
                    rows = connection.execute(
                        "SELECT symbol, start, end, reconciled_at, payload "
                        f"FROM adjusted_history WHERE symbol IN ({placeholders})",
                        chunk,
                    )
                    for symbol, start, end, reconciled_at, payload in rows:
                        try:
                            record = json.loads(payload)
                            prices = pd.Series(
                                record["values"], index=record["dates"], dtype=float, name=symbol)
                            prices = self._clean_series(prices)
                            if prices.dropna().empty or start > end or not np.isfinite(reconciled_at):
                                continue
                            pd.Timestamp(start)
                            pd.Timestamp(end)
                            self._entries[symbol] = HistoryEntry(
                                prices, start, end, reconciled_at,
                                needs_reconciliation=bool(record.get("needs_reconciliation", False)))
                        except (ValueError, TypeError, KeyError):
                            continue
        except sqlite3.Error:
            LOGGER.warning(
                "Top Picks history could not be loaded; downloading required history.")

    def _save(self, entries, *, active_symbols=None, removed_symbols=()):
        if not self._path or (
                not entries and active_symbols is None and not removed_symbols):
            return
        try:
            rows = []
            for symbol, entry in entries.items():
                rows.append((symbol, entry.start, entry.end, entry.reconciled_at,
                             json.dumps({"dates": entry.prices.index.tolist(),
                                         **({"needs_reconciliation": True}
                                            if entry.needs_reconciliation else {}),
                                         "values": [float(v) if pd.notna(v) else None
                                                    for v in entry.prices]}, allow_nan=False)))
            with closing(sqlite3.connect(self._path, timeout=30)) as connection, connection:
                removed = set(removed_symbols)
                if active_symbols is not None:
                    removed.update(
                        symbol for (symbol,) in connection.execute(
                            "SELECT symbol FROM adjusted_history")
                        if symbol not in active_symbols
                    )
                connection.executemany(
                    "DELETE FROM adjusted_history WHERE symbol = ?",
                    [(symbol,) for symbol in removed],
                )
                connection.executemany(
                    "INSERT OR REPLACE INTO adjusted_history "
                    "(symbol, start, end, reconciled_at, payload) VALUES (?, ?, ?, ?, ?)", rows,
                )
        except (sqlite3.Error, ValueError, TypeError):
            LOGGER.warning(
                "Top Picks history persistence failed; retaining in-memory history.")

    def _trim_entries(self, symbols, start_date, end_date):
        changed = {}
        removed = []
        for symbol in symbols:
            entry = self._entries.get(symbol)
            if entry is None:
                continue
            prices = entry.prices.loc[start_date:end_date]
            covered_start = max(entry.start, start_date)
            covered_end = min(entry.end, end_date)
            if covered_start > covered_end or prices.dropna().empty:
                del self._entries[symbol]
                removed.append(symbol)
            elif (len(prices) != len(entry.prices)
                    or covered_start != entry.start or covered_end != entry.end):
                changed[symbol] = HistoryEntry(
                    prices.copy(), covered_start, covered_end, entry.reconciled_at,
                    entry.needs_reconciliation)
        self._entries.update(changed)
        return changed, removed

    def prune(self, symbols, start_date, end_date):
        """Retain this complete universe and range, supplied by the service.

        Ordinary subset downloads never imply that other symbols left the pool.
        """
        active_symbols = set(normalize_tickers(symbols))
        with self._lock:
            self._load(active_symbols)
            for symbol in set(self._entries) - active_symbols:
                del self._entries[symbol]
            changed, removed = self._trim_entries(
                active_symbols, start_date, end_date)
            self._save(changed, active_symbols=active_symbols,
                       removed_symbols=removed)

    @staticmethod
    def _clean_series(prices):
        prices = clean_prices(prices)
        prices.index = pd.to_datetime(prices.index).strftime("%Y-%m-%d")
        return prices.loc[~prices.index.duplicated(keep="last")].sort_index()

    def _download_prices(self, symbols, start, end):
        data = self._downloader(symbols, start, end)
        prices = get_adjusted_close_prices(data, symbols)
        return {
            symbol: self._clean_series(prices[symbol]).loc[start:end]
            for symbol in symbols if symbol in prices.columns
        }

    @staticmethod
    def _revised_history(old, fresh):
        overlap = old.index.intersection(fresh.index)
        # The last stored bar can be unfinished; updating it is normal. Earlier
        # bar changes can signal a split/dividend adjustment or a vendor revision.
        overlap = overlap[overlap < old.index[-1]]
        overlap = overlap[old.loc[overlap].notna()
                          & fresh.loc[overlap].notna()]
        return bool(len(overlap) and not np.allclose(
            old.loc[overlap], fresh.loc[overlap], rtol=1e-7, atol=1e-8,
        ))

    @staticmethod
    def _covers_existing_history(old, fresh):
        # Known observations are evidence of coverage; calendar days are not.
        # This allows weekends, holidays, sparse listings and preexisting gaps.
        return bool(fresh.reindex(old.prices.dropna().index).notna().all())

    def _mark_reconciliation_pending(self, symbols):
        pending = {}
        for symbol in symbols:
            old = self._entries.get(symbol)
            if old is not None and not old.needs_reconciliation:
                pending[symbol] = HistoryEntry(
                    old.prices, old.start, old.end, old.reconciled_at, True)
        self._entries.update(pending)
        self._save(pending)

    def __call__(self, symbols, start_date, end_date):
        symbols = normalize_tickers(symbols)
        if not symbols:
            return pd.DataFrame()
        with self._lock:
            self._load(symbols)
            # A short-window read must retain history needed by the 1Y window.
            annual_start = (pd.Timestamp(end_date) - pd.DateOffset(
                years=1)).strftime("%Y-%m-%d")
            changed, removed = self._trim_entries(
                symbols, min(start_date, annual_start), end_date)
            self._save(changed, removed_symbols=removed)
            now = self._clock()
            groups = {}
            full_symbols = []
            for symbol in symbols:
                entry = self._entries.get(symbol)
                full = (entry is None or start_date < entry.start
                        or entry.needs_reconciliation
                        or now - entry.reconciled_at >= RECONCILE_SECONDS
                        or now < entry.reconciled_at)
                if full:
                    download_start = min(start_date, entry.start) if entry else start_date
                    full_symbols.append(symbol)
                else:
                    anchor = min(end_date, entry.end)
                    download_start = max(start_date, (
                        pd.Timestamp(anchor) - pd.Timedelta(days=OVERLAP_DAYS)
                    ).strftime("%Y-%m-%d"))
                groups.setdefault((download_start, full), []).append(symbol)

            updated = {}
            corrections = []
            rejected = []

            def replace_history(symbol, fresh, download_start):
                old = self._entries.get(symbol)
                if old is not None and not self._covers_existing_history(old, fresh):
                    # Keep one honest price basis and its old coverage/freshness.
                    # Persist the retry requirement across a process restart.
                    rejected.append(symbol)
                    return
                updated[symbol] = HistoryEntry(fresh, download_start, end_date, now)

            for (download_start, full), group in groups.items():
                if full:
                    # Write before downloading: empty/omitted responses, an
                    # exception or process interruption must all retain the retry.
                    self._mark_reconciliation_pending(group)
                fresh_by_symbol = self._download_prices(
                    group, download_start, end_date)
                for symbol in group:
                    fresh = fresh_by_symbol.get(symbol)
                    if fresh is None or fresh.dropna().empty:
                        continue
                    if full:
                        replace_history(symbol, fresh, download_start)
                        continue
                    old = self._entries[symbol]
                    if self._revised_history(old.prices, fresh):
                        self._mark_reconciliation_pending([symbol])
                        corrections.append(symbol)
                        continue
                    # New bars replace overlapping dates rather than accumulating
                    # duplicate observations. Missing bars keep stored observations.
                    combined = fresh.combine_first(old.prices).sort_index()
                    updated[symbol] = HistoryEntry(
                        combined, old.start, max(
                            old.end, end_date), old.reconciled_at,
                    )

            if corrections:
                correction_groups = {}
                for symbol in corrections:
                    correction_start = min(start_date, self._entries[symbol].start)
                    correction_groups.setdefault(correction_start, []).append(symbol)
                for correction_start, group in correction_groups.items():
                    fresh_by_symbol = self._download_prices(
                        group, correction_start, end_date)
                    for symbol, fresh in fresh_by_symbol.items():
                        if not fresh.dropna().empty:
                            replace_history(symbol, fresh, correction_start)

            if rejected:
                LOGGER.warning("Top Picks full history response lost stored observations; retaining history and retrying reconciliation.")

            observed = {symbol: entry.prices.loc[start_date:end_date].dropna()
                        for symbol, entry in updated.items()}
            self.last_refresh = {
                "requested_start": start_date, "requested_end": end_date,
                "observed_ranges_by_symbol": {
                    symbol: {"start": prices.index[0], "end": prices.index[-1],
                             "observations": len(prices)}
                    for symbol, prices in observed.items() if not prices.empty
                },
                "requested_symbols": len(symbols), "full_history_symbols": len(full_symbols),
                "incremental_symbols": len(symbols) - len(full_symbols),
                "reconciled_symbols": corrections,
                "unavailable_symbols": [s for s in symbols if s not in updated],
            }
            if not updated:
                raise TopPicksDataSourceError(
                    "No fresh market history is available.")
            self._entries.update(updated)
            self._save(updated)
            return pd.concat({
                symbol: updated[symbol].prices.loc[start_date:end_date].to_frame(
                    "Adj Close")
                for symbol in symbols if symbol in updated
            }, axis=1)
