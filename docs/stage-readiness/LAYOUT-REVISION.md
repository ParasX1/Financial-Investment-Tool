# FIT layout and identity revision

Owner request: make better use of wide screens, reconsider the Home experience,
explore substantially different logos, and permit major visual changes including
typography. Preserve the dark/black and purple/blue-violet identity. Research,
controlled comparisons, fresh review and useful verification precede acceptance.
The owner selects a logo; the concept boards are not production marks.

Issues: [#346](https://github.com/ParasX1/Financial-Investment-Tool/issues/346)
and [#347](https://github.com/ParasX1/Financial-Investment-Tool/issues/347).
Branch: `feature/layout-and-logo-exploration`, starting from DevBranch
`c3e029f8f6f75612aed900a85afe86d0df6b2dee`. Main remains
`c04875ef5d18d4134554fe36320bb05679125be4`; promotion PR #319 remains outside
this change's merge scope. The primary checkout's unrelated lockfile edit is
preserved. This record extends, rather than replaces, the earlier
[brand readiness evidence](BRAND-EXPERIENCE.md).

## Decisions and evidence by section

| Requirement / uncertainty      | Alternatives and actual evidence                                                                                                                                                                                                                                                                                                                                  | Decision / refinement                                                                                                                                                                                                                                                                                                | Acceptance boundary                                                                                                                                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wide app frames                | Native baseline capped the shared wrapper at 1,680 CSS px at 1,920/2,560/3,440. At 3,440, the collapsed-rail wrapper began around x=904.5. Compared a global cap with a fluid frame and local reading measures.                                                                                                                                                   | Remove the shared cap; preserve 64/232 px desktop and 52 px mobile navigation, bounded gutters and local forms. Remove unused duplicate width tokens.                                                                                                                                                                | Native 5-cell 320/390/1,920/3,440 rail-state checks passed before typography integration. Observed 3,361/3,193 px content widths at 3,440 collapsed/expanded, respectively. Final integrated sweep pending.                              |
| Enlarged-text action wrapping  | At 390 px and 200% root text, Watchlist's news action extended past the viewport under both old and new frames. Compared action-container bounds alone with container and direct-child bounds.                                                                                                                                                                    | Bound the shared header action children as well as their container; permit wrapping.                                                                                                                                                                                                                                 | Five refined frame cases and two short mobile cases passed; actual button bounds and focus were checked. Text resize is not browser zoom.                                                                                                |
| Learning text on wide displays | Guide body measured 2,979 px and Help FAQ 1,919.36 px at 3,440. A whole-page cap still left long lines; a local 70ch measure kept the workspace spacious and bounded paragraphs.                                                                                                                                                                                  | One reusable local reading class for card bodies, questions/answers and topic introductions. Formula rows retain their own horizontal scrolling.                                                                                                                                                                     | Four viewport checks and two formula-access checks passed before typography integration. `ch` measures the zero glyph, not literal characters or WCAG conformance.                                                                       |
| Home composition               | R1 matched workspace-first and asymmetric editorial prototypes with the same copy, routes, illustrative data and controller fixtures. The asymmetric version exposed the product earlier on desktop; the first version's small-screen “visible panel” claim did not prove useful chart content was visible.                                                       | Refine the asymmetric composition: bounded introduction beside a fluid product workspace; bounded chart height; shorter mobile introduction; six metric labels; no fabricated financial results.                                                                                                                     | R2 established visible chart/metrics and route fixtures, but fresh review found a mobile keyboard regression.                                                                                                                            |
| Home keyboard order            | R2 moved a route strip below the workspace visually while leaving it before card actions in source. Native Tab reproduced a 1,341 px backward scroll at 320×568. R3 compared hiding the redundant mobile strip with moving it in both source and visual grid.                                                                                                     | Select the smaller hide-strip change: preserve desktop shortcuts and all four card destinations, remove duplicate mobile stops, align header/source and supporting-panel actions. No positive tabindex.                                                                                                              | Independent reviewer checked every rendered focusable at 320×568, 390×844, 1,440 and 3,440, plus enlarged-text checks. Both alternatives passed. This is automated technical evidence, not human preference or screen-reader acceptance. |
| Font and hierarchy             | Matched system Arial, IBM Plex Sans and Geist Sans under fixed sizes/copy/palette/interactions. All 18 font-only cells reflowed. Geist's original variable WOFF2 is 69,760 bytes; Plex's two tested faces total 130,080 bytes and do not include a true requested 700 face. Actual rendered glyphs, delayed/blocked font loading and numeric widths were checked. | Adopt self-hosted original Geist for coherent weight coverage and a restrained identity; retain platform/CJK fallback and existing semantic tabular numerals. Desktop 48 px was preferable to 56 px in the narrow introduction; retain compact mobile sizing where a complete chart in the short first fold matters. | No measured human readability or conversion superiority. One cold local run cannot establish a performance winner. Combined production typography/layout acceptance pending.                                                             |
| Logo breadth and purpose       | Two generated contact sheets contain 24 numbered directions. Primary identity research covered reductive marks, custom typography, grids, negative space and purpose-driven systems. The first sheet's fused “FIT” in 01 reads ambiguously; some other symbols are generic.                                                                                       | Keep the boards as divergent proposals. Second round uses comparison, evidence, framing and considered-choice metaphors. Do not install a generated raster mark or infer recognition, originality/legal clearance or a selected direction.                                                                           | Owner preference is pending. Selected concepts will need vector construction, small-size/reversed/monochrome checks and further refinement.                                                                                              |

## Primary research used

Layout and reading:

- [Carbon 2x grid](https://www.carbondesignsystem.com/building-blocks/foundations/2x-grid/overview): fluid/fixed/hybrid options, fixed gutters and meaningful scaling. A breakpoint is not a universal content cap.
- [SAP dynamic page layout](https://www.sap.com/design-system/fiori-design-web/v1-151/page-types/page-layouts/dynamic-page-layout): responsive workspace composition.
- [GOV.UK layout](https://design-system.service.gov.uk/styles/layout/) and [USWDS line measure](https://designsystem.digital.gov/design-tokens/typesetting/measure/): local reading measures. WAI's [visual presentation](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html) is AAA guidance, not an AA claim for this implementation.
- WAI [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [resize text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), [focus order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html), [meaningful sequence](https://www.w3.org/WAI/WCAG22/Understanding/meaningful-sequence.html); MDN [flex ordering](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Ordering_items). Source order and CSS order must be evaluated together.

Product/design references:

- [Koyfin](https://www.koyfin.com/features/), [TradingView](https://www.tradingview.com/features/), [Finviz](https://finviz.com/), [Morningstar](https://www.morningstar.com/), [Linear](https://linear.app/), [Stripe](https://stripe.com/) and [Apple](https://www.apple.com/): named workflows and product context informed alternatives; their popularity does not prove FIT usability.
- Verified awards: [Michele Du](https://www.cssdesignawards.com/sites/michele-du/48375/) was CSSDA Website of the Day on 22 November 2025; its live site was inaccessible, so no rendered-site inspection is claimed. [Quants](https://www.cssdesignawards.com/sites/quants-vermogensmanagement/47075/) received Special Kudos on 18 February 2025, not Website of the Day. Awarded presentation is inspiration, not evidence of accessibility or financial comprehension.
- [WAI pause/stop/hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html): finite entrance motion and reduced-motion handling avoid unnecessary persistent animation. Interaction-animation guidance is separately AAA.

Typography and identity:

- [Geist](https://vercel.com/font), [official font repository](https://github.com/vercel/geist-font), [IBM typeface guidance](https://www.ibm.com/design/language/typography/typeface/) and [Carbon typography](https://www.carbondesignsystem.com/building-blocks/foundations/typography/overview). Original binaries and OFL notices are retained; no font build-network dependency or new package is required.
- [IBM 8-bar](https://www.ibm.com/design/language/ibm-logos/8-bar/), [Wise / Ragged Edge](https://raggededge.com/partnerships/wise), [Wise announcement](https://wise.com/gb/blog/a-brand-for-everywhere-wise-unveils-bold-new-look), [Monzo's 2022 update](https://monzo.com/blog/weve-had-a-little-makeover), and [Raylo / Pentagram](https://www.pentagram.com/work/raylo/story): reduction, optical adjustments, type roles and purpose-driven identity systems. Wise's D&AD reference is a shortlist, not a Pencil; marketing causality and claimed future WCAG compliance were not adopted as established evidence.
- Classic and award references included Mastercard/Slack/Pentagram, [MIT Media Lab's 2015 D&AD Graphite branding](https://www.dandad.org/work/d-ad-awards-archive/mit-media-lab-identity), [Toledo Museum's 2024 D&AD Yellow branding](https://www.dandad.org/work/d-ad-awards-archive/toledo-museum-of-art-rebrand) and [Volkswagen Group's 2024 Red Dot corporate-design winner](https://www.red-dot.org/project/volkswagen-group-shaping-mobility-for-generations-to-come-73366). They are distinct award scopes, not an industry ranking of “best logos”. Guggenheim's custom type/symbol informed exploration without an award claim.

## Cross-page refinement

A native sweep covered 84 states across Guide, Help, Watchlist, Market News,
Community, Profile and Portfolio at 320/390/1,920/3,440 CSS px and normal/doubled
root text. Eighteen focused states allowed navigation settling; use those exact
rail measurements rather than transient hover widths from the initial sweep.
Sixteen public Auth states opened sign-in/create-account without submissions.
All normal-text states had no document overflow. These presentation fixtures do
not prove populated analytics or hosted profile loading.

The sweep found three existing enlarged-text defects. Community's title/copy
was intrinsically 302.48 px inside a 229 px mobile header; restoring the previous
frame cap did not fix it. A local copy width bound and emergency wrapping passed
six mobile and three desktop checks. Profile's avatar/grid clipped inside the
card; bounding only one of the track or avatar was insufficient. Watchlist's
fixed-rem grid could place Remove outside a hidden-overflow list. A max-content
actions alternative did not work at 1,440 px with an expanded rail. The local
track/avatar bounds and inherited-font container reflow are being verified under
#347; account and data controllers are unchanged.

The Home refinement also compared 10/11 px small-screen disclosure/Guide-link
text with 12 px under the same layout. The 12 px option retains the complete
100 px chart and first three metric labels at 320×568, and the 120 px chart plus
all six labels at 390×844. Readability was preferred over tiny text. This is a
technical geometry comparison and design judgement, not a human reading study.

The font foundation's eight native checks confirmed actual Geist glyph rendering
in public pages, body-mounted Auth and MUI controls, aligned numeric specimens,
platform Chinese fallback and usable blocked-font recovery. The original WOFF2
and OFL notices match pinned upstream hashes; scoped Git attributes preserve the
original asset/license bytes across checkouts. Chinese fallback is platform
dependent; no new full CJK font was downloaded or claimed.

Final source review applies the current
[Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)
and React guidance to the installed React 18/Next 15 Pages Router architecture.
Their optional vendor migrations, new React APIs and generic visual defaults
are not treated as requirements. Existing semantic controls, account state and
shared design roles are preserved.

Production browser integration exposed test-harness assumptions beyond Home's
owned tests. The first full run recorded 149 passes and nine failures, with no
flaky classifications. A matched EventSource control proved the Markdown editor
was editable and its preview worked whether the public stream was active or
aborted, while `networkidle` timed out only with the active stream. Replace that
wait with a concrete editable-field assertion, as the installed Playwright API
and [primary documentation](https://playwright.dev/docs/api/class-page#page-wait-for-load-state)
recommend.

Fresh trace review established that Portfolio fixtures matched only API port
8080 while the production trial used configurable port 8082. The real metrics
responses exactly explained mismatched allocation assertions; the keyboard
geometry assertions had already passed. Fixtures now intercept the metrics path
regardless of port, retaining all numeric/missingness assertions. Two old Home
heading assertions were updated to the new copy and the browser-history test now
selects Guide within the named Home navigation, resolving its duplicate-link
ambiguity. Application analytics and streaming behavior remain unchanged. The
complete corrected production run is recorded separately from the first failed
run; neither failures nor configured retries are hidden.

The corrected full matrix completed 158 journeys with zero unexpected failures:
157 first-pass successes and one Watchlist queue success on configured retry.
The retained first failure read the synthetic backend before deletion completed;
the UI intentionally removes the row optimistically. The page-object helper now
waits for the confirmation dialog to close, which occurs after the asynchronous
repository operation succeeds. Three fresh repetitions with retries disabled
passed (8.7 seconds total). Application mutation behavior is unchanged.

## Reproduction and boundaries

Ignored local artifacts live under `client/test-results/layout-revision/`:
`workspace/`, `learning/`, `page-families/`, `home/` and `prototypes/`.
Prototype R1/R2 files are frozen and their hashes were checked after refinements.
R3 retains full native keyboard inventories, focused screenshots and negative
controls. Typography retains preregistration, source hashes, CDP rendered-font
evidence, matched geometry and blocked/delayed loading results.

The preview browser's requested viewport overrides did not equal actual CSS
`innerWidth`; those numbers were not accepted as native geometry. Isolated
Playwright CSS viewports supplied the authoritative measurements. Native
automated comparisons, model visual judgement and fresh independent review are
labelled separately from real-user A/B testing, which was not run.

No hosted Supabase changes are required by this UI revision. Source/fixture Auth
tests do not establish OAuth, signup delivery, SMTP, backup/recovery or Storage
acceptance. The prior hosted acceptance record remains separate. Open operational
issue #268 and future-capability issue #257 are not closed by visual work.

## Local acceptance snapshot before publication

- TypeScript passed, including a follow-up after final test/metadata cleanup.
- Full ESLint had zero errors and one existing Market News image warning;
  affected follow-up files passed scoped ESLint. Changed files passed Prettier
  and diff whitespace checks. Original font/license hashes were verified.
- Frontend: 253 suites / 1,655 tests passed. Required research coverage:
  48 suites / 358 tests passed. Watchlist coverage: 22 suites / 169 tests passed.
  Home's scoped coverage was 97.34% lines / 97.05% branches; all 33 Home tests
  passed again after removing unused icon metadata and undefined font-token
  references. No new dependency or framework was introduced.
- Production builds passed with both explicit public fixture values and the
  existing real public configuration. No environment copy or credential-bearing
  artifact was created. Native production results and their refinements are
  described above; hosted/provider and human acceptance are separate.
- The real local build on 3113 restored the owner's existing session, exposed
  direct Home destinations and loaded the real saved Watchlist. This was
  read-only; no entries or account settings were modified. The final public
  Home was separately captured at 1,440/390 in an isolated anonymous context;
  the preview tab was returned to Home for the owner to try.

The immutable PR's review, trusted GitHub CI and DevBranch merge are recorded in
the [#346 timeline](https://github.com/ParasX1/Financial-Investment-Tool/issues/346),
which is the current integration authority after this snapshot. The legacy
Vercel preview failure is tracked separately under the owner's code-CI merge
authorization. Main remains held; logo selection, operational #268 and future
#257 boundaries remain explicit.
