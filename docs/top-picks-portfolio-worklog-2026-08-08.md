# TopPicks And Portfolio Worklog - 2026-08-08

This note records the 2026-08-08 changes around TopPicks universe expansion,
universe sync automation, local snapshot caching, Portfolio loading behavior,
and separating Portfolio responsiveness from TopPicks background work.

## Background

TopPicks originally returned only 22 rows. That was not a Supabase row-limit
issue; the legacy `public.tickers` table only contained 22 seeded symbols.

The product direction became:

- Stop relying on a developer-curated 22-symbol list.
- Build TopPicks from standard index universes.
- Cover US, AU, and HK markets.
- Keep Portfolio analysis fast for the user's currently selected stocks, even
  while TopPicks is refreshing a much larger universe.

## Standard TopPicks Universe

Added a Supabase migration:

- `supabase/migrations/20260808010000_create_top_picks_universe.sql`

The migration creates:

- `public.top_picks_universe`
- `market`: `US` / `AU` / `HK`
- `source`: `SP500` / `ASX200` / `HSI` / `LEGACY` / `MANUAL`
- `active`
- `updated_at`

The migration also backfills existing `public.tickers` rows as `LEGACY`, so
deploying the migration does not leave TopPicks empty.

TopPicks repository lookup order is now:

```text
public.top_picks_universe active rows
-> fallback public.tickers
```

The default universe limit was raised from 50 to 1000.

## Universe Sync Script

Added:

- `scripts/sync_top_picks_universe.py`

Preset usage:

```powershell
python scripts\sync_top_picks_universe.py --preset SP500
python scripts\sync_top_picks_universe.py --preset ASX200
```

CSV usage:

```powershell
python scripts\sync_top_picks_universe.py `
  --csv .\data\example.csv `
  --market US `
  --source SP500 `
  --symbol-column Symbol `
  --name-column Name `
  --industry-column Industry
```

The script:

- Normalizes Yahoo Finance ticker formats.
- Converts US class shares from `.` to `-`, for example `BRK.B` -> `BRK-B`.
- Adds `.AX` to AU tickers when missing.
- Pads numeric HK tickers to four digits and appends `.HK`.
- Upserts records into `top_picks_universe`.
- Marks stale records from the same source as `active=false`.

## S&P 500 And ASX 200

The S&P 500 preset uses the public datasets CSV:

```text
https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv
```

Observed sync result:

```text
SP500 / US: 503
```

The ASX 200 preset first tries the OpenASX snapshot feed. If OpenASX returns
`403 Forbidden`, the script falls back to:

- `data/asx200.csv`

Current dry-run result:

```text
Prepared 196 ASX200 records from data/asx200.csv.
```

`IFL.AX` and `NSR.AX` are excluded because Yahoo Finance currently has no usable
market data for them.

## Local Development Sync

`npm run dev` now starts the app first, then syncs TopPicks universes in the
background:

- ASX200 after 60 seconds by default.
- S&P 500 after 90 seconds by default.

Disable either sync with:

```env
TOP_PICKS_DEV_SYNC_ASX200=false
TOP_PICKS_DEV_SYNC_SP500=false
```

Adjust delays with:

```env
TOP_PICKS_DEV_SYNC_DELAY_MS=60000
TOP_PICKS_DEV_SYNC_SP500_DELAY_MS=90000
```

Background sync failures do not terminate the dev server.

## Persistent TopPicks Snapshot Cache

TopPicks previously used only an in-memory cache. Restarting the Flask dev
server lost the last completed ranking, so the next visit still had to wait for
a full rebuild.

TopPicks now persists the last complete snapshot locally:

```text
server/.cache/top-picks-snapshot-cache.json
```

Default config:

```env
TOP_PICKS_CACHE_PATH=server/.cache/top-picks-snapshot-cache.json
```

Behavior:

- The first full calculation still has to complete once.
- The completed ranking snapshot is written to local disk.
- On a later visit or dev-server restart, a still-valid stale snapshot is shown
  immediately.
- The backend refreshes a new snapshot in the background.
- The frontend polls every 20 seconds.
- Once the fresh snapshot is ready, the table updates automatically without a
  browser refresh.

Frontend status while showing a stale snapshot:

```text
503 results - using previous results
```

## TopPicks Frontend Loading Behavior

TopPicks no longer uses a partial preview mode. The current strategy is:

- Show a stale complete snapshot immediately when one is available.
- Refresh the full snapshot in the background.
- Replace the table when the fresh result is ready.
- If no snapshot exists, show loading while the first full build runs.

`TopPicksPrewarm` was also adjusted:

- Delay increased to 30 seconds.
- Skips `/Portfolio` and `/dashboardView`.

This prevents Portfolio from being affected by TopPicks prewarm work.

## Portfolio Loading Behavior

Portfolio remains focused on the user's small selected universe:

- Up to 5 stocks.
- `Run analysis` calculates only the applied Portfolio symbols.
- If a card already has an old chart, the old chart remains visible and the card
  is marked `Updating`.
- If it is the first calculation and no old chart exists, the card shows an
  explicit `Running analysis` state.

The previous loading skeleton was too subtle and looked like disappearing
content. It now renders a clear state:

```text
Running analysis
Loading <metric> with the applied symbols and assumptions.
```

Several mojibake characters in Portfolio components were also cleaned up.

## Separating Portfolio From TopPicks Work

A key blocking point was found in `server/src/metrics.py`.

`fetch_stock_data` previously held the global stock-data cache lock while
performing yfinance downloads. When TopPicks requested a large universe,
Portfolio's smaller metric requests could wait behind that lock.

Now:

- `_stock_data_lock` is held only for cache reads and writes.
- yfinance network downloads happen outside the global cache lock.

The local Flask dev server also explicitly runs with:

```python
threaded=True
```

This lets `/api/metrics/...` and `/api/top-picks` run concurrently in local
development. TopPicks background refreshes should not block Portfolio analysis
for 3-5 selected stocks.

## Environment Configuration

`server/.env.example` now includes:

```env
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
TOP_PICKS_CACHE_PATH=server/.cache/top-picks-snapshot-cache.json
```

Local `server/.env` should use plain dotenv syntax:

```env
SUPABASE_URL=...
SUPABASE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
TOP_PICKS_CACHE_PATH=server/.cache/top-picks-snapshot-cache.json
```

Do not put PowerShell `$env:KEY=...` assignments inside `.env`.

## Verification

Backend TopPicks tests:

```text
46 passed, 2 warnings
```

Frontend TopPicks tests:

```text
20 passed
```

Portfolio tests:

```text
28 passed
```

Metrics / dev-server separation tests:

```text
20 passed
```

ASX200 preset dry-run:

```text
Prepared 196 ASX200 records from data/asx200.csv.
```

Python compile checks and `node --check scripts/dev-all.mjs` passed.

## Known Limits

### First TopPicks Cold Start

If `server/.cache/top-picks-snapshot-cache.json` does not exist yet, the first
TopPicks request still needs to complete a full calculation. That is expected:
there is no previous snapshot to display.

### ASX200 Fallback Is Not A Live Source

If OpenASX is blocked with 403, local development uses `data/asx200.csv`. This
keeps dev stable, but it is not a live data source. A more stable ASX API or
scheduled CSV update would be better later.

### HK / Hang Seng Preset Is Not Done Yet

The database schema and sync script support `HK` / `HSI`, but this work mainly
landed SP500 and ASX200. Hang Seng still needs a reliable CSV/API source before
adding an automatic preset.

