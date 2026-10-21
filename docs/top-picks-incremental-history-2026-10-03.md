# Top Picks history reuse across refresh rounds

This is the English version of the historical 2026-10-03 record, including its
later dated additions. The results below describe those recorded runs; they are
not new measurements or confirmation of the current deployment.

## Behavior described by this record

The production service uses `TopPicksHistoryProvider` to maintain the adjusted
price history needed by Top Picks. With no history, the first request still
downloads its requested window. When the background process first needs a
one-year range, it fills in a year of history. Later refreshes:

1. Download the most recent 7 calendar days of overlapping prices for stocks whose history already covers the required range.
2. After downtime, resume from 7 days before the last covered date to avoid missing data during the interruption.
3. Merge old history with new prices, updating observations for the same date without adding duplicates.
4. Run the existing metric calculations on the complete merged history; the four windows still share this round's market data.

A forced refresh clears only the short-lived market-data cache, not valid
history. The page refreshes through calculation-completion notifications; see
[completion notifications](top-picks-live-updates-2026-10-04.md).
This is **incremental downloading and history merging**, not incremental metric
calculation. It does not add a background schedule that runs without visitors.

## Storage and corrections

- SQLite stores each stock's adjusted prices and coverage range using transactional writes; no new dependency is required.
- The default filename appends `.history.sqlite3` to `TOP_PICKS_CACHE_PATH`. The default absolute location corresponds to `server/.cache/top-picks-snapshot-cache.json.history.sqlite3`.
- `TOP_PICKS_HISTORY_PATH` can select a path; an empty string keeps history in memory only.
- After a service restart, each stock's history is restored from the local database. The deployment environment must persist that file to reuse it across deployments.
- A new stock, a request for earlier history, or uninitialized history triggers a download of that stock's complete requested range.
- If a historical price in the overlap changes significantly before the last existing price observation, the provider fetches that stock's entire requested range again. This avoids joining prices with different adjustment bases. The last price, which may be from a trading session that has not closed, is replaced normally.
- A full correction runs every 7 days by default to catch historical revisions outside the overlap. The database therefore does not guarantee immediate detection of every earlier revision; weekly correction rounds can still take as long as the original full-year download.
- If one stock has no usable prices this round, its disk history is retained but is not mixed into the new snapshot as fresh data. If every stock is unavailable, a data-source error is raised and the background process retains the old snapshot.
- A stock whose adjustment-correction fetch fails is likewise not joined to prices on the old adjustment basis; the existing missing-data warning is used.
- If history persistence is unavailable, the service logs the problem and falls back to process-local history. A process restart then requires initialization again.

## History retention and space reclamation (2026-10-04)

