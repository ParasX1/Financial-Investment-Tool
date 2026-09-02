# TopPicks And ETF Worklog - 2026-08-26

This note records the 2026-08-26 work around TopPicks live refresh behavior,
snapshot update visibility, and the first standalone ETF preview page.

## Scope

The session focused on two product areas:

- Make TopPicks keep refreshing market-backed ranking snapshots without
  requiring a manual browser refresh.
- Add a separate ETF page and backend route using a 10-ETF hardcoded preview
  universe before connecting a real ETF data provider.

The ETF work is a UI and API-contract preview. It does not yet use live ETF
market data.

## TopPicks Architecture Boundary

An attempted direct dependency from the TopPicks domain service to the legacy
`metrics` layer would violate the TopPicks architecture tests.

The final shape keeps the dependency at the composition boundary:

- `server/src/top_picks/service.py` accepts an injected `market_cache_clearer`.
- `server/src/composition/top_picks.py` imports `clear_stock_data_cache` from
  `metrics` and passes it into the service.

This lets TopPicks clear the lower-level stock-data cache for force refreshes
without making the TopPicks domain package depend directly on the legacy
metrics module.

## TopPicks Force Refresh

The TopPicks request contract now accepts:

```json
{
  "force_refresh": true
}
```

When `force_refresh` is true:

- The frontend keeps the currently visible rows while the refresh request is in
  flight.
- The backend can return the current cached snapshot immediately.
- A background rebuild is started for all TopPicks windows.
- The lower-level stock-data cache is cleared before a forced rebuild.

The frontend sends force refreshes from the TopPicks controller every 20
seconds while the TopPicks page is mounted.

## Full-Window Background Refresh

TopPicks windows are still stored as separate snapshot cache entries:

- `1D`
- `1W`
- `1M`
- `1Y`

A forced refresh for the current window now triggers a full-window background
refresh. The requested window is refreshed first, followed by the other
windows.

The backend was also tightened so a force refresh that arrives while another
window refresh is already running is not lost. Instead, the requested force
refresh priority is queued and a forced full-window rebuild runs immediately
after the current background pass finishes.

This keeps Day, Week, Month, and Year snapshots moving forward even when the
user remains on one TopPicks tab.

## TopPicks Update Timestamp

The TopPicks toolbar now shows a visible sync timestamp next to the
Day/Week/Month/Year controls.

The timestamp is based on backend metadata:

```text
metadata.generatedAt
```

It is not based on the browser's current clock. The displayed `Updated` time
only changes when the frontend receives a snapshot with a new `generatedAt`
value.

This means a successful response that still points to the same cached snapshot
does not pretend that the ranking was freshly generated at the current browser
time.

## TopPicks Sync Status

The toolbar can show:

- `Syncing latest`
- `Syncing - Updated <time>`
- `Updated <time>`
- `Waiting for sync`

`syncing` is now a frontend request-in-flight state for visible rows. It is not
directly tied to `metadata.snapshotRefreshing`, because the backend can keep
refreshing the next snapshot in the background even after the current table has
valid rows.

## TopPicks Status Text

The previous bottom status text could show:

```text
using previous results
```

This was removed because it conflicted with the toolbar timestamp and could
mislead users during background refreshes.

The status area now keeps neutral result wording such as:

```text
50 results - Showing page 1 of 2
```

## ETF Preview Page

A new standalone ETF workspace was added at:

```text
/ETF
```

The page is separate from TopPicks and has its own frontend feature folder:

```text
client/features/etf
```

The sidebar now includes an `ETF` navigation item.

## ETF Backend Preview Route

A new backend ETF route was added:

```text
GET /api/etfs?window=1D
GET /api/etfs?window=1W
GET /api/etfs?window=1M
GET /api/etfs?window=1Y
```

The ETF backend code is separate:

```text
server/src/etf/service.py
server/src/routes/etf.py
```

The service currently returns a hardcoded 10-ETF preview universe:

- `SPY`
- `QQQ`
- `VOO`
- `IWM`
- `VTI`
- `VEA`
- `VWO`
- `XLK`
- `XLE`
- `TLT`

## ETF Time Windows

ETF preview rankings now support the same window controls as TopPicks:

- Day
- Week
- Month
- Year

The frontend requests the selected window and updates the table accordingly.

Sorting behavior:

- Day, Week, and Month rank by `priceReturn`.
- Year ranks by `sharpe`.

The table label is `Price return` instead of `1Y return`, so the same column
works across all windows.

## ETF Preview Columns

The first ETF table includes:

- Rank
- Symbol
- ETF name
- Category
- Issuer
- AUM
- Expense ratio
- Price return
- Sharpe
- Volatility
- Max drawdown

For short windows, Sharpe is shown as unavailable in the preview rather than
inventing a false short-period Sharpe value.

## Files Changed

TopPicks refresh and timestamp files:

- `client/features/top-picks/api/fetchTopPicks.ts`
- `client/features/top-picks/hooks/useTopPicksController.ts`
- `client/features/top-picks/components/TopPicksToolbar.tsx`
- `client/features/top-picks/screens/TopPicksScreen.tsx`
- `server/src/metrics.py`
- `server/src/top_picks/contracts.py`
- `server/src/top_picks/service.py`
- `server/src/composition/top_picks.py`

ETF preview files:

- `client/features/etf/types.ts`
- `client/features/etf/api/fetchEtfs.ts`
- `client/features/etf/screens/EtfScreen.tsx`
- `client/features/etf/index.ts`
- `client/pages/ETF.tsx`
- `server/src/etf/__init__.py`
- `server/src/etf/service.py`
- `server/src/routes/etf.py`
- `server/src/server.py`
- `client/components/navigation/sidebarNavigation.ts`

Test files:

- `client/features/top-picks/api/fetchTopPicks.test.ts`
- `client/features/top-picks/hooks/useTopPicksController.test.tsx`
- `client/features/top-picks/components/TopPicksToolbar.test.tsx`
- `client/features/top-picks/screens/TopPicksScreen.test.tsx`
- `client/components/navigation/sidebarNavigation.test.ts`
- `server/tests/api/test_etf_route.py`
- `server/tests/test_metrics_missing_data.py`
- `server/tests/top_picks/test_service.py`
- `server/tests/top_picks/test_service_edges.py`

## Verification

Backend checks passed:

```powershell
python -m pytest
```

Observed result:

```text
136 tests passed
2 Supabase dependency deprecation warnings
```

Frontend checks passed:

```powershell
cd client
npm.cmd run test:portfolio-top-picks:coverage
npm.cmd run build
```

Observed result:

```text
45 frontend test suites passed
253 frontend tests passed
Next build completed successfully
/ETF was generated in the pages route output
```

During `next build`, Windows reported non-blocking `.next/cache` `EPERM`
warnings. The build still completed with exit code `0`.

The running local backend was also smoke-tested:

```powershell
GET http://127.0.0.1:8080/api/etfs?window=1D
GET http://127.0.0.1:8080/api/etfs?window=1W
GET http://127.0.0.1:8080/api/etfs?window=1M
GET http://127.0.0.1:8080/api/etfs?window=1Y
```

Observed:

```text
All four windows returned 10 ETF rows.
Year returned sortKey=sharpe.
Day, Week, and Month returned sortKey=priceReturn.
```

## Known Limitations

The ETF page is currently a hardcoded preview. The next step is to replace the
preview service with a real ETF universe and market-data provider.

TopPicks live refresh remains page-mounted from the frontend. If the user
leaves `/TopPicks`, the browser no longer starts new 20-second refresh cycles,
although any backend refresh already in progress continues to finish.
