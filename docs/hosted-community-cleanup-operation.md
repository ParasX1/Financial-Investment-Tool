# Hosted Community cleanup operation

Tracking #268. Hosted schema alignment, real Auth/Storage acceptance and the
production cleanup worker are deployed on `egjnhetinyoyrhbetbxi` (PostgreSQL
17.6). The existing Python command remains available for protected server jobs;
this project's deployed scheduler uses the same SQL ticket protocol through
Supabase Edge, pg_cron and synchronous HTTP.

## Current hosted evidence, 10 October 2026

`community-image-cleanup` version 4 is ACTIVE with custom Bearer authentication
and `verify_jwt=false`. Retrieved `index.ts` and `cleanup.mjs` exactly match the
approved production source; no acceptance handler/file remains. The retrieved
bundle SHA256 is
`c4d85371d94cade6a3fd5bbc27302b8e8cc23e0cccd881942889c63bfd8a0e69`.

The protected SQL invocation returned HTTP 200 with all six aggregate counts
zero. External GET returned 405; missing and wrong Bearer tokens returned 401
with zero cleanup attempts. Cron job 1, `fit-community-image-cleanup`, was
scheduled at `2026-10-10T10:00:38Z` for `*/5 * * * *`, with an 80-second statement
timeout. The first automatic run (run ID 1) succeeded from
`2026-10-10T10:05:00.114046Z` to `2026-10-10T10:05:01.867628Z`, returning
`1 row`. The private dispatcher raises on non-200 responses or failed aggregates,
so this records protected worker completion; cron itself retains no raw HTTP body.
Read-back found zero pending tickets, no oldest pending timestamp and zero errors.

Two actual synthetic Auth/Storage runs used the intended Edge function. The
first failed at `comment_insert`: its fixture supplied `comments.id`, which the
production column grant correctly denied. Only the fixture was corrected to use
a database-generated ID. The first response recorded 219 checks; the corrected
HTTP 200 response passed 269 checks. Stored results contain 218 and 268 respectively
because the final finish assertion occurs after result storage. Both outcomes
remain in ignored `server/.cache/hosted-edge/hosted-acceptance-results.json`.

The corrected run covered sign-in/refresh; old 9/1/1 and new 10/2/2 RPC dispatch;
wrong/null account-intent denial; owner avatar/Community upload and upsert;
foreign-user and anonymous metadata denial; cross-author cascade; a forced
Storage API failure with a durable pending diagnostic, actual retry and ACK;
public object endpoint and Storage metadata absence; idempotent retry; unrelated fixture
survival; and exact Auth/Storage API teardown. Independent SQL read-back found
zero fixture Auth users, app users, profiles, posts, comments and objects.

Original counts are restored exactly: 10 Auth users, 10 app users, 24 posts,
14 comments, 3 profiles and 8 objects. Five application-row/object aggregate
fingerprints also match the baseline. The seven historical unreferenced
candidates (five legacy names and two valid post paths) were preserved. This
operation performs no historical orphan sweep or bucket-visibility change.

The temporary gate was created at ledger version `20261010094333` and retired
at `20261010095938` after fresh review. Only its three synthetic reservations
were removed; all four temporary RPCs and the gate table are absent. The ledger
now contains 17 entries and preserves the initial ten; all 11 pre-compatibility
versions/names/statement fingerprints are unchanged. Final read-back after
temporary DDL removal reconfirmed the original counts/fingerprints and unchanged
definitions/ACLs for all pre-existing public functions.

## Authority and credentials

Canonical Community owner policies and reviewed durable cleanup SQL were applied
before provisioning this worker. A 32-byte caller token was generated inside SQL
and encrypted in Vault; existing credentials were neither rotated nor exported.
The service-role credential stays in the Edge environment. Edge uses it to call
the existing service-only list, dispatch, error and ACK RPCs. The additional validator RPC
returns only a boolean and is service-only. Browser roles cannot read Vault,
or call the administrator dispatcher. The synchronous transport never stores
the token in pg_net queues; DEBUG2 header tracing is rejected.

Deploy `community-image-cleanup` with `verify_jwt=false` because its machine token
is not a Supabase JWT. The handler validates that token before any cleanup work;
this setting is supported only together with that custom authentication. Missing
credentials, wrong tokens and failed validation deny work. Never add a token
fetching endpoint or log request headers, keys, object paths or owner IDs.

