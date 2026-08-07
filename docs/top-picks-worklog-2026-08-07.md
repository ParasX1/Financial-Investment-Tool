# TopPicks And Local Dev Worklog - 2026-08-07

This note records the TopPicks, Portfolio alignment, cache, prewarm, and local
developer-experience changes made during the working session.

## Scope

The session focused on making TopPicks feel connected to Portfolio, improving
TopPicks repeated-load performance, reducing perceived cold-start cost, and
making local development easier to run.

Key areas:

- TopPicks metric naming
- TopPicks backend snapshot caching
- TopPicks cache prewarm on app startup
- TopPicks metadata typing
- Local one-command dev startup
- Verification and known environment issues

## Product Direction

We clarified the product relationship between TopPicks and Portfolio:

- TopPicks is the single-stock discovery surface.
- Portfolio is the multi-stock basket validation surface.

The intended workflow is:

```text
TopPicks ranks individual opportunities
-> Portfolio validates whether selected opportunities work together as a basket
```

This helps avoid treating the two pages as duplicate dashboards. TopPicks
answers "which stocks look good individually?" Portfolio answers "do these
stocks make sense together?"

## TopPicks Metric Label Alignment

TopPicks table labels were updated to use the same metric language as
Portfolio where possible.

Changed labels:

- `1Y Return` -> `Cumulative return`
- `Sharpe` -> `Sharpe ratio`
- `Sortino` -> `Sortino ratio`
- `Volatility` -> `Annualised volatility`
- `Max DD` -> `Max drawdown`
- `Beta` -> `Beta exposure`
- `Alpha` -> `Alpha vs benchmark`
- `Info Ratio` -> `Information ratio`

Important nuance:

- TopPicks `Cumulative return` still represents trailing 1Y cumulative return.
- Portfolio `Cumulative return` is a user-selected date-range series.
- TopPicks `Max drawdown` is the minimum value from the drawdown history.
- Portfolio `Drawdown history` remains a time-series chart.

The goal was to align user-facing language without pretending every display
shape is identical.

Files changed:

- `client/features/top-picks/lib/topPicksColumns.ts`
- `client/features/top-picks/lib/topPicksColumns.test.ts`
- `client/features/top-picks/lib/topPicksCsv.test.ts`
- `client/features/top-picks/screens/TopPicksScreen.test.tsx`
- `client/features/top-picks/components/TopPicksTable.test.tsx`
- `client/features/top-picks/components/TopPicksColumnsDialog.test.tsx`

## Metric Algorithm Check

We checked the backend relationship between TopPicks and Portfolio metrics.

The matching TopPicks metrics reuse the same backend calculators as Portfolio:

- `calculate_cumulative_return`
- `calculate_sharpe_ratio`
- `calculate_sortino_ratio`
- `calculate_volatility`
- `calculate_drawdown`
- `calculate_beta`
- `calculate_alpha`

Differences are mostly in usage:

- TopPicks uses a fixed trailing one-year window.
- Portfolio uses the user's selected date range.
- TopPicks compresses some series into ranking values.
- Portfolio displays the full chart or research view.
- TopPicks has `Information ratio`; Portfolio does not yet have a matching
  chart.

## Redis-Style TopPicks Snapshot Cache

Added an in-memory Redis-style TTL cache around the full TopPicks ranking
snapshot.

Behavior:

- First request builds a snapshot and returns `cacheStatus: "miss"`.
- Repeated requests with the same assumptions return `cacheStatus: "hit"`.
- Pagination and sorting are applied from cached rows.
- Repeated page/sort changes no longer recalculate the full universe.
- Default TTL is `600` seconds.
- `TOP_PICKS_CACHE_TTL_SECONDS=0` disables the cache.

Cache key includes:

- benchmark ticker
- risk-free rate
- universe limit
- requested start date
- requested end date

Files changed:

- `server/src/top_picks/service.py`
- `server/src/composition/top_picks.py`
- `server/tests/top_picks/test_service.py`
- `server/tests/top_picks/test_configuration.py`
- `server/tests/api/test_top_picks_app_config.py`
- `client/features/top-picks/types.ts`

## Cold-Start Optimization

We clarified that cache alone does not remove true cold-start cost:

```text
First request still has to calculate the snapshot.
Second and later matching requests can reuse it.
```

To reduce repeated market-data work during the first build, TopPicks now uses
one shared symbol universe for the expensive market-data window:

```text
symbols + benchmark
```

That lets the lower-level stock-data cache reuse the same requested market
window more effectively.

Files changed:

- `server/src/top_picks/service.py`
- `server/tests/top_picks/test_service_edges.py`

## App Startup Prewarm

Added a frontend prewarm component so opening the website can start warming the
TopPicks backend cache before the user clicks into TopPicks.

Behavior:

- Mounted globally from `client/pages/_app.tsx`.
- Runs once in the browser.
- Silently requests default TopPicks:
  - page 1
  - page size 25
  - sort by Sharpe ratio descending
- Skips prewarm when the user directly opens `/TopPicks`, so the page's own
  controller request is not duplicated immediately.

Files changed:

