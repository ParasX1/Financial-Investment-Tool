from contextlib import closing
import gc
import json
from pathlib import Path
import sqlite3
from tempfile import TemporaryDirectory
from unittest.mock import Mock

import numpy as np
import pandas as pd
import pytest

from src.top_picks.history import RECONCILE_SECONDS, TopPicksHistoryProvider
from src.top_picks.repository import TopPicksDataSourceError


def prices(symbols=("AAA", "BBB"), start="2025-10-01", end="2026-10-05"):
    index = pd.date_range(start, end, freq="B").strftime("%Y-%m-%d")
    return pd.concat({symbol: pd.DataFrame({"Adj Close": np.arange(len(index)) + 100.0}, index=index)
                      for symbol in symbols}, axis=1)


def setup_provider(tmp_path, frame=None):
    frame = prices() if frame is None else frame
    download = Mock(side_effect=lambda symbols, start,
                    end: frame.loc[start:end, frame.columns.get_level_values(0).isin(symbols)].copy())
    clock = [1000.0]
    path = str(tmp_path / "history.sqlite3")
    provider = TopPicksHistoryProvider(download, path, clock=lambda: clock[0])
    return provider, download, clock, frame, path


def test_first_request_is_on_demand_then_year_expands_coverage(tmp_path):
    provider, download, _, _, _ = setup_provider(tmp_path)
    provider(["AAA"], "2026-09-28", "2026-10-03")
    provider(["AAA"], "2025-10-03", "2026-10-03")
    provider(["AAA"], "2025-10-03", "2026-10-03")
    assert [call.args[1:] for call in download.call_args_list] == [
        ("2026-09-28", "2026-10-03"), ("2025-10-03", "2026-10-03"),
        ("2026-09-26", "2026-10-03"),
    ]


def test_incremental_merge_matches_full_download_and_survives_restart(tmp_path):
    provider, download, clock, frame, path = setup_provider(tmp_path)
    frame.loc["2026-09-30", ("AAA", "Adj Close")] = np.nan
    expected = frame.loc["2025-10-03":"2026-10-03"]
    first = provider(["AAA", "BBB"], "2025-10-03", "2026-10-03")
    pd.testing.assert_frame_equal(first, expected)
    # Mutating the returned frame must not alter stored history.
    first.iloc[0, 0] = -1
    restarted = TopPicksHistoryProvider(download, path, clock=lambda: clock[0])
    result = restarted(["AAA", "BBB"], "2025-10-03", "2026-10-03")
    assert download.call_args.args[1] == "2026-09-26"
    pd.testing.assert_frame_equal(result, expected)


def test_recent_bar_is_replaced_and_new_day_added_without_duplicates(tmp_path):
    provider, download, _, frame, _ = setup_provider(tmp_path)
    provider(["AAA"], "2025-10-03", "2026-10-02")
    frame.loc["2026-10-02", ("AAA", "Adj Close")] += 3
    result = provider(["AAA"], "2025-10-03", "2026-10-05")
    assert download.call_count == 2
    assert download.call_args.args[1] == "2026-09-25"
    pd.testing.assert_frame_equal(
        result, frame.loc["2025-10-03":"2026-10-05", [("AAA", "Adj Close")]])
    assert result.index.is_unique


def test_new_symbol_gets_full_history_existing_symbol_gets_overlap(tmp_path):
    provider, download, _, _, _ = setup_provider(tmp_path)
    provider(["AAA"], "2025-10-03", "2026-10-03")
    download.reset_mock()
    provider(["AAA", "BBB"], "2025-10-03", "2026-10-03")
    assert [call.args for call in download.call_args_list] == [
        (["AAA"], "2026-09-26", "2026-10-03"),
        (["BBB"], "2025-10-03", "2026-10-03"),
    ]


