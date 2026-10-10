# Actual hosted Supabase alignment

Tracking #268. This continues the original owner request to improve the actual
FIT Supabase project, beyond the completed source/local development phase.
Hosted updates were explicitly requested on 10 October 2026.

## First compatible batch

Project `egjnhetinyoyrhbetbxi` matches the configured backend URL. Fresh read-only
inspection found 10 historical ledger entries, 24 posts, 14 comments, 3 profiles
and 8 Community Storage objects. Existing avatar policies use the current client
path `<user-id>/avatar`. SELECT/UPDATE/DELETE also check owner_id; hosted INSERT
checks the path alone. This batch preserves all four definitions exactly.

The first migration creates the absent public avatars bucket (5 MiB; JPEG,
PNG, WebP and GIF), adds the three absent Community foreign-key indexes, and
optimizes the two Profile write policies using statement-level auth.uid().
It preserves the current owner-write predicate, existing avatar policies, object
bytes, application rows, old RPC interfaces and all ten historical ledger rows.

SQL bucket creation is explicitly supported by the current
[Creating Buckets guide](https://supabase.com/docs/guides/storage/buckets/creating-buckets).
This creates an empty bucket; it does not directly alter/delete Storage objects.
[RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select)
supports the initPlan form. Actual table sizes are 48 KiB and 32 KiB, so ordinary
transactional index creation is appropriate; lock/statement deadlines bound it.

Independent source review found no actionable defect. A populated disposable
rehearsal reproduced the exact four captured hosted avatar policies and missing
effects: 5/23 controls failed before, then 23/23 passed after this exact SQL.
Owner/non-owner/anonymous writes and ownership-transfer denial were isolated
from unrelated column grants; two posts/comments/profiles were preserved exactly.
Fresh replay passed 33 migrations, six SQL files/221 assertions, public/private
lint and security advisors. Original runtime config bytes were preserved.

The hosted migration was actually applied as
`20261010041548_reconcile_hosted_avatar_profile_indexes`, with explicit SQL
transaction boundaries around the reviewed file. Source was generated with the
CLI at 03:59:58 UTC and renamed to the verified hosted version after application,
so this new effect has the same source/hosted identity. Earlier ledger rows were
not renamed or repaired. Hosted catalog verification confirms the bucket's public
flag/5 MiB/MIME settings, all three exact valid indexes, the two authenticated
initPlan owner policies, and all four unchanged avatar policy definitions.
Original ten ledger fingerprints and counts24/14/3/8 are preserved.

Performance advisors no longer report the three unindexed foreign keys or two
profile initPlan warnings. Newly created indexes being unused is informational;
they are not removed merely to silence that notice. Existing security advisories
about intentional authenticated like/unlike definers and disabled leaked-password
protection remain separately tracked. A read-only public Storage probe now reports
NoSuchKey/Object not found for the absent synthetic path, confirming bucket
visibility; its HTTP status is400 with a404 body status. Real authenticated avatar
upload/foreign-user denial is not inferred from that probe or catalog inspection.

## Recovery and boundaries

Retain the captured prior catalog/policies/ledger and application/object counts.
Apply the SQL effects within one transaction and verify the new ledger entry
separately; no unverified claim of SQL-plus-ledger Management API atomicity.
On failure, stop and check actual effects before retrying. Restore the two prior
policy predicates/roles and remove only newly added indexes if necessary. Never
remove the new bucket after it starts holding uploads as a generic rollback.
Use the Storage API for any explicitly reviewed bucket reversal.

This batch neither rewrites user data nor depends on a whole-project data restore.
Its catalog snapshot and inverse SQL are narrow recovery evidence, not a verified
full database/Storage backup. Larger populated upgrades need their own recovery plan.

Expected-owner RPC deployment and durable image cleanup/worker scheduling remain
the next actual hosted batches. Existing old clients must stay compatible during
transition; do not drop their RPC signatures without a verified client cutover.
No PostgreSQL engine restart/upgrade, paid branch/project or credential change is
included in this first batch. Main remains unmerged.

## Community compatibility batch

Historical status before resumed access on 10 October2026: source and disposable
verification complete; hosted application had not succeeded. Both prior attempts returned
`Invalid or expired requestState`. Read-back after the second failure confirms
the original 9/1/1 RPCs, absent comment limit, unchanged counts24/14/3/8 and the
same eleven ledger fingerprints. Read operations work; browser is signed out
and the local CLI is not authenticated. Restore supported access before another
attempt. This is an access failure, not a request for renewed owner authorization.

Migration `20261010045043_reconcile_hosted_community_compatibility` contains only
the verified missing effects:

- Add required-identity create10 / like2 / unlike2 overloads, preserving every
  existing hosted9/1/1 definition and ACL. Fresh source replay still has only the
  new signatures. Nullable fields remain explicit JSON keys; identity arguments
  have no defaults. The old methods remain authenticated-only and retain their
  old session-switch behavior until the deployed callers retire.
- Grant authenticated INSERT on saves.user_id and reports.reporter_id, with the
  existing owner RLS still checking the request JWT. No moderation grant is added.
- Add the validated <=2000 Unicode-code-point comment CHECK. Actual hosted
 14 comments have maximum30 characters and none exceed the new limit.
- Use canonical owner_id for Community Storage SELECT/INSERT/UPDATE/DELETE,
  allowing current owner upload/upsert/read/delete and removing post-author
  authority over somebody else's comment image. Managed Storage ACLs, defaults,
  bucket settings and all avatar policies remain unchanged.

The five existing names outside posts/% and comments/% remain owner-readable
and owner-deletable. UPDATE retaining an outside-prefix name becomes restricted;
current generated-path uploads are compatible. No existing path, owner, image
byte or application row is rewritten. Physical cross-author image cleanup still
requires the separately reviewed capture migration and protected worker.

[PostgREST named arguments and overloads](https://docs.postgrest.org/en/stable/references/api/functions.html#overloaded-functions)
support retaining distinct required argument sets during the client transition.
Copying the older source expected-account migration wholesale would drop hosted
old callers; adding defaults could make payload dispatch ambiguous. Neither is
used. Only the Community subset of the larger hardening migration is reconciled;
the hosted project has no legacy Stocks/Symbols tables.

## Verification and deployment procedure

The committed SQL SHA256 is
`2eb72207b7813de73b7c3845c12ebaa603e12becc9f90f9ab04e67c177c9e6e3`.
The rehearsed3180f409 checkpoint differs only by one removed blank line at EOF.
Fresh-context source/inverse review found no actionable defect. Disposable
host-shaped controls passed54 RPC,23 comment and17 Community Storage assertions.
Actual local Auth/PostgREST/Storage requests passed464 assertions including exact
fixture cleanup, covering old/new dispatch, persisted actors/tickers/votes,
refresh, wrong/null intent, private saves/reports, owner upsert and cross-owner
denial. A snapshot-specific inverse restored the targeted catalog/rows/counts/
ledger; the final SQL then passed two applications and repeated54/17 controls.
Fresh source replay passed34 migrations, six files/221 assertions, lint/advisors
and41 exact source/runtime file hashes. These are local results.

The rehearsal retained source-only cleanup triggers, so it is not a complete
hosted replica. It also deliberately preserved the actual weak avatar INSERT;
two assertions in the broader source Storage suite failed from that one gap
and its duplicate-insert consequence. Fresh-source221 uses the already hardened
source avatar policy and passes. Legacy outside-prefix Storage API mutation and
avatar cross-owner API controls were not run. Prior fixture syntax failure and
baseline negative controls remain recorded; no global check was weakened.

Before actual application, recapture definitions/ACLs, policies, constraint and
actor grants, comment/ownership aggregates and ledger fingerprints. The captured
baseline has no new RPCs or same-name comment CHECK; reject drift and regenerate
recovery SQL rather than assuming `IF NOT EXISTS` proves equivalent definitions.
Apply the exact SQL transaction with3-second per-lock and30-second per-statement
timeouts;30 seconds is not a whole-batch deadline. Then independently verify the
new ledger record, old/new signatures with zero defaults, old ACLs unchanged,
new authenticated-only access, exact policies, validated CHECK and preserved
rows/objects/history. Verify hosted authenticated API flows when protected test
access is available; catalog evidence alone does not prove API routing.

The inspected inverse is valid only for the captured old-only host: remove the
three newly added signatures, two INSERT column grants and length CHECK, and
restore only the captured Community policies. It does not alter old RPCs, avatar
policies or data. Reverting restores weaker policies and requires checking that
new callers are no longer using the new signatures. Never run this inverse on a
fresh source replay or after unrelated schema changes. A catalog snapshot and
rehearsed targeted inverse are not a whole-project backup or Storage byte backup.

The existing Python cleanup command remains the preferred protected operation.
Read-only provider inspection found zero Edge Functions, no pg_cron/pg_net, and
an installed Vault with no secret entries. Edge Functions' default admin secret
supports outbound access, but does not authenticate a privileged scheduled
caller. Avoid an unscheduled second-runtime deployment that would leave cleanup
unfinished. Protected server access/credential and observed scheduled runs are
still pending under#268; no cleanup migration/worker/schedule or engine upgrade
was applied in this batch.

## Resumed actual deployment

After the owner's request to continue with MCP, the exact committed compatibility
SQL applied successfully as `20261010080722_reconcile_hosted_community_compatibility`.
Source identity remains `20261010045043`; the effect/content match is recorded
explicitly rather than renaming prior history. Fresh catalog confirms the three
new required10/2/2 functions, anonymous denial and authenticated access, all three
old9/1/1 definitions/ACLs preserved, validated comment CHECK, four exact canonical
Community policies and all four unchanged Avatar policies. All eleven prior
ledger fingerprints and counts24/14/3/8 are preserved. Earlier failed requests
remain historical evidence, not the current application status.

Further review found remaining applicable #288 effects: unnecessary browser
table/sequence grants on profiles/tickers/top_picks_universe, permissive
postgres-created object defaults, and path-only Avatar INSERT. The next narrow
forward migration reconciles those effects without touching private Users,
existing function definitions/ACLs, service grants or other creators' defaults.
Missing hosted Stocks/Symbols are excluded rather than inventing tables.

The owner requested actual Auth/Storage and image-cleanup completion through MCP.
No protected Python scheduler exists here, so the concrete hosted operation uses
the existing ticket protocol in Edge with a Vault-generated caller token and
Cron; see [its operation and acceptance plan](hosted-community-cleanup-operation.md).
Provisioning, deployment, actual API acceptance and observed recurring execution
remain distinct checkpoints. Main stays unmerged.
