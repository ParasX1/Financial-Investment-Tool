# Development-phase evidence register

Updated 10 October 2026 (Australia/Sydney). Tracking [#282](https://github.com/ParasX1/Financial-Investment-Tool/issues/282).
The immutable audit baseline is `3e36a257ca27a522deac6724876a6ca5adc7cb1e`.
This checkpoint records merged DevBranch `8697113a06f10abaa0611876a6a728815f925c8d`;
main remains `c04875ef5d18d4134554fe36320bb05679125be4`.

Apply [owner requirements](OWNER-REQUIREMENTS.md) and the [execution method](WORKFLOW.md).
The owner's latest scope is a basically usable development phase, completing the
existing fixes and reducing the issue backlog. The original exhaustive audit is
superseded; this register does not certify every path, bug or deployed service.

## Integrated source and verification

The following 15 focused PRs are ancestors of this checkpoint. Each received
independent technical review and the necessary trusted GitHub Actions checks
before its authorized DevBranch merge. Reviews submitted by the PR author were
technical COMMENT reviews, not GitHub APPROVE reviews. Individual PR checks are
historical evidence, not a substitute for the final combined candidate check.

| Requirement and integrated PR                                                                                    | Actual method/result at the lane checkpoint                                                                                                            | Decision and remaining boundary                                                                                              |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Guide and frontend quality: [#297](https://github.com/ParasX1/Financial-Investment-Tool/pull/297)                | Frontend lint/type/build baseline restored; 1,169 frontend and 362 backend tests passed                                                                | Preserve the documented supported UI; human UX acceptance is separate                                                        |
| ETF request-window and missing values: [#290](https://github.com/ParasX1/Financial-Investment-Tool/pull/290)     | Red/green request ownership, abort/loading and invalid-number controls                                                                                 | Preview remains truthful; live ETF capability stays in #257                                                                  |
| General contribution policy: [#301](https://github.com/ParasX1/Financial-Investment-Tool/pull/301)               | 37 native policy tests; legitimate branch/prose variants and missing/fabricated links compared; measured lines/branches/functions 98.87/97.35/100%     | Relax incidental conventions while retaining executable release boundaries                                                   |
| Explicit development startup: [#304](https://github.com/ParasX1/Financial-Investment-Tool/pull/304)              | 21 controlled launcher tests, native Windows child-process check, actual Node 22 CI; coverage 97.27/96.2/95.45%                                        | Privileged universe writes are explicit; frontend child environment is separated                                             |
| Supabase replay and authorization: [#305](https://github.com/ParasX1/Financial-Investment-Tool/pull/305)         | Initial 29-migration replay, 124 native pgTAP assertions and 40 real local API checks                                                                  | Replay/provenance and native permission CI added; final 32-migration integration is checked separately below                 |
| Verified history and persistence recovery: [#306](https://github.com/ParasX1/Financial-Investment-Tool/pull/306) | Truncated/rebased replacement, corrupted snapshots, restart/retry and compatibility controls; 423 backend tests at that lane                           | Retain complete verified history and retry intent; financial version integration belongs to #315                             |
| Trusted market peers and legacy routes: [#307](https://github.com/ParasX1/Financial-Investment-Tool/pull/307)    | Independent 125-test review plus native gzip, stalled transport and caller-abort controls                                                              | Keep admission at actual external boundaries and preserve ordinary supported requests                                        |
| Community account intent and retry: [#308](https://github.com/ParasX1/Financial-Investment-Tool/pull/308)        | 242 community tests, 11 actual-SDK request controls, 154 native SQL and 63 real local API checks; four deliberate fixture-cleanup failure controls     | Bind expected owner inside the database request; coordinated hosted RPC/caller deployment remains #268                       |
| Auth/Profile account intent and recovery: [#309](https://github.com/ParasX1/Financial-Investment-Tool/pull/309)  | Independent 44 tests and four SDK controls; 1,213 frontend tests and three mocked production-browser journeys                                          | Narrow fixed-request authorization and truthful errors; hosted auth/email/avatar acceptance remains #268                     |
| Paced refresh and subscriptions: [#311](https://github.com/ParasX1/Financial-Investment-Tool/pull/311)           | Matched actual-service synthetic workload, cooldown/race/admission controls, 388 backend tests, 305 feature-coverage tests and five browser journeys   | Bounded process-local work; distributed quotas and production sizing are deferred                                            |
| Date-correct charts and allocation: [#312](https://github.com/ParasX1/Financial-Investment-Tool/pull/312)        | 1,190 frontend tests, nine Portfolio Chromium journeys and configured coverage gates; independent normal/missing/keyboard checks                       | Preserve dates, nulls, asset identity and keyboard inspection; successful-response parsing follow-up remains #315            |
| Shared provider admission and cleanup: [#313](https://github.com/ParasX1/Financial-Investment-Tool/pull/313)     | 224 tests, three native transport controls and seven browser journeys                                                                                  | Apply shared process-local concurrency/queue/body/deadline limits; no distributed quota claim                                |
| Comment input bound: [#310](https://github.com/ParasX1/Financial-Investment-Tool/pull/310)                       | 252 community tests, 23 native SQL assertions, one browser journey and independent 65-test refinement                                                  | Retain pre-upload, service and database boundaries; remove the redundant internal repository validator                       |
| Supported patched Sharp runtime: [#314](https://github.com/ParasX1/Financial-Investment-Tool/pull/314)           | Own locked install, native benign/malformed decoder controls, 1,193 frontend tests, type/lint/build/coverage and actual Linux Node 22 CI               | Matched production audit high findings 10 -> 9, moderate 2 unchanged, critical 0; HTTP optimizer smoke was NOT VERIFIED      |
| Durable Community image cleanup: [#316](https://github.com/ParasX1/Financial-Investment-Tool/pull/316)           | 44 native SQL assertions, 85 real local cleanup API checks, 73 Python checks and two actual delete-lock controls; paused Storage completion reproduced | Source cleanup handles captured, verified metadata; hosted scheduling and the direct-owner missing-metadata edge remain #268 |

These counts are separate lane checkpoints and must not be added together as
coverage or presented as final combined results. Frontend feature coverage gates
passed at the recorded checkpoints. Overall backend percentage coverage was not
measured; the cleanup worker's trace measured 99% lines, not branch coverage.
The root launcher controls are distinct from an arbitrary descendant-process
lifecycle guarantee.

## Comparisons, review and refinement

The refresh comparison ran the same fixed ticker, four windows, three subscribers,
fake clock, one-second mocked provider and 120-second horizon through the actual
worker/cache scheduling path. Active-throughout provider calls/builds changed
from 120/480 to 2/8; both revisions served 120/120 readable matching responses,
and candidate maximum active snapshot age was 60 seconds. The matched disconnect
case changed 60/240 to 2/8 with 60/60 readable responses. These are synthetic
scheduling results, not live market freshness or production load measurements.
See [the integrated refresh record](https://github.com/ParasX1/Financial-Investment-Tool/blob/8697113a06f10abaa0611876a6a728815f925c8d/docs/top-picks-refresh-bounds-2026-10-09.md)
and its committed machine-readable comparison.

Independent reviews and normal/failure controls changed implementation decisions.
Actual SDK handoff exposed an owner-switch race after an earlier session check.
Native provider roles showed that app-owned grants and provider-managed Storage
ACLs need different treatment; an unsupported revoke experiment was removed.
Storage 1.44.11 can finish an already-authorized upload after deletion, so a terminal
cleanup flag was replaced with persistent desired-absence reconciliation. Direct
Storage behavior and Kong's request buffering remain distinct evidence.

The anti-defensive requirement is applied to each actual boundary: validate external
input, request authorization and persisted data, then trust established typed
internal contracts. Remove repeated checks, speculative fallbacks and abstractions
without a demonstrated caller. Preserve reproduced security and race controls.
The comment repository simplification and normal self-correlation correction are
concrete refinements. [Anthropic's model-specific guidance](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#overeagerness)
and [YAGNI](https://martinfowler.com/bliki/Yagni.html) inform this rule; neither
justifies silently converting malformed successful responses into empty data.

## Pending financial integration

[#315](https://github.com/ParasX1/Financial-Investment-Tool/pull/315) remains open.
Its earlier published head `6b99153f6fc309a6ae0756d647b4ecab3eb94cba` passed the
six necessary Actions jobs. The local candidate standardizes positive-price and
adjacent supplied-row samples, missingness, Sortino, finite/null JSON and version-2
snapshot contracts. The shipped version-1 seed is unchanged and installs history
only; old derived rankings require recalculation.

A clean text merge with #306 initially bypassed persistence validation for the new
eight-field key. Nineteen failing controls led to a narrow existing-validator fix.
A normal SPY/SPY case then exposed an unnecessary off-diagonal restriction; two
failing calculator/API controls led to the simpler finite-row availability rule.
After integration with #311, 150 focused controls and 504 backend tests passed.
These are the earlier financial checkpoint, not tests on the final all-PR source.

The latest three-file local follow-up stops `Response.json()` failure from becoming
normal empty data. Real `Response` controls first produced five failures/eight
passes; after correction, 13 client tests, 20 Portfolio hook tests and the configured
305-test feature coverage suite passed. A valid empty object and legacy/envelope
responses remain supported. Fresh technical review found no issue; its own test
execution hit EPERM, so the worker's actual passing tests and the review are
recorded separately. Publishing the revised immutable head, current-head CI,
DevBranch integration and closing #298/#299/#245 remain PENDING. The parent then
integrated all source through `8697113a` with this parsing change at local financial
head `79ad852` (tree `2619282d3a504427b6ace04b74e90e82291c3044`). Its full pinned
backend run passed 577 tests in 13.46 seconds; compilation and both configured
flake8 commands passed. Final frontend and revised PR-head CI remain PENDING.

## Final combined verification checkpoint

| Candidate/boundary               | Actual current result                                                                                                                                                                                                  | Required next step                                                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Current source database replay   | Fresh disposable reset copied all 32 source migrations and six SQL files from DevBranch `8697113a`; initial pgTAP reported 220/221 passing, exit 1. After the fixture repair, the complete native group passed 221/221 | Preserve both results; publish and verify the corrected immutable source revision                                            |
| Database integration refinement  | The image-only fixture now creates its existing owned Storage object. All 221 native assertions pass; independent review confirms transaction rollback and unchanged production enforcement                            | Publish the corrected source and check its immutable GitHub head                                                             |
| Actual DevBranch push CI         | Database replay and authorization job `114093250988` also failed on the integration gap                                                                                                                                | Verify the corrected immutable revision on trusted GitHub Actions; historical PR-head success does not override this failure |
| Final backend/frontend/tooling   | Full pinned backend on local financial `79ad852` passed 577 tests; compile and both configured flake8 checks passed. Final frontend/browser checks have not yet completed                                              | PENDING: locked current frontend, type/lint/build, configured coverage and critical browser checks                           |
| Final policy/launcher/provenance | Policy 37 and launcher 21 native tests passed; launcher lines/branches/functions 96.72/96.20/95.45%. Migration provenance confirmed 32 unique versions and 28 historical mappings                                      | Preserve these actual local results; revised-head GitHub CI is separate                                                      |
| Final local Auth/REST/Storage    | Final corrected source passed cleanup 85 then Auth/Community/Storage 63, matching CI order; versions/names for all 32 ledger entries and source/runtime hashes match; public/private lint and security advisors pass   | Local acceptance complete; hosted acceptance remains #268                                                                    |
| Main promotion                   | Main unchanged; release history is being reconciled separately                                                                                                                                                         | PENDING: independently reviewed promotion packet/draft PR; no main merge                                                     |

The initial pgTAP failure is retained in ignored local verification artifacts.
A subsequent SQL rerun after the API suite also failed because the latter left a
synthetic queue ticket; the final run restarted from a fresh reset and followed
CI order. Both failures are preserved. At completion there were zero fixture
users/posts/comments/Storage objects and one synthetic pending cleanup ticket,
with no remaining physical fixture bytes. Reset ownership was serialized and
released after verification. No hosted schema, ledger, configuration or
credential change ran.

## Issue reconciliation and remaining scope

The last live owner-issue snapshot was 45 -> 6 open issues:
#299, #298, #282, #268, #257 and #245. Completed source acceptance was closed with
its evidence; duplicate and deliberately deferred scope was explicitly consolidated,
not described as implemented. #282 remains active until combined phase acceptance.

[#257](https://github.com/ParasX1/Financial-Investment-Tool/issues/257) contains
next-stage live market capabilities, HSI/preset/sync refinements, production capacity
and optional UX/toolchain work. [#268](https://github.com/ParasX1/Financial-Investment-Tool/issues/268)
contains hosted Supabase reconciliation, representative populated upgrades, Auth/RPC
caller coordination, avatars/indexes, cleanup operation/legacy inventory/CDN,
current deployment ownership and release governance. The owner excluded the old
Vercel preview from DevBranch code merge gates; its deployment failure is unresolved
operational scope, not a successful deployment.

Read-only hosted inspection found 13 public tables with RLS enabled, no avatars
bucket, three missing covering indexes and ten migration-ledger entries. Existing
image CHECK constraints were verified; a ledger name alone does not prove a trigger.
This was metadata inspection, not hosted end-to-end acceptance or applied migrations.

The known conditional cleanup P2 requires a direct owner to pause a same-path upsert,
remove the original Storage object, delete references while metadata is absent,
then finish the upload. No cleanup authority was captured; the restored own object
is not discovered. No foreign-owner bypass was demonstrated. Normal application
uploads use fresh UUID paths/default non-upsert. The bounded phase defers this edge
to #268 and does not claim universal cleanup for arbitrary direct Storage changes.

The baseline Codex Security scan remains incomplete: the recorded draft covered
105 of 793 paths and validated four medium findings in peer identity, legacy routes,
refresh and comment bounds. Their focused fixes are integrated, but this is not an
exhaustive clean-repository or security-certification claim. Real hosted journeys,
production deployment, human/screen-reader UX and distributed capacity acceptance
remain distinct and were not inferred from mocked tests or source merges.