def test_closed_price_revision_reloads_only_affected_symbol(tmp_path):
    provider, download, _, frame, _ = setup_provider(tmp_path)
    provider(["AAA", "BBB"], "2025-10-03", "2026-10-03")
    frame[("AAA", "Adj Close")] *= 0.5
    result = provider(["AAA", "BBB"], "2025-10-03", "2026-10-03")
    assert download.call_args.args == (["AAA"], "2025-10-03", "2026-10-03")
    assert provider.last_refresh["reconciled_symbols"] == ["AAA"]
    pd.testing.assert_frame_equal(result, frame.loc["2025-10-03":"2026-10-03"])


def test_weekly_reconciliation_catches_revisions_outside_overlap(tmp_path):
    provider, download, clock, frame, _ = setup_provider(tmp_path)
    provider(["AAA"], "2025-10-03", "2026-10-03")
    frame.loc["2025-11-03", ("AAA", "Adj Close")] = 77
    clock[0] += RECONCILE_SECONDS
    result = provider(["AAA"], "2025-10-03", "2026-10-03")
    assert download.call_args.args[1] == "2025-10-03"
    assert result.loc["2025-11-03", ("AAA", "Adj Close")] == 77


@pytest.mark.parametrize("refresh_kind", ["weekly", "revision"])
@pytest.mark.parametrize("truncation", ["prefix", "suffix", "interior"])
@pytest.mark.parametrize("restart", [False, True])
def test_incomplete_reconciliation_preserves_old_basis_and_retries_full(
    tmp_path, refresh_kind, truncation, restart,
):
    provider, download, clock, frame, path = setup_provider(tmp_path)
    provider(["AAA"], "2025-10-03", "2026-10-03")
    old_prices = provider._entries["AAA"].prices.copy()
    reconciled_at = provider._entries["AAA"].reconciled_at
    frame[("AAA", "Adj Close")] *= 0.5
    original_download = download.side_effect
    if refresh_kind == "weekly":
        clock[0] += RECONCILE_SECONDS

    def incomplete_download(symbols, start, end):
        result = original_download(symbols, start, end)
        if start < "2026-09-01":
            if truncation == "prefix":
                return result.loc["2026-09-01":]
            if truncation == "suffix":
                return result.loc[:"2026-09-01"]
            result.loc["2026-06-01", ("AAA", "Adj Close")] = np.nan
        return result

    download.side_effect = incomplete_download
    with pytest.raises(TopPicksDataSourceError, match="No fresh market history"):
        provider(["AAA"], "2025-10-05", "2026-10-05")

    record = stored_history(path)["AAA"]
    assert record["start"] == "2025-10-05"
    assert record["end"] == "2026-10-03"
    assert record["reconciled_at"] == reconciled_at
    pd.testing.assert_series_equal(provider._entries["AAA"].prices, old_prices.loc["2025-10-05":])
    assert provider.last_refresh["unavailable_symbols"] == ["AAA"]
    download.side_effect = original_download
    if restart:
        provider = TopPicksHistoryProvider(download, path, clock=lambda: clock[0])
    download.reset_mock()

    recovered = provider(["AAA"], "2025-10-05", "2026-10-05")

    assert download.call_args_list[0].args == (["AAA"], "2025-10-05", "2026-10-05")
    assert download.call_count == 1
    pd.testing.assert_frame_equal(recovered, frame.loc["2025-10-05":"2026-10-05", [("AAA", "Adj Close")]])


def test_full_reconciliation_accepts_sparse_calendar_and_preexisting_missing_bars(tmp_path):
    frame = prices(("AAA",)).iloc[::3].copy()
    frame.loc["2026-06-01", ("AAA", "Adj Close")] = np.nan
    frame.sort_index(inplace=True)
    provider, download, clock, frame, _ = setup_provider(tmp_path, frame)
    provider(["AAA"], "2025-10-03", "2026-10-03")
    frame[("AAA", "Adj Close")] *= 0.5
    clock[0] += RECONCILE_SECONDS

    result = provider(["AAA"], "2025-10-03", "2026-10-03")

    pd.testing.assert_frame_equal(result, frame.loc["2025-10-03":"2026-10-03"])
    assert provider._entries["AAA"].reconciled_at == clock[0]


