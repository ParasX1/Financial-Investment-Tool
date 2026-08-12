import type { QuantRunArtifact } from "../types";
import type { QuantRunComparison } from "../lib/runHistory";
import {
  formatConfidence,
  humanize,
  OBJECTIVE_LABELS,
  PERIOD_LABELS,
  RISK_PROFILE_LABELS,
} from "../lib/quantDisplay";
import styles from "../styles/quantAnalysisStyles";

const inputLabels = {
  symbol: "Symbol",
  benchmark: "Benchmark",
  period: "Period",
  interval: "Interval",
  objective: "Objective",
  riskProfile: "Risk profile",
} as const;

const displayInput = (key: keyof typeof inputLabels, value: string): string => {
  if (key === "period") return PERIOD_LABELS[value as keyof typeof PERIOD_LABELS];
  if (key === "objective") return OBJECTIVE_LABELS[value as keyof typeof OBJECTIVE_LABELS];
  if (key === "riskProfile") {
    return RISK_PROFILE_LABELS[value as keyof typeof RISK_PROFILE_LABELS];
  }
  return value === "1d" ? "Daily" : value;
};

const formatUtcTimestamp = (value: string): string =>
  `${new Date(value).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "")} UTC`;

function ComparisonValue({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className={styles.comparisonValues}>
      <span>{left}</span>
      <span aria-hidden="true">→</span>
      <span>{right}</span>
    </div>
  );
}

export function RunHistory({
  comparison,
  comparisonRunIds,
  comparisonRuns,
  historyLimit,
  runs,
  onToggleComparison,
}: {
  comparison: QuantRunComparison | null;
  comparisonRunIds: readonly string[];
  comparisonRuns: readonly QuantRunArtifact[];
  historyLimit: number;
  runs: readonly QuantRunArtifact[];
  onToggleComparison: (runId: string) => void;
}) {
  return (
    <section className={styles.historyPanel} aria-labelledby="run-history-title">
      <div className={styles.historyHeader}>
        <div>
          <p className={styles.eyebrow}>Session memory</p>
          <h2 id="run-history-title" className={styles.panelTitle}>
            Run history & comparison
          </h2>
        </div>
        <span className={styles.historyCount}>
          {runs.length} / {historyLimit} retained
        </span>
      </div>

      {!runs.length ? (
        <p className={styles.historyEmpty}>
          Completed studies stay in this browser session. Select any two to compare.
        </p>
      ) : (
        <div
          className={styles.historyTableWrap}
          tabIndex={0}
          role="region"
          aria-label="Run history table"
        >
          <table className={styles.historyTable}>
            <thead>
              <tr>
                <th scope="col">Compare</th>
                <th scope="col">Run</th>
                <th scope="col">Inputs</th>
                <th scope="col">Regime</th>
                <th scope="col">Stance</th>
                <th scope="col">Warnings</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const selected = comparisonRunIds.includes(run.runId);
                return (
                  <tr key={run.runId} data-history-run={run.runId}>
                    <td>
                      <button
                        type="button"
                        className={styles.compareToggle}
                        aria-label={`Compare run ${run.runId}`}
                        aria-pressed={selected}
                        onClick={() => onToggleComparison(run.runId)}
                      >
                        {selected ? "Selected" : "Select"}
                      </button>
                    </td>
                    <td>
                      <strong>{run.request.symbol}</strong>
                      <code>{run.runId}</code>
                      <span>{formatUtcTimestamp(run.createdAt)}</span>
                    </td>
                    <td>
                      {PERIOD_LABELS[run.request.period]} · {OBJECTIVE_LABELS[run.request.objective]}
                    </td>
                    <td>{humanize(run.diagnosis.regime)}</td>
                    <td>{humanize(run.decision.stance)}</td>
                    <td>{run.warnings.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {comparison && comparisonRuns.length === 2 ? (
        <div className={styles.comparisonPanel} data-testid="run-comparison">
          <div className={styles.comparisonHeader}>
            <div>
              <p className={styles.eyebrow}>Pinned comparison</p>
              <h3>{comparisonRuns[0].runId} vs {comparisonRuns[1].runId}</h3>
            </div>
            <span>{comparison.changedInputs.length} inputs changed</span>
          </div>

          <div className={styles.comparisonGrid}>
            {comparison.changedInputs.map((key) => (
              <div key={key} className={styles.comparisonRow}>
                <strong>{inputLabels[key]}</strong>
                <ComparisonValue
                  left={displayInput(key, String(comparison.inputs[key].left))}
                  right={displayInput(key, String(comparison.inputs[key].right))}
                />
              </div>
            ))}
            <div className={styles.comparisonRow}>
              <strong>Regime</strong>
              <ComparisonValue
                left={humanize(comparison.outcomes.regime.left)}
                right={humanize(comparison.outcomes.regime.right)}
              />
            </div>
            <div className={styles.comparisonRow}>
              <strong>Stance</strong>
              <ComparisonValue
                left={humanize(comparison.outcomes.stance.left)}
                right={humanize(comparison.outcomes.stance.right)}
              />
            </div>
            <div className={styles.comparisonRow}>
              <strong>Diagnosis confidence</strong>
              <ComparisonValue
                left={formatConfidence(comparison.outcomes.diagnosisConfidence.left)}
                right={formatConfidence(comparison.outcomes.diagnosisConfidence.right)}
              />
            </div>
            <div className={styles.comparisonRow}>
              <strong>Decision confidence</strong>
              <ComparisonValue
                left={formatConfidence(comparison.outcomes.decisionConfidence.left)}
                right={formatConfidence(comparison.outcomes.decisionConfidence.right)}
              />
            </div>
          </div>

          {comparison.warningDelta.added.length || comparison.warningDelta.removed.length ? (
            <div className={styles.warningDelta}>
              <h4>Warning delta</h4>
              {comparison.warningDelta.added.map((warning) => (
                <p key={`added-${warning}`}><span>Added</span>{warning}</p>
              ))}
              {comparison.warningDelta.removed.map((warning) => (
                <p key={`removed-${warning}`}><span>Cleared</span>{warning}</p>
              ))}
            </div>
          ) : null}
        </div>
      ) : comparisonRunIds.length ? (
        <p className={styles.comparisonHint}>
          Select {2 - comparisonRunIds.length} more run to open a side-by-side audit.
        </p>
      ) : null}
    </section>
  );
}
