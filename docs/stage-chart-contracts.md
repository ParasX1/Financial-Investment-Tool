# #299 chart, allocation, and keyboard contracts

Verified base: `722e6a2a78f6f853b7026fde10f0820a9067fa5e`, branch
`fix/299-date-correct-charts`, isolated `.audit/stage-charts` worktree.
This candidate is local and uncommitted. It changes client chart presentation,
frontier allocation normalization, and Portfolio keyboard behavior. No backend,
database, authentication, ETF, Top Picks, deployment, or provider state was changed.

## Requirements and decisions

### Historical date/value correspondence

Production path: `Portfolio.tsx` → `PortfolioScreen` → metric card/workspace →
`PortfolioChart` → `LineGraph`; `usePortfolioMetric` calls the shared metric client.
Per-symbol histories can contain different date sets: backend history calculations
and client normalization independently remove unavailable observations.

The original chart chose an anchor date, then chose the nearest value independently
for every series. A controlled Chromium regression reproduced a Jan 1 heading
containing AAPL's Jan 1 +10% and MSFT's future Jan 2 +20%, without disclosing the
second date.

The common comparison task was inspecting AAPL Jan 1 and MSFT Jan 2. Criteria were
truthful dates, a coherent crosshair, preserved missingness, and compatibility with
the existing daily-history DTO.

| Design                                                                        | Result under those criteria                                                                                                    | Decision                           |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| Exact selected timestamp; unavailable row for a series without an observation | Same-date comparison; every dot matches the crosshair; missingness remains visible                                             | Selected                           |
| Nearest observation per series with its actual date in each row               | Honest when every date is disclosed, but mixes potentially stale or future observations and scatters dots around the crosshair | Rejected for this comparison chart |

This is a source-backed technical/design comparison, not a user study. A fresh
read-only explorer independently recommended exact timestamp matching. The chart
now builds one sorted timestamp union and a value map per usable series. Pointer
and keyboard use the same rows; absent observations display `N/A` and have no dot.
No forward fill, interpolation, or zero is inserted into inspection rows. Plotted
paths retain their existing interpolation. Entirely empty series retain the
existing empty-series behavior.

`LineGraph.test.tsx` independently asserts the Jan 1/2/3 observations, missing rows,
zero values, navigation boundaries, input guards, dismissal, compact/date scales,
invalid observations, and a single-value chart. The real CSS/browser checks verify
tooltip text, dot count, keyboard date values, Escape isolation, and Tab exit.

### Allocation correspondence

`normalisePortfolioSeries` previously compacted each weights vector by filtering
invalid values. `[0.2, null, 0.8]` became `[0.2, 0.8]`, assigning the third asset's
weight to the second asset in both pinned allocation and table consumers.

The boundary now normalizes each weight in place to a finite number or `null`.
The DTO and frontier prop explicitly allow null slots. Valid zero weights remain
zero; no missing weight is synthesized. Pinned allocations identify unavailable
assets as `N/A`; the existing table omits unavailable weights and preserves every
remaining asset index.

A final independent boundary control also reproduced JavaScript coercion turning
`[]` into zero, `[0.8]` into 0.8, and whitespace into zero. Only numbers and nonblank
numeric strings now enter the finite-number conversion. Structured and blank
weights retain null slots. The targeted market-metrics rerun passed six tests; a
fresh reviewer ran 24 actual-normalizer cases and confirmed existing finite numbers,
zero, padded numeric strings, and scientific notation remain compatible.

Two red regressions reproduced middle/leading holes and nonfinite/boolean values,
including filtering an invalid outer simulation and remapping highlight indices.
The controlled browser test selects a normalized `[null, 0.8]` vector and requires
`AAPL N/A` plus `MSFT 80.0%`, never `AAPL 80.0%`.

### Keyboard inspection and selection

For the frontier, a single SVG control and roving point focus were compared against
one Tab entry, individual accessible point names, tooltip inspection, and existing
Enter/Space pinning. Roving focus keeps each point's button semantics and selection
behavior, so it was selected. For historical inspection, a single discrete slider
control represents the sorted date index and announces the selected date and rows.

The frontier now has one `tabindex=0` among up to 900 displayed circles. Arrow keys,
Home, and End move focus; focus reveals risk/return/Sharpe; Enter/Space pins; Escape
dismisses details; Tab exits. Historical paths no longer add redundant Tab stops.
The historical overlay has an accessible slider name, bounds, current index, and
date/value text, and shares pointer inspection with its keyboard handlers.

Fresh independent review found that the initial radius-4 focus ring was covered by
the later radius-5 highlight markers. The focus radius is now 8, extending beyond
the highlights. A red browser assertion caught the old radius; the green screenshot
was inspected and shows the white ring around the highlighted lowest-risk point.

A navigation test also exposed `addUniquePoints` accepting the same candidate twice
when lowest risk and best Sharpe were one portfolio. That repeated point trapped
index-based navigation. The helper now updates its set while accepting candidates;
a red/green test requires `[best, second]`, where the old output was
`[best, best, second]`. Existing sampling/budget tests pass. The independent reviewer
also ran 72 sampling cases, checking uniqueness, budget, highlights, and unchanged
inputs, and reported no remaining actionable findings after refinement.