@pytest.mark.parametrize("extension", ["prefix", "suffix"])
def test_full_reload_accepts_known_bars_without_inventing_calendar_observations(tmp_path, extension):
    provider, download, clock, _, path = setup_provider(tmp_path)
    provider(["AAA"], "2026-09-01", "2026-10-03")
    old_prices = provider._entries["AAA"].prices.copy()
    original_download = download.side_effect
    clock[0] += RECONCILE_SECONDS
    download.side_effect = lambda symbols, start, end: original_download(symbols, "2026-09-01", "2026-10-03")

    requested_start = "2025-10-03" if extension == "prefix" else "2026-09-01"
    requested_end = "2026-10-05" if extension == "suffix" else "2026-10-03"
    result = provider(["AAA"], requested_start, requested_end)

    record = stored_history(path)["AAA"]
    assert (record["start"], record["end"], record["reconciled_at"]) == (
        requested_start, requested_end, clock[0])
    assert provider.last_refresh["requested_start"] == requested_start
    assert provider.last_refresh["requested_end"] == requested_end
    assert provider.last_refresh["observed_ranges_by_symbol"]["AAA"] == {
        "start": old_prices.dropna().index[0], "end": old_prices.dropna().index[-1],
        "observations": len(old_prices.dropna()),
    }
    pd.testing.assert_series_equal(result[("AAA", "Adj Close")], old_prices, check_names=False)
    pd.testing.assert_series_equal(provider._entries["AAA"].prices, old_prices)


def test_recent_listing_expands_requested_window_without_losing_usable_prices(tmp_path):
    frame = prices(("NEW",), start="2026-10-01", end="2026-10-05")
    provider, download, _, _, _ = setup_provider(tmp_path, frame)
    short = provider(["NEW"], "2026-09-28", "2026-10-03")

    annual = provider(["NEW"], "2025-10-03", "2026-10-03")

    pd.testing.assert_frame_equal(annual, short)
    assert download.call_args.args == (["NEW"], "2025-10-03", "2026-10-03")
    assert provider.last_refresh["observed_ranges_by_symbol"]["NEW"] == {
        "start": "2026-10-01", "end": "2026-10-02", "observations": 2,
    }


@pytest.mark.parametrize("refresh_kind", ["weekly", "revision"])
@pytest.mark.parametrize("failure", ["empty", "omitted", "exception"])
@pytest.mark.parametrize("restart", [False, True])
def test_failed_full_reconciliation_stays_due_and_cannot_merge_new_basis(
    tmp_path, refresh_kind, failure, restart,
):
    provider, download, clock, frame, path = setup_provider(tmp_path)
    provider(["AAA"], "2025-10-03", "2026-10-03")
    old_prices = provider._entries["AAA"].prices.loc["2025-10-05":].copy()
    reconciled_at = provider._entries["AAA"].reconciled_at
    frame[("AAA", "Adj Close")] *= 0.5
    original_download = download.side_effect
    if refresh_kind == "weekly":
        clock[0] += RECONCILE_SECONDS

    def failed_full(symbols, start, end):
        if start < "2026-09-01":
            if failure == "exception":
                raise RuntimeError("full download unavailable")
            return pd.DataFrame() if failure == "empty" else prices(("OTHER", "ANOTHER"))
        return original_download(symbols, start, end)

    download.side_effect = failed_full
    with pytest.raises(RuntimeError if failure == "exception" else TopPicksDataSourceError):
        provider(["AAA"], "2025-10-05", "2026-10-05")

    assert stored_history(path)["AAA"]["needs_reconciliation"] is True
    assert stored_history(path)["AAA"]["reconciled_at"] == reconciled_at
    pd.testing.assert_series_equal(provider._entries["AAA"].prices, old_prices)
    if restart:
        provider = TopPicksHistoryProvider(download, path, clock=lambda: clock[0])
    # No old overlap is returned now. An incremental merge would silently combine
    # the unadjusted stored series with this new adjusted closing price.
    download.side_effect = lambda symbols, start, end: original_download(symbols, "2026-10-05", end)
    download.reset_mock()
    with pytest.raises(TopPicksDataSourceError):
        provider(["AAA"], "2025-10-05", "2026-10-05")
    assert download.call_args.args == (["AAA"], "2025-10-05", "2026-10-05")
    pd.testing.assert_series_equal(provider._entries["AAA"].prices, old_prices)

    download.side_effect = original_download
    recovered = provider(["AAA"], "2025-10-05", "2026-10-05")
    pd.testing.assert_frame_equal(recovered, frame.loc["2025-10-05":"2026-10-05", [("AAA", "Adj Close")]])
    assert "needs_reconciliation" not in stored_history(path)["AAA"]


