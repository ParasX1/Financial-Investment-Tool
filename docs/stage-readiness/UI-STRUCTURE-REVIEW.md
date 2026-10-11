# Unified UI and repository structure review

Fresh section record for #339/#340 following the earlier bounded stage audit.
The owner requires a usable stage, coherent dark/black and purple presentation,
improved sign-in/sign-up, clear shared responsibilities and real Supabase evidence.
Main stays held. [OWNER-REQUIREMENTS.md](OWNER-REQUIREMENTS.md) and
[WORKFLOW.md](WORKFLOW.md) remain the authority and evolving execution method.

## Baseline, plan and acceptance

Start: DevBranch `b8fbe55c884d7d2c3ebff6e09cf58781d295d328`;
main `c04875ef5d18d4134554fe36320bb05679125be4`.
Isolated `.audit/unified-ui` preserves the primary feature checkout and unrelated
lockfile change. Lock-matched client dependencies: Next.js 15.5.27 Pages Router,
React 18.3.1, MUI 5.18.0, Tailwind 3.4.17, TypeScript 5.8.3 and Playwright 1.61.1.
Backend checks use Python 3.12.14 and pinned Flask/pandas/numpy/yfinance.

Sequence: inventory/research; controlled design and domain comparisons; shared
foundation; bounded feature lanes; independent review/refinement; aggregate
checks and hosted reconfirmation; focused PRs, trusted CI and DevBranch merges;
truthful issue reconciliation and working user trial. Promotion #319 stays draft.
Future capabilities remain #257 and operational/admin/deployment gates #268.

Acceptance covers Home/Auth/Profile/Portfolio/Top Picks/ETF/Market News/Watchlist/
Community/Create/Guide/Help, including loading/error/empty, narrow layout and
keyboard interaction. Architecture changes must improve actual repeated
responsibilities without collapsing intentional domain/math/authority contracts.

## Primary guidance and controlled decisions

