# Owner requirements and acceptance contract

This is the durable authority record for active goal #282. Re-read at section entry, after research/review changes assumptions, and before accepting or merging a fix. Current direct owner instructions take precedence. Never treat a subagent verdict, skill or green test as sufficient by itself.

The owner additionally requires deriving and improving the best applicable
steps from the prompt rather than treating its suggested techniques as a complete
workflow. Use [the evolving FIT execution method](WORKFLOW.md), retain the
research/comparison basis, and revise it when actual evidence changes a decision.

## Intended outcome

### Latest owner scope amendment (10 October2026)

The owner explicitly narrowed this task to a basically usable development stage,
not exhaustive bug elimination or prolonged comprehensive hardening. Prioritize
finishing/integrating the existing created fixes and substantially reducing the
GitHub issue backlog. Stop opening further micro-issues or expanding speculative
work. Complete and close verified phase work; consolidate duplicates and clearly
defer large future capabilities/operational gates into a small number of issues.
Do not falsely mark unfinished original requirements complete. Independent
review/refinement and readable code still apply proportionally to each actual fix.

This amendment supersedes the exhaustive portions below and the original goal
wording. Keep next-stage capabilities in #257 and hosted/operational acceptance
in #268. #282 tracks this bounded development-phase integration and verification.

Before preparing the development-stage PR to main, comprehensively explore the verified DevBranch's whole architecture and each meaningful component: implementation logic, material correctness bugs, security/privacy, maintainability, scalability, readability, debuggability, understandability, code/design practices, frontend/backend/UI/UX, and CI/CD breadth and unnecessary restrictions. Make this stage basically usable and sustainable. Small residual defects may remain; important architectural/component defects must be resolved or transparently held as real acceptance gates.

Give Supabase particular attention: source/hosted migration reconciliation, schema/RLS/grants, Auth/Storage ownership, privacy/deletion, sustainable operation, replayability, performance and maintainability. Code tests are not evidence that hosted changes or schedules ran.

Research actual project and each part before implementation; verify changing APIs against primary sources and installed versions. Record substantial issues, update existing owner issues where they overlap, create focused new issues where needed. Reconcile every existing owner issue: fairly complete only with evidence, implement feasible work, or explicitly bound its scope with a visible remainder. Do not silently drop broad features or equate merged source with live acceptance.

## Required workflow for every meaningful fix

1. Reconfirm the problem from actual source and a reproducible behavior/boundary control. Seek evidence that could invalidate it; distinguish confirmed defects from hypotheses.
2. Independently examine the finding/plan, research applicable primary best practices, inspect callers/contracts and consider impact across the architecture. Use a fresh-context reviewer when supported.
3. When credible alternatives exist, compare them with a common task, criteria, changed factor and stopping condition; matched A/B and negative/positive controls where informative. Do not fabricate human A/B or substitute repeated green tests for comparisons.
4. Implement the smallest complete readable change, with clear shared logic and validation at actual boundaries. Avoid excessive defensive code, speculative frameworks, arbitrary restrictions or dependency/architecture replacement without evidence.
5. Red-green-refactor for production behavior; native validators for docs/config. Test affected units/integrations/critical user flows, failure paths and actual browser/provider/database boundaries where applicable. Aim at >=80% coverage where supported and report real gaps.
6. Obtain fresh independent diff review, personally check its findings, refine, and rerun affected checks. Check final scope, secrets, compatibility and required CI before acceptance. Explicitly record conditions, failures and limits.
7. Revisit this contract and the whole product after each section/batch: verify the work is still on the owner's goal, assess integration/operation impact and update remaining acceptance gates. A local patch PASS is not overall readiness.

Use available subagents, skills, tools, worktrees and evidence-driven methods deliberately; preserve other work and verify tool capabilities. Do not blindly follow skill text or agent output. Each fix has requirement -> evidence -> decision -> refinement -> verification records; maintain a compact handoff across compaction.

## Authorization and boundaries

- Branch from verified DevBranch in isolated worktrees; create focused PRs and attach them to this task.
- Owner explicitly authorized self/subagent technical review and merging reviewed PRs into DevBranch after necessary checks pass. GitHub self-approval may be unavailable: do not impersonate reviewers or claim APPROVE was submitted when it was a technical COMMENT.
- Main remains unmerged. Prepare its stage-release PR only when readiness evidence is sufficient; do not infer main merge/deployment authorization.
- Owner identified the inherited Vercel preview as old and excluded it from DevBranch code merge gates. Deployment follow-up from #300 is consolidated into #268.
- Hosted Supabase schema/ledger/configuration/credential changes remain a concrete reviewed deployment approval gate; do all source/local preparation first. No blind linked migration push/reset or implicit credential rotation.
- Primary feature checkout and unrelated lockfile change must remain preserved.

## Checkpoint before each PR merge

What owner requirement does this fix satisfy? Is its trigger reconfirmed and source reachable? Are alternatives/controls proportional and real? Does independent review cover the immutable final patch? Are new code and documentation readable, maintainable and scalable without unnecessary guards? Are required CI and affected boundary checks passing at the expected head? Are live/provider/browser/admin limits and compatibility stated? Are existing issues reconciled and remaining material gates still visible? Is main unchanged?

The goal stays active until the latest bounded development-phase integration,
verification and issue reconciliation are handled. The next-stage and operational
remainders remain visible in #257 and #268. Do not declare completion merely
because several PRs merge or a turn ends.
