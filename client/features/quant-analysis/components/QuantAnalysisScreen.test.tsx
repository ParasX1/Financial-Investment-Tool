import * as React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import type { QuantAnalysisApi } from "../api/quantAnalysisApi";
import { QuantAnalysisApiError } from "../api/quantAnalysisApi";
import type {
  QuantCapabilities,
  QuantRunArtifact,
  QuantRunRequest,
} from "../types";
import {
  createQuantSessionScope,
  saveSessionRuns,
} from "../lib/sessionRunStorage";
import { QuantAnalysisScreen } from "./QuantAnalysisScreen";

jest.mock("@/components/sidebar", () => function MockSidebar() {
  return null;
});

let mockAuthState: {
  loading: boolean;
  user: { id: string } | null;
} = {
  loading: false,
  user: { id: "user-a" },
};

jest.mock("@/features/auth", () => ({
  useAuth: () => mockAuthState,
}));

const capabilities: QuantCapabilities = {
  schemaVersion: "1.0",
  periods: ["1mo", "3mo", "6mo", "1y", "2y"],
  intervals: ["1d"],
  objectives: ["signal_scan", "risk_review", "scenario_plan"],
  riskProfiles: ["conservative", "balanced", "aggressive"],
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
    maxSessionRuns: 7,
    runRateLimit: 5,
    runRateWindowSeconds: 60,
  },
  persistence: { serverHistory: false, clientMode: "session_storage" },
  remoteGenerationEnabled: false,
  cache: { policy: "no-store" },
};

const completedStages: QuantRunArtifact["stages"] = {
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
    status: "succeeded",
    durationMs: 7,
    startedAt: "2026-08-12T01:02:03.018Z",
    completedAt: "2026-08-12T01:02:03.025Z",
    providerVersion: "deterministic-1.0.0",
    validationAttemptCount: 1,
    issueCodes: [],
  },
};

function makeRun(
  runId: string,
  request: QuantRunRequest,
  overrides: Partial<QuantRunArtifact> = {},
): QuantRunArtifact {
  return {
    schemaVersion: "1.0",
    runId,
    clientRunId: request.clientRunId,
    traceId: `trace-${runId}`,
    status: "succeeded",
    request,
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
      summary: "Relative strength is positive while price remains range-bound.",
      templateVersion: "diagnosis-template@1.0.0",
      confidence: 0.58,
      evidence: [
        { evidenceId: "relative_return", direction: "positive", strength: "weak" },
      ],
      riskCodes: ["RESEARCH_UNCERTAINTY"],
      risks: ["Breakout confirmation is absent."],
      dataQuality: "complete",
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
      thesis: "Monitor for confirmation before changing the research stance.",
      templateVersion: "decision-template@1.0.0",
      scenarios: [
        { code: "BASE_CONTINUATION", name: "base", condition: "Range holds", implication: "Monitor" },
        { code: "BULL_CONFIRMATION", name: "bull", condition: "Breakout confirms", implication: "Reassess" },
        { code: "BEAR_REVERSAL", name: "bear", condition: "Support fails", implication: "Stay defensive" },
      ],
      invalidationCodes: ["SUSTAINED_RANGE_BREAK"],
      invalidationConditions: ["Relative return turns negative."],
      riskControlCodes: ["RESEARCH_ONLY"],
      riskControls: ["Keep the benchmark as the decision anchor."],
      confidence: 0.52,
    },
    versions: {
      engine: "engine-1.0.0",
      featureSet: "market-core-1.0.0",
      provider: "deterministic-1.0.0",
      playbook: "balanced-regime-1.0.0",
    },
    stages: completedStages,
    validationAttempts: [
      { stage: "diagnose", attempt: 1, outcome: "succeeded", issueCodes: [] },
      { stage: "decide", attempt: 1, outcome: "succeeded", issueCodes: [] },
    ],
    warnings: [],
    dataSource: {
      name: "Yahoo Finance",
      symbol: request.symbol,
      benchmark: request.benchmark,
      requestedStartDate: "2026-02-10",
      requestedEndDate: "2026-08-10",
      actualStartDate: "2026-02-11",
      actualEndDate: "2026-08-10",
      observationCount: 126,
      benchmarkObservationCount: 127,
      alignedObservationCount: 125,
    },
    createdAt: "2026-08-12T01:02:03.000Z",
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, reject, resolve };
}