Research checked [Next15 CSS](https://nextjs.org/docs/15/pages/building-your-application/styling/css),
[MUI5 theming](https://v5.mui.com/material-ui/customization/theming/),
[React state ownership](https://react.dev/learn/sharing-state-between-components),
[WCAG2.2](https://www.w3.org/TR/WCAG22/),
[WAI dialogs](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/),
[form labels](https://www.w3.org/WAI/tutorials/forms/labels/),
[Vercel interface guidance](https://github.com/vercel-labs/web-interface-guidelines),
[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
and [scheduled functions](https://supabase.com/docs/guides/functions/schedule-functions).

Matched dark editorial/light paper prototypes shared content and 1440/390px
conditions. Four technical conditions passed. Minimum text/control contrast:
dark 7.230/3.691, paper 4.991/3.171. Prototype source SHA256:
`f27650e3d516bdffeb65168a8ebc0e0dc0d5fe894af4d473e3044bc5e590db29`.
Fresh model review favored dark chart separation/migration cost; paper separated
reading surfaces well. These are technical/model comparisons, not human A/B.

The owner's later black/purple requirement supersedes prototype teal/citron.
Final page `#09080d`, surface `#15121d`, raised `#201a2e`, accent `#bba0ff`
share one static source across CSS, stable MUI 5 and Toast. Serif headings/system
body remain; financial success/danger/info and medal meanings remain distinct.
No React 19/App Router or experimental MUI migration was justified.

Actual cross-page computed styles subsequently found inherited NextUI utilities
overriding the weaker html selector with a white/light root. The server-emitted
central root rule now owns color-scheme and background as well as tokens.
Native reload and independent JavaScript-disabled root checks confirm dark/#09080d;
this does not certify every production server-rendered component's appearance.

## Section evidence, decisions, refinement and verification

| Section | Evidence and decision | Refinement and actual verification |
| --- | --- | --- |
| Root theme/portals | Library/CSS colors diverged, feedback was light and label contrast insufficient. Static trusted tokens feed root CSS/MUI/Toast. | Six initial color/library cases failed; final theme checks pass. Real Auth exposed SSR escaping quoted fonts; regression reproduced and static CSS emission fixed hydration. Root Bootstrap variables correct the actual border specificity collision. |
| Shared framing/navigation | Features repeated sidebar offsets, width and headings. FitPageContent owns main/skip target/offset/density; FitPageHeader owns typography/actions. Shell no longer injects global styles. | Routes/controllers remain thin. Root inheritance avoids a fixed future-page allowlist. Real native contrast2.19:1 failed for the skip link; semantic action ink now8.38:1. Maintained native keyboard/Enter regression and independent recheck pass. |
| Home/Profile/learning | Split editorial hero reuses existing decorative image without synthetic financial claims. Shared framing and semantic surfaces replace local presentation. | Account/content controllers unchanged. Independent1440/320/390 native visits found no page errors/overflow; Profile identity modal reflows and restores focus. |
| Auth | Two-panel desktop/compact mobile identity, associated readable fields, password reveal, clear error/pending status preserve existing redirects/account/provider logic. | Native Tab escaped chrome before bounded edge fix. Six journeys pass; short/mobile scrolling and rejection recovery verified. Final purple captures show correct panel/field/action colors and no page errors. Coverage85.98% lines/80% branches. |
| Shared dialog edge | Auth/Observation repeated visible Tab logic; MUI capture moves root focus before bubbling. Small helper retains one explicit container option and excludes disabled/hidden/closed-details controls. | Installed modals still own initial focus/Escape/restoration/enforcement.46 focused tests/helper100% coverage and16 native cases pass, including root Tab/Shift+Tab1440/390. Fresh independent review found no outstanding defect. |
| Portfolio | Shared modes/header, readable labels and semantic surfaces preserve Board/Focus/Observation data and geometry. Search/chips use shared roles without lifecycle changes. | Observer-only chart scroll fixes axes/legend; native wheel test passes and hidden-overflow negative control fails. Readable15-character chips exposed320px overflow; bounded width retains full text/title and keyboard/delete behavior. Native preset/date bounds failed; responsive wrapping/stacking restores full controls. Ordinary5Y/calendar clicks and independent320/390/desktop rechecks pass. |
| Top Picks/ETF | Shared framing/Sx; extracted ETF table/highlights/pure presentation preserve API order and zero/null/percent/ratio meaning. |32 focused cases and351 research coverage tests pass,95.62% lines/90.38% branches. Portfolio/ETF and four streaming/window journeys pass. Local CSV downloads canceled under all three isolated Blob timing controls; code unchanged without a production cause. Unit CSV semantics pass; trusted browser CI owns download acceptance. |
| News/Watchlist | Shared content/heading/control roles replace repeated frames/private colors; orchestration/compare/polling/account behavior remains. | Existing partial error/source metadata/paging/account tests and computed action/hover colors are verified on desktop/mobile. |
| Community/Create | In-flow toolbar compared with fixed offsets; full-width mobile prose preserves sidebar, drafts and actions while avoiding covered content/focus. | Four maintained1440/390/320/short-mobile checks. Two independent hover contrast findings fixed. Social94 component tests/24 browser-visual checks pass; reviewer checked drawer restoration and nine native visits. |
| Shared market domain | Portfolio/Watchlist duplicated search lifecycle; market-data hook plus compatibility wrappers clarify ownership. |36 old behavior cases preceded extraction. Shared/wrapper100% coverage and independent late-success/error traces preserve contracts. PR341 merged after review and six trusted checks. |
| BFF market policy | Eight duplicated preambles had genuinely different validation/cost order. Existing guard now separates method/privacy from admission. | GET/POST ticker, deduplicated chart cost, trendingcost2, namespace/key/Retry-After/cache/serializer preserved.122 tests and independent weighted/privacy controls pass. No generic request framework. |
| Flask Top Picks | Focused configuration/snapshot-cache modules separate mechanics from service composition; compatibility exports retained. | Three missing-warning red cases plus success/disabled controls preceded generic path/payload-free disk-failure diagnostics.621 full backend/458 independent tests, AST parity and120 concurrent writes pass. No math/TTL/key/lock/schema changes. |
| SQL/provider | Explicit historical source-to-host mapping retained; no abstraction/history rewrite justified. |37 source versions/28 mappings and worker37 tests pass. Hosted checks below are independent of local/CI and historical mutation acceptance. |
| Tooling/contribution | CI covers type/lint/unit/coverage/build/browser/backend/database/Auth/Storage/cleanup/policy. Prettier previously ignored TSX/CSS. | Generated/dependency ignores now permit actual changed-file formatting. Untouched legacy files are not broadly rewritten. Contribution docs clarify new cache/config ownership and retired stock helper. |

Reviewers started without earlier verdicts. Parent reconciles findings with source
and native evidence. Ignored client/test-results/server/.cache preserve commands,
screenshots, negative controls and coverage; no reviewer verdict alone establishes
acceptance. Final aggregate results and immutable-head trusted CI are recorded
in the UI PR conversation and final task checkpoint.

## Actual hosted Supabase checkpoint

Project `egjnhetinyoyrhbetbxi` is ACTIVE_HEALTHY, PostgreSQL 17.6.1.155, 19 ledger entries.
Read-only checks reconfirm RLS on 13 public tables and the private cleanup table, denied unnecessary grants,
Watchlist/account intent guards, intended Community compatibility and owner/path/
metadata Storage policies with 5MiB/MIME bounds. Public bytes have separate
privacy/retention limits.

Retrieved Edge v6 retains custom caller auth/`verify_jwt=false`, no acceptance
route and approved SHA256
`c4d85371d94cade6a3fd5bbc27302b8e8cc23e0cccd881942889c63bfd8a0e69`.
Active `fit-community-image-cleanup` cron runs every five minutes; at
`2026-10-11T14:20:02.456118Z`, 337 recorded successes and zero non-successes.
At `2026-10-11T14:25:30.789599Z`, cleanup rows/backlog/errors were zero.

Exact aggregate recipe; Auth count only:

```sql
select count(*) as rows,
       md5(coalesce(string_agg(to_jsonb(t)::text,
           E'\n' order by to_jsonb(t)::text), '')) as md5
from schema_name.table_name t;
```

Fifteen row/object aggregates plus Auth count match the fresh earlier checkpoint.
[UI-STRUCTURE-EVIDENCE.json](UI-STRUCTURE-EVIDENCE.json) stores the exact query and
aggregate read-back, excluding row contents/user identifiers/credentials.
portfolio_prefs already differed from historical SECOND-PASS before this round,
with the same 3 rows; cause unverified. Do not claim all historical hashes unchanged.

No new provider mutation was justified. Real 370-check Auth/Storage/cleanup
acceptance is historical, not rerun this UI round. Advisors remain calibrated:
intentional scoped definers/inaccessible-private-RLS/index information, plus
disabled leaked-password protection/engine maintenance in #268. Original images
and historic orphan candidates are preserved without provenance for deletion.

## Limits and final integration

Before UI merge require final type/lint/unit/coverage/build, changed-file format/
diff/secret review, affected native journeys and trusted exact-head CI. Main
stays unchanged. Human preference trials, physical devices/other engines,
production market accuracy, live OAuth/SMTP delivery, actual backup/restore,
populated engine upgrade and selected production deployment remain unverified.

Final local integration: 251 suites/1,622 tests pass; TypeScript, production build,
all changed client-file formatting and diff checks pass. ESLint has zero errors
and two existing image warnings. Portfolio/Top Picks coverage passes351 tests,
95.59% lines/90.25% branches; Watchlist passes169 tests,95.96% lines/84.63% branches.
An initial research coverage run hit a sandbox EPERM before one suite loaded;
the preserved failure is infrastructure, and scoped native rerun passes all48 suites.
The new cross-page suite passes26 native cases; four table contrast cases pass
again after fresh review strengthened actual background measurement. Separate
Auth/Observation/shared-focus16 and maximum-length ticker regressions pass.
Trusted PR CI remains a separate exact-head acceptance gate.

Dependency audit again reports 45 nodes: 40 high/5 moderate; with dev dependencies
omitted, 11 nodes: 9 high/2 moderate, matching prior scoped triage. Counts include
inherited trusted build-input/tooling paths, not 45 proven reachable app vulnerabilities. No package
changes are hidden in presentation. Supported upgrades remain #257 and the
PostCSS/braces/source-map reachability assessment remains in SECOND-PASS.
