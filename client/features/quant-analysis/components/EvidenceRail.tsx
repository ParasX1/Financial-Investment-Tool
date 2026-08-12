import type { QuantRunArtifact, QuantStageRecord } from "../types";
import {
  formatDuration,
  formatEvidenceValue,
  humanize,
  statusLabel,
} from "../lib/quantDisplay";
import styles from "../styles/quantAnalysisStyles";

const stageIssues = (stage: QuantStageRecord): readonly string[] =>
  stage.issueCodes ?? stage.issues ?? [];

function AuditRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={styles.auditRow}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function EvidenceRail({ run }: { run: QuantRunArtifact | null }) {
  if (!run) {
    return (
      <aside className={styles.evidenceRail} aria-labelledby="evidence-rail-title">
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.eyebrow}>Traceable output</p>
            <h2 id="evidence-rail-title" className={styles.panelTitle}>
              Evidence & audit
            </h2>
          </div>
          <span className={styles.sequenceBadge}>03</span>
        </div>
        <div className={styles.railEmpty}>
          <span aria-hidden="true">∷</span>
          <p>Metrics, source windows, warnings, versions, and validation attempts appear here.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className={styles.evidenceRail} aria-labelledby="evidence-rail-title">
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>Traceable output</p>
          <h2 id="evidence-rail-title" className={styles.panelTitle}>
            Evidence & audit
          </h2>
        </div>
        <span className={`${styles.statusChip} ${styles[`status_${run.status}`]}`}>
          {statusLabel(run.status)}
        </span>
      </div>

      {run.warnings.length ? (
        <section className={styles.warningPanel} aria-labelledby="run-warnings-title">
          <h3 id="run-warnings-title">Warnings · {run.warnings.length}</h3>
          <ul>
            {run.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : (
        <p className={styles.cleanAudit}>No run-level warnings recorded.</p>
      )}

      <section className={styles.railSection} aria-labelledby="metrics-title">
        <div className={styles.railSectionHeader}>
          <h3 id="metrics-title">Calculated evidence</h3>
          <span>{run.evidence.length} features</span>
        </div>
        <div className={styles.metricList}>
          {run.evidence.map((evidence) => (
            <article
              key={evidence.key}
              className={styles.metricCard}
              data-finite={evidence.finite}
            >
              <div>
                <p>{evidence.label}</p>
                <code>{evidence.key}</code>
              </div>
              <strong>{formatEvidenceValue(evidence)}</strong>
              {evidence.warnings.map((warning) => (
                <span key={warning} className={styles.metricWarning}>
                  {warning}
                </span>
              ))}
            </article>
          ))}
        </div>
      </section>

      <section className={styles.railSection} aria-labelledby="source-title">
        <div className={styles.railSectionHeader}>
          <h3 id="source-title">Source & window</h3>
        </div>
        <dl className={styles.auditList}>
          <AuditRow label="Source" value={run.dataSource.name} />
          <AuditRow
            label="Requested window"
            value={`${run.dataSource.requestedStartDate} → ${run.dataSource.requestedEndDate}`}
          />
          <AuditRow
            label="Actual observations"
            value={
              run.dataSource.actualStartDate && run.dataSource.actualEndDate
                ? `${run.dataSource.actualStartDate} → ${run.dataSource.actualEndDate}`
                : "Unavailable"
            }
          />
          <AuditRow label="Primary observations" value={run.dataSource.observationCount} />
          <AuditRow
            label="Benchmark observations"
            value={run.dataSource.benchmarkObservationCount}
          />
          <AuditRow label="Aligned observations" value={run.dataSource.alignedObservationCount} />
        </dl>
      </section>

      <section className={styles.railSection} aria-labelledby="versions-title">
        <div className={styles.railSectionHeader}>
          <h3 id="versions-title">Version ledger</h3>
        </div>
        <dl className={styles.auditList}>
          <AuditRow label="Engine" value={run.versions.engine} />
          <AuditRow label="Feature set" value={run.versions.featureSet} />
          <AuditRow label="Provider" value={run.versions.provider} />
          <AuditRow label="Playbook" value={run.versions.playbook} />
        </dl>
      </section>

      <section className={styles.railSection} aria-labelledby="stage-audit-title">
        <div className={styles.railSectionHeader}>
          <h3 id="stage-audit-title">Stage audit</h3>
        </div>
        <div className={styles.stageAuditList}>
          {(["diagnose", "decide"] as const).map((stageName) => {
            const stage = run.stages[stageName];
            return (
              <article key={stageName}>
                <div>
                  <strong>{humanize(stageName)}</strong>
                  <span>{statusLabel(stage.status)}</span>
                </div>
                <p>{formatDuration(stage.durationMs)}</p>
                {stageIssues(stage).length ? (
                  <code>{stageIssues(stage).join(", ")}</code>
                ) : null}
              </article>
            );
          })}
        </div>
        <div className={styles.validationList}>
          {run.validationAttempts.map((attempt) => (
            <div key={`${attempt.stage}-${attempt.attempt}`}>
              <span>
                {humanize(attempt.stage)} attempt {attempt.attempt}
              </span>
              <strong>{humanize(attempt.outcome)}</strong>
              {attempt.issueCodes.length ? <code>{attempt.issueCodes.join(", ")}</code> : null}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.traceBlock} aria-label="Run identifiers">
        <div>
          <span>Run</span>
          <code>{run.runId}</code>
        </div>
        <div>
          <span>Trace</span>
          <code>{run.traceId}</code>
        </div>
        {run.clientRunId ? (
          <div>
            <span>Client run</span>
            <code>{run.clientRunId}</code>
          </div>
        ) : null}
      </section>
    </aside>
  );
}
