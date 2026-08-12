# Quant Analysis Studio capability

Status: implementation contract for `feature/quant-analysis-studio`

The reviewed transport, canonical data, trace, session-storage, capabilities,
and enforceable clean-room decisions in
[`quant-analysis-studio-contract-addendum.md`](./quant-analysis-studio-contract-addendum.md)
supersede any conflicting v1 wording below.

## Capability

Quant Analysis Studio is a web-native research workflow for turning a bounded
market hypothesis into a traceable, structured decision artifact. A user selects
a symbol, benchmark, observation window, objective, and risk posture; the system
then runs two explicit stages:

1. **Diagnose** derives market evidence and classifies the current regime.
2. **Decide** routes the diagnosis through an owned playbook and returns a
   scenario-based research plan with risks, invalidation conditions, and a
   confidence assessment.

Product promise: **form a hypothesis, inspect the evidence, verify the decision**.

The first release is deliberately a research system, not a trading agent. It
does not place orders, rebalance holdings, or present generated output as
personal financial advice.

## Research and clean-room boundary

The architecture is informed by public product and project patterns:

- PA_Agent's public repository demonstrates a two-stage analysis workflow,
  strategy routing, structured validation, retries, and run records.
- OpenBB demonstrates provider-neutral normalized data and composable research
  workspaces.
- QuantConnect LEAN separates universe selection, alpha, portfolio construction,
  risk, and execution instead of allowing one model to own every decision.
- Microsoft Qlib treats datasets, models, workflows, recorders, and evaluation
  artifacts as separate experiment layers.

This implementation is clean-room. It may reproduce public product behaviours
and general architectural patterns, but it must not copy PA_Agent source code,
prompt text, strategy prose, schema wording, UI copy, or other expressive
content. PA_Agent is AGPL-licensed; this branch must remain independently
implemented unless the repository owners explicitly adopt a compatible license
and complete a separate legal review.

Reference material:

- PA_Agent: <https://github.com/rosemarycox5334-debug/PA_Agent>
- OpenBB Platform: <https://github.com/OpenBB-finance/OpenBB>
- QuantConnect LEAN: <https://github.com/QuantConnect/Lean>
- Microsoft Qlib: <https://github.com/microsoft/qlib>
- scikit-learn time-series validation:
  <https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html>
- OpenTelemetry traces: <https://opentelemetry.io/docs/concepts/signals/traces/>

## Actors and user journeys

### Investor: evidence-first scan

The user selects a ticker and benchmark, runs the study, and sees the regime,
key evidence, missing-data warnings, and decision scenarios without reading a
chat transcript. Every claim links back to a named calculated feature.

### Quant researcher: reproducible comparison

The researcher changes one input, runs again, and compares the two immutable run
artifacts. Inputs, data window, engine version, playbook version, timings, and
validation attempts remain visible.

### Product reviewer: confirm success

The reviewer can distinguish pending, running, successful, partial, and failed
stages; inspect a trace ID; verify that every response conforms to the API
schema; and reproduce a deterministic result from the same normalized evidence.

### Future model engineer: add a model safely

The engineer implements a provider contract and declares its capabilities. The
orchestrator remains unchanged, output still passes schema and semantic
validation, and the model can be evaluated against the deterministic baseline
before it becomes selectable.

## Constraints and invariants

- The browser never supplies raw prompts, provider names, model identifiers,
  tool definitions, arbitrary URLs, or executable code.
- Symbols and benchmarks are normalized and validated at the API boundary.
- Period, interval, objective, and risk posture come from server-owned enums.
- Market observations are sorted ascending and feature calculations use only
  observations available at the end of the selected window.
- Diagnose always completes and validates before Decide can begin.
- The orchestrator chooses playbooks from a server-owned registry; a provider
  cannot select arbitrary code or external tools.
- Provider output is untrusted. It must pass strict structural and semantic
  validation before it is returned or recorded as successful.
- Retries are bounded and observable. A retry never hides the original failure.
- Partial data and non-finite values are disclosed, never coerced into valid
  evidence.
- Identical normalized inputs and evidence produce identical output from the
  deterministic provider.
- A run is immutable after completion. A rerun creates a new run ID and records
  the source run ID when applicable.
- Provider credentials remain server-side. ChatGPT/Codex subscription tokens
  are never reused as application credentials.
- No remote LLM provider is enabled unless a product-owned API credential is
  explicitly authorized and configured.
