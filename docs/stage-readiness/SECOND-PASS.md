# Second development-stage review

Fresh review requested on 10 October2026; Sydney verification on 11 October.
Baseline DevBranch: `d108295d2048e79cb67865755d1073561bd4640c`.
Seven repair PRs #331–#337 are merged in `6985151fc93d51a0b685380da385fdb4f013064c`.
Main remains `c04875ef5d18d4134554fe36320bb05679125be4`.
Primary feature checkout and its unrelated lockfile edit are preserved.

## Outcome and architecture

The existing Next.js Pages frontend/BFF, Flask calculation/service layer and
Supabase authorization/persistence architecture remains appropriate for this
usable development phase. Independent whole-product/integration review found
no reason for a framework replacement or service split. Important async,
resource, recovery and accessibility defects were reproduced and repaired.
This is phase acceptance, not an unlimited-scale or exhaustive-security claim.

Next feature controllers own interaction state; repositories own Supabase calls;
server-only BFF providers own public upstream requests. Flask routes validate
calculation contracts and delegate to metric/Top Picks services, with separate
history and persistence responsibilities. Supabase owns table/RPC authorization,
Auth and Storage policies; service-only cleanup uses reservations/acknowledgments.
Inputs, units, data mode and missingness remain attached to financial results.

Admission, caches, Top Picks streams and serialized Yahoo cold fills are
process-local capacity boundaries. Browser queues coordinate one runtime, not
cross-tab/device conflicts. Community collection loading/comment-insert
subscriptions do not provide complete paginated realtime synchronization.
Measure capacity before introducing distributed queues/caches or conflict
resolution. These growth boundaries are consolidated into #257.

## Method and section acceptance

[OWNER-REQUIREMENTS.md](OWNER-REQUIREMENTS.md) preserves the long prompt and
scope/authorization amendments. [WORKFLOW.md](WORKFLOW.md) derives the proportional
method. Source/pins and current primary documentation preceded changes; earlier
PASS records were not inherited. Independent source, patch, fixture and
integration reviewers received factual packets. Root checked findings, refined
real defects and reconciled verification rather than accepting verdicts alone.

| Section                      | Evidence and decision                                                                                                                             | Phase acceptance / limitation                                                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Whole architecture           | Entrypoints/dependency direction, state/data ownership, runtime/config and independent integration review                                         | Existing layers coherent; retain stack. Process/distributed capacity and deployed operation remain explicit.                                                                          |
| Auth/Profile                 | SDK actor/session transition, profile/pending-email/sign-out source/browser cases; real synthetic login/refresh/logout                            | Existing repairs reconfirmed. Confirmation email/SMTP, expired callbacks and human acceptance remain #268. The recovery spec covers profile loading, not forgotten-password delivery. |
| Watchlist                    | Real locked-SDK deferred token, owner/role controls, additive invoker RPCs, pgTAP and hosted old/new REST dispatch                                | #324/#331 complete; required intended owner precedes mutation; no legacy fallback. Deployed-client cutover remains #268.                                                              |
| Portfolio metrics/charts     | Formula/units/missingness/query provenance, hook/card regression, dated chart fixtures and geometry/focus/state persistence                       | #325/#332 and #330/#337 complete; previous results cannot acquire new query labels. Fixtures/preview do not establish live market accuracy.                                           |
| Preferences                  | Controlled write order, hydration, remount/retry and owner transitions; shared domain-separated queue                                             | #328/#334 complete; preserve local-first/latest save; cross-tab/device conflicts remain #257.                                                                                         |
| Community                    | Post/comment/vote/save/report/image authorization; partial resource failure, optimistic replay, unknown membership, real cascade/Storage controls | #326/#335 complete; failed-only retry preserves healthy state. Whole-feed growth, Auth-delete vote/provenance lifecycle and fuller realtime remain #257.                              |
| Top Picks/history            | Calendar/window/rank/snapshot contracts, shared refresh/SSE, history/seed/WAL/bootstrap and persistence tests                                     | Existing phase behavior reconfirmed. HSI source, live freshness/SLA, distributed operation and sizing remain #257.                                                                    |
| ETF                          | Explicit predefined preview data mode, API/UI window provenance and unavailable-state controls                                                    | Preview usable and labelled; original live universe/history/ranking acceptance remains #257.                                                                                          |
| Market/news/BFF              | Reachable quote/chart/search/news requests; admission, decoded-body/deadline/fallback/cache/error native HTTP controls                            | #327/#333 complete; reuse shared limits; legitimate history retained without arbitrary period restrictions.                                                                           |
| Flask                        | Metric JSON/validation, threaded cold fill/retry/publication/clear, persistence and route tests in pinned Python                                  | #329/#336 complete. Shared fill/generation prevents duplicate work/stale publication; correlation/readiness and measured multi-worker capacity remain #257.                           |
| UI/UX/navigation/help        | Actual Observation keyboard/pointer/responsive/focus/restore, Board/Focus transitions and 47 maintained mocked journeys                           | Important #330 repaired using existing MUI. Human screen-reader, contrast/device and exact prototype acceptance remain #257/#268.                                                     |
| Supabase                     | Fresh schema/RLS/grants/function/catalog/advisors, real local roles/replay, actual Auth/Storage/worker/retry/schedule                             | Hosted new guard, fresh 370-check PASS, exact teardown and data preservation below. Source PASS is separate.                                                                          |
| CI/dependencies/contribution | Six trusted check families, fork/issue/branch policy, launcher controls, pins, Linux DB and dependency reachability                               | General checks retained; Windows newline test fixed. Residual advisories and low-impact wrapper exit issue remain #257.                                                               |
| Issues/integration/release   | Immutable reviewed heads/trees, CI, final combined tests, truthful bounded closures                                                               | #324–#330 completed; only #257/#268 remain open. Promotion #319 stays draft/unmerged, auto-merge off.                                                                                 |

