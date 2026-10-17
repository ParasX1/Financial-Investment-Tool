# Homepage task groups and copy refinement

Owner request, 17 October 2026: retain the homepage's overall direction, improve
subsection classification, UX and copy, and research beyond the existing layout.
Latest instruction: **local commit only; do not push or create a PR. Open the
working page after committing for the owner to review first.**

## Baseline and outcome

Work starts from verified DevBranch `10ccd112bf4a7cd7f72c076a0fc3fb2fb763e6bf`
in isolated `feature/home-section-refinement`. The newer upstream changes affect
launch tooling and Top Picks, not the Signature homepage. Preserve the primary
checkout's unrelated lockfile edit and older worktrees' runtime archives. Main
remains outside this task's integration scope.

The Signature hero, logo, palette, typeface and artwork are already accepted as a
direction. Below it, four flat product articles and a fifth Guide row obscure the
relationship between tools. Portfolio has an illustration; all other sections
repeat one text-row composition. Guide and operating support share one chapter.
Top Picks exists in the product but is absent from the homepage.

Acceptance: visitors can scan three meaningful task groups, recognize the actual
tools within each, jump directly to a group, and find learning separately from
support. Preserve public information and existing account/destination behavior.
Use the current shared components and native anchors rather than new navigation
state or an animation framework.

## Research and decisions

Researcher and parent checked current first-party content and source structure.
These observations and the following design decisions are not user-study results.