- After obtaining the complete universe and before downloading, each round cleans up once. For the longest current `1Y` window, it retains prices from the corresponding date one year earlier through the round's end date, using the same leap-year boundary rules as the annual calculation.
- Daily, weekly and monthly requests do not remove history needed by annual calculations. A short window's first request still downloads on demand. Once a full year exists, weekly corrections and adjustment revisions preserve that annual coverage so a later annual request does not need another backfill.
- Trimming updates both prices and coverage in memory and SQLite. If a download is empty or raises an exception, expired history has already been removed. Old prices still within the range are retained but are not presented as this round's new result.
- Stocks removed from the complete universe are removed from memory and SQLite; the benchmark belongs to the retained set. Ordinary requests for a stock subset do not trigger universe-removal deletion. A valid empty universe clears history; a failed universe query does not.
- SQLite uses `auto_vacuum=FULL` to reclaim free pages on commit. An existing database without this setting undergoes one `VACUUM` conversion when the new logic first loads it; subsequent rounds do not run a full `VACUUM`. See the [official SQLite explanation](https://www.sqlite.org/pragma.html#pragma_auto_vacuum).
- Every database operation commits or rolls back and immediately closes its connection, rather than relying on garbage collection to release file handles.
- Publishing a snapshot also removes expired in-memory snapshots and replaced startup-cache entries. The latest result for each window remains available as a fallback when updating fails. Disk snapshots still contain only the latest result for each window.

Cache size depends on the retained date range and current universe. It still
grows when the universe grows; there is no fixed byte limit.

The cleanup changes passed all 245 backend tests and static error checks.
Regression coverage included 40 consecutive days of updates, incremental reuse
across restarts, cleanup on failure, subset-request protection, leap years, a
real old-database migration and physical shrinkage, and immediate movement and
deletion of database files with automatic garbage collection disabled. In a
local offline check with 700 instruments, reducing the universe to 10 shrank
the auto-reclaiming database from 4,333,568 bytes to 77,824 bytes. Its integrity
check passed, and the temporary test directory was deleted.

After cleanup changed, a fresh measurement used 699 stocks plus the benchmark
with no history or snapshot cache. The first full backend refresh made annual
results available in 34.783 seconds and completed all four windows in 40.266
seconds; total market-data reading time was 33.329 seconds. These timings exclude
process startup, HTTP transport and browser rendering. All windows published
successfully; `QUB.AX` still had no prices and retained its warning.
The new measurement was appended to `retention_cold_runs` in the existing
`top-picks-production-96-2026-10-04.json`. Temporary snapshot, history and Yahoo
caches were deleted. That completely empty-database measurement used the
original profiling wrapper and omitted one empty-database cleanup. The profiling
tool has since gained cleanup-method forwarding to cover later cleanup with
existing history.

## Initial market-data package versioned in Git

`data/top-picks-seed.zip` contains calculated snapshots for each window and price
history as initial data for a new environment. When default runtime caches are
missing, the backend imports the package into `server/.cache/`; existing caches
are not overwritten. The page still displays the snapshot's original update
time and fetches current prices in the background. The seed package is not live
market data.

- The default snapshot path is `server/.cache/top-picks-snapshot-cache.json`; the history path appends `.history.sqlite3`. Runtime caches remain ignored by Git.
- A custom cache target does not automatically use the default package. Set `TOP_PICKS_SEED_PATH` explicitly to the package path. An empty `TOP_PICKS_SEED_PATH` disables import.
- The package supplies only snapshots and price history. It does not replace the Supabase universe or application environment configuration.

After each background round computes every window, saves runtime caches and
sends completion notifications, the existing refresh thread re-exports
`data/top-picks-seed.zip` from that cache. It does not download prices again or
delay the completion notification. If export fails, the old package is retained,
the error is logged and normal refreshing continues. The next download round
waits for export to finish. A single local offline export using a 699-instrument
cache took about 1.23 seconds. This is the extra inter-round interval introduced
by seed-package updating; the current round's page notification is sent first.

Automatic export is enabled by default; `TOP_PICKS_SEED_SYNC=false` disables it,
and `TESTING` disables it. It applies only to the default snapshot/history paths
and the normal market-data provider. Injected providers or custom cache paths do
not trigger it. `TOP_PICKS_SEED_PATH` selects only the import source; automatic
export still writes the repository's default package.

The following command can also update the package manually from populated local
caches at the repository root, without downloading prices again:

```bash
python scripts/export_top_picks_seed.py
```

The default inputs are the snapshot and history paths above, and the default
output is `data/top-picks-seed.zip`. `--snapshot`, `--history` and `--output`
select other files. If `--history` is omitted, its path is derived from the
selected snapshot path. Output summarizes only each window's row count, the
history instrument count, archive size and generation time.

This initial package was about 1.4 MB, with 699 rows in each of four windows and
699 instruments in history. With empty temporary caches, application creation,
import and the first API response together took about 0.51 seconds after Python
dependencies had loaded. This is not end-to-end web startup time. Returned
results retained their original generation time while current-price refreshing
continued in the background. Checksums of the two original cache files matched
before and after export; temporary runtime caches were removed.

The archive manifest records the format, calculation version and file SHA256
values. Import validates the snapshot and history database. An incompatible or
corrupt archive is skipped and the original update path is used. An incompatible
change to calculation rules requires increasing the shared
`CALCULATION_VERSION` in `market_primitives.py` and re-exporting after calculating
the new version.

Calculation version 2, dated 2026-10-10, preserves missing-price dates in the
input and calculates daily returns only between adjacent valid prices. An
existing version 1 package can supply raw history but no longer supplies old
calculated snapshots. The first ranking request after upgrading must calculate
again. The first-response timing above is a historical version 1 result; old
caches are not silently relabeled as version 2. See the
[calculation contract and verification record](financial-calculation-contracts-2026-10-10.md).

The package provides initial data with the Git version. Cache synchronization
updates the local package; Git commits and GitHub uploads remain normal user
actions and are not automatic. Continuously updating prices without visitors
would require a separate scheduler, which this change did not add.

## Verification

Focused tests covered expansion from on-demand downloading to a one-year range,
cross-round merging, restart recovery, return-value isolation, missing dates,
last-price revisions, new trading days, new stocks, historical revision
corrections, weekly full corrections, downtime backfills, download
failure/recovery, failed adjustment correction and fallback from a corrupt
database. Application-composition tests confirmed that the actual service uses
the history provider.

The full 699-stock universe plus benchmark ran twice consecutively through
`scripts/profile_top_picks_full.py`: the first round initialized history and the
second reused the same database. Temporary history and snapshot files were
independent of the development service. Raw record:
`docs/benchmarks/top-picks-incremental-full-universe-2026-10-03.json`.

Downloads retained the existing `threads=False` setting. This optimization did
not remove the wait for each stock's network request. A shorter date range
therefore does not imply proportionally faster downloading or justify a promise
of a five-second full-universe refresh.

## Full-universe measurements

| Stage                                                           |     Initialization round |        Incremental round |
| --------------------------------------------------------------- | -----------------------: | -----------------------: |
| Main batch date range                                           | 2025-10-03 to 2026-10-03 | 2026-09-26 to 2026-10-03 |
| Main batch instruments, including benchmark                     |                      700 |                      699 |
| Main batch date rows                                            |                      258 |                        5 |
| Main batch download                                             |          283.176 seconds |          261.467 seconds |
| Total provider time, including merging/history saving/backfills |          285.569 seconds |          265.092 seconds |
| Total calculation time for four windows                         |            3.179 seconds |            3.020 seconds |
| Total snapshot-saving time                                      |            0.326 seconds |            0.477 seconds |
| Complete round                                                  |      **289.550 seconds** |      **269.850 seconds** |

The incremental round reused history for 699 instruments: 698 stocks plus the
benchmark. `QUB.AX` returned no prices during initialization, so the next round
still requested its complete history separately and retried through the
original process; it remained unavailable. There was no retry cooldown or
artificial skipping of this stock. Both rounds had 696 stocks with valid annual
returns and 698 for the shorter windows. All four windows published successfully,
and the original missing-data/short-history warnings remained.

The incremental round finished about 19.70 seconds, or 6.8%, faster. This was one
sequential observation affected by network variation, not a stable speedup
ratio. Cross-round history reuse worked, but reducing transferred date rows did
not greatly reduce per-instrument request waits. A substantial further reduction
would require separately evaluating bounded concurrency or a batch data source.

All 197 backend tests passed. After formatting and application-composition
additions, the relevant 13 tests passed again, and static error checks passed.
Measurements used a temporary history database and did not overwrite the
development service's existing snapshot or history database.
