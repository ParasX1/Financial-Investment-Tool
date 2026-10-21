# Notify the page when Top Picks calculation completes

This is the English version of the historical 2026-10-04 record. Behavior,
measurements and test counts below describe that record, not a fresh verification
of the current deployment.

The page no longer forces a refresh every 20 seconds. The recorded flow is:

1. An initial POST to `/api/top-picks` reads the table, retaining existing cache and cold-start behavior.
2. After the initial read succeeds, the page opens a GET SSE connection to `/api/top-picks/events?window=1Y`.
3. When the background process calculates the current window and saves its snapshot, it immediately sends a `snapshot` notification.
4. On receiving that notification, the page performs an ordinary read to update its current sort, page and time window. Notification reads omit `force_refresh` and do not trigger another download.

While subscribers exist, one service process shares one background task. After a
successful round, it waits 60 seconds by default before starting another; after
a failed round, it waits 5 seconds. When the last subscriber closes, it finishes
the current round and stops. Detecting disconnection may require the next write.
Adding a subscriber does not queue another forced refresh for a task already
running.

## Connections and error handling

- A `connected` notification makes the page read the current result, covering updates missed before connection or during disconnection.
- Browser transport errors trigger reconnection with backoff from 5 to 60 seconds. Switching windows or accounts, or leaving the page, closes the old subscription.
- Hidden or offline pages pause connections and reads. When visible and online again, they read the latest result while retaining matching old rows and the original timestamp.
- Multiple notifications received during a read coalesce into one subsequent read.
- A manual retry forces only one refresh. Later pagination, sorting, window changes or account changes do not retain that forced-refresh flag.
- Each subscription retains at most one pending notification, preventing an unbounded queue for slow clients.
- The defaults allow at most 64 connections per process and 16 per server-side peer address. Excess connections receive HTTP 429 with retry guidance. Each connection lasts at most 300 seconds before reconnecting.
- Every 15 seconds, a data-free SSE heartbeat comment keeps the connection alive without querying prices or calculating metrics.
- On update failure, the existing table remains and an error is reported. A failed full round or an empty universe waits 5 seconds before retrying; closing the last subscription can end this wait immediately.

## Runtime scope

SSE uses the existing threaded Flask service. The frontend continues to use
API_BASE to reach the backend, and existing CORS settings allow cross-origin
connections. No communication dependency was added. Market-data downloads
continue with actual concurrency of 96 and sequential backfills.

Notifications and background tasks share memory within the current service
process. This suits the project's existing single-process operation. A future
multi-process deployment must share notifications/results across processes or
route subscriptions and reads to the same process. Proxies must also allow
continuous SSE streaming; the API sends headers that prohibit caching and
buffering.

This removes the wait for the next 20-second poll. It does not change the data
source's latency or download duration.

For complete configuration ranges, proxy/NAT limitations, concurrency
regressions and the fixed-clock comparison, see the
[2026-10-09 refresh-boundary record](top-picks-refresh-bounds-2026-10-09.md).
These limits are per process, not a distributed market-data quota.

## Historical verification on 2026-10-04

All 220 backend tests and 78 Top Picks frontend tests passed, along with
TypeScript and backend static checks. Three browser tests passed using installed
Chrome. They covered sorting, pagination, CSV, column visibility, and updating
table values and timestamps within 5 seconds of a simulated completion
notification. Notification reads did not force a refresh. The temporary browser
test configuration was deleted.

## Measured full-site development startup

The 2026-10-04 check used separate ports, a temporary frontend source copy and
empty compilation directory, empty price history/snapshots, and fresh Chrome
browser contexts. It used existing Next development mode and a separate Flask
service, without automatically synchronizing the universe. The browser visited
anonymously; the homepage counted as usable once its sign-in button opened a
dialog and its first-screen images had loaded. Timing excludes copying test
sources and creating the test-browser process.

- Frontend/backend HTTP services ready: 4.761 seconds after application process startup began.
- First homepage title visible: 22.385 seconds; homepage usable: 22.725 seconds.
- First homepage navigation after services were ready, including initial page compilation, to usability: 17.685 seconds.
- A new browser context then opened `/TopPicks` for the first time. Its title was visible after 11.689 seconds and 25 market-data rows appeared after 33.961 seconds, with a successful API response. The backend annual snapshot contained all 699 stocks.
- The complete path from service startup through the homepage to the Top Picks table took 57.402 seconds. This is neither the cold-start duration for opening `/TopPicks` directly nor an ordinary refresh time for an already compiled service.

Timing records were appended to `site_startup_runs` in the existing performance
report. Temporary services, browsers and source/compilation/market-cache
directories were cleaned up. First compilation in development mode and startup
of a prebuilt production deployment require separate measurements.
