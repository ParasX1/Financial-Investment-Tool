import { API_BASE } from "@/lib/apiBase";
import {
  QuantAnalysisApiError,
  createQuantRun,
  fetchQuantCapabilities,
} from "./quantAnalysisApi";

const CLIENT_RUN_ID = "11111111-1111-4111-8111-111111111111";
const COMPARISON_RUN_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_RUN_ID = "33333333-3333-4333-8333-333333333333";

const capabilitiesPayload = {
  success: true,
  data: {
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
  },
  meta: { schemaVersion: "1.0" },
};

const runPayload = {
  success: true,
  data: {
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
      {
        key: "trend_60",
        label: "60-observation trend",
        value: null,
        unit: "ratio",
        finite: false,
        warnings: ["Only 43 observations were available."],
      },
    ],
    diagnosis: {
      regime: "range_bound",
      direction: "mixed",
      strength: "weak",
      summary:
        "Relative strength is positive but the longer trend is incomplete.",
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
      thesis: "Wait for the long trend to confirm.",
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
      riskControls: ["Use the benchmark as the decision anchor."],
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
      {
        stage: "decide",
        attempt: 1,
        outcome: "succeeded",
        issueCodes: ["SHORT_WINDOW"],
      },
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
  },
  meta: { schemaVersion: "1.0" },
};

const originalFetch = global.fetch;

