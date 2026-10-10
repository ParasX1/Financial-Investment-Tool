# Portfolio trader workspace capability

## Capability

Portfolio is a progressive-density research workspace for a shared stock
universe. A trader can scan six complementary metrics at once, investigate any
card in Focus, and arrange the same cards in a full-screen Observation canvas
without losing settings or results.

Product promise: **scan broadly, investigate deeply, preserve context**.

## Constraints and invariants

- The shared universe contains at most five symbols.
- A workspace contains one to six cards with stable IDs. Duplicate metrics are
  valid because their assumptions may differ.
- Board, Focus, and Observation are projections of one workspace state. A mode
  change never deletes card configuration or changes the universe.
- Global inputs are defaults. Each card may visibly override date range,
  benchmark, risk-free rate, or confidence and can relink to global inputs.
- A card fetches only the inputs relevant to its metric. One card's invalid
  input, missing data, or provider error cannot blank the other cards.
- Previous valid results remain visible and are marked stale while a refresh is
  running. Missing or non-finite values are disclosed, never coerced to zero.
- Up to six Observation windows may be moved, resized, hidden, restored, and
  automatically arranged. Hiding an Observation window does not delete a card.
- Stored v1 dashboard and v2 focused-workspace preferences migrate to v3
  without deleting the original storage values.
- The surface is historical research. It is not live market monitoring, a
  brokerage account, or an investment recommendation engine.

## Actors and user stories

### Active trader: morning scan

The trader selects a basket once and simultaneously sees adjusted-close
performance, drawdown, volatility, risk-adjusted return, rolling correlation,
and sampled portfolio opportunities. They can identify a trade-off before
opening Focus.

### Portfolio allocator: risk triangulation

The allocator keeps return, downside, VaR/correlation, and the sampled
opportunity set visible. They can lock a correlation pair or sampled portfolio
selection and inspect exact values and weights.

### Research analyst: hypothesis comparison

The analyst duplicates a metric, keeps one card linked to the global period,
overrides another, and sees a compact `Custom` badge. Focus expands either card
without losing the board layout.

### Multi-monitor trader: Observation

The trader opens the current deck in a full-screen canvas, drags and resizes
windows, brings one forward, hides/restores cards, auto-arranges the desk, and
returns to the unchanged board with Escape or Done.

### Developing investor: metric understanding

The investor scans relationships first, then uses Focus for the metric
definition, calculation method, assumptions, limitations, warnings, and
accessible data table. Insufficient or infinite results are explained instead
of disappearing.

## Implementation contract

### State

```ts
type PortfolioWorkspaceStateV3 = {
  version: 3;
  symbols: string[];
  globalInputs: AnalysisInputs;
  cards: PortfolioMetricCard[];
  view:
    | { mode: "board" }
    | { mode: "focus"; cardId: string }
    | { mode: "observation" };
  observerLayout: Record<string, ObserverWindow>;
};
```

Each card owns a stable ID, metric, linked-input flags, local overrides, and
hidden series. Query results and transient hover/cursor selections are not
persisted.

### Surfaces and transitions

- `Board -> Focus(cardId)`: expand the card; use the same effective query.
- `Focus -> Board`: Escape or Back; preserve the deck and scroll position.
- `Board/Focus -> Observation`: restore the saved layout or arrange visible
  cards.
- `Observation -> Board`: Escape or Done; retain card settings and layout.
- `Add/Duplicate card`: inherit global inputs and create a stable ID.
- `Promote`: change geometry/order, not card configuration.
- `Close Observation window`: hide the window only.
- `Delete card`: explicit card removal; never an accidental side effect.
- `Global input change`: update linked fields only.
- `Reset to global`: remove relevant local overrides and relink the card.

### Metric and interaction truth

- Registry copy is the source of truth for unit, sign convention, method,
  required parameters, observation requirement, semantic class, and whether
  higher/lower has meaning.
- Adjusted-close returns use each symbol's first valid observation. Standalone
  statistics use per-symbol valid samples; pairwise statistics use aligned
  pairs; portfolio simulations use a common aligned sample.
- Sortino uses downside deviation relative to the daily target over the full
  sample and preserves explicit `infinite` and `limited_data` statuses.
- VaR is displayed as a positive loss magnitude at the selected confidence.
- Correlation is a rolling pairwise matrix including the benchmark; missing
  overlap is `N/A`, never zero.
- Portfolio points are long-only Dirichlet samples. Labels say `best sampled`
  and `lowest sampled`, not exact optimum.
- Hover/focus may highlight compatible symbol series. Legend visibility never
  mutates the analysis universe.
- Heatmap cells and portfolio points support a pinned selection with exact
  values. Accessible tables remain available for every graph.

### Failure and recovery

- With no symbols, all six card shells remain visible with one universe action.
- Invalid global inputs affect linked cards; valid custom cards remain usable.
- Missing symbols produce a partial result and identify exclusions.
- A failed refresh retains the last valid card result and offers per-card retry.
- A corrupt Observation layout regenerates positions without discarding cards.
- On mobile, Board becomes a usable vertical/active-card flow and Observation a
  reorderable stack; desktop freeform geometry is not squeezed into the phone.

## Non-goals

- Trade execution, holdings/P&L accounting, alerts, brokerage sync, or live
  streaming.
- Unlimited cards or independent per-card symbol universes in this pass.
- Claiming simulated portfolio extrema are recommendations or global optima.
- Cross-device Observation layout sync.
- Reintroducing the legacy monolithic chart-card component or fixture data.

## Open decisions and chosen defaults

- Correlation remains the existing mean 21-trading-day rolling Pearson matrix
  and is labelled precisely; a full-period option is deferred.
- Portfolio construction remains a deterministic long-only sampled opportunity
  set using Dirichlet weights; a constrained optimizer is deferred.
- The default board is Cumulative Return, Max Drawdown, Volatility, Sharpe,
  Correlation, and Simulated Portfolios.
- Observation layout is persisted per browser/user; named cross-device layouts
  are deferred.

## Handoff

Implementation proceeds test-first: workspace reducer and migration, metric
reference tests, Board cards, Focus reuse, Observation canvas, card-local
overrides and pinned selections, then responsive/accessibility/E2E verification.
