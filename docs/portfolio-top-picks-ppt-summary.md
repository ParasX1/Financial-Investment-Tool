# Portfolio And Top Picks Update Summary

## Portfolio

### Functional Outcome

Portfolio is now a structured research workspace instead of a single-page chart dashboard. It helps users build a small stock basket, apply shared assumptions, compare multiple risk and return views, and keep context while moving between overview, detailed focus, and observation modes.

### UI Improvements

- **Board / Focus / Observation modes** give users three working styles: quick multi-chart scanning, deep inspection of one metric, and a flexible observation workspace.
- **Five-card board layout** improves readability by replacing the older six-box layout with one primary chart, one secondary chart, and three compact supporting charts.
- **Redesigned command bar** brings the main workflow into one place: stock universe, history presets, benchmark, risk-free rate, VaR confidence, date range, and Run analysis.
- **Draft vs applied state** prevents confusion. Users can edit symbols or assumptions without immediately changing existing charts; charts update only after Run analysis.
- **Clear loading feedback** improves trust. Cards now show direct states such as Running analysis, Updating, missing data, or analysis not applied.
- **Better stock input validation** reduces failed backend requests by accepting realistic ticker formats such as AAPL, BRK-B, CBA.AX, ^GSPC, and EURUSD=X.

### Algorithm And Data Flow Improvements

- **Focused calculation scope** keeps Portfolio fast by calculating only the user's applied basket, up to five symbols.
- **Shared assumptions model** applies date range, benchmark, risk-free rate, and confidence level consistently across linked cards.
- **Local card overrides** let advanced users customize one chart without breaking the global workspace settings.
- **Reducer-based workspace state** makes Board, Focus, and Observation behavior more predictable and easier to maintain.
- **Versioned local persistence** restores the user's workspace reliably and supports future state migrations.
- **Supabase preference persistence** keeps selected portfolio symbols available across sessions for signed-in users.

### Added Capabilities

- A feature-based Portfolio module with separated screen, controller, state, data, chart, and style layers.
- Board, Focus, and Observation workspace modes.
- Dedicated stock input component with ticker validation.
- Workspace storage, migration, selectors, and reducer logic.
- Reusable metric registry and chart model helpers.
- Stronger status messages for pending drafts, running analysis, missing price history, and validation errors.
- Expanded tests for workspace state, reducer behavior, persistence, chart helpers, and UI components.

## Top Picks

### Functional Outcome

Top Picks is now a scalable single-stock discovery surface. It ranks individual stocks through a backend service, supports larger market universes, reuses cached ranking snapshots, and gives users a faster table experience with clearer metric language and status feedback.

### UI Improvements

- **Cleaner feature screen** separates the page into a header, toolbar, data table, and column settings dialog.
- **Metric labels now match Portfolio language**, making the two pages feel connected:
  - 1Y Return -> Cumulative return
  - Sharpe -> Sharpe ratio
  - Sortino -> Sortino ratio
  - Volatility -> Annualised volatility
  - Max DD -> Max drawdown
  - Beta -> Beta exposure
  - Alpha -> Alpha vs benchmark
  - Info Ratio -> Information ratio
- **Server-backed pagination and sorting** make large result sets more usable.
- **Visible-column preferences** let users customize the table and keep that setup across sessions.
- **Warnings, retry, and stale snapshot status** explain what the data represents instead of leaving users guessing during refreshes.
- **CSV export remains available** and now follows the same column model as the on-screen table.
- **Local-only email update UI was removed** because it did not provide a real notification feature.

### Algorithm And Data Flow Improvements

- **Backend-driven ranking** replaces browser-side ranking assembly. The frontend now calls one `/api/top-picks` endpoint instead of combining multiple metric endpoints itself.
- **Shared metric calculators** keep Top Picks aligned with Portfolio where possible, including cumulative return, Sharpe ratio, Sortino ratio, volatility, drawdown, beta, and alpha.
- **Trailing one-year ranking window** keeps Top Picks focused on comparable single-stock performance, while Portfolio remains user-date-range driven.
- **Ranking value compression** turns some time-series calculations into sortable table values, while Portfolio keeps richer chart views.
- **Information ratio** was added as a Top Picks ranking metric for active-return efficiency.
- **Larger stock universe support** removes dependence on the old 22-symbol seed table.
- **Universe lookup order** now prefers active `top_picks_universe` rows and falls back to legacy `tickers` only when needed.

### Added Capabilities

- Backend snapshot cache for complete Top Picks rankings.
- Persistent local snapshot file at `server/.cache/top-picks-snapshot-cache.json`.
- Stale snapshot behavior, so previous full results can display immediately while a fresh ranking rebuilds.
- Frontend polling every 20 seconds during background snapshot refresh.
- Global Top Picks prewarm, delayed so it warms the backend without duplicating direct page loads.
- Portfolio route exclusion from prewarm, preventing Top Picks background work from slowing Portfolio analysis.
- Universe sync script for standard index sources, including S&P 500 and ASX 200 presets.
- Yahoo Finance ticker normalization for US class shares, Australian `.AX` symbols, and Hong Kong `.HK` symbols.
- Supabase preference persistence for sorting and page size.
- Scoped localStorage for visible table columns.
- Stronger response validation for rows, metric statuses, warnings, and metadata.

## Product Relationship

- **Top Picks** helps users discover strong individual stocks.
- **Portfolio** helps users test whether selected stocks work well together as a basket.

Together, they now form a clearer workflow: discover candidates in Top Picks, then validate the basket in Portfolio. The two features share financial language and backend metric logic, while heavy Top Picks ranking work is separated from lightweight Portfolio analysis.
