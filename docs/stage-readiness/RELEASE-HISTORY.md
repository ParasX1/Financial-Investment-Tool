# Development promotion and archived rollback

This prepares the requested development-stage promotion under #282. Main remains
unmerged. Hosted Supabase and deployment acceptance remain in #268; next-stage
capabilities remain in #257.

## Verified history and comparison

The reviewed development baseline is
`677c337dd8c87d8697fd19d6d5c2679930b6bb46`, with tree
`832445392213a426a91ae435fd08925849fdb81a`. Current main is
`c04875ef5d18d4134554fe36320bb05679125be4`.

Only three commits are present on main and absent from that development baseline:
the #236 stage merge (`49698fdf9`), its revert (`89047414e`), and #237's revert merge
(`c04875ef5`). Main's complete tree is `87a42fa6ff46666ddb6477923e82f81d4bb7eda8`,
identical to #236's first parent `db8de4ab94c3d547ebda39f89a23479b22edfbf1`
and the revert tree. Independent read-only review and parent Git comparisons
found no independent surviving main-only content.

The rollback is real: relative to the shared merge base it changes 765 files,
with 7,538 insertions and 92,536 deletions. Ordinary merge-tree simulation against
the final development baseline exits 1 with 136 conflicts. The earlier #317
candidate had 130. Therefore a normal unresolved promotion does not provide a
reviewable combined stage.

The selected bridge retains the reviewed development tree and adds current main
as an ancestor, explicitly superseding that old stage rollback for this requested
promotion. Before documentation updates, the native history merge was checked to
retain tree `832445392213a426a91ae435fd08925849fdb81a` exactly. Its only subsequent
file changes are this history record and the phase PLAN/EVIDENCE records. No
production code, migration, fixture, dependency or workflow changes in this PR.

This decision applies to the pinned tips above. If either remote moves, inspect
the new history/content before publishing or merging; it does not authorize
ignoring later independent main changes.

## Review and release steps

1. Publish this bridge to DevBranch and independently review its parents, exact
   file diff and evidence. Run the six necessary trusted Actions checks.
2. Merge using a **merge commit**. Squash/rebase would discard the main ancestry
   that resolves the promotion history. Verify the reviewed tree and main ancestry
   after merge.
3. Create a draft from the same repository's exact **DevBranch** head to main,
   as required by the existing promotion policy. Attach it to the task and verify
   its actual checks. Do not merge main.
4. Record the draft in #282 and close the bounded phase after final reconciliation.
   Keep #257/#268 open; no hosted apply or deployment is inferred from this work.

The bridge preserves the rollback commits as history rather than rewriting main.
The policy and merge-method basis are in
[the contribution checker](../../scripts/check-pr-policy.mjs) and
[GitHub's merge methods](https://docs.github.com/en/pull-requests/reference/pull-request-merges).