| Source                                                                                                                                                      | Observation                                                               | FIT decision                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| [Mercury](https://mercury.com/)                                                                                                                             | Related financial tasks are grouped; descriptions name concrete actions.  | Group tools by the question they help answer; keep visible product names and specific capabilities. No mega-menu for this smaller catalog. |
| [Linear](https://linear.app/)                                                                                                                               | Workflow chapters connect related capabilities and examples.              | Use a hierarchy of task heading, named tools, explanation and destination. Avoid five equal, lengthy paragraphs.                           |
| [Wealthsimple](https://www.wealthsimple.com/en-ca)                                                                                                          | A compact overview introduces choices before extended explanations.       | Put a three-link native overview ahead of the chapters, with tool names visible in each group.                                             |
| [Stripe Dot Dev](https://stripe.dev/)                                                                                                                       | Content has identifiable types and explicit filtering.                    | Differentiate analysis, ongoing research and learning by meaning; a multi-filter UI is unnecessary for six entries.                        |
| [WAI headings](https://www.w3.org/WAI/tutorials/page-structure/headings/) and [content structure](https://www.w3.org/WAI/tutorials/page-structure/content/) | Headings and thematic sections communicate organization programmatically. | H1 remains the hero; H2s name task groups; H3s name tools. Do not rely on visual borders or numbers alone.                                 |
| [WAI link purpose](https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html)                                                                | A link's purpose must be determinable from its text and related context.  | Preserve explicit tool actions and normal Guide/Help links. No repeated unexplained “Learn more.”                                          |

Award provenance was checked separately. Wealthsimple's official
[SOTD record](https://www.awwwards.com/sites/wealthsimple-com) is dated
10 March 2017. Awwwards' [official archive](https://www.awwwards.com/websites/css3-1/?page=45)
records Stripe Dot Dev's SOTD and Developer Award on 9 October 2024. These dated
submissions do not establish awards for today's Wealthsimple, stripe.com, Mercury
or Linear. Direct award-page retrieval timed out in the parent's session; the
primary search/archive records supplied the dates. No award or conversion claim
is applied to FIT. Site research here is first-party content/structure review;
the unavailable interactive browser controller is not represented as a current
visual inspection of those external sites.

## Alternatives under common tasks

Common tasks: find historical comparisons; save a company and research note;
read market news and inspect its source; understand a measure; find discussions
and operational help. Compare clarity, single obvious location, tool recognition,
reading cost, mobile reflow and implementation complexity.

| Alternative                                                      | Strength                                                                                             | Cost                                                                                                    |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Three task families: Analyse / Follow / Learn and exchange views | Stable categories for new and returning visitors; tools have one primary home; learning is explicit. | Tool names must remain visible so broad headings do not hide destinations.                              |
| Research journey: Find / Investigate / Follow / Discuss          | Explains a possible investment-research sequence.                                                    | News repeats across stages, learning is hard to place, and the sequence can imply a mandatory workflow. |
| Six equal cards                                                  | Direct product discovery.                                                                            | Offers little explanation of relationships and repeats the existing flat hierarchy.                     |

Select task families with a compact overview, varied editorial composition and
one occurrence of each tool in the detailed content. A fresh independent plan
review checked the same tasks and source contracts. This is a structured design
comparison and agent review, **not a real-human A/B test**.

## Content and integration boundaries

- **Analyse an idea:** Portfolio retains its clearly labelled educational
  illustration; Top Picks is a modest secondary destination. Describe historical
  return/risk research, not owned brokerage holdings or a recommendation service.
- **Follow your research:** pair Watchlist and Market News. The implemented
  Watchlist supports companies and notes, and news cards identify source/time;
  do not promise real-time quotes, notifications or verified investment advice.
- **Learn and exchange views:** Guide remains a public introduction; Community
  uses the existing gated action. Separate Help as support for using FIT. The
  default Guide topic is Sharpe Ratio; do not promise arrival at a volatility
  deep link.
- Top Picks already exists at `/TopPicks` and is gated in shared navigation.
  Extend only Home's typed destination contract and existing generic controller
  tests. Preserve the original four action labels. No Auth internals change.
- ETF remains explicitly sample-data preview; adding it as a live research
  product would misrepresent its current implementation.
- Preserve `#product` as the outer destination collection and `#experience` for
  learning; native overview anchors target `#analyse`, `#follow`, `#experience`.

## Evidence and verification

Ignored `client/test-results/home-sections/` contains baseline/final captures,
test logs and the local handoff. Baseline captures show the original five-row
composition on the fresh Dev source. Initial preview in a restricted process
listened but did not accept loopback connections; after terminating only that
owned process, the same server launched through reviewed normal execution and
returned HTTP200. No firewall/security setting was changed.

Required checks cover grouped discovery/heading order, all five gated actions
and retained destinations, loading/signed-in states, public/no-JS navigation,
keyboard focus, reduced motion, mobile/wide layouts, 200% text and font fallback.
Run affected Home tests, frontend type/lint/unit checks, production build and
relevant existing native browser journeys. Record actual outcomes and any
refinement before the local commit; no remote CI is implied by local results.

## Local acceptance, 17 October

The initial focused tests failed on exactly the missing overview and Top Picks
entry, then passed after implementation. Final Home verification passed 11 suites
and 39 tests, with 97.19% line / 95.65% branch coverage. Full frontend verification
passed 254 suites / 1,664 tests; TypeScript, ESLint and production build passed.
ESLint retains one existing Market News image warning. Changed files pass
Prettier; a wider Home-folder formatting check exposed pre-existing untouched
files, which were preserved.

Required Portfolio/Top Picks coverage passed 358 tests; Watchlist coverage passed
169 tests. Their first attempts failed before test execution because Jest could
not rename files in its sandbox temporary transform cache. Using the writable
workspace cache resolved that infrastructure failure. Both original logs remain
in the ignored evidence folder; no application fix or threshold change was needed.

Native Chromium against the optimized build passed 36/36 affected journeys with
zero retries, skips or flakes. This includes all five gated destinations through
mocked sign-in, loading/restored sessions, three native chapter jumps, six tool
headings, public/no-JS content, keyboard/focus/reduced-motion behavior,
320/390/1440/3440px layouts, 200% text and loaded/blocked fonts. Mocked sign-in
does not establish hosted provider acceptance. Existing runtime archives and
the original primary lockfile remain outside the patch.

Parent inspected baseline and revised full-page desktop/mobile captures. A fresh
independent reviewer inspected source, tests and 1440/390px screenshots, finding
no actionable issues. Its review did not execute browser tests or a build;
those results are attributed separately above. The new page is longer than the
flat baseline because it adds an overview, explicit hierarchy and Top Picks.
Native chapter jumps provide direct access; this is an accepted design tradeoff,
not evidence of better human task completion.

This revision is for local owner review. No GitHub issue, PR, push, remote CI,
hosted configuration change or main/Dev merge is part of this delivery.
