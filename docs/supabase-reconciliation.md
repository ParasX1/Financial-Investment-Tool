# Supabase replay, authorization, and hosted reconciliation

This change makes a fresh checkout reproducible with Supabase CLI **2.84.2** and
Postgres **17**. It adds native database tests and local Auth/Storage API tests.
It does **not** apply changes to a hosted project or repair a hosted migration
ledger. Local replay and hosted deployment are separate acceptance gates.

## Bootstrap decision and preserved history

The baseline is commit `3e36a257ca27a522deac6724876a6ca5adc7cb1e`.
`supabase/migration-provenance.json` preserves the original filename, version,
Git-blob SHA256, Windows checkout SHA256, intended effect, replay filename and
normalized replay SHA256 for all 28 original migration files. The original
commit remains the source of the original SQL; the manifest does not assert
that a hosted project applied those bytes.

| Alternative | Fresh bootstrap | Existing deployment consequence | Decision |
| --- | --- | --- | --- |
| Minimal compatibility corrections and explicit historical mapping | Repairs the reproduced blockers while keeping the original effect sequence | Requires per-effect ledger reconciliation; existing applied SQL does not rerun when a file changes | Selected |
| Replace the chain with a squashed new baseline | Could describe the final schema concisely | Requires a wholesale baseline/ledger transition and proof that deployed data and effects match | Deferred; larger transition without a verified hosted snapshot |
| Append only a new forward migration | Can harden an already bootstrapped database | Cannot fix a failure in an earlier migration or duplicate version | Insufficient for bootstrap |

Only two historical files change:

1. `20240922110723_remote_schema.sql` creates the missing `pgsodium` schema before
   installing the extension. Native startup otherwise fails with SQLSTATE
   `3F000`. It also keeps the unused `pgjwt` extension only below Postgres 17,
   following the current hosted compatibility guidance. The pinned local
   Postgres image still includes `pgjwt`; its absence was **not** reproduced.
2. The unchanged avatars SQL receives fresh-bootstrap version `20260508000001`.
   The two original `20260508000000` files otherwise fail with a ledger primary
   key violation (`23505`). The conditional community ownership file keeps
   `20260508000000`. This mapping does not resolve which effect an existing
   hosted `20260508000000` entry represents.

The forward migration
`20261009114306_harden_reference_grants_and_storage_ownership.sql` removes
unneeded browser privileges from public identity/reference and legacy stock
tables; removes broad future `postgres` object grants; gives public identity
only its required field grants; and uses canonical Storage `owner_id` for image
authorization. Authenticated owners gain the SELECT policy needed for Community
upsert. A legacy discussion-owner DELETE policy is removed so post authorship
alone cannot delete another image owner's metadata. Service-role maintenance
grants and existing explicit application grants remain in place.

## Local verification and CI

Run in a **disposable local checkout** with Docker running. The reset deletes
that checkout's local database data. No hosted keys, linked project, `.env`
file, paid service, or hosted credentials are needed.

```sh
node scripts/check-supabase-migrations.mjs
supabase start --exclude realtime,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
supabase db reset --local --yes
supabase db lint --local --schema public --level warning --fail-on warning
supabase test db --local
supabase db advisors --local --type security --level warn --fail-on error
node scripts/test-local-storage.mjs
supabase stop
```

The `Supabase CI` workflow runs on every PR/push targeting `DevBranch` or `main`,
without path filters. It pins the CLI and setup action, replays all migrations,
fails on function lint warnings and security advisor errors, executes pgTAP, and exercises local Auth,
Storage and REST. Failure artifacts preserve command exit results through
`pipefail`. Startup's key-bearing stdout is discarded; CLI local keys used by
the API runner stay in process memory. Cleanup stops only the runner's local
project. It never links or deploys a hosted database.