The worker processes at most ten server-selected tickets with a 60-second budget
and eight-second request deadlines, including response reads. Existing SQL
reservations, metadata checks and ACK/retry rules support duplicate invocations;
no additional lease mechanism is required. Output contains aggregate counts;
failed or incomplete work returns HTTP503 and remains eligible for the next run.

## Deployment and recurring execution

Source migrations provision transport/authentication but schedule no HTTP calls.
Deploy the reviewed function, verify its actual source/version, then run the
administrator operation in
[community-image-cleanup-schedule.sql](../supabase/operations/community-image-cleanup-schedule.sql)
with the verified project URL. The operation invokes one batch every five minutes.
The private dispatcher uses a 70-second HTTP timeout and returns only validated
aggregate counts. It holds one cron connection while awaiting Edge; no app or
secret row locks or uncommitted gate changes may be held across that call.
The pinned HTTP driver follows redirects. Standard Authorization protects the
credential across origins on modern libcurl; use the trusted project endpoint.
The actual hosted libcurl version is not claimed as observed. SDK requests from
Edge explicitly reject redirects. The operation does not claim no redirects.

Observe `cron.job_run_details` and the dispatcher's sanitized HTTP status and
aggregate body. The dispatcher waits for the worker and raises a bounded error
on non200/incomplete work, so failed HTTP invocations fail the cron run. Monitor failures,
pending age and backlog privately. The interval and capacity are explicit
operational settings; adjust them to actual volume after checking failed work.
Disable the named cron job before a worker rollback. Do not delete reservations
or rotate the caller token as a generic failure response.

## Acceptance and limits

Source PR #322 merged after all six required checks passed. Revised Linux CI
passed 36 migrations, eight SQL files with 269 assertions, lint/advisors,
85 real local cleanup checks and 63 local Auth/Community/Storage controls.
The worker's 37 unit tests passed with 100% line/branch and 88.24% function
coverage, covering authentication, dispatch ownership/path boundaries, Storage
failures, ACK restoration, fairness, idempotency and deadlines. Native Windows
Docker replay is **NOT RUN** because the existing startup failure remains;
Linux CI and actual hosted acceptance are separate execution evidence.

Hosted acceptance used two synthetic users per run and exact registered
posts/images.
An expiring service-only gate temporarily enabled the acceptance handler in the
same intended function; no permanent second test function was created. Passwords,
JWTs and keys stayed in process memory. The registry contains only fixture IDs,
synthetic addresses/titles and object paths. The checks included old/new RPC
dispatch, sign-in/refresh, owner upload/upsert, foreign-user and anonymous metadata
denial, cross-author cascade, forced Storage failure followed by actual retry,
and survival of unrelated fixtures. Already server-selected ticket IDs were
filtered to registered fixtures; other work was not swept to expose a test ticket.

Synthetic sessions were signed out, exact fixture rows/objects/users were deleted
through their APIs, and absence was verified before retiring the gate and only its
synthetic tickets. The production handler was redeployed with acceptance code
removed; the first automatic cron run succeeded as recorded above. Preserve the
registry and failure evidence for future runs if cleanup is incomplete. User deletion
does not instantly revoke previously issued access JWTs; they are never exported.
Storage metadata/public object endpoint absence does not certify physical backing
bytes or CDN expiry. Historic orphan candidates need provenance before deletion.

Current application uploads use generated paths; the known owner-controlled
missing-metadata upsert edge remains documented in [the cleanup protocol](community-image-cleanup.md).
No universal deletion guarantee, full backup/restore, engine upgrade, SMTP
delivery or human UI acceptance is inferred from these checks. Broader #268
engine/SMTP/backups/governance/Vercel work remains partly open. Main stays
unmerged in draft PR #319; hosted completion is a separate boundary.

Primary references: [Edge authentication](https://supabase.com/docs/guides/functions/auth-headers),
[injected secrets](https://supabase.com/docs/guides/functions/secrets),
[scheduled functions](https://supabase.com/docs/guides/functions/schedule-functions),
[HTTP extension](https://supabase.com/docs/guides/database/extensions/http),
[Vault](https://supabase.com/docs/guides/database/vault).

The initial pg_net design failed real Linux CI: the provider owns its tables and
PUBLIC can read queued headers. Ordinary REVOKE cannot remove those grants.
The corrected transport avoids that queue instead of weakening the failed
confidentiality check. [Provider explanation](https://supabase.com/docs/guides/troubleshooting/database-roles-can-read-request-headers-queued-by-pg_net-ad6357).