def test_downtime_gap_is_included_in_incremental_request(tmp_path):
    provider, download, _, _, _ = setup_provider(tmp_path)
    provider(["AAA"], "2025-10-03", "2026-09-20")
    provider(["AAA"], "2025-10-03", "2026-10-03")
    assert download.call_args.args[1:] == ("2026-09-13", "2026-10-03")


def test_failure_preserves_history_and_does_not_report_old_data_as_fresh(tmp_path):
    provider, download, _, frame, _ = setup_provider(tmp_path)
    provider(["AAA", "BBB"], "2025-10-03", "2026-10-03")
    original = download.side_effect
    download.side_effect = lambda *a: pd.DataFrame()
    with pytest.raises(TopPicksDataSourceError):
        provider(["AAA", "BBB"], "2025-10-03", "2026-10-03")
    download.side_effect = lambda *a: frame.loc["2026-09-26":"2026-10-03", [
        ("AAA", "Adj Close")]]
    partial = provider(["AAA", "BBB"], "2025-10-03", "2026-10-03")
    assert "BBB" not in partial.columns.get_level_values(0)
    assert provider.last_refresh["unavailable_symbols"] == ["BBB"]
    download.side_effect = original
    recovered = provider(["AAA", "BBB"], "2025-10-03", "2026-10-03")
    assert download.call_args.args[1] == "2026-09-26"
    pd.testing.assert_frame_equal(
        recovered, frame.loc["2025-10-03":"2026-10-03"])


def test_failed_adjustment_reload_does_not_mix_price_bases(tmp_path):
    provider, download, _, frame, _ = setup_provider(tmp_path)
    provider(["AAA", "BBB"], "2025-10-03", "2026-10-03")
    revised = frame.loc["2026-09-26":"2026-10-03"].copy()
    revised[("AAA", "Adj Close")] *= 0.5
    download.side_effect = [revised, pd.DataFrame()]
    result = provider(["AAA", "BBB"], "2025-10-03", "2026-10-03")
    assert list(result.columns.get_level_values(0)) == ["BBB"]


def test_corrupt_database_falls_back_to_memory(tmp_path):
    path = tmp_path / "broken.sqlite3"
    path.write_text("broken")
    frame = prices(("AAA",))
    provider = TopPicksHistoryProvider(lambda *a: frame, str(path))
    assert not provider(["AAA"], "2025-10-03", "2026-10-03").empty


def stored_history(path):
    with closing(sqlite3.connect(path)) as connection, connection:
        return {
            symbol: {"start": start, "end": end, "reconciled_at": reconciled_at, **json.loads(payload)}
            for symbol, start, end, reconciled_at, payload in connection.execute(
                "SELECT symbol, start, end, reconciled_at, payload FROM adjusted_history")
        }


