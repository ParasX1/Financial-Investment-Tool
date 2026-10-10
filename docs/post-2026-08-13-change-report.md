# Code Change Report After 2026-08-13

This report summarizes the main code changes made after 2026-08-13 for the Financial Investment Tool. It focuses on TopPicks, Portfolio, the ETF preview workspace, and TopPicks universe synchronization.

## Executive Summary

The work in this period focused on three product directions:

- TopPicks was expanded from a single one-year ranking view into a multi-window ranking experience with Day, Week, Month, and Year views, plus stronger background snapshot refresh behavior.
- Portfolio symbol input was changed from hardcoded suggestions to a real market search experience, improving support for stocks, ETFs, indexes, and cryptocurrencies.
- A new standalone ETF preview page and backend API were added, establishing the frontend and backend contract before connecting a real ETF universe and market-data provider.

## Change Summary Table

| Date / Scope | Module | Main Change | User Value | Technical Impact |
|---|---|---|---|---|
| 2026-08-19 | TopPicks | Added `1D`, `1W`, `1M`, and `1Y` ranking windows | Users can view rankings across different investment time horizons | Backend request contract now supports a `window` field and validates sort keys per window |
| 2026-08-19 | TopPicks | Displayed different metric columns for different windows | Metrics are better aligned with Day, Week, Month, and Year semantics | Frontend filters table columns and the edit-columns dialog by selected window |
| 2026-08-19 | TopPicks | Preserved the original Year ranking behavior | The original one-year ranking experience remains stable | Year still uses a trailing one-year range and requires 200 observations for complete metrics |
| 2026-08-19 | TopPicks | Split snapshot cache by window | Users can switch windows and see the correct cached result for each view | Cache keys now include the selected window; each window is calculated and stored separately |
| 2026-08-19 | TopPicks | Changed persistent snapshot behavior to keep the latest complete result as fallback | After a server restart, users can see the last complete result while a new snapshot rebuilds | Startup loads stale snapshots and triggers background rebuilds |
| 2026-08-19 | Portfolio | Connected symbol input to `/api/market/symbol-search` | Users can search real market instruments instead of relying on fixed local suggestions | Portfolio still stores ticker symbols only, so the downstream metric workflow remains unchanged |
| 2026-08-19 | Portfolio | Tightened symbol input and autocomplete behavior | Reduces accidental partial submissions and invalid ticker requests | Keeps the existing five-symbol limit, validation, deduplication, and uppercase normalization |
| 2026-08-26 | TopPicks | Added `force_refresh` request support | Users no longer need to manually refresh the browser to see updated rankings | Frontend sends a force refresh every 20 seconds; backend can return cached data while triggering rebuilds |
| 2026-08-26 | TopPicks | Clears underlying stock-data cache before forced rebuilds | Ranking refreshes are more likely to use up-to-date market data | `market_cache_clearer` is injected through the composition layer to keep domain boundaries clean |
| 2026-08-26 | TopPicks | Added all-window background refresh and pending refresh handling | All ranking windows continue moving forward even if the user stays on one tab | If a refresh is already running, a new request is recorded as pending and replayed after the current refresh finishes |
| 2026-08-26 | TopPicks | Displayed update time from backend `metadata.generatedAt` | The displayed update time reflects actual snapshot generation, not the browser clock | `Updated` changes only when the frontend receives a newer snapshot metadata timestamp |
| 2026-08-26 | TopPicks | Revised sync states and footer copy | Reduces confusion between previous results and generated timestamps | Toolbar shows states such as `Syncing latest` and `Updated <time>`; footer keeps neutral result count and pagination copy |
| 2026-08-26 | ETF | Added standalone `/ETF` page and sidebar entry | Users can access a dedicated ETF workspace | Added `client/features/etf` and `client/pages/ETF.tsx` |
| 2026-08-26 | ETF | Added ETF backend preview API | Frontend and backend now have an ETF ranking contract | Added `GET /api/etfs?window=1D/1W/1M/1Y` |
| 2026-08-26 | ETF | Returned 10 hardcoded ETF preview rows | Enables validation of the UI, API shape, and sorting behavior | ETF is still a preview and does not yet use live ETF market data |
| 2026-08-26 | ETF | Added the same four time windows used by TopPicks | ETF ranking behavior is consistent with TopPicks | Day, Week, and Month sort by `priceReturn`; Year sorts by `sharpe` |
| 2026-08-19 related | TopPicks Universe | TopPicks now reads from `top_picks_universe` before falling back to legacy `tickers` | Ranking universe can be based on standard index sources | Supports synchronization for sources such as S&P 500, ASX 200, and HSI |

## Module Details

### TopPicks

TopPicks was upgraded from a one-year single-view ranking page into a multi-window stock discovery surface. The frontend can now switch between Day, Week, Month, and Year. The backend returns metrics and sorting behavior appropriate to the selected window.

