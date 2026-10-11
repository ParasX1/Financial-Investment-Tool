# FIT brand, landing and account experience

The local redesign uses an original stepped F mark, a shared neutral-dark palette
with deep blue-violet actions, a paired Home proposition/product view and a compact
account sheet. Research, matched prototypes and independent reviews informed these
choices. The 53-case native browser suite and production build pass. Production
SSR, bounded performance criteria and redesigned real-account login are recorded
below. The non-Portfolio fixes are verified; exact-head CI remains an integration
gates; these local results do not establish a release.

## Scope and baseline

- Isolated branch/worktree: feature/brand-experience, .audit/brand-experience.
- DevBranch baseline: b9fa09f93003133ed1225b869683b0120839197e.
- Held main baseline: c04875ef5d18d4134554fe36320bb05679125be4. Existing authorization
  covers necessary reviewed, green PRs into DevBranch; main remains unmerged.
- Actual installed versions: Next 15.5.27, React 18.3.1, MUI 5.18.0 and
  framer-motion 11.18.2. The initial 15.5.21 research note described a different
  checkout and was corrected. The exact-lock dependency junction was verified.
- Preserve the existing 3111 trial and unrelated primary-checkout lockfile edit.
  Local redesigned browser evidence uses explicit dummy-provider fixtures at 3113.

An authorized existing test account signed in through the actual FIT UI and reached
Portfolio **before this redesign**. That establishes the earlier account's
login/redirect only. It does not accept the new UI, signup, email delivery or OAuth.
No credentials, environment secrets or private account data belong in this record.

Linked test reports and screenshots under client/test-results are ignored local
audit artifacts in this worktree. They are inspectable here but are absent from a
fresh checkout. Durable sanitized summaries or PR attachments, with accessible
links, remain part of the parent's integration handoff.

## Website research and design decisions

The reference sites informed principles; the production layout, artwork and FIT
identity are original. Award records establish the named award, not FIT usability,
human preference or comparative performance.