### Workspace shortcuts

The window handler now leaves consumed events, Ctrl/Meta/Alt/Shift combinations,
composition, repeats, and editable ancestors untouched. Existing plain Board,
Focus, and Observation shortcuts remain covered. Six initial red cases reproduced
unwanted mode changes; review added a separate Shift red/green regression. Consumed
chart navigation/Escape prevents default and stops propagation so dismissing a
tooltip does not return the workspace to Board.

### Missing correlations

The current heatmap already rejects null cells, and `portfolioChartModel` preserves
missing correlations as null. Its existing regression verifies missing overlap
remains unavailable. No heatmap change was needed.

## Verification evidence

All commands ran from this candidate's `client/`. Installed versions were verified
through the ignored dependency junction: React 18.3.1, Next 15.5.27, D3 7.9.0;
Node was 24.15.0. No dependencies or framework versions changed.

| Check                                                              | Result                                                                                                                                           |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Full Jest `npm test -- --ci --runInBand` with worktree-local cache | 230 suites, 1190 tests passed after the final structured-weight regression                                                                       |
| Focused LineGraph coverage                                         | 8 tests passed; statements 97.40%, branches 98.03%, functions 90.19%, lines 97.29%                                                               |
| Watchlist coverage gate                                            | 20 suites, 102 tests passed; statements 91.96%, branches 83.47%, functions 94.23%, lines 94.57%                                                  |
| Portfolio/Top Picks coverage gate                                  | 47 suites, 312 tests passed; Portfolio aggregate statements 92.78%, branches 89.50%, functions 92.42%, lines 93.20%; all configured gates passed |
| Typecheck                                                          | Passed after all source changes and new tests                                                                                                    |
| Lint                                                               | Passed; two existing `no-img-element` warnings in Home and Market News                                                                           |
| Controlled Chromium Portfolio journeys                             | 9 passed, including all three new chart contracts and existing desktop/mobile/Observation/preference flows                                       |
| Production build                                                   | Final rebuild passed after the structured-weight refinement                                                                                      |
| Independent review                                                 | Two actionable findings fixed and rechecked; no remaining actionable findings                                                                    |
| Final diff/format checks                                           | Diff and changed-file format checks passed                                                                                                       |

Node-environment chart unit tests use D3 test doubles, matching the repository's
existing component tests. The Chromium journeys execute real chart SVG/CSS, focus,
pointer, and keyboard behavior against deterministic metric/provider/persistence
fixtures. These results do not establish live provider correctness, Supabase/RLS,
production deployment, screen-reader speech, or human usability acceptance.

Local raw logs and screenshots are ignored under `client/test-results/chart-local`,
`client/test-results/chart-browser-results`, and
`client/test-results/portfolio-browser-results`; measured coverage is under
`client/coverage`. The chart-only port 3007 server was stopped after browser checks.

## Failed checks and contained recovery

- The default sandbox denied creating the dependency junction. A scoped approved
  retry created only the ignored `client/node_modules` link to the already installed
  `.audit/stage-readiness/client/node_modules`.
- Initially, Jest's cache was under `.next`, which the dev server resets at startup;
  the tests showed intended red failures and then a missing-cache error. TEMP and
  caches were moved into this worktree's ignored `test-results/chart-local` area.
- The sandboxed browser's default cache did not contain Chromium. The existing
  installed cache was supplied through `PLAYWRIGHT_BROWSERS_PATH`; no browser was
  downloaded. Next's initial AppContainer server could listen but local requests
  timed out. A scoped approved server/browser run on port 3007 resolved loopback
  access. Only positively identified chart-server processes were stopped.
- An initial added navigation test exposed the duplicate sampling defect described
  above. A subsequent blur assertion expected the last attribute regardless of
  target; it was corrected to inspect the last stroke attribute. No production
  behavior was weakened to satisfy either test.
- A later Portfolio coverage run stopped one suite with `EPERM` while Jest tried
  to stat the shared installed `react/index.js`. Its 306 passing tests and coverage
  are preserved as an incomplete run. The unchanged gate passed with a scoped
  approved native command and a separate worktree-local cache.

The final structured-weight rebuild also encountered sandbox `EPERM` when creating
generated `.next/server/pages/api/news` output. The identical build passed with
scoped approved native filesystem access. The failed and successful logs are both
preserved; no source, tests, or sandbox settings were changed for that recovery.

## Primary documentation checked

- [WAI keyboard interface conventions](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
  support one Tab entry per composite and navigation inside it with other keys.
- [D3 event listeners](https://d3js.org/d3-selection/events) and
  [selection control flow](https://d3js.org/d3-selection/control-flow) were checked
  for element-bound event handlers and accessing selected DOM nodes.
- [KeyboardEvent.isComposing](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/isComposing)
  and [Element.closest](https://developer.mozilla.org/en-US/docs/Web/API/Element/closest)
  informed composition and editable-ancestor guards.
- [React DOM events](https://react.dev/reference/react-dom/components/common) and
  [current Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)
  were checked without adopting APIs beyond the installed React/Next versions.

Next action: parent integration review of this verified local candidate. No commit,
push, or external publication was performed in this worker lane.
