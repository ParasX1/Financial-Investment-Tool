# Actual hosted Supabase alignment

Tracking #268. This continues the original owner request to improve the actual
FIT Supabase project, beyond the completed source/local development phase.
Hosted updates were explicitly requested on 10 October 2026.

## First compatible batch

Project `egjnhetinyoyrhbetbxi` matches the configured backend URL. Fresh read-only
inspection found 10 historical ledger entries, 24 posts, 14 comments, 3 profiles
and 8 Community Storage objects. Existing canonical avatar policies already
match the current client path `<user-id>/avatar` and owner_id boundaries.

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
