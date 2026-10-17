# Top Picks Sprint Review

| Review information | Detail |
| --- | --- |
| Review period | 3–7 October 2026 |
| Review date and timezone | 2026-10-07, Australia/Sydney |
| Scope | Top Picks downloads, calculations, caching, data availability and continuous refresh |
| Delivery status | Implemented in the current checkout and verified with automated tests and browser journeys |
| Code references | `SecondStageDev_Personal` / PR #279; merge repairs `767e90f92`; app-wide refresh `302a6bdcc` |

## Sprint goal

Reduce the repeated work and waiting involved in Top Picks updates, preserve correct ranking results,
and keep saved results current while users browse other application pages.

The work addresses three user-facing needs: make complete rankings available sooner, avoid rebuilding
the same market data repeatedly, and let returning users read the latest successfully saved result.

## Outcome summary

The delivered changes combine annual batch calculations, shared downloads for four windows,
persistent incremental history, 96 concurrent downloads, controlled cache retention and seed data.
SSE replaces the old 20-second polling cycle, and an application-level subscription keeps updates
running across pages. Merge regressions and duplicate cold builds have also been repaired.

The strongest recorded full-universe result is an incremental backend refresh of **30.538 seconds**,
compared with **269.850 seconds** in the earlier sequential-download configuration: **88.7% less
elapsed time** in those historical runs. Annual calculation-only benchmarks showed **91.5% less
calculation time**. The latest feature verification passed **302 frontend tests, 286 related backend
tests and 4 Chrome journeys**.

These results have different evidence scopes. The full-universe comparison uses dated live runs of
different configurations, while the annual calculation comparison uses synthetic data. The cross-page
refresh improvement is verified behaviour; it has no new live-market latency benchmark.

## Delivered work and user outcomes

| Delivered item | What was improved | Practical outcome | Evidence |
| --- | --- | --- | --- |
| Annual batch calculations | Reused price extraction, returns, aligned samples and intermediate statistics | Less calculation work with the original metric definitions preserved | Synthetic timing comparison and numerical-equivalence tests |
| Shared data across four windows | Replaced separate window retrievals with one annual-range retrieval and date slices | Fewer repeated provider calls when refreshing Day, Week, Month and Year | Provider-call comparison, window-consistency tests and live sample reports |
| Persistent incremental history | Stored adjusted-price history in SQLite and downloaded overlapping recent data | Less historical data requested on repeat updates; history survives service restarts | Full-universe initialization/incremental reports and history regression tests |
| 96 concurrent downloads | Used a bounded download pool, sequential retries and isolation between Yahoo calls | Shorter recorded full-universe refreshes, with missing-data warnings retained | Live production-path timing report and measured peak concurrency of 96 |
| Cache retention and cleanup | Trimmed annual history, removed assets outside the universe and reclaimed database/thread records | Storage follows retained dates and assets; completed work does not accumulate indefinitely | Retention, migration, handle-release and space-reclamation tests |
| Seed package | Imported existing snapshots/history and refreshed the local package after complete rounds | Previous results can be displayed before current market data finishes downloading | Seed import/export tests and recorded first-API-response measurement |
| SSE notifications | Read the table after snapshot publication instead of forcing refresh every 20 seconds | Removes the wait for the next polling tick and ties table updates to saved results | Browser notification tests; reads do not carry `force_refresh` |
| Continuous refresh across pages | Kept a global subscription and shared same-window connections | Users can return from Portfolio, Dashboard or Guide to the latest completed result | Verified Guide → Top Picks → Guide → Top Picks journey |
| Cold-build coordination | Reused active builds, returned when the requested window was published, and prioritised waiting reads | Avoids duplicate Top Picks downloads and indefinite waits on failure or zero TTL | Concurrent cold-read, partial-failure and zero-TTL tests |
| Merge repairs | Restored state references and the 96-thread constant; restricted snapshot fallback to matching contexts | Restores page loading and prevents results from the wrong window/configuration | Controller, download and snapshot-context regressions |

## Measured impact

| Measure | Before → after | Observed improvement | Measurement scope |
| --- | --- | --- | --- |
| Annual calculation time | 8.0798 → 0.6893 seconds | **91.5% less time** | Median of three synthetic runs, 1,000 stocks plus benchmark, 260 trading days; excludes downloads and persistence |
| Full-universe incremental refresh | 269.850 → 30.538 seconds | **About 239.3 seconds saved; 88.7% shorter; 8.84× before/after ratio** | Historical sequential configuration versus later 96-concurrency production path; 699 stocks plus benchmark, all four windows completed |
| Full-universe history initialization | 289.550 → 42.126 seconds | **About 247.4 seconds saved; 85.5% shorter** | Same two dated configurations; backend worker completion for all four windows |
| Retrievals for a four-window refresh | 4 → 1 provider calls | **75% fewer provider calls** | Shared annual-range retrieval; each call can still contain many HTTP requests and retries |
| Main-batch date rows on repeat download | 258 → 5 rows | **98.1% fewer date rows in that batch** | Annual initialization versus overlapping incremental data; counts returned date rows, not elapsed time or measured network bytes |
| SQLite space after reducing the universe | 4,333,568 → 77,824 bytes | **98.2% reclaimed after shrinking from 700 to 10 assets** | Offline retention demonstration with a smaller workload; not a same-universe storage comparison |

