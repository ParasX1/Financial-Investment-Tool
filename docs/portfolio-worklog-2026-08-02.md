# Portfolio Worklog - 2026-08-02

This note records the Portfolio page cleanup and behavior changes made during the working session.

## Scope

The changes were focused on the Portfolio page unless noted otherwise:

- Board layout
- Focus mode filmstrip
- Observation mode default/restore layout
- Shared universe stock input
- Linked history and model assumptions controls
- Metric card chart sizing and status messages
- Frontend validation and tests

## Layout Cleanup

### Command bar

- Removed the old summary strip below the command bar.
- Removed the descriptive subtitle under the main title:
  - Removed: `One basket, six simultaneous lenses, and no lost context between Board, Focus, and Observation.`
- Reduced the visual weight of the title area so the analysis board starts higher.
- Kept the command bar as the main control area for:
  - shared stock universe
  - linked history presets
  - benchmark
  - risk-free rate
  - VaR confidence
  - date range
  - Run analysis

### Shared universe input

- Reduced the stock input height so it aligns better with the history preset buttons.
- Adjusted chip sizing and spacing so selected stocks do not feel crowded.
- Changed chip width behavior so short symbols like `META` use natural width instead of wasting horizontal space.
- Fixed the stock suggestion dropdown so it stays aligned to the input area instead of stretching across the page or floating badly beside the sidebar.

### Model assumptions placement

- Moved `Benchmark`, `Risk-free %`, and `VaR confidence` out from the collapsed assumptions panel.
- Placed them directly below the stock input so the left side of the command bar is not mostly empty.
- Kept their behavior the same:
  - `Benchmark` applies to metrics that compare against a market proxy.
  - `Risk-free %` applies to risk-adjusted metrics.
  - `VaR confidence` applies to Value at Risk.

### Date controls

- Kept the linked history preset layout unchanged.
- Adjusted `From` and `To` date inputs to align visually with the assumptions inputs.
- Linked history presets remain the highest-priority global time control.
- When Run analysis is clicked, linked card date overrides sync back to the command bar's current date range.

## Board Changes

### Five-card board

- Changed the Board from six visible boxes to five visible boxes.
- Removed the duplicated/redundant second right-side chart from the visible Board layout.
- The current Board structure is:
  - one large primary chart on the left
  - one taller secondary chart on the right
  - three compact charts along the bottom

### Clearer card boundaries

- Increased visual separation between boxes.
- Strengthened borders and internal separators so users can see where each card begins and ends.
- Added more consistent spacing between the command bar and chart area.

### Hero card assumptions

- Removed local assumption controls from small Board cards.
- Kept assumption override controls only on the largest Board card.
- Moved the largest card's override controls into the card header so users can edit them without opening an extra panel.

## Focus Mode Changes

- Updated the Focus mode bottom filmstrip to match the Board's five-card model.
- Removed the filmstrip entry that corresponds to the removed Board card.
- Made the five filmstrip items fill the available width evenly.
- Kept Focus mode behavior otherwise unchanged:
  - users can open a card in detail
  - linked/local assumptions still work
  - summary/data table area remains available

## Observation Mode Changes

- Updated Observation's initial layout to match the Board's five-card structure.
- Changed `Restore hidden` so it restores the same five visible cards as Board, instead of bringing back all six old windows.
- Kept Observation-specific behavior:
  - draggable windows
  - auto arrange
  - hidden/restored windows
  - focus/promote/delete/duplicate actions

## Stock Input Validation

### New dedicated component

- Extracted the stock input out of `PortfolioCommandBar` into:
  - `client/features/portfolio/components/PortfolioSymbolInput.tsx`

This makes the command bar cleaner and isolates stock input behavior.

### Ticker validation

- Aligned frontend ticker validation with backend ticker validation.
- Current accepted format:
  - 1 to 15 characters
  - first character must be one of `A-Z`, `0-9`, or `^`
  - later characters may include `A-Z`, `0-9`, `.`, `^`, `=`, or `-`

Examples that should be accepted:

- `AAPL`
- `MSFT`
- `BRK-B`
- `CBA.AX`
- `^GSPC`
- `EURUSD=X`

### Input behavior

- Invalid keyboard input is silently rejected on Enter/Tab.
- Invalid selection through the dropdown shows a user-facing warning.
- Pressing Enter no longer leaves the raw typed value behind the chips.
- Pressing Enter no longer reopens the suggestion dropdown.
- The input still supports up to five selected symbols.

## Chart Layout Changes

- Adjusted line, bar, and heatmap chart sizing in compact cards.
- Reduced chart height inside compact boxes so x-axis labels and bottom insight text are visible.
- Centered chart canvases within the available card body area.
- Added compact rendering support to chart components:
  - `LineGraph`
  - `BarGraph`
  - `HeatMap`
- Fixed legend spacing so chart legends are not clipped.
- Adjusted chart top spacing so y-axis labels are not pressed against the card header.