| Requirement | Native evidence | Decision/refinement |
| --- | --- | --- |
| Fresh bootstrap | Original startup fails on missing schema; fixing it exposes duplicate version; normalized chain resets successfully | Keep both failures; preserve original hash/effect map |
| Private data | Transactional owner/other/anon tests for Users, Watchlist, Top Picks and Portfolio preferences, including ownership transfer and RPC validation | Keep existing owner-only contract |
| Community authorization | Public reads, author writes/deletes, private likes/saves/reports, like idempotency, atomic ticker/post RPC and failed RPC rollback | Explicit grants complement RLS |
| Least privilege | Actual SQL-role TRUNCATE probes and fresh temporary table/function default-grant tests | Remove inherited browser ALL and implicit function EXECUTE |
| Image ownership | Real pgTAP role operations, including an unfiltered DELETE; owner/other/anon Storage metadata boundaries and bucket configuration | Use owner_id and remove the legacy discussion-owner policy |
| Storage usability | Same local API runner fails baseline Community owner upsert with HTTP 400; candidate permits owner upload/upsert/list/delete and rejects cross-owner mutation | Restore required owner SELECT policy |
| Cross-author post removal | Real REST deletion cascades another author's comment row; Storage denies removing their image; its owner then removes the synthetic orphan | Preserve object ownership; record cleanup limitation below |

Recorded local runs used `public.ecr.aws/supabase/postgres:17.6.1.095`, with
`SHOW server_version = 17.6`, and `supabase/pg_prove:3.36`. The original complete
authorization suite had 15 failing assertions of 122, including a downstream
avatar uniqueness failure caused by the preceding forged-owner INSERT. The
legacy discussion DELETE policy was separately reproduced by a new test
(one failure of 124). The corrected candidate reset succeeded, all **124 pgTAP
assertions** passed, and the actual local Auth/REST/Storage runner passed **40
checks including cleanup**. Public function lint and security advisors reported
no issues. Logs retain baseline and final results; do not infer GitHub CI success
from these local runs.

On the Windows verification host, gateway port 54321 was configured but Docker
did not publish it. A runtime-only port 54331 isolated that infrastructure
failure and allowed real API tests. Repository and Ubuntu CI config retain
54321. Two failed local startup attempts are preserved as infrastructure
outcomes, not passing API tests.

Tests intentionally distinguish SQL-role capability from remote exposure.
PostgREST has no TRUNCATE operation; a pgTAP TRUNCATE failure is least-privilege
evidence, not proof of remotely reachable anonymous destruction. Storage assigns
owner_id server-side; a direct SQL forged-owner test does not by itself prove a
forged-owner HTTP request is accepted. Bucket catalog assertions verify settings;
they do not independently test MIME/size enforcement for every Storage transport.

A separate provider-boundary experiment found that the managed Storage tables
carry `supabase_storage_admin`-granted browser TRUNCATE/REFERENCES/TRIGGER ACLs.
An attempted `postgres` REVOKE left those privileges unchanged even inside a
transaction; `postgres` is neither a superuser nor a member of the owning role,
and setting that role failed with permission denied. A proposed assertion that
all managed ACLs could be removed therefore failed (one of 125 tests). It is
not part of the final gate: this app cannot enforce it through its supported
migration role. The ineffective REVOKE was removed. Logs preserve the failure;
no role escalation or managed-schema workaround is introduced. This remains a
provider-owned ACL limitation, distinct from application-owned table grants and
the actually exposed Storage API, whose mutation policies are tested here.
`supabase/diagnostics/managed_storage_privileges.sql` preserves the proposed
check as a read-only deferred diagnostic: it reports table owner, grantor,
effective browser privileges, role login capability and ordinary migration-role
authority. Any provider-level grant change requires its own supported authority
and review. The final gate makes no managed Storage table-ACL hardening claim.

## Effect-by-effect hosted deployment plan: #268 and #148

The read-only readiness audit of configured project `egjnhetinyoyrhbetbxi` on
2026-10-09 reported 13 public tables with RLS enabled; only `comment-images`,
public with a five MiB jpeg/png/webp/gif allowlist; and no avatars bucket.
`comments.author_id`, `comments.post_id`, and `posts.author_id` had no covering
index. The public profile INSERT/UPDATE policies still used per-row `auth.uid()`.
Like/unlike remained authenticated-only SECURITY DEFINER RPCs; anonymous and
authenticated roles could not execute the auth trigger. No hosted account or
Storage mutation tests were run. Refresh this snapshot before an approved
deployment; RLS/table counts alone do not establish the effects below.

