# Actual hosted Supabase alignment

Tracking #268. This continues the original owner request to improve the actual
FIT Supabase project, beyond the completed source/local development phase.
Hosted updates were explicitly requested on 10 October 2026.

## Current hosted status, 10 October 2026

The requested hosted schema alignment, Auth/Storage acceptance and protected
cleanup deployment are complete on `egjnhetinyoyrhbetbxi` (PostgreSQL 17.6).
Production Edge version 4 is ACTIVE and exactly matches the approved handler/core,
with custom Bearer authentication and `verify_jwt=false`. Its protected SQL
invocation returned HTTP 200 with all six aggregate counts zero; external GET/missing
Bearer/wrong Bearer controls returned 405/401/401 with zero cleanup attempts.

Cron job 1, `fit-community-image-cleanup`, was scheduled at
`2026-10-10T10:00:38Z` for `*/5 * * * *`, with an 80-second statement timeout.
The first automatic run (run ID 1) succeeded from
`2026-10-10T10:05:00.114046Z` to `2026-10-10T10:05:01.867628Z`, with return
message `1 row`. The dispatcher raises on non-200/failed aggregates, establishing
protected worker completion; cron itself records no raw HTTP response body.
Backlog read-back found zero pending tickets, no oldest pending timestamp and
zero errors. This is one observed scheduled run, not a long-term reliability claim.

Source and hosted migration versions are explicitly mapped; existing history
was preserved rather than renamed:

| Effect                                      | Source version   | Hosted version   |
| ------------------------------------------- | ---------------- | ---------------- |
| Avatars/Profile/indexes                     | `20261010041548` | `20261010041548` |
| Community RPC/Storage compatibility         | `20261010045043` | `20261010080722` |
| Remaining reference grants/avatar ownership | `20261010081946` | `20261010094015` |
| Durable image-cleanup tickets               | `20261009153003` | `20261010094115` |
| Protected worker transport/authentication   | `20261010084019` | `20261010094122` |

Real hosted acceptance used the intended Edge slug twice. The first fixture
incorrectly supplied forbidden `comments.id`; production grants correctly denied
it at `comment_insert`. Only the fixture changed to a database-generated ID.
The first HTTP response recorded 219 checks; the corrected response returned
HTTP 200/PASS with 269. Stored results contain 218/268 because the final finish
assertion follows result storage. Both runs are retained in ignored
`server/.cache/hosted-edge/hosted-acceptance-results.json`.

The corrected run covered login/refresh, old 9/1/1 and new 10/2/2 RPC dispatch,
wrong/null intent denial, avatar/Community upload and upsert, foreign-user and
anonymous metadata denial, cross-author cascade, forced Storage API failure,
durable pending diagnostics, actual retry/ACK and public object endpoint/metadata
absence, idempotency, unrelated fixture survival and exact API teardown.
Independent SQL confirmed zero fixture Auth users, app users, profiles, posts,
comments and objects. Original counts (10 Auth users, 10 app users, 24 posts,
14 comments, 3 profiles, 8 objects) and five row/object aggregate fingerprints
were restored exactly. All seven historical unreferenced candidates remain.

Temporary gate ledger versions `20261010094333`/`20261010095938` record creation
and retirement after fresh review. Only three synthetic reservations were
removed; all four temporary RPCs and the gate table are absent. The ledger now
has 17 entries while preserving its initial ten; all 11 pre-compatibility
versions/names/statement fingerprints are unchanged. Final read-back after removal
reconfirmed those counts/fingerprints and unchanged definitions/ACLs for all
pre-existing public functions. No credentials were exported or rotated; the
scoped caller was generated inside SQL/Vault and the service-role
credential stayed in Edge's environment.

Source PR #322 merged with all six checks passing. Revised Linux CI passed
36 migrations, eight SQL files/269 assertions, lint/advisors, 85 real local
cleanup checks and 63 local Auth/Community/Storage controls. The worker passed
37 unit tests with 100% line/branch and 88.24% function coverage. Native Windows
Docker replay is **NOT RUN** due to the existing startup failure. These CI/local
results and the hosted run are distinct evidence.

See [the deployed operation](hosted-community-cleanup-operation.md) for source
identity, credential/transport boundaries and recurring-run observation.
Broader #268 engine/SMTP/backups/governance/Vercel work remains partly open.
Main stays unmerged in draft PR #319; completion of this hosted scope does not
close those broader operational requirements.

## Historical first compatible batch

The following records the first batch's captured baseline and result before
the later compatibility, grant/ownership and cleanup deployments above.

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