The snapshot system was also improved. The system keeps the latest complete snapshot as a fallback, so after a server restart users can see the previous complete result immediately while a new result rebuilds in the background. After 2026-08-26, `force_refresh` was added so the mounted TopPicks page can trigger refreshes periodically without requiring a manual browser reload.

### Portfolio

The Portfolio changes focused on symbol input. The previous input relied on hardcoded suggestions such as `AAPL`, `MSFT`, and `NVDA`. It now uses the market search API:

```text
/api/market/symbol-search?q=<query>
```

The search results can cover stocks, ETFs, indexes, and cryptocurrencies. After the user selects a result, Portfolio still stores only the ticker symbol, so the existing metric calculation pipeline is preserved.

### ETF

A standalone ETF page was added:

```text
/ETF
```

The ETF page is currently in preview status. Its purpose is to validate the page structure, table fields, window switching behavior, and backend API contract. The backend currently returns 10 hardcoded ETF rows: `SPY`, `QQQ`, `VOO`, `IWM`, `VTI`, `VEA`, `VWO`, `XLK`, `XLE`, and `TLT`.

The ETF API supports:

```text
GET /api/etfs?window=1D
GET /api/etfs?window=1W
GET /api/etfs?window=1M
GET /api/etfs?window=1Y
```

Current sorting behavior:

- Day, Week, and Month sort by `priceReturn`.
- Year sorts by `sharpe`.

## Main Files Changed

| Module | Files |
|---|---|
| TopPicks API | `client/features/top-picks/api/fetchTopPicks.ts` |
| TopPicks controller | `client/features/top-picks/hooks/useTopPicksController.ts` |
| TopPicks toolbar | `client/features/top-picks/components/TopPicksToolbar.tsx` |
| TopPicks screen | `client/features/top-picks/screens/TopPicksScreen.tsx` |
| TopPicks backend contract | `server/src/top_picks/contracts.py` |
| TopPicks backend service | `server/src/top_picks/service.py` |
| TopPicks composition | `server/src/composition/top_picks.py` |
| Metrics cache | `server/src/metrics.py` |
| ETF frontend | `client/features/etf` |
| ETF page route | `client/pages/ETF.tsx` |
| ETF backend service | `server/src/etf/service.py` |
| ETF backend route | `server/src/routes/etf.py` |
| Server route registration | `server/src/server.py` |
| Navigation | `client/components/navigation/sidebarNavigation.ts` |

## Verification Record

| Date / Scope | Verification Command | Result |
|---|---|---|
| 2026-08-19 | `npx.cmd jest --config jest.portfolio-top-picks.config.js --runInBand --coverage=false` | 45 test suites passed, 246 tests passed |
| 2026-08-19 | `npx.cmd tsc --noEmit --pretty false` | TypeScript check passed |
| 2026-08-19 | `git diff --check` | Diff check passed |
| 2026-08-19 | Backend pytest | Could not run at that time because local `python.exe` pointed to the WindowsApps shim; this was a local Python environment issue |
| 2026-08-26 | `python -m pytest` | 136 tests passed, with only 2 Supabase deprecation warnings |
| 2026-08-26 | `npm.cmd run test:portfolio-top-picks:coverage` | 45 frontend test suites passed, 253 frontend tests passed |
| 2026-08-26 | `npm.cmd run build` | Next build completed successfully, and `/ETF` appeared in the pages route output |
| 2026-08-26 | ETF API smoke test | All four windows returned 10 ETF rows; Year returned `sortKey=sharpe`, while the other windows returned `sortKey=priceReturn` |

## Known Limitations And Follow-Up Items

| Item | Current Status | Recommended Next Step |
|---|---|---|
| ETF data | Still a hardcoded preview | Connect a real ETF universe and market-data provider |
| ETF metrics | Short-window Sharpe is temporarily unavailable | Re-enable short-window Sharpe only when the real data sample size supports it |
| TopPicks live refresh | Triggered by the mounted `/TopPicks` frontend page | Consider a backend scheduler or worker if unattended refresh is required |
| Portfolio search hook | Similar to the Watchlist search hook | Extract a shared symbol-search hook if the behavior remains identical |
| TopPicks to Portfolio workflow | Linked-history transfer was not implemented in this phase | Design a workflow for selecting TopPicks candidates and bringing them into Portfolio |

## Conclusion

The changes after 2026-08-13 move the system toward a more complete investment research workflow:

- TopPicks helps users discover candidate stocks with multi-window rankings and continuous refresh behavior.
- Portfolio helps users analyze selected candidates as a basket, with a more realistic market-search input experience.
- ETF is now established as a separate preview workspace, with page structure, routing, table fields, and time-window API contracts already in place.

Overall, this phase improved ranking flexibility, data refresh credibility, and cross-asset extensibility. It also lays the groundwork for real ETF data integration and a future TopPicks-to-Portfolio workflow.