The reported ledger has ten entries:

| Hosted version | Recorded effect/name |
| --- | --- |
| 20240922110723 | remote_schema |
| 20240922112057 | remote_schema |
| 20260428025441 | remote_schema |
| 20260714173009 | Watchlist |
| 20260718144214 | research loop |
| 20260719045820 | post tickers |
| 20260719060205 | atomic post/ticker creation |
| 20260724013151 | content limits |
| 20260724014324 | image references |
| 20260724015307 | image path integrity |

Several hosted versions differ from repository versions for similarly named
effects. Matching names is not proof of matching SQL. The avatars and Community
index source migrations have neither matching ledger entries nor the requested
catalog effects. Preserve the original hosted versions and inspect their stored
statements before proposing any ledger bookkeeping.

### Capture and reconcile

1. Identify the hosted environment, application commit and Postgres version.
   Capture table/column/constraint/index definitions, policy definitions and
   applicable roles, table/column/function/default grants, RPC definitions and
   search paths, triggers, bucket settings, owner_id coverage, and migration
   ledger **versions, names and stored statements**. Do not export personal data
   into PR artifacts. Compare structural fingerprints and redacted counts.
2. Save a database backup and the prior schema/policy/grant definitions; verify
   restoration into an isolated project. Inventory Storage separately: database
   backups do not back up the object bytes. Preserve current bucket settings,
   referenced paths and the object recovery procedure.
3. Use the following inventory and the manifest hashes to assign each effect:
   **present and matching**, **missing**, **present but different**, or
   **unverified**. A filename or ledger count alone cannot assign a status.

| Historical effect group | Compare before deciding to apply |
| --- | --- |
| 2024 base schema and auth trigger | Extensions supported by the actual PG version; Stocks/Symbols/Users constraints, trigger body and final grants |
| Original duplicate 20260508000000 | Distinguish conditional community ownership statements from avatars bucket/policies using stored statements and actual catalog effects |
| 20260508010000 community bootstrap | profiles/tickers/posts/comments columns, public reads, final author policies, comment-images bucket and policies |
| 20260508020000 likes | post_likes key/FKs, private SELECT, like/unlike bodies, explicit EXECUTE and auth guards |
| 20260508030000 through 20260509020000 | body/tags/image fields, actual attachment references and historical cleanup policy |
| 20260509030000 and 20260509040000 | authenticated authorship and author-only comment deletion, with final storage policy union |
| 20260517090000 and 20260628090000 | phone, handle constraints and partial unique handle index |
| 20260714173009 Watchlist | Existing symbol validity, normalized duplicates/counts/positions, constraints, owner policies, RPC contracts and trigger |
| 20260717090000 profile security | Private Users fields/grants, auth-trigger/backfill completeness, canonical avatar path and owner_id coverage |
| 20260717110000 Community grants | Column grants, no direct vote mutation, no broad table privileges, no anonymous mutation RPCs |
| 20260718131804 research loop | Typed post metadata, private saves, private reports and moderation-only status writes |
| 20260719030238 and 20260719053615 | Ordered ticker schema/backfill, atomic creation RPC, deferred primary-ticker consistency |
| 20260724013151 through 20260724015410 | Existing title/body validity and the exact URL-to-path transformation; invalid references must be reviewed before data updates |
| 20260731093733 and 20260731094217 | Owner preferences plus seed rows, with duplicates and existing ticker edits considered |
| 20260731094703 | Profile policies plus comments author/post and posts author indexes; #268 requires verifying each actual index before installation |
| 20260731124305 | Portfolio ownership, existing primary/FK keys, tags and unknown legacy owners; fail rather than invent ownership |
| 20260808010000 | Curated universe constraints/read policy and data backfill/upsert effects |
| New forward hardening | Actual public/column/default privileges, service maintenance, canonical owner_id and all permissive Storage policies; unknown hosted policies need review |

