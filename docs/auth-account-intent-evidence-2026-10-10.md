# Auth account intent and recovery evidence

Candidate for #303 and the Sidebar/Profile portions of #302. Base:
`dd50077ef580b17542b31af97572dc1b00bfa4b2`. No live Auth, email, database,
credential, commit, push, or deployment actions were performed.

## Requirements and decisions

| Requirement | Evidence and decision | Verification |
| --- | --- | --- |
| A late bootstrap cannot restore an earlier account | Keep the explicit `getSession` bootstrap for failure/loading handling, but auth events take precedence. Ignore a late `INITIAL_SESSION` after another auth event. | Bootstrap success/failure after sign-out and initial event after account B tests. |
| A queued credential change cannot select another account | Installed auth-js `updateUser` acquires a lock before selecting `_useSession`; a concurrent password sign-in can save B while A's update waits. Pass intended `userId`, resolve one session, check its owner, then dispatch `PUT /auth/v1/user` immediately with that fixed Bearer. | Installed SDK with synchronous fake storage, controlled lock and intercepted fetch: queued password/email A requests reject without a user mutation when B becomes current. |
| A late response cannot overwrite the current SDK session | The narrow request returns account status without saving a shared session or emitting `USER_UPDATED`. Controller owner guards still govern UI changes. | Hold A's PUT, sign in B using the installed SDK, return A's response; SDK storage remains B. Real Chromium also verifies B's profile and cleared password dialog. |
| A refreshed token for the same account remains valid | Compare account ID, not access-token equality. | Installed SDK storage replaced with refreshed A token; outbound Authorization uses that token. Missing session rejects before dispatch. |
| Pending email status survives Profile remount | Profile entry loads the profile row and `GET /auth/v1/user` concurrently. The Auth read uses the same fixed Bearer boundary and its result only populates the current owner view. | Profile remount under unchanged auth user recovers server `new_email`; browser re-entry shows pending email. |
| A stale Auth read must not sign out a newer account | Installed `_getUser(jwt)` avoids session selection on success, but its `AuthSessionMissingError` catch removes the **shared** session. Use the narrow GET rather than shared `getUser(jwt)`. | Hold A's GET, sign in B, return `session_not_found` 403; SDK storage remains B. |
| Initial Profile load can recover without refreshing/signing in again | Retry increments the existing load effect attempt; load resets its feedback/loading state and retains account owner guards. | Failure -> in-place Retry -> loaded snapshot -> successful identity edit in Chromium. |
| Sign-out rejection is handled and retryable | Await the action, disable it while pending, display safe inline failure, restore the action. Discard feedback after the owner changes. | Unit and Chromium: held logout -> 500 -> visible error and enabled action -> retry 204 -> signed out. |

### Credential boundary comparison

Common task: dispatch A's password/email mutation while the global SDK lock is
held, sign in B before release, and later return an A response. Criteria: correct
account token, no stale global session writes, preserved email redirect/errors,
and a small maintainable boundary.

- A separate SDK client bound through `setSession` adds initialization/user reads;
  an expired copied session may rotate a refresh token without updating the
  main client. Hand-seeding a private session adds storage lifecycle machinery.
- The selected narrow GET/PUT Auth boundary needs no copied refresh token or
  global client mutation. It preserves `redirect_to`, publishable-key and Bearer
  headers, the installed SDK's `X-Supabase-Api-Version: 2024-01-01`, safe
  `status`/`code` causes, and network-failure classification (including
  502/503/504 before parsing possibly non-JSON proxy responses).

The canonical browser client currently uses the SDK's default **implicit** flow.
If the project later changes to PKCE, revisit email-change challenge handling.
Already-dispatched requests can finish for their captured account; later account
events prevent their results from changing the newer account view.

Primary sources consulted:
[Supabase auth events](https://supabase.com/docs/reference/javascript/auth-onauthstatechange),
[updateUser](https://supabase.com/docs/reference/javascript/auth-updateuser),
[client initialization](https://supabase.com/docs/reference/javascript/initializing),
[Auth OpenAPI GET/PUT user contract](https://github.com/supabase/auth/blob/master/openapi.yaml).
Installed source was verified at supabase-js **2.52.1**, auth-js **2.71.1** and
ssr **0.6.1**; this frontend uses `createClient`, not the SSR browser factory.
The changelog Markdown index request was unavailable; the decision uses current
official operation documentation and the actual installed source.

## Verification record

Commands ran from the candidate's `client/` with public dummy Supabase values and
the unchanged locked dependencies. Jest cache/report paths were local ignored
`coverage/auth-*` directories. Initial default-temp Jest transforms failed with
sandbox `EPERM` rename; using the local cache resolved that infrastructure error.

- Red: late bootstrap restored A, queued password/email mutations succeeded
  after B sign-in, and late A SDK update restored A into B's storage. Recovery
  tests also failed on missing busy/retry behavior. The owner-bound implementation
  passed those regressions.
- Refinement red: pending status disappeared on remount. Adding the narrow read
  restored it; the late A 403 test establishes that B is preserved.
- Focused Auth/Profile/Sidebar: **22 suites, 97 tests passed** before three
  additional owner-recovery/transient-response regressions; their affected
  suites passed and all are included in the final full run.
- Entire frontend Jest: **231 suites, 1213 tests passed**.
- Typecheck passed. Lint passed with two existing `no-img-element` warnings in
  HomeScreen tests and MarketNewsArticleCards.
- Portfolio/Top Picks coverage: **47 suites, 302 tests passed**; statements
  **93.85%**, branches **88.63%**, functions **93.13%**, lines **95.00%**.
- Watchlist coverage: **20 suites, 102 tests passed**; statements **91.96%**,
  branches **83.47%**, functions **94.23%**, lines **94.57%**.
- Changed AuthContext: **94.91/86.66/100/100%**; account adapter:
  **95.52/81.25/100/96.55%**; ProfileMain: **93.93/82.81/100/100%**
  (statements/branches/functions/lines).
- Combined five-file changed surface: **80.24/71.90/81.06/83.79%**. Existing
  Sidebar gesture/responsive branches and broader profile-controller branches
  leave a branch-coverage gap; this is not a repository-wide 80% claim.
- Real Chromium: **3 tests passed**, using `accountRecovery.spec.ts` on isolated
  port **3008** against both the development server and the final production
  build. The default sandbox browser-cache path was absent; verified
  existing Chromium **1228** was selected. Sandbox loopback could not be reached
  from host or later sandbox checks; approved host-loopback server/browser calls
  resolved that environment limitation. The first reachable run found locator
  ambiguity from Next's route announcer and two Change buttons; region-scoped
  locators fixed it. Failure traces remain in ignored `coverage/auth-browser/results`.

Browser fixtures verify visible behavior and the installed browser SDK against
intercepted responses. They do not establish live Auth policy, email delivery,
RLS, credential mutation, or production deployment behavior.

The final production build passed; the isolated test server was then stopped.
Independent review is in progress before handoff. Sign-out busy/error/retry and
stale feedback are verified here; the shared SDK logout request's owner selection
while queued remains a separate unverified question for the overall Auth audit.
