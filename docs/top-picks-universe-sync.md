# Top Picks Universe Sync

Top Picks now reads from `public.top_picks_universe` before falling back to the
legacy `public.tickers` table. The universe table is intended for external,
standard index sources rather than developer-curated symbols.

Supported markets:

- `US` with source `SP500`
- `AU` with source `ASX200`
- `HK` with source `HSI`

S&P 500 can be synced from the built-in preset:

```powershell
python scripts\sync_top_picks_universe.py --preset SP500
```

Run the Supabase migration first, then sync CSV exports from the index data
provider you choose:

```powershell
python scripts\sync_top_picks_universe.py `
  --csv .\data\sp500.csv `
  --market US `
  --source SP500 `
  --symbol-column Symbol `
  --name-column Name `
  --industry-column Industry
```

The script expects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the
environment unless `--dry-run` is passed.

ASX 200 can be synced directly from the OpenASX snapshot feed:

```powershell
python scripts\sync_top_picks_universe.py --preset ASX200
```

The preset uses the latest available OpenASX snapshot and keeps the first 200
ranked constituents from that snapshot. If the OpenASX request is blocked, the
script falls back to the local `data/asx200.csv` snapshot so local development
can continue without manual intervention.

During local development, `npm run dev` starts the app first and then runs the
ASX 200 and S&P 500 preset syncs in the background after short delays. Set
`TOP_PICKS_DEV_SYNC_ASX200=false` or `TOP_PICKS_DEV_SYNC_SP500=false` to disable
one of them. Set `TOP_PICKS_DEV_SYNC_DELAY_MS` or
`TOP_PICKS_DEV_SYNC_SP500_DELAY_MS` to change the delays.

Top Picks also persists the last complete ranking snapshot locally at
`server/.cache/top-picks-snapshot-cache.json` by default. After the first full
calculation finishes, later dev-server restarts can show that previous result
immediately while a fresh snapshot rebuilds in the background. Override the
location with `TOP_PICKS_CACHE_PATH`.

For market-specific symbol formats:

- `AU` symbols without an exchange suffix are converted to `.AX`.
- `HK` numeric symbols are converted to four-digit `.HK` tickers.
- `US` symbols are uppercased, and `/` is converted to `-` for Yahoo Finance
  compatibility.