At this first checkpoint, expected-owner RPCs and durable cleanup/scheduling had
not yet been deployed; those subsequent batches are now recorded above.
Existing old clients must stay compatible during
transition; do not drop their RPC signatures without a verified client cutover.
No PostgreSQL engine restart/upgrade, paid branch/project or credential change is
included in this first batch. Main remains unmerged.

## Historical Community compatibility batch

Historical status before resumed access on 10 October2026: source and disposable
verification complete; hosted application had not succeeded. Both prior attempts returned
`Invalid or expired requestState`. Read-back after the second failure confirms
the original 9/1/1 RPCs, absent comment limit, unchanged counts24/14/3/8 and the
same eleven ledger fingerprints. At that checkpoint, read operations worked;
the browser was signed out and the local CLI unauthenticated. Subsequent MCP
access enabled the successful deployment below. These were access failures,
not failures of the SQL or requests for renewed owner authorization.

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
byte or application row is rewritten. Physical cross-author image cleanup at
this checkpoint still required the separately reviewed capture migration and
protected worker, now deployed above.

[PostgREST named arguments and overloads](https://docs.postgrest.org/en/stable/references/api/functions.html#overloaded-functions)
support retaining distinct required argument sets during the client transition.
Copying the older source expected-account migration wholesale would drop hosted
old callers; adding defaults could make payload dispatch ambiguous. Neither is
used. Only the Community subset of the larger hardening migration is reconciled;
the hosted project has no legacy Stocks/Symbols tables.

## Historical rehearsal and deployment safeguards

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

The initial plan preferred the existing Python cleanup command. That checkpoint's
read-only provider inspection found zero Edge Functions, no pg_cron/pg_net, and
an installed Vault with no secret entries. Edge Functions' default admin secret
supports outbound access, but does not authenticate a privileged scheduled
caller. No cleanup migration/worker/schedule or engine upgrade was applied in
the compatibility batch itself. Because no protected Python scheduler existed,
the later reviewed operation used Edge and synchronous HTTP; its completed
deployment and observed automatic run are recorded above.

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
postgres-created object defaults, and path-only Avatar INSERT. The narrow
forward migration `20261010081946`, applied as `20261010094015`, reconciled
those effects without touching private Users,
existing function definitions/ACLs, service grants or other creators' defaults.
Missing hosted Stocks/Symbols are excluded rather than inventing tables.

The owner requested actual Auth/Storage and image-cleanup completion through MCP.
No protected Python scheduler exists here, so the hosted operation uses the
existing ticket protocol in Edge with a Vault-generated caller token and cron
using synchronous HTTP; see [the deployed operation](hosted-community-cleanup-operation.md).
Provisioning, deployment, actual API acceptance and the first automatic cron run
are verified above. Main stays unmerged.

## Fresh second review, 10 October UTC / 11 October Sydney

The renewed whole-product review deployed the additive Watchlist owner-intent
guard: source `20261010111650`, hosted `20261010124654`. Legacy one-argument
definitions and ACLs are preserved; required two-argument invoker wrappers reject
wrong/null/missing identity before mutation. PR #331 merged after independent
review, required CI and actual hosted acceptance.

Fresh real Auth/Community/Storage/Watchlist/cleanup acceptance returned HTTP200
and PASS with 370 checks, zero teardown failures. Deferred real SDK token dispatch,
normal/legacy RPCs, full fixture-row/timestamp preservation after denials,
ownership/cascade, injected Storage failure/retry/ACK and Auth-FK teardown passed.
Sixteen original aggregate counts/fingerprints remained identical, including
10 Auth/10 Users/24 posts/14 comments/3 profiles/8 Storage objects. Original images
and credentials were preserved.

Temporary gate `20261010130447` was removed after proven exact fixture absence.
MCP retirement DDL returned requestState expiry; exact ticket retirement succeeded
through MCP and the reviewed table/four-function retirement ran in the signed-in
Dashboard. MCP independently confirmed gate absent/functions zero. Nineteen
ledger entries retain history, with this Dashboard retirement recorded explicitly.

Production cleanup v6 restores the exact approved v4 bundle
`c4d85371d94cade6a3fd5bbc27302b8e8cc23e0cccd881942889c63bfd8a0e69`, with no
acceptance route. Named cron is active every five minutes; fresh automatic runs
at13:20,13:30,13:35 UTC succeeded. Manual invocation HTTP200, pending0/errors0.
Full source, aggregate proof and remaining backup/SMTP/caller/deployment/admin/
engine/human limits are in [the second review](stage-readiness/SECOND-PASS.md) and
[its evidence](stage-readiness/SECOND-PASS-EVIDENCE.json). Main remains held.