## Repair and refinement records

| Confirmed requirement/trigger                                                     | Decision and controlled comparison                                                                                                                                           | Review/refinement and verification                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #324: pending remove/reorder acquired next account JWT without initiating owner   | Required owner payload plus two-argument invoker wrapper; preserve old definitions/ACLs. Actual SDK/role controls distinguish intent from RLS identity.                      | 130 Watchlist tests; repository lines/branches98.3/100%;38 new SQL assertions/307 total in real replay; hosted normal/legacy/deferred B-JWT/A-intent denial and full row/timestamp preservation.                                                        |
| #325: previous metric appeared under new units/assumptions during load/failure    | Bind result/error/timestamp to effective query at render; same-query retry retains valid timestamp. Qualify finite Sortino leader when unbounded readings exist.             | Red/green hook/card controls;52 focused tests; hook lines100%, branches90.62%; independent43-test review, no remaining finding.                                                                                                                         |
| #326: associated resources failed without retry; unknown membership treated false | Retry failed resources, preserve valid posts/unaffected optimism, disable unknown toggles.                                                                                   | Review exposed same-batch retry/comment replay gap; three failing controls drove atomic state capture/replay.304 Community tests; lines90.44%, branches82.62%; reviewer recheck passed.                                                                 |
| #327: quote/chart/search bypassed existing provider bounds                        | Reuse current admission/decoded2MiB/full-deadline helpers, one deadline includes fallback. Excessive gzip/concurrency/queue/stall controls compared with legitimate history. | 42 producer/80 reviewer tests; affected lines95.95%, branches80.98%. Commit credential guard stayed enabled after correcting a harmless fixture key.                                                                                                    |
| #328: overlapping saves left cloud preferences older than UI                      | Share existing active/latest-pending per-owner pattern, keep domain queues separate; order/owner/hydration/remount/retry controls.                                           | 83 producer/70 reviewer tests; queue/helper100% coverage; controller lines98.33%, branches96.59%.                                                                                                                                                       |
| #329: identical cold misses repeated downloads and stale refresh publication      | Reuse RLock through fill/publication/recheck; compare warm/forced and shared work.                                                                                           | Review reproduced clear→ordinary-refresh adopting old fill. Locking clear failed responsiveness control; generation scalar corrected publication.32 focused/13 reviewer checks. Native coverage plugin absent; no percentage claimed.                   |
| #330: overlay focus stayed behind it; move/resize pointer-only                    | MUI5 Modal plus native controls/arrow geometry. Primitive-only versus thin visible-boundary guard showed mobile hidden/closed-details targets.                               | Review reproduced portal resize clipping; delayed-portal unit/native viewport red/green drove node-dependent observer.31 unit/six browser plus existing pointer/persistence/shrink; lines97.77%, branches90%; independent mobile/resize recheck passed. |

Final Windows checkout revealed two LF-literal migration source assertions
failing on CRLF (1489 others passed). SQL and actual role behavior were unchanged.
Normalize CRLF only in the test input; retain signatures, invoker/default/guard
order and ACL assertions. Independent LF/CRLF positive controls and changed
owner/security/default/PUBLIC-grant negatives passed. This improves contributor
portability without additional production defensive code.

## Fresh actual hosted Supabase acceptance

Project `egjnhetinyoyrhbetbxi` remains ACTIVE_HEALTHY, PostgreSQL17.6.1.155.
Source guard `20261010111650_watchlist_expected_account_intent` was applied as
host `20261010124654_watchlist_expected_account_intent`: required owner,
invoker/empty search path, no defaults, wrong/null/missing identity rejection
before mutation, denied anon EXECUTE, unchanged legacy definitions/ACLs.

Protected real-provider acceptance returned HTTP200/PASS with **370 checks**:
two registered synthetic accounts performed password login/refresh, old/new
Community and Watchlist RPCs, actual deferred SDK token handoff, wrong/null/
anonymous/service-without-user denials, avatar/Community upload/upsert and
foreign-owner controls, cross-author cascade, injected Storage failure followed
by actual retry/ACK and idempotence. Missing-contract probe measures SDK dispatch;
separate repository tests protect application no-fallback behavior.

