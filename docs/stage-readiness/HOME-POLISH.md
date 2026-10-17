# Home copy, compact tool examples and independent disclosures

17 October 2026. Local follow-up to `4315dea73`. Scope: Home presentation only;
the owner asked for a local commit and preview before any push. Preserve the
accepted Signature identity, dark/purple palette, research sample, calculations,
five authentication destinations and public Guide/Help links.

## Research and decisions

Current first-party pages inspected: [Linear](https://linear.app/),
[Mercury](https://mercury.com/), [Reader](https://readwise.io/read) and
[Notion](https://www.notion.com/). They explain recognizable tasks and place
specific product examples near their claims. This supports a design technique,
not a claim that FIT will gain conversions. No award status is attributed to
these current pages. FIT does not inherit their automation, integration,
superiority or financial outcome claims.

| Requirement                                              | Evidence and alternatives                                                                                                                                                                                                                                                                                                                                      | Decision and refinement                                                                                                                                                                                                                                                                               | Acceptance                                                                                                                                       |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Expanding a method must not move adjacent metric content | Native Chromium reproduced default Grid stretching at 1440 and 3440px. Opening volatility moved sibling content by 230.64px and 210.25px respectively. [CSS alignment documentation](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/align-items) explains grid alignment.                                                               | Apply `align-items: start` to the existing grid; retain native independent `details`, without state or new JavaScript.                                                                                                                                                                                | Each of the three expansions must preserve sibling card, chart, button and summary rectangles; actual RED 2 failures followed by GREEN 2 passes. |
| Explain FIT's purpose and benefit in the hero            | Compared A: Research companies / Understand the trade-offs; B: Research companies / Build your own view; C: Make sense of investing / One company at a time. Same support, fonts, CSS, actions, reduced motion and three viewports: 320x568, 390x844, 1440x1000. All 9 renders fit without horizontal overflow and kept the main action wholly above the fold. | Parent and fresh-context reviewer selected C for the student/newer-investor audience. A's terminology is less approachable; B has a less specific benefit. The concrete supporting sentence narrows the broad word investing to historical research and learning. No promise of profitable decisions. | Persisted copy, mobile CTA, font fallback, enlarged text, no-JavaScript text/navigation and existing entry flows.                                |
| Show each smaller tool's value without another dashboard | Compared plain text/metadata anatomy with quiet inset excerpts on task recognition, truth, mobile readability and maintenance. Source audit verified actual features before implementation.                                                                                                                                                                    | Use one compact static excerpt per tool and ordinary semantic HTML; no extra account requests or simulated controls. News needs metadata anatomy rather than an invented story.                                                                                                                       | Accessible examples, honest labels, natural wrapping, no extra keyboard stops or changes to route behavior.                                      |
| Top Picks                                                | Actual toolbar windows and sorting; `TopPicksScreen` exports current controller rows and visible columns. A second return table would repeat Portfolio and would need a different-period disclaimer.                                                                                                                                                           | Small three-step workflow; say **Export page CSV**, not export all results.                                                                                                                                                                                                                           | No fabricated ranking or financial values.                                                                                                       |
| Watchlist                                                | Actual editable per-company notes.                                                                                                                                                                                                                                                                                                                             | Label an illustrative AAPL research note; retain a concrete question to revisit.                                                                                                                                                                                                                      | No claimed saved state, live quote or alert.                                                                                                     |
| Market News                                              | Actual source, publication time and optional related ticker metadata.                                                                                                                                                                                                                                                                                          | Explain the three reading checks; qualify ticker availability.                                                                                                                                                                                                                                        | No invented story, publisher, timestamp or freshness.                                                                                            |
| Guide                                                    | Actual max-drawdown topic definition.                                                                                                                                                                                                                                                                                                                          | Teach one useful concept immediately with a faithful short definition.                                                                                                                                                                                                                                | No conflicting formula or invented numeric example.                                                                                              |
| Community                                                | Actual question type, tickers, time horizon and source context in the composer.                                                                                                                                                                                                                                                                                | Label a sample research question; show how reasoning can have context.                                                                                                                                                                                                                                | No fictional member, post, likes, replies or activity.                                                                                           |

The controlled renders and independent model reviews are design evidence, not
real-human A/B or comprehension results. The original screenshot defect and
failed reproduction runs remain recorded rather than overwritten.

The inset-versus-divider comparison used identical content, fonts, source order
and 390/1440px widths (four renders). Both fit and added zero controls. The parent
selected the inset because its background clearly separates each example from
the introduction; the divider version reads as another paragraph. Final review
also inspected the rendered mobile and desktop examples. During this inspection,
the parent noticed missing Top Picks sequence numbers. A native browser probe
confirmed the global list reset produced `list-style-type: none`; explicit
`decimal` restores visible order without extra markup or controls. A maintained
browser assertion protects this regression. Forced colors already retains the
existing border and text, so no extra override was added.

## Verification record

Current artifacts are kept separately from the previous delivery under
`client/test-results/home-polish/` (ignored): hero comparison script, nine
renders and geometry results; disclosure RED/GREEN evidence; implementation
checks and final captures.

- Full frontend unit/contract suite: 258 suites, 1,680 tests passed. New proof
  module: 100% statements, branches, functions and lines. Existing required
  Portfolio/Top Picks (358 tests) and Watchlist (169 tests) coverage gates passed.
- Type generation/typecheck, ESLint, changed-file Prettier, production build and
  diff whitespace checks passed. One inherited Market News `<img>` lint warning
  remains. Local Node 24.15.0; CI declares Node 22. No new dependencies or lockfile
  changes. The remote CI environment was not run for this local-only delivery.
- Optimized build with isolated test configuration: 49 native Chromium Home and
  typography checks passed, zero retries, skips or flaky results; two additional
  Home theme checks passed. Includes all five mocked authentication destinations,
  restored/loading sessions, keyboard focus, no-JavaScript navigation, 320px
  layout, 200% text and blocked-font cases. These are not live Auth acceptance.
- Expanded disclosure regressions passed at 901px (just above the column
  breakpoint), 1440px and 3440px. Every individual expansion preserves sibling
  geometry; multiple disclosures can also remain open without toggling or moving
  sibling content. Small excerpts stay readable and non-interactive at 320px with
  normal/200% text and remain available in the server response without JavaScript.
- Final optimized captures at 320/390/901/1440/3440px have no document overflow.
  Parent inspected the refreshed numbered workflow, paired excerpts and expanded
  volatility panel; a fresh-context reviewer inspected six final captures and the
  last test changes with no actionable findings. The parent owns executed checks;
  independent review was source/image inspection, not another test run.
- Unrelated runtime seed archive and primary-checkout lockfile edits are excluded.
  No push, PR, issue write or merge is included. The existing-config local preview
  is restored on port 3117 and smoke-tested at 390/1440px; the old comparison on
  port 3118 is retained.

No changes to financial math, hosted Supabase, live account acceptance or cloud
deployment are inferred from these Home checks.

## Owner feedback and follow-up

The owner rejected the secondary excerpts as contrived and unhelpful. Prior
model reviews and technical passes did not establish human design acceptance.
The excerpts are pending a different direction, rather than being treated as an
accepted design. Separate, non-production concepts compare a text-led directory,
one actual UI crop, and task-based navigation under the same five-tool scope.
They remain local studies, not changes to authentication or product behavior.

The owner also explicitly asked to remove “One company at a time.” The hero now
retains only “Make sense of investing.” and its concrete supporting paragraph;
the unused span rule is removed. The Hero SSR test, six native viewport/no-JS
checks, scoped lint/format and diff checks pass. Independent source review found
no actionable issue. No push or merge accompanies this follow-up.
