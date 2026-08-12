import type { QuantRunArtifact, QuantRunRequest } from "../types";

export const QUANT_SESSION_RUN_LIMIT = 20;

export function appendSessionRun(
  runs: readonly QuantRunArtifact[],
  run: QuantRunArtifact,
  limit = QUANT_SESSION_RUN_LIMIT,
): readonly QuantRunArtifact[] {
  const uniqueRuns = runs.filter(
    (candidate) =>
      candidate.runId !== run.runId &&
      (!run.clientRunId || candidate.clientRunId !== run.clientRunId),
  );
  return [run, ...uniqueRuns].slice(0, Math.max(1, limit));
}

export function toggleComparisonRun(
  selectedRunIds: readonly string[],
  runId: string,
): readonly string[] {
  if (selectedRunIds.includes(runId)) {
    return selectedRunIds.filter((selectedRunId) => selectedRunId !== runId);
  }
  return [...selectedRunIds, runId].slice(-2);
}

type ComparableRequestKey = keyof Pick<
  QuantRunRequest,
  "symbol" | "benchmark" | "period" | "interval" | "objective" | "riskProfile"
>;

const COMPARABLE_INPUT_KEYS: readonly ComparableRequestKey[] = [
  "symbol",
  "benchmark",
  "period",
  "interval",
  "objective",
  "riskProfile",
];

type ComparisonValue<T> = Readonly<{
  left: T;
  right: T;
  changed: boolean;
}>;

const comparisonValue = <T>(left: T, right: T): ComparisonValue<T> => ({
  left,
  right,
  changed: left !== right,
});

export type QuantRunComparison = Readonly<{
  changedInputs: readonly ComparableRequestKey[];
  inputs: Readonly<
    Record<
      ComparableRequestKey,
      ComparisonValue<QuantRunRequest[ComparableRequestKey]>
    >
  >;
  outcomes: Readonly<{
    regime: ComparisonValue<QuantRunArtifact["diagnosis"]["regime"]>;
    stance: ComparisonValue<QuantRunArtifact["decision"]["stance"]>;
    diagnosisConfidence: ComparisonValue<number>;
    decisionConfidence: ComparisonValue<number>;
  }>;
  warningDelta: Readonly<{
    added: readonly string[];
    removed: readonly string[];
  }>;
}>;

export function buildRunComparison(
  left: QuantRunArtifact,
  right: QuantRunArtifact,
): QuantRunComparison {
  const inputs = COMPARABLE_INPUT_KEYS.reduce<QuantRunComparison["inputs"]>(
    (result, key) => ({
      ...result,
      [key]: comparisonValue(left.request[key], right.request[key]),
    }),
    {} as QuantRunComparison["inputs"],
  );
  return {
    inputs,
    changedInputs: COMPARABLE_INPUT_KEYS.filter((key) => inputs[key].changed),
    outcomes: {
      regime: comparisonValue(left.diagnosis.regime, right.diagnosis.regime),
      stance: comparisonValue(left.decision.stance, right.decision.stance),
      diagnosisConfidence: comparisonValue(
        left.diagnosis.confidence,
        right.diagnosis.confidence,
      ),
      decisionConfidence: comparisonValue(
        left.decision.confidence,
        right.decision.confidence,
      ),
    },
    warningDelta: {
      added: right.warnings.filter(
        (warning) => !left.warnings.includes(warning),
      ),
      removed: left.warnings.filter(
        (warning) => !right.warnings.includes(warning),
      ),
    },
  };
}