const textContent = (renderer: ReactTestRenderer) =>
  JSON.stringify(renderer.toJSON());

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

async function renderWithApi(api: QuantAnalysisApi, storage?: Storage) {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <QuantAnalysisScreen api={api} sessionStorage={storage} />,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  return renderer;
}

describe("QuantAnalysisScreen", () => {
  beforeEach(() => {
    mockAuthState = {
      loading: false,
      user: { id: "user-a" },
    };
  });

  it("loads bounded controls, validates inputs, and exposes running then partial stage states", async () => {
    const capabilitiesRequest = deferred<QuantCapabilities>();
    const runRequest = deferred<QuantRunArtifact>();
    const api: QuantAnalysisApi = {
      fetchCapabilities: jest.fn(() => capabilitiesRequest.promise),
      createRun: jest.fn(() => runRequest.promise),
    };
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<QuantAnalysisScreen api={api} />);
      await Promise.resolve();
    });

    expect(textContent(renderer)).toContain("Loading research controls");
    expect(renderer.root.findByProps({ "data-testid": "run-study" }).props.disabled).toBe(
      true,
    );

    await act(async () => {
      capabilitiesRequest.resolve(capabilities);
      await capabilitiesRequest.promise;
      await Promise.resolve();
    });

    const symbol = renderer.root.findByProps({ id: "quant-symbol" });
    expect(symbol.props["aria-describedby"]).toContain("quant-symbol-help");
    act(() => symbol.props.onChange({ target: { value: "bad symbol!" } }));
    await act(async () => {
      renderer.root.findByProps({ "data-testid": "research-form" }).props.onSubmit({
        preventDefault: jest.fn(),
      });
      await Promise.resolve();
    });
    expect(api.createRun).not.toHaveBeenCalled();
    expect(renderer.root.findByProps({ role: "alert" }).children.join(" ")).toContain(
      "letters, numbers",
    );

    act(() => symbol.props.onChange({ target: { value: "bhp.ax" } }));
    await act(async () => {
      renderer.root.findByProps({ "data-testid": "research-form" }).props.onSubmit({
        preventDefault: jest.fn(),
      });
      await Promise.resolve();
    });

    expect(api.createRun).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: "BHP.AX", benchmark: "^AXJO" }),
      expect.anything(),
    );
    expect(renderer.root.findByProps({ "data-stage": "diagnose" }).props["data-status"]).toBe(
      "running",
    );
    expect(renderer.root.findByProps({ "data-stage": "decide" }).props["data-status"]).toBe(
      "pending",
    );
    expect(renderer.root.findByProps({ "data-testid": "run-study" }).props.disabled).toBe(
      true,
    );

    const partialRun = makeRun(
      "run-partial",
      {
        clientRunId: "11111111-1111-4111-8111-111111111111",
        symbol: "BHP.AX",
        benchmark: "^AXJO",
        period: "6mo",
        interval: "1d",
        objective: "signal_scan",
        riskProfile: "balanced",
      },
      {
        status: "partial",
        warnings: ["Long-trend evidence is unavailable."],
        evidence: [
          {
            key: "trend_60",
            label: "60-observation trend",
            value: null,
            unit: "ratio",
            finite: false,
            warnings: ["Only 43 observations were available."],
          },
        ],
        stages: {
          diagnose: completedStages.diagnose,
          decide: {
            ...completedStages.decide,
            status: "partial",
            issueCodes: ["SHORT_WINDOW"],
          },
        },
        dataSource: {
          name: "Yahoo Finance",
          symbol: "BHP.AX",
          benchmark: "^AXJO",
          requestedStartDate: "2026-02-10",
          requestedEndDate: "2026-08-10",
          actualStartDate: null,
          actualEndDate: null,
          observationCount: 43,
          benchmarkObservationCount: 44,
          alignedObservationCount: 42,
        },
      },
    );
    await act(async () => {
      runRequest.resolve(partialRun);
      await runRequest.promise;
      await Promise.resolve();
    });

    const output = textContent(renderer);
    expect(output).toContain("Partial");
    expect(output).toContain("Yahoo Finance");
    expect(output).toContain("2026-02-10");
    expect(output).toContain("Requested window");
    expect(output).toContain("Actual observations");
    expect(output).toContain("Unavailable");
    expect(output).toContain("Up to ");
    expect(output).toContain("7");
    expect(output).toContain("redacted artifacts");
    expect(output).toContain("diagnosis-template@1.0.0");
    expect(output).toContain("decision-template@1.0.0");
    expect(output).toContain("clean_room");
    expect(output).toContain("sha256:balanced-regime-v1");
    expect(output).toContain("RESEARCH_UNCERTAINTY");
    expect(output).toContain("BASE_CONTINUATION");
    expect(output).toContain("SUSTAINED_RANGE_BREAK");
    expect(output).toContain("RESEARCH_ONLY");
    expect(output).toContain("engine-1.0.0");
    expect(output).toContain("trace-run-partial");
    expect(output).toContain("Long-trend evidence is unavailable");
    expect(output).toContain("SHORT_WINDOW");
    expect(renderer.root.findAllByProps({ "data-history-run": "run-partial" })).toHaveLength(1);
    renderer.unmount();
  });

  it("preserves the last successful artifact and inputs when a later provider request fails", async () => {
    const firstRequest: QuantRunRequest = {
      clientRunId: "11111111-1111-4111-8111-111111111111",
      symbol: "BHP.AX",
      benchmark: "^AXJO",
      period: "6mo",
      interval: "1d",
      objective: "signal_scan",
      riskProfile: "balanced",
    };
    const successfulRun = makeRun("run-success", firstRequest);
    const createRun = jest
      .fn()
      .mockResolvedValueOnce(successfulRun)
      .mockRejectedValueOnce(
        new QuantAnalysisApiError({
          code: "MARKET_PROVIDER_UNAVAILABLE",
          message: "Market data is temporarily unavailable.",
          status: 503,
          traceId: "trace-retry",
        }),
      );
    const renderer = await renderWithApi({
      fetchCapabilities: jest.fn().mockResolvedValue(capabilities),
      createRun,
    });
    const submit = renderer.root.findByProps({ "data-testid": "research-form" });

    await act(async () => {
      submit.props.onSubmit({ preventDefault: jest.fn() });
      await Promise.resolve();
      await Promise.resolve();
    });
    act(() =>
      renderer.root.findByProps({ id: "quant-period" }).props.onChange({
        target: { value: "1y" },
      }),
    );
    await act(async () => {
      submit.props.onSubmit({ preventDefault: jest.fn() });
      await Promise.resolve();
      await Promise.resolve();
    });

    const output = textContent(renderer);
    expect(output).toContain("Market data is temporarily unavailable");
    expect(output).toContain("trace-retry");
    expect(output).toContain("run-success");
    expect(output).toContain(
      "Previous completed artifact shown — latest attempt failed.",
    );
    expect(
      renderer.root.findByProps({ "data-stage": "diagnose" }).props[
        "data-status"
      ],
    ).toBe("succeeded");
    expect(
      renderer.root.findByProps({ "data-stage": "decide" }).props[
        "data-status"
      ],
    ).toBe("succeeded");
    expect(renderer.root.findByProps({ id: "quant-period" }).props.value).toBe("1y");
    expect(renderer.root.findAllByProps({ "data-history-run": "run-success" })).toHaveLength(1);
    renderer.unmount();
  });

  it("keeps immutable session history and compares exactly two changed runs", async () => {
    const firstRequest: QuantRunRequest = {
      clientRunId: "11111111-1111-4111-8111-111111111111",
      symbol: "BHP.AX",
      benchmark: "^AXJO",
      period: "6mo",
      interval: "1d",
      objective: "signal_scan",
      riskProfile: "balanced",
    };
    const secondRequest: QuantRunRequest = {
      ...firstRequest,
      clientRunId: "22222222-2222-4222-8222-222222222222",
      period: "1y",
    };
    const first = makeRun("run-one", firstRequest);
    const second = makeRun("run-two", secondRequest, {
      diagnosis: {
        ...first.diagnosis,
        regime: "bullish",
        confidence: 0.71,
      },
      decision: {
        ...first.decision,
        stance: "constructive",
        confidence: 0.68,
      },
      warnings: ["Latest session was incomplete."],
    });
    const api: QuantAnalysisApi = {
      fetchCapabilities: jest.fn().mockResolvedValue(capabilities),
      createRun: jest.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second),
    };
    const renderer = await renderWithApi(api);
    const submit = renderer.root.findByProps({ "data-testid": "research-form" });

    await act(async () => {
      submit.props.onSubmit({ preventDefault: jest.fn() });
      await Promise.resolve();
      await Promise.resolve();
    });
    act(() =>
      renderer.root.findByProps({ id: "quant-period" }).props.onChange({
        target: { value: "1y" },
      }),
    );
    await act(async () => {
      submit.props.onSubmit({ preventDefault: jest.fn() });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(renderer.root.findAll((node) => node.props["data-history-run"])).toHaveLength(2);
    act(() => renderer.root.findByProps({ "aria-label": "Compare run run-one" }).props.onClick());
    act(() => renderer.root.findByProps({ "aria-label": "Compare run run-two" }).props.onClick());

    const comparisonText = textContent(renderer);
    expect(comparisonText).toContain("Period");
    expect(comparisonText).toContain("6 months");
    expect(comparisonText).toContain("1 year");
    expect(comparisonText).toContain("Range Bound");
    expect(comparisonText).toContain("Bullish");
    expect(comparisonText).toContain("Latest session was incomplete");
    renderer.unmount();
  });

  it("never renders another account's history, active run, or comparison during account transitions", async () => {
    const storage = memoryStorage();
    const baseRequest: QuantRunRequest = {
      clientRunId: "11111111-1111-4111-8111-111111111111",
      symbol: "BHP.AX",
      benchmark: "^AXJO",
      period: "6mo",
      interval: "1d",
      objective: "signal_scan",
      riskProfile: "balanced",
    };
    const userAStored = makeRun("user-a-stored", baseRequest);
    const userBStored = makeRun("user-b-stored", {
      ...baseRequest,
      clientRunId: "22222222-2222-4222-8222-222222222222",
      symbol: "CBA.AX",
    });
    const anonymousStored = makeRun("anonymous-stored", {
      ...baseRequest,
      clientRunId: "33333333-3333-4333-8333-333333333333",
      symbol: "WES.AX",
    });
    saveSessionRuns(
      storage,
      createQuantSessionScope(false, "user-a")!,
      [userAStored],
    );
    saveSessionRuns(
      storage,
      createQuantSessionScope(false, "user-b")!,
      [userBStored],
    );
    saveSessionRuns(
      storage,
      createQuantSessionScope(false, null)!,
      [anonymousStored],
    );

    const createRun = jest.fn((request: QuantRunRequest) =>
      Promise.resolve(
        makeRun("user-a-active", request, {
          decision: {
            ...userAStored.decision,
            thesis: "User A private active thesis.",
          },
        }),
      ),
    );
    const api: QuantAnalysisApi = {
      fetchCapabilities: jest.fn().mockResolvedValue(capabilities),
      createRun,
    };
    const renderer = await renderWithApi(api, storage);

    expect(textContent(renderer)).toContain("user-a-stored");
    expect(textContent(renderer)).not.toContain("user-b-stored");

    await act(async () => {
      renderer.root
        .findByProps({ "data-testid": "research-form" })
        .props.onSubmit({ preventDefault: jest.fn() });
      await Promise.resolve();
      await Promise.resolve();
    });
    act(() =>
      renderer.root
        .findByProps({ "aria-label": "Compare run user-a-stored" })
        .props.onClick(),
    );
    act(() =>
      renderer.root
        .findByProps({ "aria-label": "Compare run user-a-active" })
        .props.onClick(),
    );
    expect(textContent(renderer)).toContain("User A private active thesis");
    expect(
      renderer.root.findAllByProps({ "data-testid": "run-comparison" }),
    ).toHaveLength(1);

    act(() => {
      mockAuthState = { loading: true, user: null };
      renderer.update(<QuantAnalysisScreen api={api} sessionStorage={storage} />);
    });
    const transitionOutput = textContent(renderer);
    expect(transitionOutput).toContain("Securing research session");
    expect(transitionOutput).not.toContain("user-a-stored");
    expect(transitionOutput).not.toContain("user-a-active");
    expect(transitionOutput).not.toContain("User A private active thesis");
    expect(
      renderer.root.findAllByProps({ "data-testid": "run-comparison" }),
    ).toHaveLength(0);

    await act(async () => {
      mockAuthState = { loading: false, user: { id: "user-b" } };
      renderer.update(<QuantAnalysisScreen api={api} sessionStorage={storage} />);
      await Promise.resolve();
    });
    expect(textContent(renderer)).toContain("user-b-stored");
    expect(textContent(renderer)).not.toContain("user-a-stored");
    expect(textContent(renderer)).not.toContain("anonymous-stored");

    act(() => {
      mockAuthState = { loading: true, user: null };
      renderer.update(<QuantAnalysisScreen api={api} sessionStorage={storage} />);
    });
    const signOutTransition = textContent(renderer);
    expect(signOutTransition).not.toContain("user-b-stored");
    expect(signOutTransition).not.toContain("anonymous-stored");
    await act(async () => {
      mockAuthState = { loading: false, user: null };
      renderer.update(<QuantAnalysisScreen api={api} sessionStorage={storage} />);
      await Promise.resolve();
    });
    expect(textContent(renderer)).toContain("anonymous-stored");
    expect(textContent(renderer)).not.toContain("user-a-stored");
    expect(textContent(renderer)).not.toContain("user-b-stored");
    renderer.unmount();
  });

  it("fails closed before the run API when no provider is enabled", async () => {
    const createRun = jest.fn();
    const api: QuantAnalysisApi = {
      fetchCapabilities: jest.fn().mockResolvedValue({
        ...capabilities,
        providers: capabilities.providers.map((provider) => ({
          ...provider,
          enabled: false,
        })),
      }),
      createRun,
    };
    const renderer = await renderWithApi(api);

    expect(
      renderer.root.findByProps({ "data-testid": "run-study" }).props.disabled,
    ).toBe(true);
    await act(async () => {
      renderer.root
        .findByProps({ "data-testid": "research-form" })
        .props.onSubmit({ preventDefault: jest.fn() });
      await Promise.resolve();
    });

    expect(createRun).not.toHaveBeenCalled();
    renderer.unmount();
  });

  it("discards an account A response that resolves after switching to account B", async () => {
    const storage = memoryStorage();
    const pending = deferred<QuantRunArtifact>();
    const createRun = jest.fn(
      (_request: QuantRunRequest) => pending.promise,
    );
    const api: QuantAnalysisApi = {
      fetchCapabilities: jest.fn().mockResolvedValue(capabilities),
      createRun,
    };
    const renderer = await renderWithApi(api, storage);

    act(() =>
      renderer.root
        .findByProps({ "data-testid": "research-form" })
        .props.onSubmit({ preventDefault: jest.fn() }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    const request = createRun.mock.calls[0]![0] as QuantRunRequest;

    await act(async () => {
      mockAuthState = { loading: false, user: { id: "user-b" } };
      renderer.update(
        <QuantAnalysisScreen api={api} sessionStorage={storage} />,
      );
      await Promise.resolve();
    });
    await act(async () => {
      pending.resolve(makeRun("user-a-late", request));
      await pending.promise;
      await Promise.resolve();
    });

    expect(textContent(renderer)).not.toContain("user-a-late");
    expect(
      renderer.root.findAllByProps({
        "data-history-run": "user-a-late",
      }),
    ).toHaveLength(0);
    renderer.unmount();
  });

  it("does not retry a saved request after providers become disabled", async () => {
    const enabledApi: QuantAnalysisApi = {
      fetchCapabilities: jest.fn().mockResolvedValue(capabilities),
      createRun: jest.fn().mockRejectedValue(new Error("temporary failure")),
    };
    const renderer = await renderWithApi(enabledApi);

    await act(async () => {
      renderer.root
        .findByProps({ "data-testid": "research-form" })
        .props.onSubmit({ preventDefault: jest.fn() });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(
      renderer.root.findAllByProps({ "data-testid": "retry-run" }),
    ).toHaveLength(1);

    const retryCreate = jest.fn();
    const disabledApi: QuantAnalysisApi = {
      fetchCapabilities: jest.fn().mockResolvedValue({
        ...capabilities,
        providers: capabilities.providers.map((provider) => ({
          ...provider,
          enabled: false,
        })),
      }),
      createRun: retryCreate,
    };
    await act(async () => {
      renderer.update(<QuantAnalysisScreen api={disabledApi} />);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(
      renderer.root.findByProps({ "data-testid": "run-study" }).props.disabled,
    ).toBe(true);
    await act(async () => {
      renderer.root
        .findByProps({ "data-testid": "retry-run" })
        .props.onClick();
      await Promise.resolve();
    });

    expect(retryCreate).not.toHaveBeenCalled();
    renderer.unmount();
  });
});