Teardown verified global logout/refresh rejection, exact Admin Auth deletion,
FK Watchlist absence, app rows/objects and public endpoint absence. Only two
registered completed synthetic cleanup reservations were retired. All **16**
original aggregate relation counts/fingerprints match before/after:
10Auth/10Users/24posts/14comments/3profiles/8Storageobjects plus other app tables.
Historical unreferenced images were preserved pending provenance; no blanket sweep.

Temporary gate added at `20261010130447`. Three MCP DDL retirement attempts
returned `Invalid or expired requestState`; readback showed no effect.
Guarded exact synthetic-ticket DML succeeded through MCP. Reviewed remaining
table/four-function retirement used the signed-in Dashboard SQL editor; independent
MCP confirmed table absent/functions zero. **19 ledger entries** retain history;
Dashboard retirement is recorded here without rewriting its creation entry.

Production worker restored as **v6**, exact original bundle SHA256
`c4d85371d94cade6a3fd5bbc27302b8e8cc23e0cccd881942889c63bfd8a0e69`,
with no acceptance route. Protected manual invocation returned HTTP200/empty
aggregate. Named five-minute cron is active; automatic execution succeeded
13:20:00.111154–13:20:03.471996 UTC, pending/errors zero. Existing credentials
were not rotated/exported. All13public app tables/private cleanup retain RLS;
browser-private access and forbidden TRUNCATE/TRIGGER grants remain denied.

Intentional SECURITY DEFINER/no-policy advisor notices and unused indexes remain
reviewed; they are not instructions to weaken authority/remove useful indexes.
Disabled leaked-password protection and PG17.6 maintenance are #268, without
assuming downtime authorization.

## Final integration and evidence limits

Immutable heads/check IDs, hosted aggregate and original preservation:
[SECOND-PASS-EVIDENCE.json](SECOND-PASS-EVIDENCE.json).
Pinned frontend Next15.5.27/Supabase2.52.1(auth-js2.71.1)/React18.3.1/
TypeScript5.8.3/Jest29.7.0/Playwright1.61.1; pinned backend Python3.12.14/
Flask3.1.1/pandas2.3.1/numpy2.2.6/yfinance0.2.65.

Final integrated source plus newline portability fix: **1491 tests in246 suites**
and **47 native Chromium journeys**, with retries disabled, passed. Backend
unchanged by frontend-only final merges: **590 pinned tests** passed.
Initial backend AppContainer TEMP caused8failures/40errors; same pins with
task-owned native TEMP passed590. Test-runtime Next preparation removed an
ephemeral config/log under .next; owned test config/evidence moved to ignored
test-results. Neither infrastructure failure is an application verdict.

Each source PR passed six trusted Actions checks at its reviewed head.
#335 had one chart-measurement case pass on configured retry, retained in CI;
#337's47 mocked journeys had no reported flake. Real Linux CI separately
passed37 migrations/307SQL assertions,63Auth/Storage and85cleanup controls
when Watchlist guard present; local Windows Docker replay remains unavailable.
Specifically, #331 validated the guard-present 307 assertions; #337 began from an
older base and its database job validated 269 assertions. Final evidence PR CI
replays the combined branch with the guard. Do not attribute 307 to #337's run.
Local Node24 and CI Node22 are distinct verified runtimes. No human A/B was run.

Client audit reported45nodes (40high/5moderate),11with dev omitted(9high/2moderate).
These are not45proven reachable app vulnerabilities; assessed PostCSS/braces/
source-map paths primarily process trusted build input. Supported dependency
updates/Python transitive locking/native coverage remain #257; no blanket
React/Pages migration. Date9999 overflow/Windows wrapper exit propagation remain
low-impact follow-ups, alongside real capacity/cross-device/liveETF/HSI growth.

#268 retains full backup/restore, representative populated upgrade, SMTP/
confirmation/callback/deployed-client cutover, selected current Vercel target,
admin branch enforcement, engine/password-protection maintenance and physical/
CDN retention limits. Code/fixtures do not establish live market accuracy,
human acceptance or production deployment. These gates stay visible without
falsely keeping the seven completed phase defects open.

Primary research complements installed source and actual controls:
[React effect lifecycle](https://react.dev/reference/react/useEffect),
[Python3.12 RLock](https://docs.python.org/3.12/library/threading.html#rlock-objects),
[MUI5 Modal](https://v5.mui.com/material-ui/react-modal/),
[WAI dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/),
[PostgREST14 overloaded RPCs](https://docs.postgrest.org/en/v14/references/api/functions.html#overloaded-functions),
and [Supabase maintenance changelog](https://supabase.com/changelog).
Guidance was evaluated against the locked versions and observed contracts;
actual old/new REST dispatch resolves overload compatibility here.
