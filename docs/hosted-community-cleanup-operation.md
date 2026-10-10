# Hosted Community cleanup operation

Tracking #268. The existing Python command remains available for protected server
jobs. This project has no established protected Python scheduler; the deployed
operation uses the same SQL ticket protocol in a Supabase Edge Function, invoked
by pg_cron/pg_net. It does not sweep old unreferenced objects or change public
bucket visibility. Original data and object counts must be preserved separately
from synthetic acceptance fixtures.

## Authority and credentials

Apply canonical Community owner policies and the reviewed durable cleanup SQL
before provisioning this worker. A 32-byte caller token is generated inside SQL
and encrypted in Vault; existing service credentials are neither rotated nor
exported. Edge uses Supabase's injected service credential to call the existing
service-only list, dispatch, error and ACK RPCs. The additional validator RPC
returns only a boolean and is service-only. Browser roles cannot read Vault,
transport headers/responses, or call the administrator dispatcher.

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
The private dispatcher uses a 70-second HTTP timeout and never returns the token.

Observe `cron.job_run_details` and the corresponding `net._http_response` status
and aggregate body. Cron success or a pg_net request ID only proves queuing;
HTTP200 plus successful cleanup counts proves the invocation. Monitor failures,
pending age and backlog privately. The interval and capacity are explicit
operational settings; adjust them to actual volume after checking failed work.
Disable the named cron job before a worker rollback. Do not delete reservations
or rotate the caller token as a generic failure response.

## Acceptance and limits

Worker unit tests cover authentication, dispatch ownership/path boundaries,
Storage failures, ACK restoration, fairness, idempotency and deadlines. Native
SQL checks cover validator/dispatcher grants, protected transport/secret access,
reference grants and avatar ownership. Local Docker startup currently fails;
do not report the prepared native replay/round-trip as executed. Required Linux
CI and actual hosted acceptance must supply the missing execution evidence.

Hosted acceptance uses two synthetic users and exact registered posts/images.
An expiring service-only gate temporarily enables the acceptance handler in the
same intended function; no permanent second test function is created. Passwords,
JWTs and keys stay in process memory. The registry contains only fixture IDs,
synthetic addresses/titles and object paths. Check old/new RPC dispatch, sign-in
and refresh, owner upload/upsert, foreign-user denial, anonymous metadata denial,
cross-author cascade, a forced Storage failure followed by actual retry, and
survival of unrelated fixtures. Filter already server-selected ticket IDs to the
registered fixtures; never sweep other work merely to expose the test ticket.

Finally sign out synthetic sessions, delete exact fixture rows/objects/users,
verify absence, then remove only their tickets and temporary gate/RPCs. Redeploy
the production handler with acceptance code removed and observe a scheduled run.
Preserve the registry and failure evidence if cleanup is incomplete. User deletion
does not instantly revoke previously issued access JWTs; they are never exported.
Storage metadata/authenticated-origin absence does not certify physical backing
bytes or CDN expiry. Historic orphan candidates need provenance before deletion.

Current application uploads use generated paths; the known owner-controlled
missing-metadata upsert edge remains documented in [the cleanup protocol](community-image-cleanup.md).
No universal deletion guarantee, full backup/restore, engine upgrade, SMTP
delivery or human UI acceptance is inferred from these checks.

Primary references: [Edge authentication](https://supabase.com/docs/guides/functions/auth-headers),
[injected secrets](https://supabase.com/docs/guides/functions/secrets),
[scheduled functions](https://supabase.com/docs/guides/functions/schedule-functions),
[pg_net](https://supabase.com/docs/guides/database/extensions/pg_net),
[Vault](https://supabase.com/docs/guides/database/vault).