## Status And Feedback Changes

### Run analysis pending state

- Made the pending state clearer in the command bar.
- New message explains that draft changes are waiting and current charts still use the previous analysis.
- If symbols are typed but not applied yet, empty cards now show:
  - `Analysis not applied`
  - an instruction to click `Run analysis`

This avoids the confusing state where the input shows a stock but the cards say no universe has been applied.

### Missing price history

- Improved card-level warnings when the backend returns missing symbols.
- Instead of only saying a symbol was excluded, cards now explain:
  - which symbol has no usable price history
  - that it was excluded from the card
  - that the user should check ticker format or use a longer date range

## State And Selector Changes

- Added Board-visible card selector logic so Board, Focus filmstrip, and Observation restore can share the same five-card model.
- Added reducer behavior to sync linked card date overrides with the global linked history when Run analysis is applied.
- Updated Observation layout generation so the hidden sixth card stays hidden by default.

Key state files changed:

- `client/features/portfolio/state/workspaceSelectors.ts`
- `client/features/portfolio/state/workspaceReducer.ts`
- `client/features/portfolio/state/workspaceDefaults.ts`
- `client/features/portfolio/state/index.ts`

## Test Updates

Added or updated tests around:

- command bar layout and props
- symbol normalization and ticker validation
- Board visible-card selector
- Board/Focus/Observation mode behavior
- Observation restore/arrange behavior
- reducer behavior for linked date synchronization

Tests successfully run:

```powershell
cd D:\Financial-Investment-Tool\client
npm test -- PortfolioCommandBar.test.tsx PortfolioSymbolInput.test.ts PortfolioScreen.test.tsx --runInBand
```

Result:

- 3 test suites passed
- 12 tests passed

Formatting check successfully run:

```powershell
cd D:\Financial-Investment-Tool\client
npx prettier --check features/portfolio/components/PortfolioMetricCard.tsx features/portfolio/components/PortfolioCommandBar.tsx features/portfolio/hooks/usePortfolioWorkspaceController.ts features/portfolio/components/PortfolioMetricCard.test.tsx features/portfolio/components/PortfolioChart.tsx
```

Result:

- all matched files use Prettier style

Known local test environment issue:

- `PortfolioMetricCard.test.tsx` cannot currently run because `react-test-renderer` is missing from `client/node_modules`.
- This is a dependency installation issue, not a component assertion failure.

Known lint notes:

- Full lint still reports two unrelated `<img>` warnings outside Portfolio:
  - `client/features/home/screens/HomeScreen.test.tsx`
  - `client/features/market-news/components/MarketNewsArticleCards.tsx`

## Main Files Changed

Portfolio components:

- `client/features/portfolio/screens/PortfolioScreen.tsx`
- `client/features/portfolio/components/PortfolioCommandBar.tsx`
- `client/features/portfolio/components/PortfolioSymbolInput.tsx`
- `client/features/portfolio/components/PortfolioMetricCard.tsx`
- `client/features/portfolio/components/PortfolioChart.tsx`
- `client/features/portfolio/components/PortfolioObservation.tsx`

Chart components:

- `client/components/charts/LineGraph.tsx`
- `client/components/charts/BarGraph.tsx`
- `client/components/charts/HeatMap.tsx`

Portfolio state:

- `client/features/portfolio/hooks/usePortfolioWorkspaceController.ts`
- `client/features/portfolio/state/workspaceDefaults.ts`
- `client/features/portfolio/state/workspaceReducer.ts`
- `client/features/portfolio/state/workspaceSelectors.ts`
- `client/features/portfolio/state/index.ts`

Styles:

- `client/features/portfolio/styles/PortfolioCommandBar.module.css`
- `client/features/portfolio/styles/PortfolioMetricCard.module.css`
- `client/features/portfolio/styles/PortfolioChart.module.css`
- `client/features/portfolio/styles/PortfolioWorkspaceShell.module.css`

Tests:

- `client/features/portfolio/components/PortfolioCommandBar.test.tsx`
- `client/features/portfolio/components/PortfolioSymbolInput.test.ts`
- `client/features/portfolio/components/PortfolioMetricCard.test.tsx`
- `client/features/portfolio/components/PortfolioObservation.test.tsx`
- `client/features/portfolio/screens/PortfolioScreen.test.tsx`
- `client/features/portfolio/state/workspacePureHelpers.test.ts`
- `client/features/portfolio/state/workspaceReducer.test.ts`
- `client/features/portfolio/state/workspaceState.test.ts`
- `client/features/portfolio/portfolioStyleBoundary.test.ts`

## Current Design Direction

The Portfolio page is now closer to a research workspace:

- one command area
- five clearer analysis cards
- consistent Board, Focus, and Observation structure
- clearer distinction between draft inputs and applied analysis
- better chart readability inside constrained boxes
- stricter ticker validation before the backend request