def test_daily_window_rolls_without_full_download_after_restart(tmp_path):
    frame = prices(("AAA",), end="2026-10-10")
    provider, download, clock, _, path = setup_provider(tmp_path, frame)
    provider(["AAA"], "2025-10-03", "2026-10-03")

    result = provider(["AAA"], "2025-10-05", "2026-10-05")
    assert download.call_args.args == (["AAA"], "2026-09-26", "2026-10-05")
    pd.testing.assert_frame_equal(result, frame.loc["2025-10-05":"2026-10-05"])
    record = stored_history(path)["AAA"]
    assert record["start"] == "2025-10-05"
    assert all("2025-10-05" <= date <= "2026-10-05" for date in record["dates"])

    restarted = TopPicksHistoryProvider(download, path, clock=lambda: clock[0])
    result = restarted(["AAA"], "2025-10-06", "2026-10-06")
    assert download.call_args.args == (["AAA"], "2026-09-28", "2026-10-06")
    assert restarted.last_refresh["full_history_symbols"] == 0
    pd.testing.assert_frame_equal(result, frame.loc["2025-10-06":"2026-10-06"])
    assert min(stored_history(path)["AAA"]["dates"]) >= "2025-10-06"


@pytest.mark.parametrize("refresh_kind", ["ordinary", "weekly", "revision"])
def test_short_window_refresh_retains_annual_history(tmp_path, refresh_kind):
    provider, download, clock, frame, path = setup_provider(tmp_path)
    provider(["AAA"], "2025-10-03", "2026-10-03")
    download.reset_mock()
    if refresh_kind == "weekly":
        clock[0] += RECONCILE_SECONDS
        frame.loc["2025-11-03", ("AAA", "Adj Close")] = 77
    elif refresh_kind == "revision":
        frame[("AAA", "Adj Close")] *= 0.5

    result = provider(["AAA"], "2026-09-28", "2026-10-05")
    pd.testing.assert_frame_equal(
        result, frame.loc["2026-09-28":"2026-10-05", [("AAA", "Adj Close")]])
    record = stored_history(path)["AAA"]
    assert record["start"] == "2025-10-05"
    assert record["end"] == "2026-10-05"
    assert min(record["dates"]) < "2026-09-28"
    assert all(date >= "2025-10-05" for date in record["dates"])
    if refresh_kind != "ordinary":
        assert download.call_args.args == (["AAA"], "2025-10-05", "2026-10-05")

    download.reset_mock()
    annual = provider(["AAA"], "2025-10-05", "2026-10-05")
    assert download.call_count == 1
    assert download.call_args.args == (["AAA"], "2026-09-28", "2026-10-05")
    pd.testing.assert_frame_equal(
        annual, frame.loc["2025-10-05":"2026-10-05", [("AAA", "Adj Close")]])


@pytest.mark.parametrize("failure", ["empty", "exception"])
def test_failed_download_still_trims_expired_history(tmp_path, failure):
    provider, download, _, frame, path = setup_provider(tmp_path)
    provider(["AAA"], "2025-10-03", "2026-10-03")
    original_download = download.side_effect
    if failure == "empty":
        download.side_effect = lambda *args: pd.DataFrame()
        expected_error = TopPicksDataSourceError
    else:
        download.side_effect = RuntimeError("download unavailable")
        expected_error = RuntimeError

    with pytest.raises(expected_error):
        provider(["AAA"], "2025-10-05", "2026-10-05")

    record = stored_history(path)["AAA"]
    assert record["start"] == "2025-10-05"
    assert record["end"] == "2026-10-03"
    assert min(record["dates"]) >= "2025-10-05"
    assert min(provider._entries["AAA"].prices.index) >= "2025-10-05"
    download.side_effect = original_download
    recovered = provider(["AAA"], "2025-10-05", "2026-10-05")
    assert download.call_args.args == (["AAA"], "2026-09-26", "2026-10-05")
    pd.testing.assert_frame_equal(
        recovered, frame.loc["2025-10-05":"2026-10-05", [("AAA", "Adj Close")]])


