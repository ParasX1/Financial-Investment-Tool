# Quant Analysis Studio contract addendum

This addendum resolves the first architecture review findings and supersedes
any conflicting v1 wording in `quant-analysis-studio-capability.md`.

## Synchronous v1 transport

`POST /api/v1/quant-analysis/runs` is synchronous in v1. It returns `200 OK`
with the complete immutable run artifact in `data`, including evidence,
diagnosis, decision, versions, stages, validation attempts, warnings, data
source metadata, run ID, client run ID, and trace ID. `pending` and `running`
are client-only states while the request is in flight. A future asynchronous
mode requires a separately versioned `202 Accepted` plus status-resource or
event-stream contract.

Every request includes a caller-generated UUID `clientRunId`. The browser
reuses it for an ambiguous network retry and the server echoes it at the
artifact top level and inside the normalized request. It is a correlation and
session de-duplication key, not authentication and not a cross-process
exactly-once guarantee.

## Canonical observation and feature semantics

- V1 consumes daily adjusted close only. Raw close is not a silent fallback.
- A session key is an exchange trading date serialized as `YYYY-MM-DD`.
- Rows are sorted ascending. Duplicate rows with the same normalized price are
  collapsed to one observation and counted as duplicate exclusions. If one
  date has conflicting valid prices, that whole date is rejected. Both rules
  are independent of provider row order.
- Non-finite and non-positive prices are missing. No forward fill, backward
  fill, interpolation, or zero coercion is allowed.
- Standalone features use the symbol's own valid samples. Benchmark-relative
  features use the exact intersection of valid symbol and benchmark dates.
- Cumulative return is `last / first - 1`; daily returns are simple returns.
- Annualized volatility is sample standard deviation (`ddof=1`) times
  `sqrt(252)`.
- Maximum drawdown is `min(price / running_max - 1)`.
- A 20- or 60-observation trend is
  `last / price_n_sessions_earlier - 1`, requiring 21 or 61 observations.
- The 20-session moving-average distance requires 20 observations.
- Downside frequency is the fraction of finite daily returns below zero.
- Fewer than 20 valid symbol observations is `insufficient`; 20 through 60 is
  `partial`; 61 or more is `complete`, subject to benchmark/missing warnings.

The deterministic provider emits semantic enums, evidence IDs, direction and
strength codes, scenario codes, and risk-control codes only. Provider output
must match exact semantic shapes and server-owned code allowlists. Unknown
fields, prose, codes, evidence references, non-finite values, and mismatched
policy sets fail closed within the bounded validation loop. Only after a stage
passes validation are summary, thesis, risks, conditions, implications, and
the selected playbook rendered from versioned server-owned templates.
Reproducibility compares the structured semantic model, not wording from a
future generative provider.

Run artifacts distinguish the requested and observed windows. `dataSource`
contains `requestedStartDate`/`requestedEndDate` plus nullable
`actualStartDate`/`actualEndDate` for the primary symbol; observation counts
separately disclose primary, benchmark, and aligned samples.

## Locked capabilities response

The response is wrapped in the standard success envelope and `data` contains:

```ts
type QuantCapabilities = {
  schemaVersion: "1.0";
  enums: {
    periods: Array<"1mo" | "3mo" | "6mo" | "1y" | "2y">;
    intervals: ["1d"];
    objectives: Array<"signal_scan" | "risk_review" | "scenario_plan">;
    riskProfiles: Array<"conservative" | "balanced" | "aggressive">;
  };
  defaults: Omit<QuantRunRequest, "clientRunId" | "compareToRunId">;
  limits: {
    maxBodyBytes: number;
    maxSymbolLength: number;
    maxValidationRetries: number;
    maxSessionRuns: number;
    runRateLimit: number;
    runRateWindowSeconds: number;
  };
  providers: Array<{
    id: string;
    label: string;
    version: string;
    enabled: boolean;
    remote: boolean;
    deterministic: boolean;
    stages: Array<"diagnose" | "decide">;
    structuredOutput: "validated" | "native";
  }>;
  featureSet: { id: string; version: string };
  playbooks: Array<{
    id: string;
    version: string;
    title: string;
    origin: "clean_room";
    contentHash: string;
  }>;
  persistence: {
    serverHistory: false;
    clientMode: "session_storage";
  };
  remoteGenerationEnabled: boolean;
  cache: { policy: "no-store" };
};
```

The endpoint sends `Cache-Control: no-store`.
For run creation, `remoteGenerationEnabled` is true only when the configured
provider declares both `enabled: true` and `remote: true`; the deterministic
v1 provider therefore reports false.

Provider metadata is a fail-closed execution contract, not decorative UI
metadata. A configured provider must expose exactly the documented fields and
types; `stages` must be the ordered `["diagnose", "decide"]` pair and
`structuredOutput` must be `validated`. Its declared ID and version must
match the provider object's execution identity. The service validates and
caches this metadata once during composition, returns defensive copies, and
refuses to run a provider whose capability is disabled. A custom orchestrator
is accepted only when it uses the identical provider and playbook-registry
objects recorded by the service, so the public version ledger cannot describe
different execution components.

Before buffering a run request, Flask applies `maxBodyBytes` as the request
stream limit. Declared or streamed over-limit bodies return the same redacted
`413 REQUEST_TOO_LARGE` envelope and server trace ID without invoking the
service.

## Trace, storage, and authorization boundary

The Flask request boundary creates a fresh server-owned trace ID and returns it
in `X-Trace-ID`. The Quant error envelope and successful run artifact use that
same value. Client-supplied trace IDs are not trusted as server identity.

V1 stores at most 20 redacted run artifacts per verified account scope in
versioned `sessionStorage`; signed-out use has a separate anonymous scope.
Authentication loading or an invalid user identifier fails closed. An account
transition hides the old active artifact, history, failure, and comparison in
the same render, aborts an in-flight request, and rejects any stale response.
History survives refresh in the same tab/session, rejects corrupt or
incompatible values, and disappears with the browser session. Durable history
waits for Flask-verified Supabase identity and owner-scoped RLS.

Quant run, artifact, note, and comparison records may only be created through
the Flask API. The browser must never write these records directly to
Supabase. A client user ID, client run ID, or unguessable URL is not
authorization.

Every successful or partial run emits one redacted
`quant_analysis.run_completed` event. Its safe structured payload is limited
to the server trace ID, artifact status, validated provider ID/version, bounded
retry counts for `diagnose` and `decide`, total duration in milliseconds,
and primary/reference/aligned observation counts. It must not contain symbols,
benchmarks, requests, user identifiers, client or run IDs, prompts, raw
provider output, or source content.

## V1 release boundary

V1 is approved only for local or otherwise controlled research use. It is not
an internet-facing production trading service and does not claim order
execution. Public production release remains blocked until the deployment has
verified authentication and authorization, origin-scoped CORS, a shared
authenticated rate limiter, trusted-proxy handling, an explicit upstream
market-data deadline, bounded provider concurrency, and a circuit breaker.
These controls are release gates; this v1 contract does not claim they already
exist.

## Enforceable clean-room controls

Every playbook records `origin: clean_room`, version, content hash, and an
authorship/attestation reference. Review must confirm that production code,
tests, fixtures, templates, schemas, and UI wording do not import or copy
PA_Agent expressive material. PA_Agent is never vendored or downloaded into
the implementation branch. Architectural references may identify public ideas,
but implementation provenance must point to independently authored artifacts.