- `client/features/top-picks/components/TopPicksPrewarm.tsx`
- `client/pages/_app.tsx`
- `client/features/top-picks/api/fetchTopPicks.ts`
- `client/features/top-picks/api/fetchTopPicks.test.ts`
- `client/features/top-picks/api/fetchTopPicks.edgeCases.test.ts`

## Cache Metadata Normalization

The frontend TopPicks response normalizer now preserves backend cache metadata:

- `cacheStatus`
- `cacheTtlSeconds`

This makes it possible to show cache hit/miss information in the UI later
without changing the API contract again.

## Local Dev One-Command Startup

Added a root-level one-command development startup script.

New commands:

```powershell
npm run dev
npm run dev:all
```

These start both:

- Flask backend at `http://127.0.0.1:8080`
- Next frontend at `http://localhost:3000`

The script prefers the known Conda Python environment:

```text
C:\Users\Johnny\miniconda3\envs\financeDev-server\python.exe
```

This avoids the WindowsApps Python alias issue.

The script also prints a clear project link before server logs:

```text
Project link
Client: http://localhost:3000
```

Files changed:

- `package.json`
- `scripts/dev-all.mjs`

## Local Environment Finding

The interactive terminal had Python available:

```text
Python 3.11.15
```

But the non-interactive tool shell initially resolved `python` to:

```text
C:\Users\Johnny\AppData\Local\Microsoft\WindowsApps\python.exe
```

The fix was to call the Conda environment's Python executable directly:

```powershell
& C:\Users\Johnny\miniconda3\envs\financeDev-server\python.exe -m pytest ...
```

## Verification

Frontend TopPicks targeted tests passed:

```powershell
cd D:\Financial-Investment-Tool\client
npx.cmd jest --config jest.portfolio-top-picks.config.js --runInBand features/top-picks/api/fetchTopPicks.test.ts features/top-picks/api/fetchTopPicks.edgeCases.test.ts features/top-picks/lib/topPicksColumns.test.ts features/top-picks/lib/topPicksCsv.test.ts features/top-picks/components/TopPicksTable.test.tsx features/top-picks/components/TopPicksColumnsDialog.test.tsx features/top-picks/screens/TopPicksScreen.test.tsx features/top-picks/topPicksBoundary.test.ts --coverage=false
```

Result:

- 8 test suites passed
- 30 tests passed

Backend TopPicks tests passed:

```powershell
cd D:\Financial-Investment-Tool
& C:\Users\Johnny\miniconda3\envs\financeDev-server\python.exe -m pytest server\tests\top_picks server\tests\api\test_top_picks_app_config.py
```

Result:

- 42 tests passed
- 2 Supabase dependency deprecation warnings

Development startup script checks:

```powershell
node --check scripts\dev-all.mjs
```

Result:

- passed

The one-command startup was smoke-tested with:

```powershell
npm.cmd run dev
```

Observed:

- Flask backend started on `http://127.0.0.1:8080`
- Next frontend started on `http://localhost:3000`

## Performance Comparison

A local mocked benchmark compared old no-snapshot-cache behavior against the
new snapshot cache.

Old behavior, simulated with `cache_ttl=0`:

```text
call_1: 0.571s status=miss
call_2: 0.562s status=miss
call_3: 0.559s status=miss
repo_calls=3
calculator_calls=21
```

New snapshot cache:

```text
call_1: 0.560s status=miss
call_2: 0.001s status=hit
call_3: 0.001s status=hit
repo_calls=1
calculator_calls=7
```

Summary:

- First cold request is nearly unchanged.
- Repeated matching requests are effectively instant in the mocked benchmark.
- Three consecutive requests were about 3x faster overall.
- Calculator calls dropped from 21 to 7.
- Repository calls dropped from 3 to 1.

## Known Limitations

### True cold start

The first cache miss still needs to compute the TopPicks snapshot. To make the
first user-visible load faster, the next stronger option is server-side
prewarm or scheduled materialization.

Possible next steps:

- backend startup prewarm
- scheduled daily TopPicks snapshot
- storing snapshots in Supabase
- later replacing the in-memory cache with Redis or another shared cache

### Full TypeScript check

`npx.cmd tsc --noEmit` was attempted, but the repository's current TypeScript
configuration reports existing unrelated issues, including:

- Jest globals not available to test files
- `react-test-renderer` type/module resolution in some areas
- Playwright type/module resolution
- unrelated provider type resolution warnings

This failure was not specific to the TopPicks prewarm changes.

### Next config warning

During the local startup smoke test, Next reported:

```text
Unrecognized key(s) in object: 'outputFileTracingRoot'
```

This appears to be an existing `next.config.mjs` warning. It did not prevent the
local dev server from starting.

## Deployment Discussion Notes

We discussed that deployment is possible, but the current app should be
hardened before publishing publicly.

Recommended before a real hosted demo:

- restrict Flask CORS to the frontend domain
- add basic API rate limiting
- confirm Supabase RLS and key usage
- keep frontend keys browser-safe
- do not commit `.env`
- consider a private demo gate such as Vercel Deployment Protection,
  Cloudflare Access, or a simple password gate

The recommended demo deployment shape is:

```text
Vercel frontend
-> Render/Railway/Fly Flask backend
-> Supabase
```

Code changes would still be made locally and deployed through Git push once the
deployment pipeline is connected.