@pytest.mark.parametrize("restart", [False, True])
def test_prune_removes_departed_symbols_and_expired_dates(tmp_path, restart):
    provider, download, clock, _, path = setup_provider(
        tmp_path, prices(("AAA", "BBB", "CCC")))
    provider(["AAA", "BBB", "CCC"], "2025-10-03", "2026-10-03")
    download.reset_mock()
    if restart:
        provider = TopPicksHistoryProvider(download, path, clock=lambda: clock[0])
        assert not provider._entries

    provider.prune(["AAA"], "2025-10-05", "2026-10-05")

    assert set(provider._entries) == {"AAA"}
    records = stored_history(path)
    assert set(records) == {"AAA"}
    assert records["AAA"]["start"] == "2025-10-05"
    assert min(records["AAA"]["dates"]) >= "2025-10-05"
    download.assert_not_called()


def test_empty_complete_universe_clears_memory_and_database(tmp_path):
    provider, download, _, _, path = setup_provider(tmp_path)
    provider(["AAA", "BBB"], "2025-10-03", "2026-10-03")
    provider.prune([], "2025-10-05", "2026-10-05")
    assert provider._entries == {}
    assert stored_history(path) == {}

    provider(["AAA"], "2025-10-05", "2026-10-05")
    assert download.call_args.args == (["AAA"], "2025-10-05", "2026-10-05")


@pytest.mark.parametrize("restart", [False, True])
def test_subset_download_does_not_remove_other_pool_members(tmp_path, restart):
    provider, download, clock, _, path = setup_provider(tmp_path)
    provider(["AAA", "BBB"], "2025-10-03", "2026-10-03")
    other_history = stored_history(path)["BBB"]
    if restart:
        provider = TopPicksHistoryProvider(download, path, clock=lambda: clock[0])

    provider(["AAA"], "2026-09-28", "2026-10-05")

    records = stored_history(path)
    assert set(records) == {"AAA", "BBB"}
    assert records["BBB"] == other_history
    if not restart:
        assert "BBB" in provider._entries


def test_retention_uses_calendar_year_at_leap_day(tmp_path):
    frame = prices(("AAA",), start="2023-02-01", end="2024-03-01")
    provider, download, _, _, path = setup_provider(tmp_path, frame)
    provider(["AAA"], "2023-02-28", "2024-02-28")
    provider(["AAA"], "2024-02-26", "2024-02-29")
    record = stored_history(path)["AAA"]
    assert record["start"] == "2023-02-28"
    assert "2023-02-28" in record["dates"]

    provider(["AAA"], "2024-02-26", "2024-03-01")
    record = stored_history(path)["AAA"]
    assert record["start"] == "2023-03-01"
    assert "2023-02-28" not in record["dates"]
    result = provider(["AAA"], "2023-03-01", "2024-03-01")
    assert download.call_args.args == (["AAA"], "2024-02-23", "2024-03-01")
    pd.testing.assert_frame_equal(result, frame.loc["2023-03-01":"2024-03-01"])


