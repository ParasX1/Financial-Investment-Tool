# TopPicks And Portfolio Worklog - 2026-08-19

This note records the 2026-08-19 work around TopPicks multi-window rankings,
persistent snapshot fallback behavior, and Portfolio symbol search.

## Scope

The session focused on three product areas:

- Keep the existing TopPicks one-year ranking behavior.
- Add Day, Week, Month, and Year views with metrics suitable for each window.
- Make Portfolio symbol entry behave like a real market symbol search instead
  of a hard-coded suggestion list.

No TopPicks-to-Portfolio linked-history handoff was implemented in this pass.

## TopPicks Time Windows

TopPicks now supports four ranking windows:

- `1D`: Day
- `1W`: Week
- `1M`: Month
- `1Y`: Year

The frontend exposes these through the TopPicks toolbar. The existing Year view
is still present and remains the default window.

The request contract now accepts a `window` field. The backend validates that
the selected sort key is available for that window:

- Day: price return only.
- Week: price return, annualised volatility, max drawdown.
- Month: price return, annualised volatility, max drawdown.
- Year: the full original TopPicks metric set.

## Metric Availability By Window

The UI now filters the visible columns and edit-column dialog by window.

Day shows only metrics that make sense for a single-day ranking. Week and Month
include volatility and drawdown because there are enough observations for a
short risk view. Year keeps the full risk-adjusted set:

- Price return
- Sharpe ratio
- Sortino ratio
- Annualised volatility
- Max drawdown
- Beta exposure
- Alpha vs benchmark
- Information ratio

Column preferences are stored per user scope and per window, so selecting a
minimal Day layout no longer hides Year columns.

## Year Behavior

The Year window was kept close to the original TopPicks implementation.

Important preserved behavior:

- Year uses the trailing one-year date range.
- Year keeps the `200` observation minimum for full metric availability.
- Year warnings still report insufficient trailing history, unavailable
  metrics, and unusable market data using the original categories.

This prevents short-window logic from changing the original one-year ranking
semantics.

## Backend Snapshot Cache

TopPicks snapshot cache keys now include the selected window. Day, Week, Month,
and Year are calculated and stored separately.

Persistent snapshot behavior changed from a 24-hour-expiring stale fallback to
a permanent latest-result fallback:

- The latest complete snapshot is written to disk.
- On restart, the persisted snapshot is loaded as stale.
- The user can see the previous complete result immediately.
- A fresh snapshot is rebuilt in the background.
- The frontend polls every 20 seconds while `snapshotRefreshing` is true.

The persisted cache is intended as a startup fallback, not as a claim that the
data is current.

When a stale or previous snapshot is used, the backend refreshes all TopPicks
windows in the background. The requested window is refreshed first, then the
other windows are refreshed sequentially.

## TopPicks Frontend Behavior

TopPicks still enters loading during polling refreshes. This was intentionally
kept so users can see that the data is updating.

The status line now describes the risk-free-rate date more precisely:

```text
risk-free rate 4.35% (RBA cash rate target, effective 2026-06-17)
```

`effective` is used instead of `as of` because the date is the effective date of
the RBA cash rate target used as the risk-free-rate assumption.

Several mojibake display issues in TopPicks text were also cleaned up, including
metric empty-state formatting and loading text.

## Portfolio Symbol Search

Portfolio's shared-universe input no longer uses the hard-coded default
suggestion list such as `AAPL`, `MSFT`, and `NVDA`.

The input now uses the existing market symbol search API:

```text
/api/market/symbol-search?q=<query>
```

The search API supports:

- Equity
- ETF
- Index
- Cryptocurrency

Suggestions display the symbol, exchange or quote type, and instrument name.
Selecting a suggestion still stores only the ticker symbol in Portfolio, so the
existing metric calculation flow is unchanged.

Manual ticker entry is still supported. The placeholder now says:

```text
Add ticker...
```

instead of implying that `AAPL` or a small local list is the expected input.

## Portfolio Input Edge Cases

The Portfolio symbol input keeps the existing rules:

- Maximum of five symbols.
- Ticker format validation.
- Deduplication.
- Uppercase normalization.

The autocomplete behavior was tightened so partial search text such as `A` is
not accidentally submitted when suggestions are visible. If the user types an
exact result symbol such as `VOO`, it can still be committed as a ticker.

## Verification

Frontend checks passed:

```powershell
npx.cmd jest --config jest.portfolio-top-picks.config.js --runInBand --coverage=false
npx.cmd tsc --noEmit --pretty false
git diff --check
```

Observed result:

```text
45 test suites passed
246 tests passed
TypeScript passed
diff check passed
```

Backend pytest could not be executed in the local environment because
`python.exe` resolves to a WindowsApps shim and fails with:

```text
The system cannot access this file.
```

This is an environment limitation rather than a reported backend test failure.

## Notes

Portfolio search and Watchlist search now have similar hook logic. This is
acceptable for the current change because the pages remain decoupled. A future
cleanup could extract a shared symbol-search hook if both pages continue to use
the same behavior.
