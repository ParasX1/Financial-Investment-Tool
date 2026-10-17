# Task-first Home entry area

17 October 2026. Base `736f5143d`. The owner selected task-first concept C and
requested a more polished, original interface. Preserve the Signature identity,
dark/purple palette, shortened hero, actual Portfolio research desk and existing
authentication destinations. Local commit only; do not push or merge main.

## Research and selection

Current first-party references: [Framer](https://www.framer.com/),
[Stripe Payments](https://stripe.com/payments) and
[Notion Calendar](https://www.notion.com/product/calendar). Independent research
inspected their hero screenshots for composition and their parsed lower content
for task wording. Useful techniques are strong purpose/action hierarchy, fine
structural rules and explicit destination names. No award or conversion claim
is attributed to these current pages; their demos and product capabilities are
not copied into FIT.

Two refinements held the same three tasks, descriptions, five routes, brand and
font: editorial lanes versus asymmetric panels. These are design comparisons,
not real-user A/B tests. Prototype checks covered 320/390/820/1440/3440px with
normal/200% text, manual study tabs, 44px controls and a no-JavaScript fallback.
The parent inspected desktop/mobile images; a fresh-context visual reviewer
selected the editorial base. The asymmetric panel overemphasised Top Picks and
made a secondary area resemble another hero. Editorial refinement reduces the
category labels and promotes the actual task headings, with compact spacing.

## Requirement and implementation trail

| Requirement                      | Decision                                                                                                                                           | Verification boundary                                                                                 |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Start from user purpose          | One H2 followed by three independent H3 tasks; named tools stay visible. No mandatory numbered sequence.                                           | Inspect hierarchy and task-to-tool mapping in SSR and the integrated page.                            |
| Original, fluent presentation    | Editorial alignment, fluid width, fine violet rules, distinct route controls and restrained hover/focus feedback.                                  | Inspect real desktop/mobile composition, touch targets, focus and reduced motion.                     |
| Remove contrived examples        | Delete unused proof components/styles/tests and old paired introductions. No replacement fake records, screenshots, metrics or illustrative posts. | Source/diff audit and focused task tests.                                                             |
| Avoid repeated navigation        | Remove the three-link chapter overview. Portfolio stays under `#analyse`; supporting tasks share `#research-tasks`.                                | Confirm every rendered local anchor has exactly one target.                                           |
| Retain useful deep links         | Follow task uses `#follow`; learning/discussion task uses `#experience`, preserving footer Learning.                                               | Direct hash loads, footer click and no-JavaScript navigation.                                         |
| Preserve actual account behavior | Reuse `HomeRouteAction` and exact existing route objects/action labels for all five gated destinations. Guide and Help remain public links.        | SSR/loading/restored-user tests, callbacks, existing mocked sign-in journeys and Escape focus return. |
| Maintain simple source           | A small Home-specific component and scoped CSS, no new state, fetching, animation dependency or generic schema engine.                             | Independent source review and native project checks.                                                  |

The comfortable 44px target is a design choice; [WCAG 2.2 AA's minimum criterion](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
uses 24px with exceptions. Motion must remain optional and preserve access to
content, following [interaction animation guidance](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).

## Verification

Current evidence is kept separately under ignored `client/test-results/task-home/`.
Technical passes and model review do not establish the owner's visual preference.

The integrated refinement uses small category labels and prominent actual task
headings. Tool names remain concise visually, while their existing accessible
action labels and sign-in requirements are preserved. Normal desktops use
editorial lanes; very wide screens use three equal columns. Narrow containers
stack content. A font-relative container query also stacks enlarged text rather
than squeezing it into tablet columns; this follows the existing project's use
of container queries and [CSS containment guidance](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries).
No new JavaScript state, fetching or animation package is added.

- Structural RED reproduced the obsolete heading/composition contract; the new
  component, callback and loading tests then passed. Full final unit/contract
  suite: **257 suites / 1,673 tests passed**. Product/Task component coverage:
  **100% statements, branches, functions and lines**, measured on the final
  component source. Required Portfolio/Top Picks (358 tests) and Watchlist (169
  tests) coverage gates passed.
- Type generation/typecheck, final TypeScript check, ESLint, changed-file
  Prettier, final production build and diff checks passed. The inherited Market
  News `<img>` warning remains. Local Node 24.15.0 differs from CI Node 22; no
  remote CI result is claimed for this local-only delivery.
- Final optimized Chromium matrix: **59 passed**, zero skips, retries or flaky
  results; two further Home theme cases passed. Includes all five mocked sign-in
  destinations, restored/loading sessions, focus return, native Tab order,
  no-JavaScript anchors/public links, font failure and enlarged text.
- Task layout cases cover 320/390/820/1440/3440px at normal and 200% root text,
  complete control visibility during explicit layout inspection, 44px targets
  and no clipping/overflow. The tablet regression checks actions move below
  their explanation. Four focused reflow cases passed before the final matrix.
- Parent inspected integrated, focus and Portfolio-to-task captures. Final
  native images include 390/1440/3440px and 820px with 200% text. Fresh-context
  source/image review and focused rechecks found no actionable issues; those
  reviewers did not execute the parent's final test runs.

Failed and interrupted evidence is retained. An initial full suite could not load
three dependency modules due to sandbox EPERM errors; a subsequent run was
interrupted when the app closed. Neither was counted as a pass. A complete rerun
passed. Two initial SSR assertions expected the previous visible Guide wording;
the final assertions require its public destination, visible Guide label and
correct accessible name.

The first optimized matrix passed 56/57 cases: bare programmatic focus left
approximately 0.48px of one control below the viewport. A comparison reproduced
that boundary and showed viewport preparation avoided it. A later tablet case
exposed a similar subpixel edge plus visibly cramped text. Layout inspection now
explicitly centers targets using [scrollIntoView](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView)
and keeps the exact visibility assertion; the native Tab gate remains separate
and checks intersection, source order and focus, rather than 100% visibility.
This does not claim to fix or prove the browser's automatic-focus scroll cause.
The tablet text issue is addressed by content-aware reflow. No production focus
workaround was added. All original failure artifacts remain available.

The normal-configuration local preview was restored and smoke-tested at
390/1440px after the isolated acceptance run. Prototype pages are separate from
the implemented homepage. The unrelated runtime seed archive and primary
checkout lockfile change are preserved and excluded from this commit.

Held source hashes attribute the final build, test and capture evidence. No
changes to financial calculations, hosted Supabase, provider configuration,
dependencies or authentication contracts are included. Mock sign-in checks are
not live Auth/SMTP acceptance. Real-human preference, other browser engines and
screen-reader/device acceptance have not been measured in this iteration.

## Navbar and action refinement

The owner requested removal of the padlock glyph and a clearer top navigation.
The glyph is removed from shared homepage tool actions; sign-in requirements,
loading states, accessible labels and destination intent are preserved.

Current first-party [Linear](https://linear.app/) and [Framer](https://www.framer.com/)
navigation informed the separation of public exploration and account entry.
Their page content was inspected; this is not a claim of rendered visual testing
of those sites. Two local desktop variants used the same labels, sizing and routes:
a subtle framed group and an unframed group. Parent inspection selected the framed
desktop version for clearer grouping, with an unframed compact mobile version.
This is a controlled visual comparison and model judgement, not a human A/B test.

The Signature logo and navigation text are larger, desktop links are centered,
and Tools links directly to the task section. All four public destinations remain
available on mobile. The narrowest layout was refined to keep Help on the same
row at normal text size. Enlarged text can reflow into additional rows. Navigation
styles now live beside the component in their own CSS module; no menu state,
dependencies, sticky behavior or artificial active indicator was added.

Evidence for this follow-up is under ignored `client/test-results/home-nav/`.
The first browser run caught an invalid no-JavaScript geometry assertion in the
development fixture. Installed Next 15's Pages CSS loader injects development CSS
through JavaScript and extracts production CSS. The default no-JavaScript test
therefore checks native destinations, disabled auth entry and Tools navigation;
all 14 hydrated layout cases retain 44px target checks. Production no-JavaScript
geometry is checked separately using actual extracted CSS and a root-text-only
size override. The initial failure is retained. A local evidence-config working
directory error and its TypeScript configuration were also corrected and retained;
they changed no application code.

Final follow-up verification passed: **258 suites / 1,677 unit and contract tests**;
the existing **358-test research** and **169-test Watchlist** coverage gates;
typecheck, ESLint, changed-file formatting, production build and diff checks.
The inherited Market News image warning remains. Browser results were **16/16**
new cases against the default development fixture and **75/75** optimized Home
and brand cases, plus **2/2** Home theme cases. All **6/6** production no-JavaScript
probes passed at 320/390/1440px and normal/200% text. No skips or retries were used.
Source hashes and original failures are retained with those artifacts. Independent
source review found no actionable implementation issues; the development versus
production test-boundary finding was corrected before acceptance. These remain
local Chromium and mocked-provider checks, not remote CI or live Auth acceptance.
The normal-configuration preview was restored at port 3117 and smoke-tested at
320/390/1440px, including absence of the removed padlock glyph. Unrelated archive
and primary-checkout lockfile changes remain excluded.
