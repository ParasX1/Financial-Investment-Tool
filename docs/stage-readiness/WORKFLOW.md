# FIT readiness execution method

This is the evolving project-specific method derived from the owner's outcome,
not a verbatim prompt or a claim of a universally optimal workflow. Apply
[owner requirements](OWNER-REQUIREMENTS.md), inspect current evidence, and revise
the method when a comparison, failed control or independent review warrants it.

## At every meaningful subsection

Define the supported user flow, violated contract, source/runtime version,
dependencies and observable acceptance. Trace the actual production caller and
failure path. Reproduce with a discriminating regression and a normal control;
check plausible non-bug explanations. Independently inspect the finding/plan
and primary documentation before production edits. Three confirmations mean
independent evidence channels, not running the same assertion three times.

Choose verification by boundary:

| Change               | Required evidence                                                                                                                                                    | Useful comparison                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Deterministic bug    | Failing reachable regression, independent expected result, passing normal/failure paths                                                                              | Baseline versus candidate on identical inputs                                        |
| Financial contract   | Independent arithmetic, sample/units/missingness controls, strict JSON and client normalization                                                                      | Adjacent, compact and fill policies with shared price fixtures                       |
| Async account/state  | Controlled dispatch ordering with actual SDK, JWT/request assertions, stale-result rejection, browser flow                                                           | Initiating owner versus switched owner and same-owner refresh                        |
| Resource/concurrency | Native transport/database/process behavior, cap/deadline/release and recovery, measured workload                                                                     | Matched provider calls/builds/age or queued/error controls                           |
| Supabase             | Fresh replay, real roles/denials/rollback and actual Auth/REST/Storage bytes; representative populated upgrade and hosted effects remain a separate operational gate | SQL-pattern assertions versus native role/API evidence; actual provider-version race |
| UI/chart             | Real values/dates/asset correspondence, keyboard/focus/responsive browser flow, accessible error/retry                                                               | Exact-date missing values versus dated-nearest alternatives                          |
| CI/docs/config       | Native syntax/configuration validators, actual GitHub jobs, executable/documented behavior agree                                                                     | Valid contributor variants and real release/permission boundaries                    |
| Agent method         | Isolated matched tasks/rubric, controlled context/factor and reviewed outcomes when informative                                                                      | Fresh factual packet versus inherited decision context; do not fabricate trials      |

Implement a small cohesive change in an isolated DevBranch worktree, preserve
other owners, and keep shared logic readable. Avoid new abstractions and guards
unless the evidence shows their need. Make errors actionable and retain known
failure results. Inspect tests as carefully as production code: a test that
copies the implementation is not an independent oracle.

For the owner's explicit anti-defensive requirement, validate actual external
input/API/auth/persistence boundaries; trust unchanged typed internal values.
Remove repeated checks without a separate effect or trust boundary, speculative
fallbacks and unnecessary flexibility. Preserve demonstrated security/race
controls. [Anthropic's model-specific guidance](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#overeagerness)
and [YAGNI](https://martinfowler.com/bliki/Yagni.html) inform this proportional
rule; they do not prove every guard is waste or justify silently masking errors.

Review the entire final patch independently, preferably with no previous chat
history. Give factual goals, constraints, versions and a rubric without earlier
verdicts. Personally reproduce actionable findings; record nonfindings and
assumptions; refine and rerun affected checks. Broad tests run at relevant
integration checkpoints, not endlessly after unrelated unchanged results.

Before publishing, inspect explicit files for secrets/artifacts and verify the
remote Git tree matches validated local bytes. After base/source changes,
reconcile overlapping contracts and review the delta. Verify necessary trusted
GitHub Actions checks at the expected PR head; merge only within owner scope,
then verify DevBranch and unchanged main. Close issues only when their actual
acceptance is met; show source/local/live/admin/human remainders separately.

## Stage acceptance and capacity

After each batch, revisit the entire architecture/issue matrix and owner outcome.
Check supported journeys across browser, Next, Flask and Supabase; cache/version
and migration/caller compatibility; privacy/deletion and failure recovery;
operations/schedule/rollback; CI breadth and unnecessary restrictions. Unresolved
development-phase defects prevent accepting this phase. Hosted deployment and
next-stage gates stay explicit without being reported as completed source work.

Reserve capacity for parent coordination and final independent reviews. Child
delegation should stay bounded and coordinate slots; nested workers must not
consume all review capacity. Give each worker explicit file ownership and keep
dependent database/process operations serialized. Preserve concise handoff,
requirement/evidence records and this method through compaction.

## Refinements observed in this task

- Use pinned Python/Node dependencies and own writable TEMP/cache; keep sandbox
  failures separate from application verdicts. GitHub Node22 complements local24.
- Profile actor checks at UI completion did not bind the SDK's later JWT;
  controlled actual-SDK dispatch exposed it. A narrow fixed-Bearer adapter avoids
  extra copied-session lifecycle. Shared getUser(jwt) had failure-side effects,
  so its supposedly read-only use was rejected by source and negative controls.
- Storage1.44.11 can complete an already authorized upload after deletion. A
  terminal cleanup flag was insufficient; persistent desired-absence state and
  occupied-completed reconciliation were selected and tested with paused bytes.
  Kong buffering and direct Storage behavior are recorded separately.
- Native permissions distinguished provider-owned ACLs from app-owned grants;
  an unsupported revoke experiment failed and was removed rather than hidden.
- Synthetic test fixtures must register persisted IDs before assertions and
  retain exact-identifier cleanup on ambiguous responses. Controlled failures
  proved both cleanup and preservation of unrelated records.

Primary guidance checked on 10 October2026: OpenAI recommends durable context
and continuous improvement in [Codex best practices](https://learn.chatgpt.com/guides/best-practices).
Task-specific criteria and iterative comparisons inform the agent portions of
[evaluation guidance](https://developers.openai.com/api/docs/guides/evaluation-best-practices);
these are not proof that a particular agent configuration is superior. GitHub's
[branch protection guidance](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
separates checks/reviews from repository enforcement. Supabase's
[testing overview](https://supabase.com/docs/guides/local-development/testing/overview)
supports transactional isolation, role/negative checks and PR CI. Provider examples
do not override installed versions, actual tools or the owner's authorization.
