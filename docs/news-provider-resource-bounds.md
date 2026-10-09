# News and ticker provider resource bounds

The server boundaries in `newsService.ts` and `tickerStrip/snapshotService.ts`
use `fetchAdmittedProviderResponse`. This combines process-local admission with
the shared `fetchBoundedProviderResponse` reader. Provider order, strict-category
selection, continuation, demo responses, ticker selection and route privacy/cache
policies keep their existing contracts.

The browser-facing ticker index exposes only shared selection, display, types and
refresh policy. The API imports the snapshot service directly. A production build
caught the previous index's server-service re-export pulling `node:net` into the
browser bundle; moving this import boundary keeps provider admission server-side
while retaining the shared sixty-second refresh constant.

| Boundary              | Limit and behavior                                                                                                                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decoded provider body | 2 MiB per response, including responses without Content-Length and compressed responses. The reader rejects excess bytes before RSS/JSON parsing.                                                               |
| Shared work           | Eight active news/ticker provider reads and at most 64 FIFO waiters in one server process. Overflow fails immediately through the existing unavailable/fallback path.                                           |
| Queue lifecycle       | Queue wait consumes the same deadline as headers and body. Expiry or caller abort removes a waiter; completion, error or abort releases active capacity. Release is idempotent.                                 |
| News read             | Five seconds by default in development, eight in production. A positive NEWS_PROVIDER_TIMEOUT_MS can shorten this, but cannot exceed eight seconds.                                                             |
| News fallback         | The existing first-provider batch precedes the remaining-provider batch. Registered providers perform parallel reads within each batch, so their I/O budgets total at most twice the per-read deadline.         |
| Ticker snapshot       | Eight seconds for trending, quotes and all chart reads together. Each read gets at most five seconds, or the remaining snapshot budget. Exhausted stages start no outgoing fetch and use display-safe fallback. |

The admission object is stored on the server process's global object so separate
Pages API module bundles share it. These are local bounds, not a distributed quota
or a guarantee across serverless instances. They bound asynchronous provider I/O;
they cannot preempt synchronous parsing or a blocked event loop. Cancellation is
sent to native fetch and response readers. An injected transport that ignores
abort can keep its own work alive; it cannot hold a caller indefinitely, and late
responses are cancelled rather than read.

## Comparison and verification

The same twelve controlled fixtures ran against the original services and the
candidate. The original had ten expected failures and two passing controls; the
candidate passed all twelve. The failures covered stalled headers and bodies,
declared and streamed oversize JSON, caller cancellation, shared fanout, ticker
fallback latency and nine-chart fanout. Valid Yahoo RSS and GDELT JSON passed in
both versions. Three 60-second polls with twenty watchlist symbols remained live,
retained all twenty symbols in the quote pool and produced nine selected cards;
the candidate's peak provider concurrency was eight rather than nine.

A separate malformed-JSON regression failed before awaiting the JSON read inside
the ticker fallback handler and passed afterward. Admission tests exercise FIFO,
full queues, abort/expiry removal, expiry/release races, failure release and queue
time charged against the body deadline. Native Node fetch tests use only a local
HTTP fixture: stalled headers, stalled bodies and gzip whose compressed length is
small but decoded body exceeds 2 MiB. Each timed-out request is followed by a
successful request using the same permit. No live provider or credentials are
used by these tests.

The selected mechanism reuses the existing buffered reader and adds one bounded
shared queue without dependencies. A header-only timer fails the stalled-body
fixture. Independent per-snapshot limits leave total work unbounded as callers
increase. Lowering the watchlist input cap would reject legitimate twenty-symbol
polling without addressing either defect.

Primary API references:

- [Fetch body reading and streaming](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
  explain why receiving headers does not finish a body read.
- [Node 22 AbortSignal](https://nodejs.org/docs/latest-v22.x/api/globals.html#class-abortsignal)
  documents cancellation and listener cleanup. CI uses Node 22; the local check
  runtime is Node 24.15.0.
- [Next.js 15 fetch options](https://nextjs.org/docs/15/app/api-reference/functions/fetch)
  preserve native request options alongside framework cache options. The verified
  local Next version is 15.5.27.

Run focused verification from `client` with the installed Jest:

```powershell
node node_modules/jest/bin/jest.js --runInBand --ci lib/news lib/server/providerAdmission.test.ts lib/server/providerAdmission.node.test.ts
```

Use the existing typecheck, lint, full unit, coverage and build commands before
integration. Mocked browser journeys verify presentation contracts; they do not
prove live provider availability or distributed admission behavior.
