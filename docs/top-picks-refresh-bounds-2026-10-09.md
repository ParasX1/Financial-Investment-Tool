# Top Picks refresh and stream bounds

This change addresses #291 and the bounded refresh part of #276/#246. Public research reads remain available. One process shares one background worker and each window's browser listeners share one transport. Successful worker rounds now wait before fetching again; queued manual refreshes coalesce into one pending priority and respect the same cooldown. Disconnect/reconnect cannot reset that cooldown. A cold foreground request still uses the existing shared build slot.

## Configuration and limits

| Server setting | Default | Accepted integer range | Behavior |
| --- | ---: | ---: | --- |
| `TOP_PICKS_REFRESH_INTERVAL_SECONDS` | 60 | 5–3600 | Delay from a successful background round's completion until the next round |
| `TOP_PICKS_MAX_SUBSCRIBERS` | 64 | 1–1024 | Active SSE subscriptions in this service process, across all windows and peers |
| `TOP_PICKS_MAX_SUBSCRIBERS_PER_CLIENT` | 16 | 1–128 | Active subscriptions from one server peer address |
| `TOP_PICKS_STREAM_LIFETIME_SECONDS` | 300 | 30–3600 | Maximum stream age; reconnect event closes the subscription |

Admission and release use the hub's lock. Rejections return JSON HTTP 429 with `Retry-After: 5` before opening SSE. Closing twice releases no additional slot. Expired subscriptions are removed before admission and notification delivery. Transport heartbeats wait at most 15 seconds and never extend the stream deadline. Failed rounds retain saved results and retry after five seconds. Closing the final subscription interrupts a subscriber-driven cooldown; a queued manual request can still finish as a single bounded background job.

Peer identity comes from Flask's server peer address, `request.remote_addr`. This route does not read `X-Forwarded-For` or other forwarding headers. Clients behind a proxy/NAT can share the same allowance. Operators must configure trusted proxy identity at the deployment boundary when needed. The default 16 allows three tabs with a shared annual background stream and another selected window in each tab (six connections). The same fixture with peer cap 4 rejects two legitimate connections; cap 16 admits all six and at most ten additional connections before rejecting excess requests.

These are process-local connection and worker controls. Multiple workers multiply the allowances and can each fetch independently. Distributed provider quotas, proxy socket deadlines, request rate limiting, provider download concurrency and production capacity need deployment-level controls and measurement. Disabling snapshot caching still permits foreground cold reads; this change does not establish an absolute quota for every POST request or prove denial-of-service protection.

## Browser lifecycle and freshness

A hidden or offline page closes its shared SSE transport and cancels scheduled reconnects. The table aborts its in-flight read while retaining matching rows, warnings and original `generatedAt`. Reopening happens only when the page is visible and online. Reconnection reads the latest snapshot; obsolete connection callbacks and aborted responses cannot replace it. Window, page and account matching still apply.

Manual retry while inactive remains queued. Its force token is consumed only when an actual request begins after recovery, and subsequent page/sort changes perform ordinary reads. Transport failures close the native EventSource and retry after 5, 10, 20, 40 and at most 60 seconds; a successful connection resets the delay. Server lifetime rotation reconnects through the same transport. Pauses do not manufacture a newer snapshot timestamp.

The successful-refresh budget declared before implementation was 60 seconds plus one complete round's duration while actively subscribed. The fixed test provider takes one second, so the test budget is 61 seconds. Failure, provider delay and inactivity can exceed this budget, with the saved timestamp retained. This measures snapshot calculation age, not the market source's underlying price freshness.

## Controlled comparison and stopping condition

Baseline was commit `3e36a257ca27a522deac6724876a6ca5adc7cb1e`. The same fixture uses one fixed ticker, four windows, three initial subscribers, a fixed date, a fake monotonic clock, a one-second mock provider call, matching-row reads and a 120-second horizon. No live provider, Supabase account or production load is used. `server/tests/top_picks/test_refresh_comparison.py` runs the actual worker/cache scheduling path, with metric calculations stubbed.

| Matched fixture | Baseline provider calls / rebuilds | Candidate provider calls / rebuilds | Baseline / candidate readable responses | Candidate maximum active snapshot age |
| --- | ---: | ---: | ---: | ---: |
| Active throughout 120 seconds | 120 / 480 | 2 / 8 | 120 / 120 | 60 seconds |
| Controlled disconnect at 30 seconds, reconnect at 90 | 60 / 240 | 2 / 8 | 60 / 60 | 29 seconds |

The second server fixture applies the same disconnect protocol to both revisions to isolate pacing. The old browser transport did not automatically apply this protocol; separate red/green browser lifecycle tests reproduce and repair that omission. These counts are synthetic, not measured production quotas or performance claims. The stopping condition is passing the declared age/availability invariants, concurrent admission/release, stream expiry, queued-force cooldown, shared-window tests and client lifecycle regressions. No additional provider benchmark is justified after those invariants pass.

## Verification record

Red regressions reproduced 120 versus expected 2 rounds, missing hub admission/lifetime controls, and clients staying connected/fetching while inactive. Green checks cover atomic peer/process admission, idempotent cleanup, expired-slot reclamation, untrusted forwarding headers, safe 429/retry, bounded queue waits, cooldown-preserving reconnect, coalesced manual force, thread-start failure cleanup, saved timestamps, and obsolete callbacks.

Fresh independent review identified two further cooldown races. Deterministic regressions first reproduced an exiting worker being revived by a reconnect before its post-lock shared-flag check, and an initial manual job being cancelled when a stream joined then left during cooldown. The worker now returns under its lock when subscriber-only work ends and keeps its own completion intent for page/manual jobs. A further self-review regression reproduced a subscriber-only job entering sleep when the last subscriber had already left; the no-subscriber branch now returns under the same lock. All three regressions pass; the parent performs the final independent re-review and integrated checks before publication.

Local verification uses Python 3.12.14 with the audited backend dependencies, Next.js 15.5.27 and React 18.3.1. The first client run resolved an older Next.js 15.5.21 dependency junction; it was corrected and the affected checks were repeated on 15.5.27. Final results:

- Backend complete suite: 388 passed, exit 0, including the new race/configuration tests.
- Portfolio/Top Picks coverage: 305 passed in 47 suites, exit 0. Changed transport has 100% line / 96.15% branch coverage, activity helper/hook 100%, and controller 100% line / 97.56% branch coverage. Configured feature coverage gates pass. Backend percentage coverage was not measured because no coverage package is installed in this backend's development toolchain.
- Next type generation, TypeScript, scoped ESLint, Python compilation and changed Python style checks pass. The existing composition callback F811 remains the separately owned persistence branch's repair; full branch lint is not claimed green here.
- Optimized Next.js 15.5.27 production build: exit 0, public dummy configuration.
- Five existing/new Top Picks browser journeys: passed on installed headless Edge using an isolated localhost port, persistent local mock SSE and dummy Supabase responses. The new test uses a controlled document visibility fixture and native Playwright offline network emulation. It verifies pause/recovery and readable matching rows, not real-user behavior or live-provider acceptance. The runner exited successfully and its dedicated server port no longer listened afterward.
- Initial sandboxed backend and browser runs failed on temporary SQLite/hard-link and Edge profile writes. Their logs are retained in ignored task-local results. Scoped authorized reruns resolved those host restrictions; sandbox settings were not changed.

Machine-readable comparison evidence is in `docs/benchmarks/top-picks-refresh-bounds-synthetic-2026-10-09.json`. The recorded counts come from the same fixture before implementation and after the refined candidate; no policy-only simulation is presented as an executed service benchmark.
