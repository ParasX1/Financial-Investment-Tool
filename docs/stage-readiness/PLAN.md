# FIT development-stage readiness plan

Tracking [#282](https://github.com/ParasX1/Financial-Investment-Tool/issues/282).
Started 9 October 2026; updated 10 October 2026 (Australia/Sydney).
Audit baseline: `3e36a257ca27a522deac6724876a6ca5adc7cb1e`.
Current integrated DevBranch: `677c337dd8c87d8697fd19d6d5c2679930b6bb46`.
Main remains `c04875ef5d18d4134554fe36320bb05679125be4`.

## Current outcome and authority

Make the existing development stage basically usable, finish/integrate the fixes
already created, and reduce the issue backlog. The owner explicitly replaced the
original exhaustive scope with this bounded phase. Preserve the primary
`feature/quant-analysis-studio` checkout and its unrelated `client/package-lock.json`
edit. Read [OWNER-REQUIREMENTS.md](OWNER-REQUIREMENTS.md) at entry, after changed
assumptions and before acceptance; use [WORKFLOW.md](WORKFLOW.md) critically.

Research, create focused issues/branches/PRs and merge reviewed, check-passing fixes
into DevBranch are authorized. Main remains unmerged. Prepare a reviewable stage
promotion PR after the combined evidence is sufficient. Hosted Supabase schema,
ledger, configuration, credentials and worker scheduling need their separate concrete
deployment approval. The old Vercel preview is excluded from DevBranch merge gates.
Technical self/subagent review does not imply another GitHub account's approval.

Do not open further micro-issues, chase every possible bug or introduce speculative
hardening. Keep next-stage capabilities in #257 and operational/hosted gates in #268.
Close actual completed acceptance; visibly consolidate broader remainders without
claiming they were implemented.

## Phase acceptance by section

| Section                             | Supported phase acceptance and current state                                                                                                                       | Distinct deferred boundary                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Architecture and developer workflow | Source entrypoints/configuration traced; explicit startup and child environment isolation merged; primary changes preserved                                        | Arbitrary multi-process/descendant lifecycle and production capacity guarantees                     |
| Auth/Profile/Community              | Account intent/retry, comment bounds and metadata-backed durable deletion merged; actual SDK and local role/API controls recorded                                  | Hosted Auth/email/avatar and coordinated RPC deployment; direct-owner missing-metadata cleanup edge |
| Watchlist/navigation/Guide          | Existing CRUD/recovery/compact navigation reconciled; quality baseline and mocked browser checks retained                                                          | Human preference, optional drawer behavior, device/screen-reader acceptance                         |
| Portfolio/charts                    | Date/null/asset/keyboard fixes merged; financial contracts and malformed-success parsing merged in #315                                                            | Live provider accuracy and human visual acceptance                                                  |
| Top Picks/history/provider work     | Verified history/retry and paced shared refresh merged; synthetic matched workload and native transport controls pass                                              | Distributed quotas, production freshness/resource measurements and deferred live capabilities       |
| ETF/Market News                     | Preview request ownership/missingness, legacy-route and shared-provider boundaries merged                                                                          | Live ETF capability and current deployment acceptance                                               |
| Supabase maintainability/security   | Replay/provenance, grants/RLS/RPC/Storage tests and source cleanup merged; the exposed image-only fixture gap was repaired and fresh 32/221/85/63 checks passed    | Hosted effect/ledger/backup reconciliation, populated upgrade, schedule/legacy inventory/CDN        |
| CI/contribution                     | Six trusted Actions jobs now cover frontend, backend, mocked journeys, policy, launcher and native database/API behavior; incidental metadata restrictions relaxed | Browser mocks are not hosted integration; branch protection/admin governance remains separate       |
| Existing issues/release             | Owner backlog 45 -> 3 open after #315; completed/duplicate/deferred scopes reconciled explicitly                                                                   | Reviewed history bridge and direct draft promotion remain; main/hosted stay unchanged               |

The original matrix covered every architecture/component plus security, privacy,
maintainability, scalability, debuggability and UX. Those dimensions still guide
material decisions. Its exhaustive all-path and all-bug expectations are superseded
by the owner's latest scope; neither the matrix nor several merged PRs certify a
fully deployed or universally hardened product.

## Completed checks and remaining release step

Seventeen focused repairs/preparation PRs are integrated, including #315 and #317.
The combined candidate passed 577 backend and 1,389 frontend tests, configured
feature coverage gates, compile/types/lint/build, native 32/221/85/63 database/API
checks and root policy/launcher/provenance checks. Both final PR heads passed all
six necessary trusted Actions jobs before merge. The original database failure
and the actual fixture correction remain visible in [EVIDENCE.md](EVIDENCE.md).

The remaining step is the [reviewed history bridge](RELEASE-HISTORY.md). Its
production tree stays unchanged while current main's archived rollback history
becomes an ancestor. Merge that PR into DevBranch only after independent review
and required CI, using a merge commit. Then create the direct DevBranch-to-main
draft, verify the actual promotion checks, and leave main unmerged.

Recheck the owner issue list and preserved primary edit; close #282 after that
promotion packet exists. #257/#268 remain the small consolidated future and
operational backlog. #245's unproved full four-window API/browser state matrix
is explicitly deferred to #257 rather than falsely reported as executed.

Stop each lane once its declared behavior and material integration checks pass.
A new material failure warrants refinement; unchanged green results do not
justify endless repetition or a new architectural scope.

## Decision and evidence method

Before changing code, trace the actual caller and reproduce the defect with normal
and failure controls. Check alternative explanations and installed versions against
primary documentation. Compare credible alternatives under the same task/input and
stopping condition when the result can change the choice. Use fresh independent
review, then personally validate its findings. Detailed records belong in
[EVIDENCE.md](EVIDENCE.md) and the focused source runbooks.

For the anti-defensive requirement, validate actual external/auth/persistence
boundaries and trust established internal contracts. Prefer the smallest complete
readable change. Remove duplicated internal guards and speculative fallbacks;
retain demonstrated race/security controls and actionable errors. The workflow
links the researched Anthropic/YAGNI guidance and actual FIT refinements.

Use PASS, FAIL, NOT RUN, ABORTED and INFRASTRUCTURE FAILURE with source/runtime
attribution. Local source tests, mocked browser flows, real local provider APIs,
hosted metadata, deployed journeys and human UX are different evidence. Never sum
lane test counts into coverage. Backend overall percentage coverage is unmeasured.
No hosted mutations, deployment, arbitrary orphan purge or credential rotation ran.

Current local checks use Python 3.12.14 with Flask 3.1.1, pandas 2.3.1, NumPy 2.2.6,
yfinance 0.2.65 and Supabase 2.16.0; local Node is 24.15.0. GitHub frontend/tooling
uses Node 22, backend CI Python 3.10 and cleanup/database CI Python 3.12. Next.js
15.5.27, React 18.3.1, supabase-js 2.52.1 and SSR 0.6.1 remain unchanged; Sharp is
now pinned to 0.35.5. Verify the final install matches the current lockfile.
