import type { QuantRunArtifact } from "../types";
import {
  appendSessionRun,
  buildRunComparison,
  toggleComparisonRun,
} from "./runHistory";

const makeRun = (
  runId: string,
  overrides: Partial<QuantRunArtifact> = {},
): QuantRunArtifact => ({
  schemaVersion: "1.0",
  runId,
  clientRunId: `11111111-1111-4111-8111-${runId.replace(/\D/g, "").padStart(12, "0")}`,
  traceId: `trace-${runId}`,
  status: "succeeded",
  request: {
    clientRunId: `11111111-1111-4111-8111-${runId.replace(/\D/g, "").padStart(12, "0")}`,
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
    summary: "Range-bound regime.",
    templateVersion: "diagnosis-template@1.0.0",
    confidence: 0.55,
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
      version: "1.0.0",
      title: "Balanced",
      origin: "clean_room",
      contentHash: "sha256:balanced-v1",
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
        implication: "Defend",
      },
    ],
    invalidationCodes: ["SUSTAINED_RANGE_BREAK"],
    invalidationConditions: ["Multiple trend horizons support one direction."],
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
  ...overrides,
});

describe("session run history", () => {
  it("prepends immutable artifacts, de-duplicates run IDs, and applies a limit", () => {
    const first = makeRun("run-1");
    const second = makeRun("run-2");
    const original = [first] as const;

    const withSecond = appendSessionRun(original, second, 2);
    const rerenderedFirst = appendSessionRun(withSecond, first, 2);

    expect(original).toEqual([first]);
    expect(withSecond.map((run) => run.runId)).toEqual(["run-2", "run-1"]);
    expect(rerenderedFirst.map((run) => run.runId)).toEqual(["run-1", "run-2"]);
    expect(rerenderedFirst).not.toBe(withSecond);
  });

  it("keeps comparison selection bounded to two runs and supports toggling", () => {
    expect(toggleComparisonRun([], "run-1")).toEqual(["run-1"]);
    expect(toggleComparisonRun(["run-1"], "run-2")).toEqual(["run-1", "run-2"]);
    expect(toggleComparisonRun(["run-1", "run-2"], "run-3")).toEqual([
      "run-2",
      "run-3",
    ]);
    expect(toggleComparisonRun(["run-2", "run-3"], "run-2")).toEqual(["run-3"]);
  });

  it("compares changed inputs, outcomes, confidence, and warnings without mutating runs", () => {
    const left = makeRun("run-1");
    const right = makeRun("run-2", {
      request: {
        ...left.request,
        period: "1y",
        riskProfile: "conservative",
      },
      diagnosis: {
        ...left.diagnosis,
        regime: "bearish",
        confidence: 0.37,
      },
      decision: {
        ...left.decision,
        stance: "defensive",
        confidence: 0.42,
      },
      warnings: ["Benchmark history is partial."],
    });

    const comparison = buildRunComparison(left, right);

    expect(comparison.changedInputs).toEqual(["period", "riskProfile"]);
    expect(comparison.outcomes).toMatchObject({
      regime: { left: "range_bound", right: "bearish", changed: true },
      stance: { left: "neutral", right: "defensive", changed: true },
      diagnosisConfidence: { left: 0.55, right: 0.37, changed: true },
      decisionConfidence: { left: 0.5, right: 0.42, changed: true },
    });
    expect(comparison.warningDelta).toEqual({
      added: ["Benchmark history is partial."],
      removed: [],
    });
    expect(left.warnings).toEqual([]);
  });
});