- Generated language is research commentary, not an order instruction or a
  guarantee of return.

## Architecture contract

```text
Quant Studio page
    -> typed API client
        -> Flask quant-analysis blueprint
            -> request validator
            -> market-data adapter
            -> feature engine
            -> two-stage orchestrator
                -> playbook registry
                -> analysis provider
                -> output validator + bounded retry
            -> run/audit recorder
        <- versioned run artifact
    <- evidence, decision, history, compare, audit UI
```

### Module boundaries

| Boundary | Responsibility | Must not own |
| --- | --- | --- |
| API route | Parse, validate, map errors, envelope responses | Feature math, provider prompts |
| Market adapter | Obtain and normalize observations | Decisions, UI wording |
| Feature engine | Deterministic evidence calculations | Provider selection, persistence |
| Playbook registry | Route regime/objective to owned policy metadata | Network calls, arbitrary code |
| Provider | Transform typed context into typed stage output | Data access, order execution |
| Validator | Structural and semantic checks | Silent repair, business routing |
| Orchestrator | Stage order, retry budget, timing, trace assembly | HTTP details, UI state |
| Run repository | Immutable run artifacts behind an interface | Model inference, authorization policy |
| UI | Research setup, evidence, decision, compare, audit | Secrets, model prompts, feature math |

### Extensibility seams

Data adapters implement a canonical observation contract. Analysis providers
implement a capability-declared stage contract. Model plugins eventually expose
`fit`, `predict`, `explain`, and immutable metadata without changing the API
run artifact. Backtests consume signal artifacts rather than provider-specific
responses. Risk filters consume candidate signals and emit approved, reduced,
or rejected research targets; future execution remains a separate subsystem.

The intended evolution is:

```text
data adapters -> point-in-time features -> labels -> model experiments
              -> walk-forward validation -> cost-aware backtest
              -> paper trading -> separately authorized execution
```

## Canonical domain model

### Run request

```ts
type QuantRunRequest = {
  symbol: string;
  benchmark: string;
  period: "1mo" | "3mo" | "6mo" | "1y" | "2y";
  interval: "1d";
  objective: "signal_scan" | "risk_review" | "scenario_plan";
  riskProfile: "conservative" | "balanced" | "aggressive";
  compareToRunId?: string;
};
```

### Evidence

The v1 feature set is intentionally inspectable: observation count, start/end
dates, cumulative return, benchmark-relative return, annualized volatility,
maximum drawdown, 20/60-observation trend, downside frequency, and latest
distance from the 20-observation mean. Calculations include units, finite-value
status, and warnings.

Feature definitions are versioned independently from providers. Future
fundamentals, macro, alternative data, embeddings, and learned factors join via
new adapters and feature-set versions rather than expanding one route file.

### Diagnose result

```ts
type Diagnosis = {
  regime: "bullish" | "bearish" | "range_bound" | "insufficient_data";
  summary: string;
  confidence: number; // finite, 0..1
  evidence: EvidenceReference[];
  risks: string[];
  dataQuality: "complete" | "partial" | "insufficient";
};
```

### Decide result

```ts
type Decision = {
  stance: "constructive" | "neutral" | "defensive" | "insufficient_data";
  playbook: { id: string; version: string; title: string };
  thesis: string;
  scenarios: Array<{
    name: "base" | "bull" | "bear";
    condition: string;
    implication: string;
  }>;
  invalidationConditions: string[];
  riskControls: string[];
  confidence: number;
};
```

### Run artifact

A successful run contains `schemaVersion`, `runId`, `traceId`, normalized
request, evidence, diagnosis, decision, engine/provider/playbook versions,
stage status and duration, validation attempt summaries, warnings, data source
metadata, and `createdAt`. It never contains a credential, raw provider prompt,
private chain-of-thought, stack trace, or unrestricted provider response.

## HTTP contract

### `GET /api/v1/quant-analysis/capabilities`

Returns supported request enums, provider capability metadata, feature version,
playbook versions, limits, and whether remote generation is enabled. This lets
the UI render truthfully without duplicating server configuration.

### `POST /api/v1/quant-analysis/runs`

Accepts a `QuantRunRequest` JSON body and returns one immutable run artifact.

Success envelope:

```json
{
  "success": true,
  "data": { "runId": "...", "status": "succeeded" },
  "meta": { "schemaVersion": "1.0" }
}
```