def test_legacy_database_migrates_and_deleted_payload_releases_disk_space(tmp_path):
    path = tmp_path / "legacy.sqlite3"
    active_prices = prices(("AAA",), start="2024-01-01")[("AAA", "Adj Close")]
    removed_dates = pd.date_range("1900-01-01", "2026-10-03").strftime("%Y-%m-%d").tolist()
    with closing(sqlite3.connect(path)) as connection, connection:
        connection.execute(
            "CREATE TABLE adjusted_history (symbol TEXT PRIMARY KEY, "
            "start TEXT NOT NULL, end TEXT NOT NULL, reconciled_at REAL NOT NULL, "
            "payload TEXT NOT NULL)")
        connection.executemany(
            "INSERT INTO adjusted_history VALUES (?, ?, ?, ?, ?)",
            [
                ("AAA", "2024-01-01", "2026-10-03", 1000.0,
                 json.dumps({"dates": active_prices.index.tolist(),
                             "values": active_prices.tolist()})),
                ("DEPARTED", "1900-01-01", "2026-10-03", 1000.0,
                 json.dumps({"dates": removed_dates, "values": list(range(len(removed_dates)))})),
            ],
        )
        assert connection.execute("PRAGMA auto_vacuum").fetchone()[0] == 0
    initial_size = path.stat().st_size
    downloader = Mock()

    provider = TopPicksHistoryProvider(downloader, str(path), clock=lambda: 1000.0)
    assert set(stored_history(path)) == {"AAA", "DEPARTED"}
    with closing(sqlite3.connect(path)) as connection, connection:
        assert connection.execute("PRAGMA auto_vacuum").fetchone()[0] == 1
    provider.prune(["AAA"], "2025-10-03", "2026-10-03")

    assert path.stat().st_size < initial_size / 3
    records = stored_history(path)
    assert set(records) == {"AAA"}
    assert min(records["AAA"]["dates"]) >= "2025-10-03"
    with closing(sqlite3.connect(path)) as connection, connection:
        assert connection.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        assert connection.execute("PRAGMA freelist_count").fetchone()[0] == 0
    downloader.assert_not_called()


def test_many_daily_updates_keep_history_and_database_size_bounded(tmp_path):
    frame = prices(start="2025-09-01", end="2026-11-15")
    provider, download, clock, _, path = setup_provider(tmp_path, frame)
    first_end = pd.Timestamp("2026-10-03")
    provider(["AAA", "BBB"], "2025-10-03", "2026-10-03")
    initial_size = (tmp_path / "history.sqlite3").stat().st_size
    sizes = [initial_size]

    for day in range(1, 41):
        end = first_end + pd.Timedelta(days=day)
        start = end - pd.DateOffset(years=1)
        clock[0] += 1
        result = provider(["AAA", "BBB"], start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"))
        assert provider.last_refresh["full_history_symbols"] == 0
        assert result.index.is_unique
        assert len(result) <= 263
        sizes.append((tmp_path / "history.sqlite3").stat().st_size)

    assert download.call_count == 41
    assert max(sizes) <= initial_size + 8192
    records = stored_history(path)
    assert set(records) == {"AAA", "BBB"}
    assert all(len(record["dates"]) <= 263 for record in records.values())
    assert all(min(record["dates"]) >= "2025-11-12" for record in records.values())
    restarted = TopPicksHistoryProvider(download, path, clock=lambda: clock[0])
    restarted(["AAA", "BBB"], "2025-11-12", "2026-11-12")
    assert restarted.last_refresh["full_history_symbols"] == 0


def test_database_connections_release_files_without_garbage_collection(tmp_path):
    was_gc_enabled = gc.isenabled()
    gc.disable()
    try:
        with TemporaryDirectory(dir=tmp_path) as directory:
            provider, download, clock, _, database_path = setup_provider(Path(directory))
            path = Path(database_path)

            def verify_file_is_released():
                # Windows rejects this rename while an SQLite handle is open.
                moved = path.with_suffix(".moved.sqlite3")
                path.rename(moved)
                moved.rename(path)

            verify_file_is_released()
            provider(["AAA", "BBB"], "2025-10-03", "2026-10-03")
            assert set(stored_history(path)) == {"AAA", "BBB"}
            verify_file_is_released()

            restarted = TopPicksHistoryProvider(download, database_path, clock=lambda: clock[0])
            verify_file_is_released()
            restarted(["AAA"], "2025-10-05", "2026-10-05")
            assert restarted.last_refresh["full_history_symbols"] == 0
            verify_file_is_released()

            restarted.prune(["AAA"], "2025-10-05", "2026-10-05")
            assert set(stored_history(path)) == {"AAA"}
            verify_file_is_released()
            restarted.prune([], "2025-10-05", "2026-10-05")
            assert stored_history(path) == {}
            path.unlink()
    finally:
        if was_gc_enabled:
            gc.enable()
