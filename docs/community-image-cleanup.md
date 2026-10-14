# Community image cleanup

## Development-phase boundary

This phase covers normal application uploads (fresh UUID paths, default
non-upsert) and persisted post/comment deletion with existing, verified Storage
metadata. Independent review additionally reproduced a direct-owner Storage
edge: pause a same-path upsert, remove the original object, delete the relational
references while metadata is absent, then finish the upload. No cleanup ticket
was captured, so the restored owner-controlled object is not discovered. No
foreign ownership/data bypass was demonstrated. The owner scoped this phase to
basic usability; this conditional P2 is recorded for follow-up in issue#268.
Eventual cleanup assumes metadata exists when deletion captures authority;
do not claim all direct Storage mutations are covered. Revisit provenance before
adding persisted image replacement/move flows. Hosted schedule and CDN behavior
remain separate operational acceptance.

Deleting a persisted discussion or comment removes its relational rows and records
any verified, unreferenced attachment in the same database transaction. A protected
server command removes the captured path through the Storage API. Discussion
authors can therefore delete discussions containing images uploaded by other
comment authors without receiving authority over those authors' Storage objects.

The forward migration requires the owner-correct Storage policies from #288.
It adds one private ticket/reservation table, application-table triggers, restrictive
Storage INSERT/UPDATE policies, and four service-role-only worker RPCs. It does not
modify provider-managed Storage triggers or SQL-delete Storage metadata.

## Authority and concurrency

Removed attachments derive authority from the OLD application record, the valid
`posts/<generated-name>.<extension>` or `comments/<post-id>/<generated-name>.<extension>`
namespace, and the actual object's canonical `owner_id`. The trigger locks the
object, then separately checks references from every author before reserving it.
Forged legacy references and remaining shared references cannot authorize cleanup.
INSERT and reference-change validation checks the actual owner and reservation.
Comment attachment takes the parent's `FOR KEY SHARE` lock before the object lock;
the fresh checks after waiting prevent reattachment from racing with deletion.
Nullable and image-only records remain supported. This adds no persisted user
attachment-editing flow.

The worker accepts IDs from the protected list RPC, never a user-provided path.
Dispatch touches `last_attempt_at`, checks current ownership and references, and
returns the captured path. Never-attempted work precedes attempted work. Failure
diagnostics are bounded codes; a failed path does not starve later tickets.
The server uses `Storage.remove`, then ACK checks current metadata absence.
Failures remain eligible for retry. A crash after removal and before ACK, duplicate
dispatch, or a successful empty removal response can safely be replayed.

The path reservation survives successful cleanup. Completed rows clear the old
object UUID and obsolete errors, while retaining the private original owner needed
to detect an unexpected owner replacement. App filenames contain generated object
and post IDs, not owner UUIDs. A mismatching current owner fails closed with a
private diagnostic. Browsers cannot read or mutate tickets or call worker RPCs.

## Late uploads and deletion limits

The inspected CLI 2.84.2 stack runs Storage 1.44.11. That implementation checks
upload permission before consuming the complete stream and commits completion
with elevated database access. An already-authorized upload can consequently
finish after cleanup and restore a reserved path with a different object UUID.
This is an untrusted in-flight request. Completed reservations which are occupied
again are included in subsequent worker runs; matching-owner late completions
are removed again. New authenticated INSERT, upsert, rename into a reserved path,
and reattachment are rejected.

`Storage.remove` accepts a path and cannot atomically bind deletion to an immutable
object UUID or owner. The authority is retirement of the verified captured path.
The pre-removal owner check detects an unexpected replacement present at lookup;
it does not make lookup and API deletion one atomic operation. Trusted admin or
service-role replacement writes are outside the untrusted-request boundary.

The guarantee is eventual origin absence after finite in-flight uploads quiesce,
the Storage service recovers, and scheduled worker runs succeed. It is not instant
erasure. The next scheduled invocation determines retry delay. Public browser/CDN
cached copies can outlive origin deletion; this command does not purge those caches.
Historical orphan cleanup needs a separate read-only inventory because deleted
records cannot retroactively prove ownership.

## Protected operation

Install the existing server requirements and provide `SUPABASE_URL` plus an explicit
`SUPABASE_SERVICE_ROLE_KEY` through the server's protected environment or secret
manager. Do not use browser variables or commit the credential. The command does
not fall back to `SUPABASE_KEY` or accept path arguments.

```bash
python scripts/cleanup_community_images.py --limit 100
```

One invocation processes at most 100 tickets. RPC and Storage requests have bounded
timeouts. Output contains aggregate counts; any attempted failure gives a nonzero
exit status. Monitor failures, pending age and backlog privately and select an
appropriate recurring interval and batch capacity for the actual volume. Retain
the reservations so late completions remain detectable.

