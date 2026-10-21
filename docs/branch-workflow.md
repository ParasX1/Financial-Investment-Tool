# Dev, Test and Prod branch workflow

Setup record: **2026-10-22, Australia/Sydney**. This additive transition creates
three Git refs and preserves `DevBranch` and `main`. Branch names do not create
isolated databases, credentials, hosting environments or deployments.

## Seed record and migration status

The source refs were checked immediately before creation; all three new names
were absent. GitHub branch creation and a subsequent remote-ref read confirmed:

| Branch | Initial source | Exact seed commit                          | Role                                                               |
| ------ | -------------- | ------------------------------------------ | ------------------------------------------------------------------ |
| `Dev`  | `DevBranch`    | `224a1f1f1e54b862a7c870910f23ced9ff76eabc` | Integration for new work                                           |
| `Test` | `main`         | `c04875ef5d18d4134554fe36320bb05679125be4` | Candidate acceptance after the first reviewed promotion            |
| `Prod` | `main`         | `c04875ef5d18d4134554fe36320bb05679125be4` | Production-source baseline, held pending separate release approval |

`DevBranch` and `main` retained those respective source commits at setup.
The governance implementation PR targets `Dev`. After review and CI, a separate
initial `Dev` -> `Test` candidate PR must be reviewed and merge committed before
Test contains the current development application and five modern workflows.
The original Test and Prod seed trees lack that modern workflow set: adding
filters in Dev does not retrofit files onto those branches. Do not copy modern
CI onto the old Prod application merely to manufacture passing checks. Verify
the actual PR merge tree and emitted checks at each promotion.

No production application promotion is authorized by this setup. `main` remains
held; draft release #319 does not become approved by policy compatibility.
PR #130 is outside this migration. Existing feature PRs need an explicit
base/diff review before retargeting; their earlier checks are not inherited.

## Routes and merge methods

| Source                                           | Target | Requirement                                                                                      |
| ------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------ |
| Descriptive contribution branch, including forks | `Dev`  | Relevant tests and independent review; branch prefix/issue number optional                       |
| Same-repository `Dev`                            | `Test` | Candidate packet, actual six CI checks, review; merge commit                                     |
| Same-repository `Test`                           | `Prod` | Tested candidate and explicit release-owner approval; merge commit                               |
| Same-repository `stabilize/*`                    | `Test` | `## Stabilization exception` with scope, owner and backmerge plan; review                        |
| Same-repository `hotfix/*`                       | `Prod` | `## Emergency exception` with impact, owner and staged backmerge plan; explicit release approval |
| Same-repository `Prod`                           | `Test` | Carry approved hotfixes back; merge commit                                                       |
| Same-repository `Test`                           | `Dev`  | Carry stabilization/hotfixes back; merge commit                                                  |

Ordinary feature PRs may be squash merged. Stage promotions and backmerges must
preserve ancestry with merge commits; check the selected merge method manually.
After a Prod hotfix, backmerge Prod -> Test -> Dev. Same-repository direct Prod -> Dev is not
needed and is blocked so Test receives the fix too. Merge a stabilization branch
into Test and backmerge Test into Dev before the next candidate promotion.

The metadata policy rejects Dev -> Prod, arbitrary feature -> Test/Prod and fork
branches impersonating trusted release-stage promotions. Ordinary fork branches
may target Dev with any source name, including main, Dev, Test, Prod or DevBranch;
these are contributions, not trusted stage promotions. Exceptions into Test/Prod require
same-repository identity and real prose beneath the relevant heading; examples,
comments and empty headings do not count. Reviewers verify the explanation,
owner approval and actual diff. The script cannot prove those human decisions.

Legacy feature -> DevBranch, same-repository DevBranch -> main, and explained
hotfix -> main routes remain compatible during migration. Legacy main promotion
emits advisory migration guidance; it does not authorize a release. Legacy main
hotfixes require owner review and a planned reconciliation into the active stages.
Do not delete, rename or force push legacy refs as part of this setup.

## Checks and enforcement boundaries

The five modern workflows accept push/PR targets `Dev`, `Test`, `Prod`,
`DevBranch` and `main` (PR Policy handles PR events). Keep these exact job names:

1. `Frontend quality`
2. `Mocked browser journeys`
3. `Backend quality`
4. `Database replay and authorization`
5. `Development launcher safety`
6. `Issue and branch policy`

The policy uses read-only `pull_request`, JSON event input and no shell
interpolation of PR text. Issue linkage is advisory. Candidate-controlled
workflow/script files are not an independent security enforcement boundary:
required checks, review restrictions and approved workflow ownership need GitHub
administration. A green workflow alone does not prove live provider, database,
deployment, human acceptance or release approval.

## Administrator handoff: pending

The authenticated GitHub identity has write/triage, but not admin/maintain access.
Vercel project access returned HTTP 403. No default-branch, protection, deployment
binding, environment/secret, or database setting was changed. These pending steps
must be performed and read back by an authorized administrator:

1. After the reviewed governance PR and usable initial Test candidate are merged,
   audit existing deployment branch bindings and their default-branch behavior
   with the provider administrator. Once that audit confirms a safe cutover,
   set the repository default branch to **Dev**. Recheck contribution links,
   existing PR bases and the actual default readback. Closing keywords currently
   follow `main`; after this switch, merging into Dev can auto-close linked issues
   independently of production release. Do not close incomplete admin work.
2. Configure rulesets/protection for Dev, Test and Prod: require PRs, independent
   approval, resolved conversations and the six exact checks above after checking
   they run on real candidate PRs. Block force pushes/deletion and restrict direct
   writes, especially Test/Prod. Set and test the intended administrator/bypass
   policy; account write access alone does not establish these controls.
3. Keep merge commits enabled for stage promotions/backmerges. Prevent squash or
   rebase from being selected for those PRs through reviewer procedure or a
   suitable repository rule; ordinary feature squash merges remain allowed.
   Required check names alone do not enforce allowed source routes or merge method.
4. Until a separately approved Prod promotion exists, retain current deployment
   behavior. Inventory the actual frontend and backend providers before changing
   bindings. With explicit deployment authorization, bind the intended production
   source to Prod, define Dev/Test preview or acceptance targets and read back the
   real provider configuration. Git refs alone are not environment isolation.
5. Review per-environment credentials, Supabase projects, RLS/migration state,
   callbacks/CORS, cleanup schedules and rollback needs before enabling a hosted
   stage. Do not share production secrets merely because a branch is named Test.
   Record real smoke/authorization/rollback evidence separately from mocked CI.

Protection/freeze and deployment cutover are **pending**, not enforced or tested
by this change. Keep the migration issue open until its administrator acceptance
is complete, or explicitly split and link that remaining work.

## Verification record

The chosen additive seed preserves both legacy refs and holds Prod at the existing
main tree. Seeding all three from development was rejected because it would imply
a production-source promotion without release acceptance. Copying modern CI to
the old Prod tree was rejected because checks must match the application candidate.

Policy tests cover ordinary contributions, trusted promotion/backmerge identities,
fork spoofing, missing identity, forbidden routes and real/empty/code-only exception
explanations. Workflow consistency checks preserve all five filters and six names;
native YAML parsing validates syntax. Independent review and exact-head remote
CI are required before merging the implementation; initial Test promotion needs
its own review and actual checks. These are source/configuration checks, not
browser acceptance or hosted environment validation.
