# Signature homepage redesign

Owner request, 15 October 2026: redesign the homepage's appearance, UX and
content substantially, informed by excellent and awarded design. Concept 12
Signature in the supplied identity sheet is selected for production. Earlier
technical acceptance did not establish owner satisfaction with the visual result.

Issue: [#352](https://github.com/ParasX1/Financial-Investment-Tool/issues/352).
Baseline DevBranch: `688ed10facd15c38deb1c0c176363e524003179d`; main remains
`c04875ef5d18d4134554fe36320bb05679125be4`. Work is isolated in
`feature/signature-homepage`; preserve the primary lockfile and older runtime
artifacts. The newer baseline changed documentation/market seed, not Home code.

## Research and implications

- [Mercury](https://mercury.com/): current desktop screenshot inspected by parent
  and researcher. A coherent scenic visual field, concise central proposition and
  concentrated violet action establish hierarchy. FIT should develop its own
  Signature-derived field; no Mercury imagery, claims or customer evidence is reused.
- [Daylight](https://daylightcomputer.com/) and
  [Apple AirPods Pro](https://www.apple.com/airpods-pro/): researcher inspected
  current desktop views. Large isolated imagery and successive feature chapters
  motivate a readable introduction followed by concrete capabilities.
- [Lusion](https://lusion.co/): researcher inspected current desktop view.
  [Lusion v3's award record](https://www.awwwards.com/sites/lusion-v3) identifies
  Site of the Day on 2 October 2023 and a Developer Award. Current newer content
  is not claimed identical to that submission. Study visual scale and selective
  emphasis; essential FIT content must not wait for an immersive loading scene.
- [Wealthsimple](https://www.wealthsimple.com/en-ca): researcher inspected current
  hero, visible Pause motion control and task-based financial categories.
  [Its SOTD record](https://www.awwwards.com/sites/wealthsimple-com) is from
  10 March 2017, not evidence that today's design won that award.
- [Are.na](https://www.are.na/): researcher inspected its sparse direct opening
  and task sequence. Explain actual FIT actions in plain language.
- [Pentagram's \_able](https://www.pentagram.com/work/able/story) and
  [Chapter 418's Decode Finance](https://www.chapter418.com/work/decode-finance):
  parent read designer case studies. Identity can shape messaging/composition,
  instead of being an unrelated corner icon. No awards or commercial outcomes
  are inferred from these studies.
- [Signature design](https://www.adobe.com/uk/creativecloud/design/discover/signature-logo-design.html),
  [Google optical identity construction](https://design.google/library/evolving-google-identity)
  and [IBM optical variants](https://www.ibm.com/design/language/ibm-logos/8-bar/):
  use original vector geometry, purposeful small-size adjustments and actual
  reversed/monochrome proofs. Borrow principles, not other brands' marks.
- WAI [pause/stop/hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
  and [animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html):
  prefer finite entrance and user-triggered motion, static reduced-motion output,
  native scrolling and immediate access to content. These criteria have different
  conformance levels; no blanket WCAG certification is claimed.

## Method and acceptance

Compare two compositions with identical headline, supporting copy, actions and
four real destinations: A, a centered Signature-led editorial opening followed
by wide product proof; B, a full-width typographic field guide with sequential
task chapters. Inspect desktop/mobile hierarchy, meaning, action discovery,
content order, overflow and motion. This is a technical/design comparison, not a
real-human A/B test or evidence of improved conversion.

The old 400px hero cap and requirement to pack six demonstration metrics into
the first screen describe the rejected composition. New visual acceptance is
clear purpose and reachable primary action on the first mobile screen, meaningful
product explanation below, accessible routes and comfortable reading. Keep
behavioral account/route, keyboard, focus, reflow and financial-honesty assertions;
replace obsolete layout assertions with checks of the new intended behavior.

Selected logo features: leaning upper loop, lower descender loop, entry crossing,
detached dot and rising swash, with readable FIT companion type. It resembles
cursive fi; do not force an invented third stroke. Preserve the shared logo API
and functional-link names. Compare full and optical variants at 16/24/32/44/128px.

## Prototype comparison and implementation decision

Both standalone prototypes were rendered at 320/390/1440/1920px with the same
core copy, primary/secondary actions and destinations. The parent inspected
desktop A/B and mobile A images. Native checks recorded no document overflow,
loaded Geist, valid internal anchors, visible illustration labels, no page errors
and static reduced-motion states. At 320x568 the primary action bottom was
460.7px in A and 499.6px in B. These are prototype measurements, not application
authentication acceptance. A mobile B text-strip clip was refined before capture.

Select A for its distinct Signature-derived visual field and clearer hierarchy
between introduction and product explanation. B gives quick chapter navigation
but repeats large text chapters for substantially longer scrolling. This is a
parent design decision, not owner approval or an empirical preference result.
Production must tighten repeated abstract perspective/question copy into concrete
capabilities, keep all four real route actions and public learning navigation,
and use the wide canvas without stretching reading lines.

Baseline Home captures precede Home implementation but concurrent Signature work
was already visible in the header; they are Home-layout baselines, not an old-logo
control. Artifacts are in ignored `client/test-results/signature-home/`.

## Implementation and local acceptance snapshot

The selected Signature is custom vector geometry with a related optical favicon,
preserving the shared logo API and accessible naming. Complete SVG geometry and
16/32px ICO pixel correspondence pass 16 tests. Native 16/24/32/44/128px dark/light
proofs were inspected; the light proof is a recolor, not an application light theme.

Home now has a centered introduction, full-width original Signature artwork, one
wide educational portfolio illustration, open product chapters, public learning
links and a clear closing action. Three explanatory metrics replace six placeholder
classification cells. Remove the obsolete route strip while retaining all four
destination actions and the unchanged account-entry controller. Mobile navigation
keeps sign-in; the primary signup remains visible in the hero. Guide/Help remain
public in the learning/footer sections. No dependency, backend, hosted Supabase or
financial-calculation change is introduced.

Local verification: 254 frontend suites / 1,660 tests; required 358 research and
169 Watchlist coverage tests; Home 35 tests with 97.05% line / 96.55% branch
coverage. TypeScript, ESLint (one existing Market News image warning), formatting
and production build pass. Parent inspected native desktop/mobile full-page and
first-fold images. Initial browser checks were 57/63: four obsolete mobile-navbar
expectations, an ambiguous Help lookup, and a Portfolio redirect timeout during
a 5-second development compilation. Corrected Home checks passed 17/17; the
unchanged Portfolio redirect also passed against the production runtime.

Full production browser acceptance recorded 161 passes and the previously tracked
#257 pointer-measurement failure. The SVG can be recreated between visibility and
an external bounding-box query. A focused test refinement uses a synchronous DOM
size read and locator-relative hover, whose native stability/event checks follow
[Playwright's actionability contract](https://playwright.dev/docs/actionability).
Date, numeric-value, missingness and dot-count assertions remain unchanged; no
financial chart implementation is modified. Original failed evidence is retained.
The refined three chart contracts passed three repetitions without retries
(nine checks, 16.8 seconds); this is bounded regression evidence, not a permanent
flakiness guarantee.

Fresh independent prototype, identity and combined source reviews found no
remaining actionable production findings. The combined reviewer's native browser
launch was blocked before navigation; its findings are source/rendered-evidence
review, not reviewer-executed browser acceptance. Parent native checks remain
separately recorded. These results do not establish human preference, live-market
accuracy, full WCAG conformance or cloud deployment.

Current immutable PR review, trusted CI, merge and final trial evidence are
recorded on [issue #352](https://github.com/ParasX1/Financial-Investment-Tool/issues/352)
after this local snapshot. Main remains held.