Hosted acceptance remains a reviewed migration deployment, protected command,
observed recurring schedule and recovery/retry evidence. This source change does
not create a hosted schedule or change hosted configuration or credentials.

## Local evidence and reproduction

The native pgTAP test runs inside a rollback transaction. It covers cross-author
cascade, rollback, forged OLD ownership, shared references, removed OLD attachment,
role/RPC denial, pending/completed reservations, fairness and owner mismatch. Native
Storage metadata fixtures are renamed to test absence; no metadata DELETE is used.
Those fixtures do not prove physical-byte deletion.

```bash
supabase test db supabase/tests/database/community_image_cleanup.test.sql --local --workdir <disposable-local-project>
node scripts/test-local-community-cleanup.mjs <disposable-local-project> <python-with-server-requirements>
```

The API runner reads keys only from CLI local status, requires a loopback HTTP URL,
checks that no preexisting cleanup work exists, and requires exclusive access to
the disposable stack. It creates dummy users and exact tracked objects, and cleans
only those users, application rows, Storage paths and private fixture reservations.
It neither resets nor links a project. Its backing-file control is deliberately
pinned to the inspected local file backend and Storage 1.44.11.

Verified controls include a real cross-author cascade, physical backing-byte and
public-origin absence after retry, unrelated image/avatar survival, one failed
batch followed by fair later work, crash after removal before ACK, duplicate ACK,
coordinated duplicate worker processes, and both attachment/parent-deletion
orderings using actual blocking PIDs. A parent-only lock also proves that a waiting
attachment has not acquired the object lock first. The timeout control injects a
Storage exception while retaining real RPCs.

For the streaming control, the loopback Kong gateway buffered the partial body,
so that route did not reach the paused authorized-upload state. The runner sends
the same genuine user JWT to the HTTP Storage API from inside its local container,
without changing provider configuration. It observes a second physical version
before deletion, removes/ACKs the original object while the stream remains paused,
resumes it, verifies a changed object UUID, and verifies that the next worker run
removes the restored bytes. This reproduces the Storage boundary, not hosted
gateway behavior or hosted scheduling. The browser deletion service is verified
by Community behavior tests; a hosted browser flow remains a release gate.

Local candidate checkpoint, 10 October 2026:

| Requirement | Evidence and refinement | Verification |
| --- | --- | --- |
| Durable authority and rollback | Baseline had no cleanup table or noninternal Community triggers; the first pgTAP assertion failed. A trigger record-field error was corrected using separate post/comment branches. | 44 native checks pass, including forge, shared-reference, privilege and rollback controls. |
| Safe retry and fair service work | Real Storage timeout injection left the ticket and bytes; later unattempted work completed first, and the failed ticket completed on retry. Two coordinated worker processes used the same real server-selected ID. | API checks confirm physical files and metadata disappear, unrelated image/avatar remain, and crash/duplicate replay succeeds. |
| Reattachment and parent ordering | Pending/completed paths reject writes and references. A waiting comment attachment leaves its object lock available while the parent is held; the reverse ordering cascades the committed attachment. | Native role/path controls plus actual blocking-PID and `NOWAIT` API controls pass. |
| Late completion recovery | Under the same restored-path condition, pending-only selection omits the ticket; completed occupied-path reconciliation includes it. The second physical version proves initial Storage authorization before deletion. | Resumed upload creates a different object UUID, and the next actual worker removes its bytes. Kong buffering and direct Storage evidence are recorded separately. |
| Application integration | Browser persisted deletion stops enumerating/removing files; failed unpersisted upload cleanup remains. Error and cross-author negative controls preserve failed deletions. | 237 Community tests pass; service statements 83.6%, lines 85.04%, branches 71.42%. TypeScript and affected ESLint pass. |
| Backend and source quality | Pinned server dependencies are reused. Sandbox temporary-directory/hard-link failures were reproduced, then the same full suite ran natively without weakening checks. | 435 backend tests pass; compilation, fatal/configured flake8, database lint/security advisors and diff whitespace checks pass. Standard-library trace reports 99% worker line coverage; Python branch coverage is unmeasured. |

The standard server/ticket design reuses existing Python/Supabase dependencies and
service credentials. Custom Storage JWT roles or PGMQ would add provisioning and
operational state without solving the observed late elevated completion by
themselves. No such credentials, extensions, leases or provider hooks were added.
Independent final review of the complete candidate is performed by the parent
integration workflow; passing local checks are not hosted acceptance.

Primary references: [Storage access control](https://supabase.com/docs/guides/storage/security/access-control),
[Python removal API](https://supabase.com/docs/reference/python/storage-from-remove),
[Storage 1.44.11 uploader](https://github.com/supabase/storage/blob/v1.44.11/src/storage/uploader.ts),
[PostgreSQL 17 locking](https://www.postgresql.org/docs/17/explicit-locking.html),
and [function snapshots](https://www.postgresql.org/docs/17/xfunc-volatility.html).