Full-universe values come from the [2026-10-03 incremental report](benchmarks/top-picks-incremental-full-universe-2026-10-03.json)
and the [2026-10-04 production report](benchmarks/top-picks-production-96-2026-10-04.json).
The calculation benchmark method, provider-call evidence and storage demonstration are retained in
[Appendix C](#appendix-c-historical-timing-and-resource-evidence).

Time reduction is `(before - after) / before`; the speed ratio is `before / after`. The live comparisons
are observations across dated configurations and network conditions. They do not isolate the effect
of one change or establish a fixed refresh interval for every environment.

## Timing report: what becomes available, and when

| User or system milestone | Recorded time | Meaning |
| --- | --- | --- |
| Year snapshot during 96-concurrency initialization | **37.133 seconds** | Year published before the four-window worker completed at 42.126 seconds |
| Year snapshot during 96-concurrency incremental refresh | **25.375 seconds** | Year published before the four-window worker completed at 30.538 seconds |
| Empty-cache run after retention changes | **Year: 34.783 seconds; worker complete: 40.266 seconds** | Separate cold-run measurement; market-data work took 33.329 seconds |
| Seed-assisted first API response | **Approximately 0.51 seconds** | Application creation, seed import and first response after Python dependencies had loaded; serves an existing snapshot |
| First Top Picks rows after opening the page in the development-startup test | **33.961 seconds** | 25 rows displayed; includes that page's first development compilation and data request |
| Complete development-startup journey | **57.402 seconds** | Services started, homepage visited, then Top Picks opened in a new browser context |

The first two rows are in `rounds[].published` and `rounds[].worker_complete_seconds` in the
[production timing report](benchmarks/top-picks-production-96-2026-10-04.json). The separate cold
run is in `retention_cold_runs`, and the browser journey is in `site_startup_runs` in the same file.
The seed measurement is a retained local observation with its method described in Appendix C.

Backend snapshot completion, saved-data availability and browser display are different endpoints.
The seed response provides the original snapshot timestamp; it does not mean current prices downloaded
in 0.51 seconds. The 57.402-second development journey includes first compilation and a homepage visit;
it is not a direct Top Picks cold-open measurement or a production-deployment benchmark.

## Verification and review walkthrough

| Completion check | Evidence | Result |
| --- | --- | --- |
| Ranking and page behaviour remain correct | 47 Portfolio / Top Picks suites, 302 tests and coverage thresholds | Passed |
| Downloads, caches and concurrent reads work together | 286 related backend tests | Passed |
| Table updates and navigation work in a browser | 4 installed-Chrome regression journeys with controlled providers/events | Passed |
| Code checks | TypeScript, frontend ESLint, backend flake8 and diff checks | Passed |

### Top Picks test inventory

This inventory counts tests dedicated to Top Picks, including its architecture checks. Shared Portfolio
and market-data tests are outside this file count. Test helpers and mock backends are not test files.

| Feature | Main test locations in the repository | Test files | Declared test cases | Current execution |
| --- | --- | ---: | ---: | --- |
| TopPicks | `client/features/top-picks/`<br>`server/tests/top_picks/`<br>`server/tests/api/test_top_picks_*.py`<br>`server/tests/test_top_picks_architecture.py`<br>`client/tests/e2e/top-picks/` | **38** | **248** | **391 unit/integration cases passed** in the inventory check; **6 E2E cases collected**, of which **4 passed in the latest browser run** |

| Test group | Files | Source declarations | Cases after parameter expansion |
| --- | ---: | ---: | ---: |
| Frontend | 16 | 99 | 108 |
| Backend, API and architecture | 20 | 143 | 283 |
| Browser E2E | 2 | 6 | 6 |
| Total | **38** | **248** | **397** |

“Declared test cases” counts source test declarations before parameter expansion. Jest `it.each` and
pytest parametrization produce more executable cases: **108 + 283 + 6 = 397**. The inventory check
executed and passed all **391** frontend/backend cases. E2E collection counted six cases without
launching a browser; the latest recorded browser execution covered the four in `top-picks.spec.ts`,
while the two in `ranking-context.spec.ts` were not rerun in this inventory check.

The review can demonstrate the delivered behaviour with these regression scenarios:

1. Open Guide and inspect the persistent `1Y` event stream. There is no table POST caused by background
   notifications while the user remains on that page.
2. Open Top Picks and inspect the latest saved timestamp, ranking window, sorting and pagination.
   The Year table reuses the existing connection.
3. Return to Guide, allow a new snapshot event, and open Top Picks again. The connection survives and
   the table reads the latest completed result. The automated journey verifies the first visit and a later return.
4. Switch ranking windows and make a manual retry. Window-specific results remain isolated, and a
   forced-refresh request is consumed once rather than carried into subsequent table changes.
5. Use the backend regressions to show cold requests sharing a build, returning after their own window
   is published, and progressing when a window fails or caching is disabled.

Browser events and market data are controlled in these tests. The historical notification test's
five-second assertion measures notification-to-table behaviour, not a full-universe market download.
Stage-specific test coverage is recorded in [Appendix B](#appendix-b-validation-history).

## Findings from the sprint

Reducing repeated calculations and shortening download ranges address different costs. In the earlier
sequential configuration, initialization versus incremental refresh reduced returned main-batch rows
from 258 to 5, but total round time improved by only about 6.8%. Much of the waiting remained in asset
requests. The later concurrent configuration recorded substantially shorter full-universe rounds.

Keeping a saved result available also differs from finishing a fresh update. Seed data, window-by-window
publication and persistent subscriptions improve when users can see results; they do not make the
market-data provider instantaneous. Both elapsed time and the result's original timestamp matter when
reviewing the user experience.

## Trade-offs and follow-up

- “Latest” means the latest successfully saved snapshot. Provider delays, missing symbols and weekly
  reconciliation still affect freshness. The recorded runs retained warnings for unavailable `QUB.AX`
  data and short annual history for `FDXF` and `HONA`.
- Continuous updates keep download and calculation work active while an application subscription
  exists. Yahoo calls share a process-level lock. Portfolio latency under this background workload has
  not been benchmarked; measure that interaction alongside refresh throughput in a follow-up run.
- After the last connection closes, current and queued work completes before the worker stops.
  Updates without visitors require a separate scheduler. Multi-process deployment requires shared
  notifications/results or routing subscriptions and reads to the same process.
- Repeat the live timing scenarios with the current complete configuration, multiple runs and explicit
  cache states. Record distributions and source revisions before setting a production latency target.

The technical appendix below preserves operating details, configuration, all historical measurement
records and source links so this remains the single document for the sprint's changes.

## Appendix A: Implementation and operating reference

### Current data flow

1. Once the application's authentication state has initialised, `TopPicksBackgroundRefresh` opens a
   global `GET /api/top-picks/events?window=1Y` subscription. This applies to both anonymous and
   signed-in users.
2. The backend fetches the complete stock universe and removes expired history, then fetches market
   data for the annual range once per round. When history exists, it performs incremental downloads,
   reconciliation and merging. A single market-data provider call may still involve multiple network
   requests and retries internally.
3. It slices the data using the actual start and end dates for `1D`, `1W`, `1M` and `1Y`, then calculates
   and saves each snapshot. The current priority window is calculated and published first. Normal
   prewarming may skip windows that remain fresh; a forced refresh processes every window.
4. Saving each window sends a `snapshot` notification. An open Top Picks table makes a normal read
   using its current window, sort order and pagination. The global listener on other pages does not
   make additional table POST requests.
5. After a fully successful round saves and announces all windows, the existing refresh thread updates
   the local seed package. It proceeds to the next round while a live subscription exists. On failure,
   it retains the previous results and follows the retry rules.

`POST /api/top-picks` remains the table's read endpoint. If no snapshot is available and no build is
running, a cold request downloads data for its requested window. If an annual background build has
already started, the request waits for and reuses the result for its window. The first background build
that needs an annual range fills in the annual history. Metrics are still recalculated from the merged
history.

### Annual batch metric calculations

The composition layer injects `calculate_yearly_metrics` into the service. The annual path extracts
prices and calculates returns once, reusing the mean, standard deviation and aligned stock/benchmark
samples. Alpha reuses Beta from the same calculation. Callers without an injected batch calculator
can still use the original individual calculation path for compatibility and numerical comparison.

Missing dates retain the original two return definitions: Sharpe, Beta, Alpha, Information Ratio and
sample counts use returns between adjacent dates; volatility and Sortino use returns between adjacent
valid prices. When there are no internal gaps, the calculations share a return array. With gaps, they
calculate the necessary samples separately. The service layer still enforces the annual display
threshold of 200 return observations.

The four windows are sliced by date boundaries. Taking the last N valid prices from annual data would
allow old prices outside a window to fill gaps inside it, so that approach is not used. Minimum sample
requirements for short windows and the existing missing, unavailable and zero-volatility states remain
unchanged. Failure to calculate one window does not prevent the others from being published. Failure
to fetch the shared market data retains the previous snapshots.

### Incremental history and retention

`TopPicksHistoryProvider` stores adjusted prices, coverage ranges and reconciliation information for
each asset. SQLite writes are transactional and history is restored after service restarts. If persistence
is unavailable, the service logs the issue and falls back to in-process history, which must be initialised
again after a restart.

- For assets whose history covers the required range, downloads overlap the most recent 7 calendar
  days. After downtime, downloads start 7 days before the last covered date to avoid missing intervening
  data. New prices replace existing values for the same date without adding duplicate observations.
- New assets, uninitialised history and requests for earlier dates fetch the full required range for the
  affected assets.
- Full reconciliation runs every 7 days by default. If historical prices within the overlap, before the
  last previously stored price, change materially, the affected assets are fetched for the full range
  again to avoid combining different adjustment bases. The trailing price, which may belong to a
  session that has not closed, is replaced normally.
- If an asset has no usable prices in the current round, its disk history is retained but is not treated
  as newly fetched data. A failed fetch to reconcile adjusted prices likewise does not splice together
  different adjustment bases. If every asset is unavailable, a data-source error is raised and the
  background task retains the old snapshots.
- Forced refreshes clear the short-term market-data cache while retaining valid SQLite history.
  Incremental downloads do not guarantee immediate detection of all revisions to earlier prices;
  weekly full reconciliation can still take as long as a full annual download.

After fetching the complete universe and before downloading, each round trims dates and coverage in
memory and SQLite to the longest `1Y` window. Leap-year boundaries follow the annual calculation
rules. Short-window requests do not discard existing annual coverage; weekly reconciliation and
adjusted-price revisions also preserve it. Expired dates are removed before a download returns empty
data or raises an error.

Assets removed from the complete universe are deleted from memory and SQLite. The benchmark is
always included in the retained set. Ordinary requests for a subset of stocks do not trigger universe
removal. A valid empty universe clears history; a universe-query error does not.

SQLite uses `auto_vacuum=FULL` to reclaim free pages on commit. An older database without this mode
is converted with a one-off `VACUUM` when first loaded; subsequent rounds do not perform a full
`VACUUM`. Database connections close immediately after commit or rollback. Cache size varies with
the retained dates and universe rather than having a fixed byte limit.

### 96 concurrent downloads and cache fallback

Batch downloads in `server/src/metrics.py` use `STOCK_DATA_DOWNLOAD_THREADS = 96`. Single-asset
requests and retries for missing data remain sequential. The current dependencies are
`yfinance==0.2.65` and `multitasking==0.0.13`. Calling `set_max_threads` alone does not resize an
existing pool, so a pool with 96 slots is explicitly created before each batch download. When the call
finishes, the downloader waits for the batch's worker threads to finish before removing their task records.

Yahoo download calls within the same process share a download lock to prevent concurrent resets of
yfinance's global result dictionary. This lock does not hold the market-data cache lock, and downloads
within a batch still run in parallel. Retry merging fills missing values from new results while retaining
existing valid prices. This fixes the case where duplicate all-empty columns masked prices from a
successful retry. The short-term market-data cache lasts 120 seconds and retains at most 128 request
entries. It evicts entries by least recent use and returns independent copies so one caller cannot alter
another caller's data.

Top Picks snapshots have a default freshness period of 600 seconds. Fallback snapshots must match
the window, benchmark, risk-free rate and universe configuration. Matching results can be reused
across dates or restarts; a Day result cannot stand in for Year. Old results loaded from disk are treated
as stale and retain their original `generatedAt`. A forced refresh may also return a matching old
snapshot first, then start a background update.

Publishing a new snapshot removes expired in-memory entries and superseded startup cache entries.
The latest result is retained for each window and calculation-configuration context as a failure
fallback. Disk storage uses the same contexts. Frontend row data and export context are isolated by
account, window, sort order, pagination and page size.

### Seed package

`data/top-picks-seed.zip` contains calculated snapshots for all four windows and price history. When
the default runtime cache is missing, the backend imports the package into `server/.cache/`, leaving
any existing cache intact. The page shows the original snapshot timestamp while current market data
is fetched in the background. The seed package is not live market data and does not replace the
Supabase universe or environment configuration.

The default snapshot path is `server/.cache/top-picks-snapshot-cache.json`. The default history path
appends `.history.sqlite3` to that path. Runtime caches are ignored by Git. Custom targets require an
explicit `TOP_PICKS_SEED_PATH` for import; an empty string disables import.

After a complete round calculates all windows, saves the runtime cache and sends notifications, the
existing refresh thread exports the local default package. Export does not download market data again
or delay the current round's notifications. The next download round waits for export to finish. If
export fails, the old package is retained, the error is logged and refreshing continues. Automatic
export is enabled by default and applies only to the default cache paths, the normal market-data
provider and a positive cache TTL. It is disabled in `TESTING` mode, with an injected provider or with
custom paths. `TOP_PICKS_SEED_PATH` selects only the import source; automatic export always writes
to the repository's default package. Updating the local package does not commit or push it to Git.

The package manifest records its format, calculation version and file SHA256 values. Snapshots and
the database are validated before import. An incompatible or damaged package is skipped and normal
updates proceed. When calculation rules change incompatibly, increment `SEED_CALCULATION_VERSION`
in `bootstrap.py` and export the package again.

If the snapshot assumptions do not match the current benchmark, risk-free rate or universe
configuration, only price history is reused. A zero TTL also imports history only. Missing snapshot
and history files are populated independently to avoid overwriting existing caches.

To export manually from the repository root using existing caches without downloading market data:

```bash
python scripts/export_top_picks_seed.py
```

The command supports `--snapshot`, `--history` and `--output`. If `--history` is omitted, its path is
derived from the snapshot path. The output summarises row counts per window, the number of assets
in history, package size and generation time.

### SSE and continuous refresh across pages

The global component is mounted at the application entry point. Application pages such as Portfolio,
Dashboard and Guide all retain the `1Y` subscription. After its first successful table read, Top Picks
joins the subscription for the selected window. Within the same browser page, listeners for the same
window share one EventSource; other windows can have separate connections. Separate browser tabs
create their own connections, while the backend shares one refresh task within the same process.

- A `connected` event prompts the table to read current results, covering updates missed before the
  connection opened or during a disconnection. When a returning page joins an existing connection
  that has already received an update, it reads the snapshot again. Unmounted listeners are no longer
  called. Duplicate `snapshot` events with the same revision are ignored, while `connected` events
  after reconnection still trigger a read.
- EventSource reconnects automatically. Changing window or account, or leaving Top Picks, removes
  the page listener while retaining the global subscription. A connection closes only after the last
  listener for its window is removed.
- New-snapshot notifications trigger normal table reads without `force_refresh`. Multiple notifications
  during a request are combined into one follow-up read. A forced refresh requested by a manual retry
  is consumed once and is not carried over to subsequent sorting, pagination, window or account changes.
- Each backend subscription holds at most one pending notification. An empty heartbeat is sent every
  15 seconds to maintain the connection; it does not query market data.
- If an update fails, Top Picks retains the existing table and shows an error. A failed whole round or
  an empty universe waits 5 seconds before retrying. Closing the last subscription can end that wait.
- With live subscriptions, each completed round proceeds to the next. A new subscription does not
  queue another forced refresh for an existing task. After the last application connection closes,
  the current round and any queued forced refresh complete before the task stops. Detecting a
  disconnected client may take until the next write.

The global subscription replaces the old 30-second delayed prewarm on selected pages and the
continuous subscription previously owned only by the Top Picks page. There is no unattended
continuous refresh without a live subscription; that would require a separate scheduled task.

SSE uses the existing threaded Flask server, `API_BASE` and CORS. The endpoint disables caching and
buffering. Notifications and background state reside in service-process memory. A multi-process
deployment needs shared notifications and results across processes, or must route subscriptions and
reads to the same process. Proxies must support continuous SSE delivery. SSE removes the wait for the
next 20-second polling interval; data-source latency and download time still apply.

### Cold-request coordination and merge fixes

The global subscription may begin building before the first table request arrives. A read without an
available snapshot waits on a shared condition variable for an active build, then reuses its result.
It can return as soon as its window is saved and published, without waiting for all four windows.
Reads with an available snapshot return immediately. Multiple cold requests also share a build, and
a failed build releases its slot.

If a window calculation fails or `TOP_PICKS_CACHE_TTL_SECONDS=0`, waiting reads get a chance to check
the cache or claim a build before another background round starts. This prevents continuous
background rounds from blocking them indefinitely. Forced-refresh intent is preserved.

Commit `767e90f92` fixes omissions and incompatible combinations in the merge result:

- Restores `subscriptionScope`, the pending-notification reference and the forced-refresh consumption
  reference. This resolves `subscriptionScope is not defined` and restores notification coalescing
  and the behaviour that executes a manually requested forced refresh only once.
- Updates current request state on SSE errors and clears the error after a successful read.
- Restores `STOCK_DATA_DOWNLOAD_THREADS = 96`.
- Restricts old-snapshot fallback to the same window and calculation configuration. A forced refresh
  can reuse a matching old result first while updating in the background.

The frontend omissions appeared in merge result `a29bc42ab` on `fix/262-ranking-context` and were
introduced through PR #271. The missing concurrency constant appeared in merge result `bc9c3a6c2`
on `fix/269-market-cache-retention` and was introduced through PR #274. The fixes preserve the #279
download architecture. Commit `302a6bdcc` adds the app-wide subscription, connection sharing and
cold-request coordination.

### Configuration switches

| Location / setting | Default behaviour and effect |
| --- | --- |
| Frontend `NEXT_PUBLIC_TOP_PICKS_BACKGROUND_REFRESH=false` | Disables the app-wide subscription; Top Picks still subscribes while open |
| Frontend `NEXT_PUBLIC_TOP_PICKS_PREWARM=false` | Compatibility with the old switch; also disables the app-wide subscription |
| Backend `TOP_PICKS_CACHE_PATH` | Default snapshot path; an empty string disables snapshot persistence to disk |
| Backend `TOP_PICKS_CACHE_TTL_SECONDS` | Defaults to 600 seconds; `0` disables snapshot caching |
| Backend `TOP_PICKS_HISTORY_PATH` | Derived from the snapshot path by default; an empty string retains history in memory only |
| Backend `TOP_PICKS_SEED_PATH` | The default cache uses the repository package; custom targets require an explicit source; an empty string disables import |
| Backend `TOP_PICKS_SEED_SYNC=false` | Disables automatic seed-package export only; market-data refresh continues |

## Appendix B: Validation history

| Stage | Completed validation |
| --- | --- |
| Annual batch calculations | 38 new numerical-comparison and boundary tests; relative tolerance `1e-10`, absolute tolerance `1e-12` |
| Incremental history (2026-10-03) | The full backend suite at that stage: 197 tests; 13 related tests passed again after composition-layer additions |
| 96 concurrency (2026-10-04) | The full backend suite at that stage: 200 tests; actual scheduling verified a peak of 96 for 128 assets, sequential retries, isolation of overlapping calls and thread cleanup |
| SSE (2026-10-04) | The full backend suite at that stage: 220 tests; 78 Top Picks frontend tests; 3 Chrome tests; the table updated within 5 seconds of a simulated notification |
| History retention (2026-10-04) | The full backend suite at that stage: 245 tests; 40-day rolling history, restarts, subsets, cleanup on failure, leap years, migration of older databases and space reclamation |

Batch-calculation comparisons also cover sample counts, Sortino states, empty/short history, missing
data, constant prices, missing benchmarks, field layouts, Close fallback and unchanged inputs.
Shared-data tests cover date indexes, sparse history, exclusion of out-of-window data, consistency of
all four windows, priority order, empty universes and recovery from errors. Incremental-history tests
cover price revisions, new trading days, new assets, catch-up after downtime, reconciliation failures
and damaged databases. Composition tests confirm that the actual service enables the history
provider and annual batch calculator.

The latest browser journey, `Guide → Top Picks → Guide → Top Picks`, verifies that the connection
survives time spent on other pages, notifications do not make extra table reads while away, and
returning shows the latest simulated results. Backend checks verify return immediately after window
publication, warm reads without waiting, slot release on failure, partial-window failures and request
progress with a zero TTL. The latest feature validation uses controlled market data and events; it did
not measure real download speeds again.

## Appendix C: Historical timing and resource evidence

These records describe different stages of the source and configuration and are not fixed current
update times. Service-layer measurements exclude process startup, HTTP and browser rendering.
Total market-data read time already includes batch downloads and retries, so those times must not be
added again. Sequential sample runs, provider/library caches and network variation can affect results.
`docs/benchmarks/` retains the raw data for each stage.

### Annual calculations and shared market data

The annual calculation-only benchmark used random seed 42, 1,000 stocks plus a benchmark,
260 trading days and simulated cache hits over three runs. The original path took
`9.0673 / 8.0798 / 7.9471` seconds, with a median of `8.0798` seconds. The batch path took
`0.6566 / 0.7592 / 0.6893` seconds, with a median of `0.6893` seconds: about a 91.5% reduction in
calculation time. It used `tests.top_picks.test_batch_analytics.market_frame(count=260, assets=1000)`,
the two `make_service` paths and `perf_counter` to measure `_calculate_metric_maps(..., "1Y")`.
The market-data provider returned a deep copy. Results exclude network access, universe reads and
disk writes.

Live measurements with 20 stocks plus a benchmark compared the original per-window downloads with
shared annual market data:

| Initial window / stage | Original path (seconds) | Shared path (seconds) |
| --- | ---: | ---: |
| 1D cold start / prewarm / subsequent full round | 10.165 / 27.956 / 33.341 | 8.935 / 8.721 / 1.178 |
| 1Y cold start / prewarm / subsequent full round | 7.966 / 23.948 / 34.409 | 8.442 / 0.209 / 8.891 |

The subsequent 1D round read market data in only `0.920` seconds, possibly due to upstream caching
or network conditions. It does not establish a stable 1.2-second refresh. The 1Y refresh in that sample
was about 74.2% faster; the cold-start algorithm had not changed at that stage. In the 5-stock precheck,
the original full rounds took `10.828 / 10.314` seconds, compared with `2.352 / 2.904` seconds for
shared data. Provider calls per round fell from four to one, and all four windows were published.

Offline measurements with 1,000 stocks plus a benchmark showed no substantial, consistent reduction
in calculation time:

| Initial window | Shared-path cold start (seconds) | Original full round (seconds) | Shared full round (seconds) |
| --- | ---: | ---: | ---: |
| 1D | 1.518 | 5.964 | 5.840 |
| 1W | 1.484 | 5.755 | 5.895 |
| 1M | 1.627 | 5.847 | 5.229 |
| 1Y | 0.783 | 5.629 | 5.439 |

Raw records: [5-stock live precheck](benchmarks/top-picks-refresh-live-2026-10-03.json),
[20-stock live measurements](benchmarks/top-picks-refresh-live-20-2026-10-03.json),
[1,000-stock synthetic measurements](benchmarks/top-picks-refresh-synthetic-2026-10-03.json).

### Full-universe downloads

The following live full-universe measurements used the then-current 699 stocks plus `^AXJO`, with
all four windows published each round. Both 10-03 groups used the historical `threads=False`
configuration; 10-04 used 96 concurrent downloads. Differences between stages cannot be attributed
to one optimisation alone.

| Scenario | First / subsequent round total (seconds) | Measurement details and raw record |
| --- | --- | --- |
| 10-03 before incremental history | 277.859 / 282.908 | Market data: 274.202 / 279.038 seconds; [full-universe record](benchmarks/top-picks-full-universe-2026-10-03.json) |
| 10-03 incremental history | 289.550 / 269.850 | Market data: 285.569 / 265.092 seconds; [incremental record](benchmarks/top-picks-incremental-full-universe-2026-10-03.json) |
| 10-04 96 concurrency | 42.126 / 30.538 | Initialisation and incremental rounds; [production record](benchmarks/top-picks-production-96-2026-10-04.json) |
| 10-04 empty database after adding retention cleanup | Full round: 40.266; annual results available earlier at 34.783 | Market data: 33.329 seconds; `retention_cold_runs` in the same production record |

For the historical incremental run, the main batch changed from 258 rows and 700 assets over
`2025-10-03 to 2026-10-03` to 5 rows and 699 assets over `2026-09-26 to 2026-10-03`. Main-batch
downloads took `283.176 / 261.467` seconds, four-window calculations `3.179 / 3.020` seconds, and
snapshot saves `0.326 / 0.477` seconds. History for 698 stocks plus the benchmark was successfully
reused, reducing the full-round time by about 6.8%. Fewer date rows did not proportionally remove
the network wait for each asset.

Before incremental history, the two rounds' four-window calculations took `2.970 / 2.924` seconds,
snapshot saves took `0.320 / 0.472` seconds, and Year was published at `275.012 / 279.971` seconds.
Retries for `QUB.AX` took `0.493 / 0.458` seconds and still returned no data. Annual samples for
`FDXF` and `HONA` were also insufficient. In the two incremental rounds, 696 stocks had usable
annual returns and 698 had usable short-window returns. Missing stocks still received full requests
and retries, without an artificial cooldown or skip. Missing/short-history warnings were retained at
each stage. Both 96-concurrency rounds reached an actual peak of 96.

The original timing wrapper for the empty-database retention measurement omitted one empty-database
cleanup. The later tool forwards the cleanup method and supports measurements with existing history.
That measurement excludes process startup, HTTP, the browser and waiting for the next poll.

Raw records for additional concurrency-selection experiments:
[concurrency comparison](benchmarks/top-picks-concurrency-comparison-2026-10-04.json),
[live concurrency](benchmarks/top-picks-concurrency-live-2026-10-04.json),
[higher concurrency](benchmarks/top-picks-concurrency-higher-2026-10-04.json),
[48/64/96 comparison](benchmarks/top-picks-concurrency-48-64-96-2026-10-04.json).

These experiments measured 7-day downloads for 700 assets. The comparison, higher and 48/64/96
experiments used recovery specific to the test tools: two rounds per setting and at most two sequential
recovery attempts. They excluded metric calculations, history saves and the browser.

| Experiment | Concurrency settings | Mean download plus recovery time (seconds) |
| --- | --- | --- |
| comparison | 8 / 16 / 24 | 80.210 / 41.927 / 31.256 |
| higher | 24 / 32 / 48 | 33.807 / 30.922 / 27.912 |
| 48/64/96 | 48 / 64 / 96 | 26.082 / 26.623 / 25.148 |

Sequential downloads in the live exploration took 532.162 seconds. Later downloads with verified
actual peaks of 4 / 8 took 150.364 / 77.539 seconds. Earlier `requested_threads=4/8` runs took
40.579 / 42.612 seconds but still used the default capacity of 16 and did not measure the peak, so
they are not actual 4 / 8-concurrency results. The two-round differences between 48 / 64 / 96 were
small and do not establish that 96 is optimal in every environment. The raw JSON did not record
source commit SHAs; version attribution follows the stage dates and configuration descriptions.

### Cache space, seed package and development startup

- In an offline test reducing a 700-asset universe to 10 assets, SQLite shrank from `4,333,568` to
  `77,824` bytes after automatic space reclamation and remained valid. Database handles were still
  released promptly with automatic garbage collection disabled.
- The seed package at that stage was about 1.4 MB, with 699 rows in each of the four windows and
  history for 699 assets. With Python dependencies already loaded, application creation, import and
  the first API response took about 0.51 seconds in total. This was the time to make an old snapshot
  available, not webpage startup or the time to fetch current market data. Cache checksums were
  unchanged before and after export. A single offline export at the same scale took about 1.23 seconds;
  the current round's notifications were sent before export.
- The 10-04 development-startup measurement used isolated services, temporary source/build/market-data
  directories and a fresh Chrome instance, without automatic universe synchronisation. Frontend and
  backend HTTP readiness took 4.761 seconds. The first home-page title appeared at 22.385 seconds
  and the page became interactive at 22.725 seconds. The first home page became interactive
  17.685 seconds after service readiness.
- Opening Top Picks afterwards in a new browser context showed the title at 11.689 seconds and
  25 rows at 33.961 seconds; the annual snapshot contained 699 stocks. The complete
  “start services → home page → Top Picks” journey took 57.402 seconds, recorded under
  `site_startup_runs` in the [production record](benchmarks/top-picks-production-96-2026-10-04.json).
  Timings exclude copying the working files and creating the browser. Initial development compilation
  and production deployment need separate measurements.

Each measurement used isolated processes, temporary caches or controlled data. It did not overwrite
development-service caches or write to the remote universe. Temporary artefacts were removed.
Historical results do not establish a fixed refresh interval or a five-second update guarantee for the
complete universe.

## Appendix D: Reproduction and source entry points

The commands below run the current source and create new local reports. Reproducing historical
performance data requires checking out the corresponding historical version. Live mode requires
existing backend dependencies and Supabase/market-data configuration. Use `--env-file` to specify a
local environment file if needed.

```powershell
python scripts/benchmark_top_picks_refresh.py --live --limit 20 --as-of 2026-10-07 --windows 1D 1Y --output server/.cache/top-picks-refresh-local.json
python scripts/benchmark_top_picks_refresh.py --limit 1000 --as-of 2026-10-07 --windows 1D 1W 1M 1Y --output server/.cache/top-picks-refresh-synthetic-local.json
python scripts/profile_top_picks_full.py --as-of 2026-10-07 --rounds 2 --output server/.cache/top-picks-full-local.json
```

| Area | Source entry points |
| --- | --- |
| Application-level subscription | [TopPicksBackgroundRefresh.tsx](../client/features/top-picks/components/TopPicksBackgroundRefresh.tsx), [_app.tsx](../client/pages/_app.tsx) |
| Shared connections, reconnection and catch-up reads on return | [subscribeToTopPicksUpdates.ts](../client/features/top-picks/api/subscribeToTopPicksUpdates.ts) |
| Table reads and request context | [useTopPicksController.ts](../client/features/top-picks/hooks/useTopPicksController.ts) |
| Downloads and short-term cache | [metrics.py](../server/src/metrics.py) |
| Annual calculations and persistent history | [batch_analytics.py](../server/src/top_picks/batch_analytics.py), [history.py](../server/src/top_picks/history.py) |
| Snapshots, build coordination and events | [service.py](../server/src/top_picks/service.py), [events.py](../server/src/top_picks/events.py) |
| Seed package and composition | [bootstrap.py](../server/src/top_picks/bootstrap.py), [top_picks.py](../server/src/composition/top_picks.py) |

This document replaces seven separate stage reports covering batch calculations, shared history,
incremental history, full-universe benchmarks, download concurrency, real-time notifications and
cross-page refresh. The original JSON benchmark evidence remains in `docs/benchmarks/`.
