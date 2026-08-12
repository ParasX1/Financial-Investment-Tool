import {
  normalizeQuantCapabilities,
  normalizeQuantRunArtifact,
} from "./quantAnalysisApi";

const CLIENT_RUN_ID = "11111111-1111-4111-8111-111111111111";

const capabilities = {
  schemaVersion: "1.0",
  enums: {
    periods: ["1mo", "3mo", "6mo", "1y", "2y"],
    intervals: ["1d"],
    objectives: ["signal_scan", "risk_review", "scenario_plan"],
    riskProfiles: ["conservative", "balanced", "aggressive"],
  },
  defaults: {
    symbol: "BHP.AX",
    benchmark: "^AXJO",
    period: "6mo",
    interval: "1d",
    objective: "signal_scan",
    riskProfile: "balanced",
  },
  providers: [
    {
      id: "deterministic",
      label: "Deterministic baseline",
      version: "1.0.0",
      enabled: true,
      remote: false,
      deterministic: true,
      stages: ["diagnose", "decide"],
      structuredOutput: "validated",
    },
  ],
  featureSet: { id: "market-core", version: "1.0.0" },
  playbooks: [
    {
      id: "balanced-regime",
      version: "1.0.0",
      title: "Balanced regime",
      origin: "clean_room",
      contentHash: "sha256:balanced-regime-v1",
    },
  ],
  limits: {
    maxBodyBytes: 4096,
    maxSymbolLength: 20,
    maxValidationRetries: 1,
    maxSessionRuns: 20,
    runRateLimit: 5,
    runRateWindowSeconds: 60,
  },
  persistence: { serverHistory: false, clientMode: "session_storage" },
  remoteGenerationEnabled: false,
  cache: { policy: "no-store" },
};