| Primary reference                                                                                                                                                                                                | Verified observation or qualification                                                                                                                                                                                                          | FIT decision                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Apple MacBook Pro](https://www.apple.com/macbook-pro/) and [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/)                                                                          | Product-led hierarchy, generous space and limited actions. Inspected deployed CSS uses component-specific 300–344 ms transitions. HIG supports brief purposeful motion and semantic color; native Liquid Glass is not equivalent to CSS blur.  | Pair a clear proposition with one product illustration, then workflow chapters. Keep content visible during finite motion; no copied Apple assets or assumed font license. |
| [Linear 2026 refresh](https://linear.app/now/behind-the-latest-design-refresh)                                                                                                                                   | Quieter navigation, softer separators and warmer, less saturated gray. A first browser capture caught delayed hero visibility; a later capture showed the content. The 2024 LCH article remains historical rationale.                          | Quiet chrome and strong task hierarchy; essential content must not wait for a reveal.                                                                                      |
| [Raycast](https://www.raycast.com/) / [press](https://www.raycast.com/press), [Resend](https://resend.com/), [Geist colors](https://vercel.com/geist/colors) / [typography](https://vercel.com/geist/typography) | Distinct surface, border, text and action roles. Raycast press-kit values differ from current homepage evidence; Resend stylesheet tokens alone do not prove the rendered theme. No Raycast/Resend award was verified.                         | Use neutral surface steps, readable sans type, restrained FIT violet and separate bright-link/deep-action roles.                                                           |
| [Lusion v3 CSSDA 2023](https://www.cssdesignawards.com/blog/2023-website-of-the-year-winners/394/) / [Awwwards entry](https://www.awwwards.com/sites/lusion-v3) / [current site](https://lusion.co/)             | CSSDA Website of the Year 2023 and Best Agency; Awwwards Site of the Day on 2023-10-02. The current canvas-led site need not equal its awarded 2023 version. Its light shell and blue/black/white object do not establish a dark-only palette. | One memorable original product object and coherent chapters. Persistent WebGL, preloaders and sound would require separate justification and performance evidence.         |
| [Active Theory V6 and Cartier CSSDA 2024](https://www.cssdesignawards.com/blog/2024-website-of-the-year-winners/414/)                                                                                            | Active Theory won Best Innovation; Cartier won Best UI. Neither was the overall Website of the Year winner. Current Active Theory browser evidence shows sparse controls around a reflective central mark.                                     | Controlled continuity between chapters while preserving normal navigation and accessible controls. Jury awards do not measure FIT mobile performance.                      |
| [Google identity branding](https://developers.google.com/identity/branding-guidelines)                                                                                                                           | Approved provider artwork uses the multicolor G. FIT's earlier monochrome G was a presentation mismatch.                                                                                                                                       | Adopt the official dark outlined button without changing providers or OAuth contracts; provenance is recorded below.                                                       |
| [WAI forms](https://www.w3.org/WAI/tutorials/forms/), [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and [web.dev animations](https://web.dev/articles/animations-guide)                                              | Visible labels, autofill/error association, contrast, reflow, focus and targets; transform/opacity-first motion and reduced-motion handling.                                                                                                   | Test real viewport, enlarged-text, keyboard and failure states. Technical checks remain separate from screen-reader/device and human trials.                               |

The parent inspected Apple, Linear, Stripe, Lusion and Active Theory in the actual
browser. At the inspected 1280 px width, Apple used black chrome and 600-weight
SF/Helvetica sans; Linear used rgb(8,9,10) and an inspected Inter Variable heading
at weight 510. Stripe's regional page paired a colorful wave with neutral copy.
These are observations at specific conditions, not universal brand tokens or
measured speed/preference comparisons.

## Matched concepts and fresh review

Precision, Horizon and Editorial used the same FIT proposition, entry actions,
illustrative workspace and sign-in/sign-up fields at 1440, 390 and 320 px.

| Concept   | Original identity and composition                                  | Palette proposal                                           | Qualitative finding                                                                                                                                                |
| --------- | ------------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Precision | Folded F, centered benefit and wide product panel                  | Neutral Obsidian; bright violet links, deep violet actions | Clear hierarchy; the angular F had qualitative resemblance to familiar Framer-like marks despite different geometry. It was not transferred to the final identity. |
| Horizon   | Open focus/F mark, static violet-blue horizon and centered product | Midnight Periwinkle; deep blue-violet actions              | Coherent atmospheric object; desktop product evidence began around y800.                                                                                           |
| Editorial | Geometric FIT wordmark and left proposition paired with product    | Graphite Lilac; pale action with dark ink                  | Strong simultaneous proposition/product composition; desktop product evidence began around y216.                                                                   |

The authoritative native HTTP prototype run passed **427 checks with 30 screenshots**:
27 direction/view/viewport combinations and three desktop crops. Minimum observed
normal-text contrast was 7.169:1, link/action text 5.623:1, focus 10.777:1 and input
border 4.117:1. These values describe the static prototypes.

A reviewer started without prior chat history or a preferred winner, rendered all
27 conditions and inspected 15 shots. The reviewer reproduced Editorial's 320 px
monochrome-strip overflow; wrapping and gap refinements resolved it. The parent
viewed the three desktop compositions and selected Editorial's pairing/quieter
structure, refined with a neutral black/gray base and deep blue-violet action.
This is a model/owner design judgement, not a human A/B study.

Earlier infrastructure, selector and focus-setup failures remain archived. A later
fresh check also exposed a no-JavaScript false positive: query-selected signup
still displayed the sign-in preview without name fields. **No-JS signup fallback
is unverified.** Static landing information and public navigation remain available;
account/analysis interaction is explicitly JavaScript-dependent.

Source hashes, conditions and failed runs are preserved in
[COMPARISON.md](../../client/test-results/brand-design/COMPARISON.md) and
[REVIEW.md](../../client/test-results/brand-design/REVIEW.md). Prototype submissions
and Google actions were disabled; they provide no authentication acceptance.

## Dedicated logo research and selected identity

Logo research used primary designer/brand accounts for
[Mastercard](https://www.pentagram.com/work/mastercard/story),
[MIT Media Lab](https://www-prod.media.mit.edu/posts/MLBrandPortal/),
[Slack](https://www.pentagram.com/work/slack/story),
[Airbnb](https://www.further.group/work/airbnb),
[Dropbox](https://wearecollins.com/case-studies/dropbox/),
[historical Mozilla](https://www.johnsonbanks.co.uk/work/mozilla) and
[SF Symphony](https://wearecollins.com/story/sfsymphony/).

MIT's identity received [D&AD Graphite, Branding, 2015](https://www.dandad.org/work/d-ad-awards-archive/mit-media-lab-identity).
SF Symphony's [2021 D&AD record](https://www.dandad.org/work/d-ad-awards-archive/san-francisco-symphony-dynamic-typography)
lists two Yellow and two Graphite pencils for identity/typography work; the exact
pencil-to-category mapping is not exposed. Other specific identity awards were not
verified. Mozilla's 2017 wordmark is historical and was superseded by its 2024 flag
identity. These are identity awards, not universal best-logo rankings.

The useful principles were strategy before pictogram, one core geometry with a
coordinated wordmark, reproduction/background checks and a static identity that
survives monochrome. Original index-tab F, open-field and FIT-family approaches
were compared at native 16/24/32 px. Initial P/Q/R and refined P/R/S comparisons
led the parent to select **S**, an upright F with a stepped upper terminal. “Index
tab” is an intended metaphor; visitor recognition and trademark clearance were
not tested. The 2-unit terminal step is only 1 px at 16 px, so recognition must not
be inferred from that detail.

One canonical 32-square path supplies the inline mark, public SVG and SVG favicon;
16/32 px ICO entries use the same glyph. Actual guest Home/Auth/sidebar checks
passed, including 36/32/28 px marks. The actual compact-sidebar mark is **28 px in
a 47 px control within a 64 px sidebar**; the comparison fixture's 52 px control
within a 58 px column is a separate prototype condition.

The initial native ICO fixture failed with broad request interception. A controlled
routing comparison retained identical bytes: un-routed HTTP and data-URL decoding
passed, while intercepted HTTP failed. Both native 16/32 entries also decoded
through Windows System.Drawing; the routed failure remains archived. This was
not an encoding defect waived by inspection. Legacy PNG hashes remain unchanged.

The final fresh logo reviewer found no actionable defects, independently passed
13 focused tests, verified six final hashes and decoded both ICO entries. FitLogo
has 100% scoped statement/branch/function/line coverage. Forced-colors evidence is
Chromium emulation; human recognition, screen-reader testing and trademark
clearance remain unverified. See
[IDENTITY-EVIDENCE.md](../../client/test-results/brand-design/logo-evidence/IDENTITY-EVIDENCE.md).

## Implemented Home, account sheet and shared palette

| Requirement                                                   | Implementation and refinement                                                                                                                                                                                                                                                                                                      | Completed evidence and boundary                                                                                                                                                                                                                    |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Uniform visual roles                                          | Shared page/panel/input #09090B/#141418/#1C1C22; primary/muted text #F4F4F5/#A1A1AA; bright link #A78BFA; filled action/hover #5B50E6/#4F46E5 with white labels; focus #C4B5FD; control border #71717A. CSS, Bootstrap, MUI and body-mounted portals use the shared roles. Financial/status colors retain separate meaning.        | Shared source and browser checks; action text is separated from pale badge/danger ink and bright links. The proposed palette is original FIT work, not copied official tokens.                                                                     |
| Honest paired Home preview                                    | 600-weight sans proposition beside decorative metric geometry and readable HTML rebased-return, volatility, drawdown and Sharpe labels. Alpha, VaR and sampled-opportunity copy was checked against the actual Portfolio registry. Clear Illustrative view/no-account/no-calculated-results caption replaces the allocation donut. | Five native viewport checks, including 1280×720 complete hero CTA, pass. The 1280×600 hero CTA remains scroll-reachable. No numerical account result, accuracy or return promise is implied.                                                       |
| Home access and destinations                                  | Compact mobile identity, distinct Sign in/Get started, preserved public navigation and existing gated destinations. Fresh review found incomplete accessible action names and enlarged-text overflow; red regressions drove corrections.                                                                                           | 27 Home tests in nine suites; affected gated/loading cases and seven baseline/enlarged-text browser cases pass. Home coverage: statements 98.83%, branches 100%, functions 95.45%, lines 98.73%. Final aggregate browser acceptance remains below. |
| Compact account presentation                                  | One centered max-472 px sheet, 16 px/50 px inputs and 280 ms finite opacity/transform entry; reduced-motion removes transitions. Corrected an independently reproduced 8 px vertical-centering offset while preserving installed Modal gutter/focus ownership.                                                                     | 48 tests in seven suites and 10 native fixture journeys pass. AuthDialog coverage: statements 97.14%, branches 97.05%, functions 95%, lines 98.95%. Seven settled screenshots were inspected.                                                      |
| Preserved auth behavior                                       | Existing providers/controllers, short legacy sign-in passwords, signup validation, safe redirect, pending locks, mode/reset/password hiding and email-confirmation behavior retained.                                                                                                                                              | Source, unit and mocked native-browser boundaries pass. Provider token/signup responses are fixtures; live registration, delivery and OAuth remain unaccepted. The separate real login is recorded below.                                          |
| MUI action contrast without overriding local secondary styles | Native ETF 503/Retry regression first measured 3.538:1 and failed the 4.5:1 criterion. Initial fix passed, but independent review reproduced its stronger selector overriding Top Picks' local default/hover styles. Refined to MUI 5 ownerState callbacks: empty disabled override, ordinary enabled default/hover rules.         | ETF red/green and eight foundation tests retained. Top Picks secondary-action red is retained; the refined ETF and Top Picks cases both pass, as does the integrated 53-case suite.                                                                |

After an interrupted write, Home CSS alone was entirely NUL bytes (16,890 bytes);
its TSX was intact. The stylesheet was reconstructed and the recovery checkpoint
scanned 45 edited text files with zero NUL bytes. This records a bounded source
recovery, not a claim that every asset is a text file.

Home's development probe used cached Chromium, 4× CPU throttle and no network
throttle. Two samples had 16.7 ms median frame intervals, CLS 0 and no continuing
animation after settling; frame maxima were 50.2–66.8 ms, with one frame over
50 ms per sample. The latest initial long tasks were 632/428/166/156 ms. No
matched old/new production baseline was measured; these results do not establish
production LCP/INP or attribute all startup work to Home.

Detailed conditions and refinements:
[Home handoff](../../client/test-results/home-production/HANDOFF.md),
[layout/performance record](../../client/test-results/home-production/layout-performance.json)
and [Auth verification](../../client/test-results/auth-finish-evidence/verification.md).

### Google asset provenance and label parity

The public [google-signin-dark.svg](../../client/public/brand/google-signin-dark.svg)
is the unchanged full-text dark outlined Android/Web asset from
[Google's official archive](https://developers.google.com/static/identity/images/signin-assets.zip),
linked by the [branding guidelines](https://developers.google.com/identity/branding-guidelines).
Its archive entry is Android + Web/SVG/Dark/Theme=Dark, Show text=Yes,
Shape=Square, Platform=Android+Web.svg; native artwork is 180×40 and renders at
216×48. Public bytes match that entry exactly:
SHA256 790F35A6CEA01D512D8C0CBF51D6277219A17206A67471FC3329DFFFA0EDE293.

Visible artwork and the button's accessible name both say **Sign in with Google**.
The image is decorative within that named button; pending information is in a
separate status region. Source/alt/size/border and pending-state checks pass.
This accepts provider presentation only, not OAuth completion.

## Integrated verification checkpoint

| Lane                        | Actual result and boundary                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit and contract snapshot  | Final source checks passed 252 suites / 1,649 tests. An earlier local snapshot also included an ignored prototype contract suite, so its 253 / 1,654 count is not the source acceptance total. Affected copy/foundation checks passed 14 tests and non-Portfolio checks passed 61.                                                                                                    |
| Source quality              | TypeScript passed; source ESLint had zero errors and one existing MarketNews image warning; changed TS/TSX/CSS passed Prettier.                                                                                                                                                                                                                                                       |
| Research coverage           | 351 tests / 48 suites passed: statements 94.63%, branches 90.25%, functions 93.14%, lines 95.59%.                                                                                                                                                                                                                                                                                     |
| Watchlist coverage          | 169 tests / 22 suites passed: statements 93.29%, branches 84.63%, functions 94.20%, lines 95.96%.                                                                                                                                                                                                                                                                                     |
| Integrated browser snapshot | 53 native cases passed: Auth 10, Home 15, shared theme 28. Subsequent short-screen Auth checks require full viewport visibility and passed all 10 production fixture cases.                                                                                                                                                                                                           |
| First-Tab investigation     | Immediate input failed 6/10 matched cases; enabled-entry readiness passed 10/10 while preserving actual first Tab and Enter. This is a calibrated startup synchronization result, not a proven application focus defect.                                                                                                                                                              |
| Shared MUI refinement       | ETF failure-path text contrast initially failed at 3.538:1. Fresh review reproduced a stronger-selector regression against local Top Picks secondary styles; ownerState callbacks fixed it. Actual default/hover, disabled, text/outlined and danger checks passed.                                                                                                                   |
| Production build            | Both fixture and real-public-configuration builds passed. The existing trial configuration was reused only in the ignored local environment; no credential values or backup artifact are included in evidence.                                                                                                                                                                        |
| Final no-JS navigation      | Actual rebuilt Home copy and Features → Guide → Home → Help links passed in normal motion, including their initial-topic content. Bootstrap hash scrolling needed observable scroll completion before the next click; a bounded normal/reduced/readiness comparison and fresh test review support the synchronization change. Framework-owned cleanup preserves future action errors. |
| Production measurements     | Declared UI criteria passed on retained real Chromium data: 12 controlled visits, CLS 0, one finite 480 ms hero animation normally, none in reduced motion and none running at the cutoff. Six independent anonymous form flows passed full visibility/hit tests, validation, mode switching and focus recovery. Native harness outcomes remain failed, as explained below.           |
| Real account                | The owner-authorized existing account signed in on the redesigned real-configuration production UI, reached Portfolio and restored signed-in Home destinations. No private account data is recorded. This accepts that login/redirect only; signup, OAuth and email delivery remain separate.                                                                                         |
| Publication                 | Require the attached PR's six necessary trusted Actions jobs at its immutable head, fresh review and expected-head merge into DevBranch. Final CI/merge evidence is retained in issues #343/#344 and the PR conversation; main and draft promotion #319 stay held.                                                                                                                    |

### Production measurement limits and retained failures

Measurements use headless Chromium 149, 4× CPU, unthrottled loopback frontend
networking and one cold/warm pair at each of 1440×900, 390×844 and 320×568 in
normal/reduced motion. The public background Top Picks SSE was explicitly blocked
through CDP without Playwright routing, preserving HTTP cache. FCP/latest observed
LCP ranged from 224–312 ms cold and 116–184 ms warm. Cold visits had four long
tasks totaling 350–534 ms; warm visits had none. Frame-interval p95 was 16.7–16.8 ms,
but maxima reached 66.6–250 ms. These bounded observations through load + two
seconds establish no field SLO, INP, statistical advantage or old/new speed claim.

The original runner passed SSR and six form flows but failed an invalid additional
assumption that anonymous Home would make no backend GET. Parent source review
confirmed the intentionally shared, bounded public snapshot-notification stream.
A worker restart also overwrote its raw timing aggregation; those timing records
were not reconstructed. The replacement retained all 12 raw visits but failed an
error-string assumption: Chromium reports CDP blocking as inspector, rather than
the expected string. One bounded CDP control confirmed the blocked reason and
zero backend responses. Offline assertions over retained records and fresh review
accept the declared UI criteria; neither failed native run is relabeled green.
The no-JS notice and non-Portfolio presentation changed after that measured bundle; the final build and
actual navigation were separately checked.

The tracked [sanitized checkpoint](BRAND-EXPERIENCE.checkpoint.json) preserves
these aggregates and native failure boundaries for fresh checkouts. Raw screenshots,
measurements and diagnostic logs remain ignored local artifacts.

## UI/UX outside Portfolio

The owner's latest clarification extends this round beyond Home and account
presentation. Fresh independent review inspected current source, retained desktop/
320 px synthetic screenshots and the earlier integrated interaction evidence.

| Page             | Evidence and decision                                                                                                                                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Market News      | Search URL state, source/publication context, quote lookup and mobile layouts were inspected. No material defect established.                                                                                                           |
| Top Picks        | Table/sort/export and freshness states were inspected. Same-query refresh errors were below retained rows; issue #344 now places existing error/Retry above the table and labels retained rows. Native 25/100-row recovery checks pass. |
| ETF              | Preview/loading/empty/error/disclosure and native Retry contrast were inspected. No new stage blocker established; keep its non-live-data boundary explicit.                                                                            |
| Watchlist        | Synthetic add/search/research-note/monitor/removal presentations and responsive rows were inspected. No material defect established.                                                                                                    |
| Community        | Synthetic feed/search and mobile navigation were inspected. No material feed defect established.                                                                                                                                        |
| Community Create | Parent independently viewed the clipped 320 px Preview screenshot and source. Issue #344 now wraps the mode/count header without new state; native complete button/count/leading-text bounds and the maximum count pass.                |
| Profile          | Guest presentation and signed-in settings source were inspected. Field errors have labels, aria-invalid and descriptions; real assistive-technology operation was not tested. No stage blocker was established.                         |
| Guide / Help     | Shared layout, topic navigation/focus and readable formulas/answers were inspected. Actual no-JS links expose only initial-topic content; subsequent selection needs JavaScript and the notice now says so.                             |

No P1 was found in this bounded review. The two material P2 findings are tracked
in [#344](https://github.com/ParasX1/Financial-Investment-Tool/issues/344); final
red/green evidence includes five intended unit failures and three genuine native geometry failures before the fix; 61 affected tests and three browser journeys pass after refinement. The parent separately reran all three on the final production build with fully isolated synthetic provider responses; no real provider requests or account data were used. Fresh independent static review found no actionable defect. Human
preference/recognition, physical-device/software-keyboard and screen-reader trials,
trademark clearance, hosted deployment and release acceptance remain separate.
