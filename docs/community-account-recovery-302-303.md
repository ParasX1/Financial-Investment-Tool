# Community account intent and initial-load recovery

Community writes retain the account that started the action. The post-creation
RPC compares `p_expected_author_id` with `auth.uid()` before inserting the post
and ordered tickers. Like and unlike RPCs compare `p_expected_user_id` before
changing votes. Saves and reports send explicit `user_id` and `reporter_id`;
the existing ownership RLS checks those columns against the request JWT. The
legacy post and comment inserts already carry an explicit `author_id`, and
owner-filtered deletions retain their existing contract.

This check belongs inside the database request. In installed
`@supabase/supabase-js` 2.52.1, REST authentication awaits a fresh session/token
lookup after a service-level `getSession()` check. A sign-in can replace A's
session with B's before that lookup finishes. A same-owner session replacement
still passes the account comparison.

## Migration and caller compatibility

Apply `20261009152052_community_expected_account_intent.sql` with the caller
update as a coordinated deployment. It drops the old creation and like/unlike
signatures and creates one signature per RPC, avoiding ambiguous overloads.
The new expected-owner parameters are required. PostgREST schema reload is
requested by the migration.

New callers against the old database cannot use the new like signatures, and
explicit save/report identities need the new column grants. A missing creation
signature keeps the existing legacy fallback for zero or one ticker; every
fallback insert still includes the original `author_id`, so ownership RLS
rejects a switched request. Multiple tickers continue to require the atomic
RPC. Old like callers fail after the signature change. Older default-identity
save/report callers do not gain account-intent protection until updated.

The initial empty-feed error now offers **Try again** without navigation or an
auth change. The existing load lifecycle deduplicates repeated retry clicks
and discards replies after an account change. A cached feed stays visible when
refreshing fails; its optimistic changes and existing partial-error behavior
are retained.

## Verification evidence

- Repository red tests first failed for missing expected create/like arguments
  and omitted save/report owner columns; all four failures passed after the fix.
- The actual installed SDK regression uses controlled auth locks and a mocked
  Data API: 11 cases cover switched JWTs, same-owner session replacement and
  the explicit-author legacy fallback. This is request-handoff evidence, not a
  hosted-provider test.
- `supabase/tests/database/community_expected_account_intent.test.sql` passes
  30 native pgTAP assertions in a disposable PostgreSQL 17.6 local stack. Its
  transaction rolls back fixtures. It covers anonymous and missing-JWT denial,
  valid owner writes, null/mismatched owners, idempotence and unchanged rows,
  votes and tickers after rejection.
- The shared authorization suite from #288 now supplies the new RPC arguments
  and explicit save/report identities. Its 124 assertions plus the 30 account
  intent assertions passed all 154 native cases. The local
  Auth/Community/Storage API runner passed 63 checks with real B-token/A-intent
  rejection controls, matched-account controls and exact synthetic cleanup.
  It retains the original Storage ownership and orphan checks; those establish
  the owner boundary, not automatic orphan cleanup. This serialized integration
  run used a local schema containing temporary #292/#296 effects beyond this
  branch. It is not a source-only fresh replay.
- Independent review found that an unexpectedly accepted mismatch probe could
  create an untracked post before its denial assertion threw. The runner now
  records returned IDs before asserting and cleans the exact unique probe title
  after ambiguous responses. Four full-runner controlled-transport cases
  (accepted 200, opaque 500, 42501 after persistence, network failure after
  persistence) left no synthetic posts, objects or users and preserved unrelated
  sentinels. The original failure remained visible. These controls are simulated
  failure-path evidence, separate from the real API run.
- The Chromium regression in `communityLoadRecovery.spec.ts` intercepts Data
  API responses and verifies an initial failure followed by in-place recovery.
  Hook tests cover duplicate retry clicks, account-switch races and cached
  optimistic state. These browser fixtures do not verify hosted auth or RLS.

The native migration was applied incrementally to the disposable stack;
no database reset, linked database operation or hosted schema change ran.
Auth/Profile account-intent changes belong to their separate implementation.

Primary references: [Supabase database functions](https://supabase.com/docs/guides/database/functions),
[RLS ownership checks](https://supabase.com/docs/guides/database/postgres/row-level-security),
[JavaScript RPC calls](https://supabase.com/docs/reference/javascript/rpc).