For #268, an absent avatars bucket requires the bucket **and** its final policy
effects; marking a version applied cannot create them. Verify each requested
FK/index by columns and validity, not merely index names. RLS-enabled table
counts do not prove owner filters, grants, RPC execution or Storage settings.
For #268, completion additionally requires the reviewed effect/ledger plan,
explicitly authorized apply, real own-avatar upsert/foreign-user denial, and
advisors on the changed hosted project. These deployment gates remain pending.
For #148, general schema/Storage robustness includes the unresolved image cleanup
boundary below. Do not infer either issue is complete from merged code or passing
local tests.

### Apply only reviewed missing effects

Prepare an environment-specific migration from the reconciled inventory. Review
data transforms and preconditions separately from DDL, since some historical
migrations normalize/delete duplicates, backfill rows, rewrite image references
or overwrite curated data. Do not blindly replay the entire old chain on a
populated project: historical permissive policies and grants must not be
temporarily reintroduced. Do not rename the hosted ledger to match fresh-local
filenames. Ledger repair is a **separate** reviewed bookkeeping operation, only
after proving the corresponding effects already exist or were successfully
applied. No ready-to-run hosted repair command is part of this PR.

Apply within the approved maintenance boundary. Where transactional DDL applies,
use a transaction and fail on unmet preconditions. Independently validate each
changed table/grant/RPC/bucket effect and run role-level tests in the restored
staging project. Run actual Auth/REST/Storage application flows with designated
test accounts before and after the approved hosted change. Record deployment
commit, environment, snapshot/backup identity, migration content hashes and
acceptance results. Only then reconcile bookkeeping and resolve deployment issues.

### Failure and recovery

Stop on the first mismatched precondition or failed acceptance. Roll back an
uncommitted DDL transaction. For committed changes, restore the captured prior
policies/grants/definitions or execute a separately reviewed compensating
migration; avoid restoring the old broad permissions as a generic rollback.
Restore transformed data from the verified backup where necessary. Restore
Storage objects through its API from the separate object backup; do not delete
storage metadata directly. Preserve the failed run and immutable attribution.
Reverify before resuming application writes or marking the ledger repaired.

## Remaining acceptance boundaries

An additional hosted read-only catalog check found image-reference CHECK
constraints on posts/comments and no noninternal triggers on those two tables.
The checks validate the path format; they do not establish Storage ownership or
durable cleanup. A migration-ledger name must not be interpreted as proof that a
particular trigger exists. Reconcile actual constraints/functions/policies as
well as ledger rows before proposing hosted changes.

Local SQL tests have no meaningful application line-coverage percentage. They
exercise real database effects and denied paths; the existing frontend source
pattern tests are supplemental. CI has not run until a pushed PR's actual
workflow result is checked. No live database/schema/data/ledger/key change is
included, and comment length constraints are a separate lane.

Owner-only image policies intentionally prevent a discussion author from removing
another author's image after a comment cascade. The local REST/Storage scenario
shows that such **public objects remain orphaned**, which is a remaining cleanup
and privacy gate, not successful cleanup. Complete orphan cleanup needs an explicitly
authorized server/maintenance design that proves deleted-parent ownership and
uses the Storage API; do not grant all users another author's files or put a
service key in the browser. This PR establishes the boundary and tests it; it
does not claim automatic orphan cleanup or hosted acceptance.

Primary references checked for this work:
[CLI and migrations](https://supabase.com/docs/reference/cli/supabase-db-reset),
[database testing](https://supabase.com/docs/guides/local-development/testing/overview),
[Storage ownership](https://supabase.com/docs/guides/storage/security/ownership),
[Storage access control](https://supabase.com/docs/guides/storage/security/access-control),
[managed Storage schema](https://supabase.com/docs/guides/storage/schema/design),
[Postgres 17 pgjwt compatibility](https://supabase.com/docs/guides/database/extensions/pgjwt),
[setup action](https://github.com/supabase/setup-cli).
