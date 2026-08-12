import type { QuantRunArtifact } from "../types";
import {
  createQuantSessionScope,
  getQuantRunStorageKey,
  loadSessionRuns,
  saveSessionRuns,
} from "./sessionRunStorage";

const makeRun = (index: number): QuantRunArtifact => {
  const suffix = String(index).padStart(12, "0");
  const clientRunId = `11111111-1111-4111-8111-${suffix}`;
  return {
    schemaVersion: "1.0",
    runId: `run-${index}`,
    clientRunId,
    traceId: `trace-${index}`,
    status: "succeeded",
    request: {
      clientRunId,
      symbol: "BHP.AX",
      benchmark: "^AXJO",
      period: "6mo",
      interval: "1d",
      objective: "signal_scan",
      riskProfile: "balanced",
    },
    evidence: [],
    diagnosis: {
      regime: "range_bound",
      direction: "mixed",
      strength: "weak",
      summary: "Range-bound.",
      templateVersion: "diagnosis-template@1.0.0",
      confidence: 0.5,
      evidence: [
        {
          evidenceId: "observation_count",
          direction: "neutral",
          strength: "weak",
        },
      ],
      riskCodes: ["RESEARCH_UNCERTAINTY"],
      risks: ["Historical evidence does not guarantee a future outcome."],
      dataQuality: "complete",
    },
    decision: {
      stance: "neutral",
      playbook: {
        id: "balanced",
        version: "1",
        title: "Balanced",
        origin: "clean_room",
        contentHash: "sha256:balanced-v1",
      },
      thesis: "Monitor.",
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
          implication: "Defend",
        },
      ],
      invalidationCodes: ["SUSTAINED_RANGE_BREAK"],
      invalidationConditions: [
        "Multiple trend horizons support one direction.",
      ],
      riskControlCodes: ["RESEARCH_ONLY"],
      riskControls: ["Treat this output as research commentary only."],
      confidence: 0.5,
    },
    versions: {
      engine: "engine-1",
      featureSet: "features-1",
      provider: "deterministic-1",
      playbook: "balanced-1",
    },
    stages: {
      diagnose: {
        status: "succeeded",
        durationMs: 12,
        startedAt: "2026-08-01T01:00:00.000Z",
        completedAt: "2026-08-01T01:00:00.012Z",
        providerVersion: "deterministic-1",
        validationAttemptCount: 1,
        issueCodes: [],
      },
      decide: {
        status: "succeeded",
        durationMs: 8,
        startedAt: "2026-08-01T01:00:00.012Z",
        completedAt: "2026-08-01T01:00:00.020Z",
        providerVersion: "deterministic-1",
        validationAttemptCount: 1,
        issueCodes: [],
      },
    },
    validationAttempts: [],
    warnings: [],
    dataSource: {
      name: "Market provider",
      symbol: "BHP.AX",
      benchmark: "^AXJO",
      requestedStartDate: "2026-02-01",
      requestedEndDate: "2026-08-01",
      actualStartDate: "2026-02-02",
      actualEndDate: "2026-08-01",
      observationCount: 120,
      benchmarkObservationCount: 121,
      alignedObservationCount: 119,
    },
    createdAt: "2026-08-12T00:00:00.000Z",
  };
};

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial));
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

describe("versioned Quant Studio session storage", () => {
  const anonymousScope = createQuantSessionScope(false, null)!;
  const userAScope = createQuantSessionScope(false, "user-a")!;
  const userBScope = createQuantSessionScope(false, "user-b")!;

  it("round-trips bounded history and strips unexpected provider fields", () => {
    const storage = memoryStorage();
    const unsafe = {
      ...makeRun(1),
      rawProviderResponse: { privateMarker: "must-not-persist" },
      prompt: "must-not-persist",
    } as QuantRunArtifact;

    saveSessionRuns(storage, userAScope, [
      unsafe,
      ...Array.from({ length: 24 }, (_, index) => makeRun(index + 2)),
    ]);
    const stored = storage.getItem(getQuantRunStorageKey(userAScope)) ?? "";
    const restored = loadSessionRuns(storage, userAScope);

    expect(restored).toHaveLength(20);
    expect(restored[0].runId).toBe("run-1");
    expect(stored).not.toContain("must-not-persist");
    expect(stored).toContain('"version":1');
  });

  it("isolates authenticated accounts and the anonymous tab session", () => {
    const storage = memoryStorage();

    saveSessionRuns(storage, userAScope, [makeRun(1)]);
    saveSessionRuns(storage, userBScope, [makeRun(2)]);
    saveSessionRuns(storage, anonymousScope, [makeRun(3)]);

    expect(
      loadSessionRuns(storage, userAScope).map((run) => run.runId),
    ).toEqual(["run-1"]);
    expect(
      loadSessionRuns(storage, userBScope).map((run) => run.runId),
    ).toEqual(["run-2"]);
    expect(
      loadSessionRuns(storage, anonymousScope).map((run) => run.runId),
    ).toEqual(["run-3"]);
    expect(getQuantRunStorageKey(userAScope)).not.toBe(
      getQuantRunStorageKey(userBScope),
    );
  });

  it("fails closed while auth is loading or the authenticated id is invalid", () => {
    expect(createQuantSessionScope(true, "user-a")).toBeNull();
    expect(createQuantSessionScope(false, "   ")).toBeNull();
    expect(createQuantSessionScope(false, "user/a")).toBeNull();
  });

  it("recovers from corrupt, wrong-version, and unavailable storage", () => {
    const storageKey = getQuantRunStorageKey(userAScope);
    const corrupt = memoryStorage({ [storageKey]: "not-json" });
    const wrongVersion = memoryStorage({
      [storageKey]: JSON.stringify({
        version: 99,
        runs: [makeRun(1)],
      }),
    });
    const unavailable = memoryStorage();
    unavailable.getItem = () => {
      throw new Error("blocked");
    };
    unavailable.setItem = () => {
      throw new Error("quota");
    };

    expect(loadSessionRuns(corrupt, userAScope)).toEqual([]);
    expect(loadSessionRuns(wrongVersion, userAScope)).toEqual([]);
    expect(loadSessionRuns(unavailable, userAScope)).toEqual([]);
    expect(() =>
      saveSessionRuns(unavailable, userAScope, [makeRun(1)]),
    ).not.toThrow();
  });
});