const artifact = {
  schemaVersion: "1.0",
  runId: "run-001",
  clientRunId: CLIENT_RUN_ID,
  traceId: "trace-001",
  status: "partial",
  request: {
    clientRunId: CLIENT_RUN_ID,
    symbol: "BHP.AX",
    benchmark: "^AXJO",
    period: "6mo",
    interval: "1d",
    objective: "signal_scan",
    riskProfile: "balanced",
  },
  evidence: [
    {
      key: "relative_return",
      label: "Benchmark-relative return",
      value: 0.041,
      unit: "ratio",
      finite: true,
      warnings: [],
    },
  ],
  diagnosis: {
    regime: "range_bound",
    direction: "mixed",
    strength: "weak",
    summary: "Relative strength is mixed.",
    templateVersion: "diagnosis-template@1.0.0",
    confidence: 0.58,
    evidence: [
      {
        evidenceId: "relative_return",
        direction: "positive",
        strength: "weak",
      },
    ],
    riskCodes: ["RESEARCH_UNCERTAINTY"],
    risks: ["The observation window is short."],
    dataQuality: "partial",
  },
  decision: {
    stance: "neutral",
    playbook: {
      id: "balanced-regime",
      version: "1.0.0",
      title: "Balanced regime",
      origin: "clean_room",
      contentHash: "sha256:balanced-regime-v1",
    },
    thesis: "Wait for confirmation.",
    templateVersion: "decision-template@1.0.0",
    scenarios: [
      {
        code: "BASE_CONTINUATION",
        name: "base",
        condition: "Range holds",
        implication: "Monitor",
      },
      {
        code: "BULL_CONFIRMATION",
        name: "bull",
        condition: "Breakout confirms",
        implication: "Reassess",
      },
      {
        code: "BEAR_REVERSAL",
        name: "bear",
        condition: "Support fails",
        implication: "Stay defensive",
      },
    ],
    invalidationCodes: ["SUSTAINED_RANGE_BREAK"],
    invalidationConditions: ["Relative return turns negative."],
    riskControlCodes: ["RESEARCH_ONLY"],
    riskControls: ["Use the benchmark as the anchor."],
    confidence: 0.52,
  },
  versions: {
    engine: "engine-1.0.0",
    featureSet: "market-core-1.0.0",
    provider: "deterministic-1.0.0",
    playbook: "balanced-regime-1.0.0",
  },
  stages: {
    diagnose: {
      status: "succeeded",
      durationMs: 18,
      startedAt: "2026-08-12T01:02:03.000Z",
      completedAt: "2026-08-12T01:02:03.018Z",
      providerVersion: "deterministic-1.0.0",
      validationAttemptCount: 1,
      issueCodes: [],
    },
    decide: {
      status: "partial",
      durationMs: 7,
      startedAt: "2026-08-12T01:02:03.018Z",
      completedAt: "2026-08-12T01:02:03.025Z",
      providerVersion: "deterministic-1.0.0",
      validationAttemptCount: 1,
      issueCodes: ["SHORT_WINDOW"],
    },
  },
  validationAttempts: [
    { stage: "diagnose", attempt: 1, outcome: "succeeded", issueCodes: [] },
  ],
  warnings: ["Long-trend evidence is unavailable."],
  dataSource: {
    name: "Yahoo Finance",
    symbol: "BHP.AX",
    benchmark: "^AXJO",
    requestedStartDate: "2026-02-10",
    requestedEndDate: "2026-08-10",
    actualStartDate: "2026-02-11",
    actualEndDate: "2026-08-10",
    observationCount: 43,
    benchmarkObservationCount: 44,
    alignedObservationCount: 42,
  },
  createdAt: "2026-08-12T01:02:03.000Z",
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe("quant response parser branch boundaries", () => {
  it.each([
    ["non-object capability", null],
    ["missing capability records", { ...capabilities, enums: null }],
    ["non-array providers", { ...capabilities, providers: null }],
    [
      "empty enum",
      { ...capabilities, enums: { ...capabilities.enums, periods: [] } },
    ],
    [
      "non-array enum",
      { ...capabilities, enums: { ...capabilities.enums, periods: "6mo" } },
    ],
    ["non-object provider", { ...capabilities, providers: [null] }],
    ["non-object playbook", { ...capabilities, playbooks: [null] }],
    [
      "zero positive limit",
      {
        ...capabilities,
        limits: { ...capabilities.limits, maxSessionRuns: 0 },
      },
    ],
    [
      "fractional integer limit",
      {
        ...capabilities,
        limits: { ...capabilities.limits, runRateLimit: 1.5 },
      },
    ],
    [
      "inconsistent persistence",
      {
        ...capabilities,
        persistence: { ...capabilities.persistence, serverHistory: true },
      },
    ],
    [
      "inconsistent remote generation",
      { ...capabilities, remoteGenerationEnabled: true },
    ],
  ])("rejects %s", (_label, value) => {
    expect(() => normalizeQuantCapabilities(value)).toThrow("invalid");
  });

  it.each([
    ["non-object artifact", null],
    ["missing audit records", { ...artifact, versions: null }],
    ["non-object request", { ...artifact, request: null }],
    ["non-object evidence", { ...artifact, evidence: [null] }],
    [
      "non-finite evidence",
      {
        ...artifact,
        evidence: [{ ...artifact.evidence[0], value: Infinity }],
      },
    ],
    [
      "non-object evidence reference",
      {
        ...artifact,
        diagnosis: { ...artifact.diagnosis, evidence: [null] },
      },
    ],
    [
      "empty diagnosis evidence",
      { ...artifact, diagnosis: { ...artifact.diagnosis, evidence: [] } },
    ],
    [
      "duplicate diagnosis codes",
      {
        ...artifact,
        diagnosis: {
          ...artifact.diagnosis,
          riskCodes: ["RESEARCH_UNCERTAINTY", "RESEARCH_UNCERTAINTY"],
          risks: ["First", "Second"],
        },
      },
    ],
    [
      "invalid diagnosis code",
      {
        ...artifact,
        diagnosis: { ...artifact.diagnosis, riskCodes: ["not-valid"] },
      },
    ],
    [
      "out-of-range confidence",
      {
        ...artifact,
        diagnosis: { ...artifact.diagnosis, confidence: 1.1 },
      },
    ],
    ["non-object decision", { ...artifact, decision: null }],
    [
      "non-object scenario",
      { ...artifact, decision: { ...artifact.decision, scenarios: [null] } },
    ],
    [
      "invalid scenario code",
      {
        ...artifact,
        decision: {
          ...artifact.decision,
          scenarios: [
            { ...artifact.decision.scenarios[0], code: "bad-code" },
            ...artifact.decision.scenarios.slice(1),
          ],
        },
      },
    ],
    [
      "missing scenario",
      {
        ...artifact,
        decision: {
          ...artifact.decision,
          scenarios: artifact.decision.scenarios.slice(0, 2),
        },
      },
    ],
    [
      "mismatched decision text",
      {
        ...artifact,
        decision: { ...artifact.decision, invalidationConditions: [] },
      },
    ],
    [
      "non-object stage",
      { ...artifact, stages: { ...artifact.stages, diagnose: null } },
    ],
    [
      "non-object validation attempt",
      { ...artifact, validationAttempts: [null] },
    ],
    [
      "malformed requested date",
      {
        ...artifact,
        dataSource: {
          ...artifact.dataSource,
          requestedStartDate: "2026/02/10",
        },
      },
    ],
    [
      "impossible actual date",
      {
        ...artifact,
        dataSource: { ...artifact.dataSource, actualStartDate: "2026-02-30" },
      },
    ],
    [
      "reversed requested dates",
      {
        ...artifact,
        dataSource: {
          ...artifact.dataSource,
          requestedStartDate: "2026-08-11",
          requestedEndDate: "2026-08-10",
        },
      },
    ],
    [
      "one-sided actual dates",
      {
        ...artifact,
        dataSource: { ...artifact.dataSource, actualStartDate: null },
      },
    ],
    [
      "reversed actual dates",
      {
        ...artifact,
        dataSource: {
          ...artifact.dataSource,
          actualStartDate: "2026-08-11",
          actualEndDate: "2026-08-10",
        },
      },
    ],
  ])("rejects %s", (_label, value) => {
    expect(() => normalizeQuantRunArtifact(clone(value))).toThrow("invalid");
  });

  it("accepts the null date pair used by insufficient-data artifacts", () => {
    const value = {
      ...artifact,
      dataSource: {
        ...artifact.dataSource,
        actualStartDate: null,
        actualEndDate: null,
      },
    };

    expect(normalizeQuantRunArtifact(value).dataSource).toMatchObject({
      actualStartDate: null,
      actualEndDate: null,
    });
  });
});