describe("quant analysis API client", () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("loads server-owned capabilities without duplicating bounded enums", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => capabilitiesPayload,
    });
    global.fetch = fetchMock as typeof fetch;

    const capabilities = await fetchQuantCapabilities();

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE}/api/v1/quant-analysis/capabilities`,
      expect.objectContaining({ method: "GET" }),
    );
    expect(capabilities.periods).toEqual(["1mo", "3mo", "6mo", "1y", "2y"]);
    expect(capabilities.defaults).toEqual(capabilitiesPayload.data.defaults);
    expect(capabilities.limits).toEqual(capabilitiesPayload.data.limits);
    expect(capabilities.providers[0]).toMatchObject({
      id: "deterministic",
      remote: false,
      deterministic: true,
      enabled: true,
    });
    expect(capabilities.persistence).toEqual({
      serverHistory: false,
      clientMode: "session_storage",
    });
    expect(capabilities.remoteGenerationEnabled).toBe(false);
  });

  it("derives remote generation truthfully from an enabled remote provider", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...capabilitiesPayload,
        data: {
          ...capabilitiesPayload.data,
          providers: [
            {
              ...capabilitiesPayload.data.providers[0],
              remote: true,
            },
          ],
          remoteGenerationEnabled: true,
        },
      }),
    }) as typeof fetch;

    await expect(fetchQuantCapabilities()).resolves.toMatchObject({
      remoteGenerationEnabled: true,
      providers: [expect.objectContaining({ enabled: true, remote: true })],
    });
  });

  it("posts only the typed research request and preserves partial evidence and audit data", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "X-Trace-ID": runPayload.data.traceId }),
      json: async () => runPayload,
    });
    global.fetch = fetchMock as typeof fetch;

    const artifact = await createQuantRun({
      clientRunId: CLIENT_RUN_ID,
      symbol: " bhp.ax ",
      benchmark: " ^axjo ",
      period: "6mo",
      interval: "1d",
      objective: "signal_scan",
      riskProfile: "balanced",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE}/api/v1/quant-analysis/runs`,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientRunId: CLIENT_RUN_ID,
          symbol: "BHP.AX",
          benchmark: "^AXJO",
          period: "6mo",
          interval: "1d",
          objective: "signal_scan",
          riskProfile: "balanced",
        }),
      }),
    );
    expect(artifact.status).toBe("partial");
    expect(artifact.clientRunId).toBe(artifact.request.clientRunId);
    expect(artifact.dataSource).toMatchObject({
      requestedStartDate: "2026-02-10",
      requestedEndDate: "2026-08-10",
      actualStartDate: "2026-02-11",
      actualEndDate: "2026-08-10",
    });
    expect(artifact.evidence[1]).toMatchObject({ finite: false, value: null });
    expect(artifact.stages.decide.status).toBe("partial");
    expect(artifact.validationAttempts[1].issueCodes).toEqual(["SHORT_WINDOW"]);
  });

  it("fails closed when the response trace header differs from the artifact", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "X-Trace-ID": "trace-mismatch" }),
      json: async () => runPayload,
    }) as typeof fetch;

    await expect(
      createQuantRun({
        clientRunId: CLIENT_RUN_ID,
        symbol: "BHP.AX",
        benchmark: "^AXJO",
        period: "6mo",
        interval: "1d",
        objective: "signal_scan",
        riskProfile: "balanced",
      }),
    ).rejects.toThrow("invalid response");
  });

  it("surfaces safe field and trace details from a provider failure envelope", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        success: false,
        error: {
          code: "MARKET_PROVIDER_UNAVAILABLE",
          message: "Market data is temporarily unavailable.",
          fields: { symbol: "No observations were returned." },
          traceId: "trace-failed",
        },
      }),
    }) as typeof fetch;

    await expect(
      createQuantRun({
        clientRunId: CLIENT_RUN_ID,
        symbol: "BHP.AX",
        benchmark: "^AXJO",
        period: "6mo",
        interval: "1d",
        objective: "signal_scan",
        riskProfile: "balanced",
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<QuantAnalysisApiError>>({
        name: "QuantAnalysisApiError",
        code: "MARKET_PROVIDER_UNAVAILABLE",
        message: "Market data is temporarily unavailable.",
        fields: { symbol: "No observations were returned." },
        traceId: "trace-failed",
        status: 503,
      }),
    );
  });

  it("fails closed when a success response is malformed", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { runId: "missing-audit" } }),
    }) as typeof fetch;

    await expect(
      createQuantRun({
        clientRunId: CLIENT_RUN_ID,
        symbol: "BHP.AX",
        benchmark: "^AXJO",
        period: "6mo",
        interval: "1d",
        objective: "signal_scan",
        riskProfile: "balanced",
      }),
    ).rejects.toThrow("invalid response");
  });

  it("fails closed when the artifact client run ID differs from the request echo", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...runPayload,
        data: {
          ...runPayload.data,
          clientRunId: "22222222-2222-4222-8222-222222222222",
        },
      }),
    }) as typeof fetch;

    await expect(
      createQuantRun({
        clientRunId: CLIENT_RUN_ID,
        symbol: "BHP.AX",
        benchmark: "^AXJO",
        period: "6mo",
        interval: "1d",
        objective: "signal_scan",
        riskProfile: "balanced",
      }),
    ).rejects.toThrow("invalid response");
  });

  it("fails closed when both response echoes differ from the outbound client run ID", async () => {
    const substitutedId = "22222222-2222-4222-8222-222222222222";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...runPayload,
        data: {
          ...runPayload.data,
          clientRunId: substitutedId,
          request: { ...runPayload.data.request, clientRunId: substitutedId },
        },
      }),
    }) as typeof fetch;

    await expect(
      createQuantRun({
        clientRunId: CLIENT_RUN_ID,
        symbol: "BHP.AX",
        benchmark: "^AXJO",
        period: "6mo",
        interval: "1d",
        objective: "signal_scan",
        riskProfile: "balanced",
      }),
    ).rejects.toThrow("invalid response");
  });

  it("fails closed when the response request echo differs from the outbound request", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...runPayload,
        data: {
          ...runPayload.data,
          request: { ...runPayload.data.request, symbol: "RIO.AX" },
        },
      }),
    }) as typeof fetch;

    await expect(
      createQuantRun({
        clientRunId: CLIENT_RUN_ID,
        symbol: "BHP.AX",
        benchmark: "^AXJO",
        period: "6mo",
        interval: "1d",
        objective: "signal_scan",
        riskProfile: "balanced",
      }),
    ).rejects.toThrow("invalid response");
  });

  it.each([
    ["response envelope", { ...runPayload, meta: { schemaVersion: "2.0" } }],
    [
      "artifact",
      {
        ...runPayload,
        data: { ...runPayload.data, schemaVersion: "2.0" },
      },
    ],
  ])(
    "fails closed for an unsupported %s schema version",
    async (_case, payload) => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => payload,
      }) as typeof fetch;

      await expect(
        createQuantRun({
          clientRunId: CLIENT_RUN_ID,
          symbol: "BHP.AX",
          benchmark: "^AXJO",
          period: "6mo",
          interval: "1d",
          objective: "signal_scan",
          riskProfile: "balanced",
        }),
      ).rejects.toThrow("invalid");
    },
  );

  it.each([
    [
      "a non-boolean finite flag",
      { ...runPayload.data.evidence[0], finite: 1 },
    ],
    [
      "missing warnings",
      { ...runPayload.data.evidence[0], warnings: undefined },
    ],
    [
      "a null value marked finite",
      { ...runPayload.data.evidence[0], value: null, finite: true },
    ],
    [
      "a numeric value marked unavailable",
      { ...runPayload.data.evidence[0], value: 0.041, finite: false },
    ],
  ])("fails closed when evidence has %s", async (_case, evidence) => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...runPayload,
        data: { ...runPayload.data, evidence: [evidence] },
      }),
    }) as typeof fetch;

    await expect(
      createQuantRun({
        clientRunId: CLIENT_RUN_ID,
        symbol: "BHP.AX",
        benchmark: "^AXJO",
        period: "6mo",
        interval: "1d",
        objective: "signal_scan",
        riskProfile: "balanced",
      }),
    ).rejects.toThrow("invalid");
  });

  it("rejects a malformed optional comparison run ID before sending the request", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;

    await expect(
      createQuantRun({
        clientRunId: CLIENT_RUN_ID,
        symbol: "BHP.AX",
        benchmark: "^AXJO",
        period: "6mo",
        interval: "1d",
        objective: "signal_scan",
        riskProfile: "balanced",
        compareToRunId: "22222222-2222-1222-8222-222222222222",
      }),
    ).rejects.toThrow("invalid comparison run ID");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves a valid source run ID that matches the comparison request", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        "X-Trace-ID": runPayload.data.traceId,
      }),
      json: async () => ({
        ...runPayload,
        data: {
          ...runPayload.data,
          sourceRunId: COMPARISON_RUN_ID,
          request: {
            ...runPayload.data.request,
            compareToRunId: COMPARISON_RUN_ID,
          },
        },
      }),
    }) as typeof fetch;

    await expect(
      createQuantRun({
        clientRunId: CLIENT_RUN_ID,
        symbol: "BHP.AX",
        benchmark: "^AXJO",
        period: "6mo",
        interval: "1d",
        objective: "signal_scan",
        riskProfile: "balanced",
        compareToRunId: COMPARISON_RUN_ID,
      }),
    ).resolves.toMatchObject({
      sourceRunId: COMPARISON_RUN_ID,
      request: { compareToRunId: COMPARISON_RUN_ID },
    });
  });

  it.each([
    ["invalid", undefined, "not-a-uuid"],
    ["missing", COMPARISON_RUN_ID, undefined],
    ["mismatched", COMPARISON_RUN_ID, OTHER_RUN_ID],
    ["unexpected", undefined, COMPARISON_RUN_ID],
  ])(
    "fails closed for a source run ID that is %s",
    async (_case, compareToRunId, sourceRunId) => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ...runPayload,
          data: {
            ...runPayload.data,
            ...(sourceRunId ? { sourceRunId } : {}),
            request: {
              ...runPayload.data.request,
              ...(compareToRunId ? { compareToRunId } : {}),
            },
          },
        }),
      }) as typeof fetch;

      await expect(
        createQuantRun({
          clientRunId: CLIENT_RUN_ID,
          symbol: "BHP.AX",
          benchmark: "^AXJO",
          period: "6mo",
          interval: "1d",
          objective: "signal_scan",
          riskProfile: "balanced",
          ...(compareToRunId ? { compareToRunId } : {}),
        }),
      ).rejects.toThrow("invalid");
    },
  );

  it("fails closed when required observation audit counts are missing", async () => {
    const { alignedObservationCount: _missing, ...incompleteSource } =
      runPayload.data.dataSource;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...runPayload,
        data: { ...runPayload.data, dataSource: incompleteSource },
      }),
    }) as typeof fetch;

    await expect(
      createQuantRun({
        clientRunId: CLIENT_RUN_ID,
        symbol: "BHP.AX",
        benchmark: "^AXJO",
        period: "6mo",
        interval: "1d",
        objective: "signal_scan",
        riskProfile: "balanced",
      }),
    ).rejects.toThrow("invalid aligned observation count");
  });

  it.each([
    [
      "a non-terminal status",
      { ...runPayload.data.stages.diagnose, status: "running" },
    ],
    [
      "a missing duration",
      { ...runPayload.data.stages.diagnose, durationMs: undefined },
    ],
    [
      "a negative duration",
      { ...runPayload.data.stages.diagnose, durationMs: -1 },
    ],
    [
      "a missing start time",
      { ...runPayload.data.stages.diagnose, startedAt: undefined },
    ],
    [
      "an invalid completion time",
      { ...runPayload.data.stages.diagnose, completedAt: "not-a-date" },
    ],
    [
      "a missing provider version",
      { ...runPayload.data.stages.diagnose, providerVersion: undefined },
    ],
    [
      "a zero validation-attempt count",
      { ...runPayload.data.stages.diagnose, validationAttemptCount: 0 },
    ],
    [
      "only the obsolete issues alias",
      {
        ...runPayload.data.stages.diagnose,
        issueCodes: undefined,
        issues: [],
      },
    ],
  ])("fails closed when a completed stage has %s", async (_case, diagnose) => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...runPayload,
        data: {
          ...runPayload.data,
          stages: { ...runPayload.data.stages, diagnose },
        },
      }),
    }) as typeof fetch;

    await expect(
      createQuantRun({
        clientRunId: CLIENT_RUN_ID,
        symbol: "BHP.AX",
        benchmark: "^AXJO",
        period: "6mo",
        interval: "1d",
        objective: "signal_scan",
        riskProfile: "balanced",
      }),
    ).rejects.toThrow("invalid");
  });

  it("fails closed when a validation-attempt outcome is outside the locked enum", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...runPayload,
        data: {
          ...runPayload.data,
          validationAttempts: [
            {
              ...runPayload.data.validationAttempts[0],
              outcome: "passed",
            },
          ],
        },
      }),
    }) as typeof fetch;

    await expect(
      createQuantRun({
        clientRunId: CLIENT_RUN_ID,
        symbol: "BHP.AX",
        benchmark: "^AXJO",
        period: "6mo",
        interval: "1d",
        objective: "signal_scan",
        riskProfile: "balanced",
      }),
    ).rejects.toThrow("invalid validation outcome");
  });
});