Error envelope:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request could not be validated.",
    "fields": { "period": "Unsupported value." },
    "traceId": "..."
  }
}
```

Expected status codes are `200`, `400`, `413`, `422`, `429`, `502`, and `503`.
Quant failures log a stable event, exception class, and trace ID. Exception
messages and raw request/provider content are neither returned to the browser
nor written by the Quant route.

Run history in v1 is deliberately session-local in the UI. Durable cross-device
history is blocked until the Flask API verifies Supabase bearer tokens and the
repository can enforce owner-scoped access. A client-provided user ID or an
unguessable URL alone is not authorization.

## Provider contract

V1 ships with a deterministic provider as an executable specification and
baseline. It enables repeatable end-to-end verification without a paid service
or secret. A future remote provider must declare:

- provider and model identifiers controlled by server configuration;
- supported stages and structured-output level;
- maximum context and output size;
- timeout and bounded retry policy;
- usage accounting and upstream request ID support;
- health status and feature flag state.

Remote providers receive only the minimum typed context. They cannot call tools,
browse, fetch URLs, access the database, or choose a downstream provider in v1.
Provider-specific SDK objects never cross the provider adapter boundary.

## User interface contract

The page is a research workbench rather than a chat surface:

- **Top summary**: symbol, benchmark, sample window, provider, run status.
- **Research Setup**: bounded inputs, objective, risk posture, and run action.
- **Stage workspace**: Hypothesis, Diagnose, and Decide progress with explicit
  success, partial, and failure states.
- **Evidence rail**: calculated metrics, data quality, source, warnings,
  versions, timings, trace ID, and validation attempts.
- **History/Compare**: session runs remain immutable and differences identify
  changed inputs, regime, stance, confidence, and warnings.

Desktop uses setup / stage workspace / evidence columns. Tablet moves setup and
evidence into accessible panels. Mobile becomes a single logical reading order.
All controls have labels and keyboard focus; status is never communicated by
colour alone; reduced-motion preferences are respected.

## Failure and recovery

- Invalid request: identify fields; do not call market data or a provider.
- Insufficient observations: produce an explicit insufficient-data diagnosis
  and conservative decision artifact rather than inventing certainty.
- Partial symbol/benchmark data: retain usable evidence, name exclusions, and
  lower data quality/confidence.
- Market provider failure: return a stable user message and trace ID; log only
  the safe failure class and trace rather than upstream exception content.
- Invalid stage output: record validation issues, retry within the configured
  budget, then fail closed.
- Remote provider timeout/rate limit: do not silently switch models. Report the
  provider status; an explicitly configured deterministic fallback may be
  offered as a new run.
- Browser/network failure: preserve the last successful session artifact and
  let the user retry without clearing inputs.
- Compare target unavailable: keep both standalone runs usable and explain the
  missing comparison.

## Threat model and controls

| Threat | Control |
| --- | --- |
| Prompt/model injection | No raw prompt input; typed context; no provider tools |
| SSRF | No client URL fields; server-owned market adapters |
| Secret exposure | Server-only env configuration; redacted logs/errors |
| Cost/denial abuse | Body/per-process rate/retry limits in controlled v1; public release remains gated on an upstream deadline, shared authenticated limits, bounded concurrency, and a circuit breaker |
| Malformed model output | Strict schema plus semantic validation; fail closed |
| Cross-user record access | No server history until verified identity + owner-scoped policy |
| Look-ahead leakage | Point-in-time feature contract and time-aware tests |
| Misleading certainty | Confidence bounds, data quality, scenarios, invalidation, disclaimer |
| Dependency compromise | Locked dependencies, audit checks, minimal new packages |
| Trace leakage | IDs and summaries only; never raw secrets/prompts/chain-of-thought |

When durable Supabase storage is added, every exposed table must have RLS,
explicit grants, owner policies using `auth.uid()`, matching `USING` and
`WITH CHECK` clauses for updates, supporting indexes, and tests proving that one
user cannot read or mutate another user's runs.

## Observability and audit

Each stage records start/end timestamps, duration, outcome, provider version,
validation attempt count, issue codes, and trace/run correlation. Logs are
structured and use stable event names. Errors include contextual IDs but exclude
request secrets and unrestricted provider output.

Future OpenTelemetry spans follow the same boundaries:

```text
quant.run
  -> market_data.fetch
  -> features.calculate
  -> diagnose.generate
  -> diagnose.validate
  -> decide.generate
  -> decide.validate
