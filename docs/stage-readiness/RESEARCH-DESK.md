# Home research desk: plan, comparisons and acceptance

17 October 2026. Owner selected a compact actual research desk to replace the
ambiguous decorative line, asking for deep research, planning, multiple matched
comparisons and independent checks. The prior local-only instruction still
applies: commit locally, do not push/create PR/merge, then open the preview.

## Outcome and boundary

Starting head: `56cb3b5e9f5e517cbdc3864cf8714438ef1031d0`, branch
`feature/home-section-refinement`. Preserve runtime `data/top-picks-seed.zip`, the
primary checkout lockfile and the old preview on port 3118. Hero, Signature
identity, task groups and account routing remain intact.

A first-time visitor should identify the compared companies and period, see
their historical return and risk together, and open an explanation of one result.
Actual cumulative-return/drawdown plots are per company. Do not imply tracked
brokerage holdings, automatic benchmark overlays or live prices. Keep essential
values, units and explanation readable without hover and provide a no-JS path.

## Research before implementation

- [Linear](https://linear.app/) and [Stripe Billing](https://stripe.com/billing):
  actual task scenes connect inputs and results. Show a small coherent analysis,
  rather than another ornamental graph.
- [Mercury Insights](https://mercury.com/insights): explain timeframes, comparisons
  and drill-down beside dashboard imagery. FIT's example remains historical and
  should not borrow Mercury's banking or AI capabilities.
- [NN/G progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/):
  keep the main comparison visible and put secondary method/data detail behind
  explicit controls.
- [WAI complex images](https://www.w3.org/WAI/tutorials/images/complex/): identify
  charts and expose their essential information in text and semantic tables.
- [WAI disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) and
  [dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): use native
  semantic controls; a modal adds focus containment/return obligations.
- [Datawrapper guidance](https://www.datawrapper.de/academy/customizing-your-line-chart):
  keep company identities, dates, units and values readable; meaningful context
  should not require tooltip discovery.

Source observations are page/documentation reads. External live visual timing,
human preference and conversion improvements have not been established. Earlier
research and the corrected per-company contract are retained in ignored
`client/test-results/home-sections/PORTFOLIO-SHOWCASE-RESEARCH.md`.

## Predeclared comparisons

All candidates use the same two companies, frozen historical period, production
metric outputs, copy, typography, palette and available actions. Native captures
use 320/390/1440px; app acceptance also covers 3440px and 200% text.

| Round | Changed factor     | Candidates                                                                         | Common task                                                                                |
| ----- | ------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1     | Spatial allocation | A: dominant return chart plus two smaller risk panels; B: three equal metric cards | Identify companies/period, compare return and drawdown, find the volatility result         |
| 2     | Detail interaction | Same layout with inline detail versus modal detail                                 | Inspect Return → Volatility → Drawdown, then restore Return; dismiss and resume comparison |

Criteria: company/period discovery, correct units/financial meaning, readable
plots, related metrics together, compactness without clipping, mobile order,
activation count, context retention and keyboard/focus behavior. Clipping,
unreadable labels, inconsistent numbers, fake controls or undisclosed data origin
disqualify a candidate. Parent and a fresh reviewer inspect matched artifacts;
model judgment remains separate from browser measurements.

Stopping condition: both rounds have inspectable artifacts and actual mechanics
results, material failures are refined, and a justified candidate passes the
application acceptance gates. Do not repeat trials until a preferred winner
appears. These are controlled technical/design comparisons, not human A/B tests.

## Data and implementation plan

1. Freeze a bounded public historical adjusted-close sample and provenance. Run
   existing server calculations for cumulative return, annualised volatility and
   drawdown; verify full series and displayed figures. Avoid a second frontend
   financial-calculation implementation.
2. Build matched prototype variants in ignored scratch, review them independently
   and record the selected layout/detail behavior.
3. Implement a focused Home component using existing chart/theme/formatting
   capabilities where suitable. Keep optional heavy chart code out of the
   critical path if useful; do not introduce a new chart/animation dependency.
4. Protect new behavior with meaningful data/interaction tests. Preserve original
   route intent, public navigation, source order and all surrounding UI.
5. Run affected Home/data/chart contracts, required frontend checks and native
   browser journeys. Fresh review, inspect final diff, commit locally, reopen
   actual-config preview. No hosted mutation or remote release is included.

## Acceptance gates

- One visible sample identity and exact historical window; no live/account claim.
- Two company series, same dates, values and summary numbers tied to one frozen
  input and production calculations. Labels match the actual metric semantics.
- Main comparison and values usable at320/390/1440/3440px,200% text and font
  fallback. Long charts must not stretch or crop labels on wide/mobile screens.
- Detail controls work with keyboard, selected/expanded state is clear, no
  hover-only explanation, and reduced motion is honored. No automatic carousel.
- No-JS still supplies meaningful sample information, figures and explanations.
- Home entry/loading/restore/guest destination behavior remains correct.
- Build/types/lint/tests/coverage/diff and independent review are complete with
  failed or infrastructure runs retained and scoped limits stated.

## Frozen data and comparison decision

The existing public provider fetched 20 adjusted-close observations each for
AAPL and MSFT, 3–30 September 2024. One initial AAPL rate-limit warning recovered
through the existing fetch retry. No ongoing provider call is required by the
homepage. Frozen prices and outputs live in `researchDeskSample.json`; the
offline generator invokes existing server calculators, and regression tests
check every point and summary. Parent independently executed `--check`.

The earlier concern about holiday rows in an unrelated seed archive was resolved:
those union-calendar rows contain nulls. It is not evidence of fabricated source
data. That archive remains unrelated and uncommitted.

Final matched prototypes contain the same source/content in four variants.
Round 1 held inline focus constant and compared spatial layout; round 2 held each
layout constant and compared inline versus modal focus. Final native results:
16 runs, 262 passed checks, zero failures. Data source hash
`affc70e69978ebb767babf30afa77940e59faf3825feb45145291db7fd0be59b`;
freeze-manifest hash `d96289b4ecb58e5819d4c21b2b3c18eac4c65a8ddb7a5a98bc2167942400b110`.
The fresh reviewer verified all 48 artifact hashes and normalized content parity.
Parent viewed desktop A/B, mobile B and mobile modal focus captures.

At 1440px, both final grids were 550px tall: A gave return 667×348px and each risk
plot 377×95px; B gave each plot 331×348px. At 390px both had the same stacked
274×150px plots. Both were mechanically usable, but A made risk secondary;
B made all three questions equally visible. Parent selects **B** for the stated
value proposition, accepting its narrower line plots and spare volatility space.

Parent selects **modal detail** among the tested implementations: it repeats
company/date context and returns to the opener. The tested inline alternative
placed detail after the entire grid and scrolled away from the comparison. This
does not prove all inline designs inferior. Production detail will focus on
figures, interpretation, method and tables; the original keyboard-inspectable
charts remain on the cards, avoiding duplicate interactive plots inside a modal.
A compact summary/jump strip addresses the shared mobile finding that the third
card starts below the initial prototype viewport.

Retained pilot findings: 18 modal focus-containment failures, enlarged-label/axis
collisions, four enlarged-detail overflow failures, a positive drawdown-axis
limit and unequal grid heights. These were repaired before the frozen run.
Intervening screenshot protocol/sandbox aborts are retained without an asserted
root cause. Prototype enlarged-text detail coverage was limited to volatility
with its table closed; production checks must cover expanded return/drawdown
tables too. These are technical comparisons plus model review, not real-human
A/B or comprehension measurements.

## Production refinement and verification

The Home component keeps figures, company/date context, interpretation, method
and native percentage tables in server-rendered HTML. The small chart adapter
loads existing LineGraph/BarGraph directly; no financial formula is duplicated
in the browser and no new dependency was installed. Native date inspection and
bar focus remain available. Modal detail uses the existing dialog library and
focus helper; it does not duplicate the interactive charts inside the dialog.
Obsolete illustration paths, styles and vocabulary-only definitions were removed.

Frozen output formatting is independent of reproducibility: generator `--check`
compares parsed values, tolerating Prettier whitespace while rejecting stale
metrics without writing. An added regression control covers compact JSON. Parent
verified every parsed value and metadata field remained identical after formatting;
the prototype manifest retains the original comparison's byte hash.

Local frontend results: 257 suites / 1,671 tests; required 358 Portfolio/Top Picks
and 169 Watchlist coverage checks; types, lint and optimized build pass. New
research scope measured 97.43% line / 95.45% branch coverage. The existing Market
News image lint warning remains. Nine focused backend tests pass, including
complete frozen-series/scalar parity and generator controls. Backend application
code was not changed; this is not a claim of a new full backend or hosted run.

Next's reported Home first-load JS changed from 187kB to 194kB; optional D3 charts
are in a separate chunk. This is a bounded bundle observation, not an LCP claim.
Parent blocked the actual chart asset identified from each development and
optimized build's loadable manifest: all six figures, three explicit unavailable
states, data and modal/focus behavior survived. Initial source-text-based chunk
discovery failed before injection and is retained separately.

Seven new browser cases passed before the full matrix. The initial optimized
matrix passed 41/46: one old test assumed no signed-in buttons at all, while
four keyboard cases assumed every SVG focus indicator must be a stroke. Actual
native bar focus has a visible 5px outline. Parent verified the real Tab path,
then scoped the auth assertion to gated controls and accepted either a visible
outline or stroke, also requiring focus in the viewport. All five affected cases
passed without retry. Original failed screenshots and results remain available.

Two coverage attempts overlapped a build's temporary `.next/package.json`
replacement and failed before test execution. These are orchestration failures;
after build completion the coverage jobs passed with separate workspace caches.
No application code or thresholds were changed to address them.

The final optimized native matrix passed **46/46** with zero retries, skips or
flakes after those test refinements. It covers the unchanged account destinations,
Home grouping, all metric inspections, expanded enlarged-text tables, no-JS,
font fallback, shared chart contracts, and complete source-order keyboard paths
at 320/390/1440/3440px. A fresh independent implementation reviewer found no
actionable issues; its source/visual review is separate from parent execution.