```

Metrics should include run count by status, stage latency, validation failure
rate, retry rate, provider error rate, insufficient-data rate, and remote token/
cost usage when applicable.

## Verification and success criteria

### Release-blocking v1 criteria

- Unit and integration tests cover request validation, feature calculations,
  regime routing, output validation, retry exhaustion, error redaction, and API
  envelopes.
- New production modules achieve at least 80% statement coverage.
- Frontend tests cover valid run, invalid input, loading, partial data, provider
  failure, history, and comparison behaviours.
- A Playwright flow opens Quant Studio, completes a run, inspects evidence,
  creates a changed run, and compares the two at desktop and mobile widths.
- Type checking, linting, backend tests, frontend tests, build, dependency audit,
  and secret scan complete without new critical findings.
- Schema-valid successful stage outputs: 100% in deterministic/provider contract
  tests; required-field omission: 0%.
- Same fixture + same request + same engine version produces byte-equivalent
  domain output after excluding run/time/trace fields.
- No credentials, raw prompts, private reasoning, or stack traces appear in API
  snapshots or browser bundles.

### Quant model admission criteria (future, design targets)

These are engineering gates to validate experimentally, not promises of return:

- Walk-forward or purged/embargoed validation; never random K-fold for temporal
  labels.
- Compare against a dummy baseline and at least one simple transparent signal.
- Post-cost performance includes fees, slippage, turnover, drawdown, and capacity
  assumptions.
- Candidate ranking models target mean out-of-sample rank IC above `0.02`,
  positive-IC windows above `55%`, and uncertainty that excludes zero before
  promotion.
- Backtest-overfitting diagnostics target probability below `0.20` before paper
  trading.
- Calibration, feature/data lineage, model/version lineage, reproducibility, and
  rollback artifacts are mandatory.
- Paper trading runs for at least 2–4 weeks before any separately authorized live
  execution review.

## Phased delivery

### Phase 1 — deterministic vertical slice

- Capability contract, tests, typed request/response schema.
- Market adapter, inspectable feature engine, two-stage orchestrator.
- Owned playbook registry, deterministic provider, validation and bounded retry.
- Independent Quant Studio page, session history/compare, audit evidence.
- Unit, integration, E2E, accessibility, build, and security verification.

### Phase 2 — authenticated durable research

- Flask verification of Supabase access tokens.
- RLS-protected run, artifact, note, and comparison persistence.
- Idempotency, authenticated rate limits, retention/export/delete controls.
- OpenTelemetry and production dashboards.

### Phase 3 — authorized model providers

- Server-configured OpenAI Responses API adapter after credential authorization.
- Strict structured outputs, request/usage IDs, provider eval corpus, shadow mode,
  deterministic fallback as an explicit new run.
- Optional local adapter behind the same contract.

### Phase 4 — quantitative experiments

- Point-in-time dataset/feature registry, labels, experiment recorder, model
  registry, walk-forward and purged validation.
- Cost-aware backtest artifacts and calibrated comparison against transparent
  baselines.
- Paper-trading boundary with independent risk controls.

## Non-goals

- Brokerage connectivity, order creation, position sizing, automated execution,
  or live portfolio management.
- Free-form autonomous browsing/tool use by a model.
- Client-selected prompts, models, endpoints, or credentials.
- Claiming an LLM explanation is an alpha signal or verified forecast.
- Copying PA_Agent implementation or expressive content.
- Durable unauthenticated run history.
- Treating a backtest as proof of future performance.

## Open decisions and chosen defaults

- Route name is `/QuantAnalysis`; navigation label is `Quant Studio`.
- V1 supports one primary symbol and one benchmark to keep evidence and failure
  states legible. A multi-asset universe is a later typed extension.
- V1 interval is daily; unsupported intervals are rejected rather than silently
  resampled.
- The deterministic provider is the only enabled provider until a product API
  credential is explicitly authorized.
- Session history is browser-memory only; durable history waits for verified
  backend identity and RLS.
- Feature and playbook versions are visible in every run artifact.

## Handoff

Implementation proceeds test-first: domain validators and feature fixtures,
orchestrator validation/retry tests, API integration tests, page state and API
client tests, responsive workbench, then Playwright comparison flow. Code review,
security review, and verification run after the vertical slice, and critical or
high findings block the branch's final implementation commit.
