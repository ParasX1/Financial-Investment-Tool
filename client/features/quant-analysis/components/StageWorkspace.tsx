import type {
  QuantRunArtifact,
  QuantRunForm,
  QuantStageRecord,
  QuantStageStatus,
} from "../types";
import { formatConfidence, humanize, statusLabel } from "../lib/quantDisplay";
import styles from "../styles/quantAnalysisStyles";

const clientStage = (status: QuantStageStatus): QuantStageRecord => ({
  status,
  issueCodes: [],
});

function StageCard({
  children,
  description,
  name,
  stage,
  stageKey,
}: {
  children: React.ReactNode;
  description: string;
  name: string;
  stage: QuantStageRecord;
  stageKey: "hypothesis" | "diagnose" | "decide";
}) {
  return (
    <article
      className={styles.stageCard}
      data-stage={stageKey}
      data-status={stage.status}
      aria-label={`${name}: ${statusLabel(stage.status)}`}
    >
      <div className={styles.stageHeader}>
        <div className={styles.stageMarker} aria-hidden="true">
          {stageKey === "hypothesis" ? "H" : stageKey === "diagnose" ? "D1" : "D2"}
        </div>
        <div className={styles.stageHeading}>
          <p>{name}</p>
          <span>{description}</span>
        </div>
        <span className={`${styles.statusChip} ${styles[`status_${stage.status}`]}`}>
          {statusLabel(stage.status)}
        </span>
      </div>
      <div className={styles.stageBody}>{children}</div>
    </article>
  );
}

function EmptyStage({ children }: { children: React.ReactNode }) {
  return <p className={styles.emptyStage}>{children}</p>;
}

export function StageWorkspace({
  form,
  run,
  running,
  failed,
}: {
  form: QuantRunForm;
  run: QuantRunArtifact | null;
  running: boolean;
  failed: boolean;
}) {
  const diagnoseStage = run?.stages.diagnose ?? (
    running
      ? clientStage("running")
      : failed
        ? clientStage("failed")
        : clientStage("pending")
  );
  const decideStage = run?.stages.decide ?? (
    running
      ? clientStage("pending")
      : failed
        ? clientStage("skipped")
        : clientStage("pending")
  );
  const previousArtifactMessage = run && running
    ? "Previous completed artifact shown — latest attempt is running."
    : run && failed
      ? "Previous completed artifact shown — latest attempt failed."
      : null;
  const displayedForm = run?.request ?? form;

  return (
    <section className={styles.workspace} aria-labelledby="stage-workspace-title">
      <div className={styles.workspaceHeader}>
        <div>
          <p className={styles.eyebrow}>Two-stage pipeline</p>
          <h2 id="stage-workspace-title" className={styles.workspaceTitle}>
            Hypothesis → evidence → decision
          </h2>
        </div>
        <span className={styles.schemaStamp}>Schema 1.0</span>
      </div>

      <div className={styles.stageStack} aria-busy={running}>
        {previousArtifactMessage ? (
          <p className={styles.staleArtifact} role="status" aria-live="polite">
            {previousArtifactMessage}
          </p>
        ) : null}
        <StageCard
          stageKey="hypothesis"
          name="Hypothesis"
          description="The bounded question sent to the research engine."
          stage={clientStage(running || run || failed ? "succeeded" : "pending")}
        >
          <dl className={styles.hypothesisGrid}>
            <div>
              <dt>Target</dt>
              <dd>{displayedForm.symbol || "Not set"}</dd>
            </div>
            <div>
              <dt>Relative to</dt>
              <dd>{displayedForm.benchmark || "Not set"}</dd>
            </div>
            <div>
              <dt>Objective</dt>
              <dd>{humanize(displayedForm.objective)}</dd>
            </div>
            <div>
              <dt>Risk posture</dt>
              <dd>{humanize(displayedForm.riskProfile)}</dd>
            </div>
          </dl>
        </StageCard>

        <StageCard
          stageKey="diagnose"
          name="Diagnose"
          description="Derive point-in-time evidence and classify the regime."
          stage={diagnoseStage}
        >
          {run ? (
            <>
              <div className={styles.resultHeadline}>
                <div>
                  <span>Regime</span>
                  <strong>{humanize(run.diagnosis.regime)}</strong>
                </div>
                <div>
                  <span>Direction</span>
                  <strong>{humanize(run.diagnosis.direction)}</strong>
                </div>
                <div>
                  <span>Strength</span>
                  <strong>{humanize(run.diagnosis.strength)}</strong>
                </div>
                <div>
                  <span>Confidence</span>
                  <strong>{formatConfidence(run.diagnosis.confidence)}</strong>
                </div>
                <div>
                  <span>Data quality</span>
                  <strong>{humanize(run.diagnosis.dataQuality)}</strong>
                </div>
              </div>
              <p className={styles.resultSummary}>{run.diagnosis.summary}</p>
              <div className={styles.semanticMetadata} aria-label="Diagnosis semantic metadata">
                <span>
                  Template <code>{run.diagnosis.templateVersion}</code>
                </span>
                <span>
                  Risk codes <code>{run.diagnosis.riskCodes.join(" · ")}</code>
                </span>
              </div>
              {run.diagnosis.evidence.length ? (
                <div className={styles.driverList}>
                  <p className={styles.subheading}>Why this diagnosis</p>
                  <ul>
                    {run.diagnosis.evidence.map((reference) => (
                      <li key={`${reference.evidenceId}-${reference.direction}-${reference.strength}`}>
                        <code>{reference.evidenceId}</code>
                        <span>
                          {humanize(reference.direction)} · {humanize(reference.strength)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {run.diagnosis.risks.length ? (
                <div className={styles.riskBlock}>
                  <p className={styles.subheading}>Diagnostic risks</p>
                  <ul>
                    {run.diagnosis.risks.map((risk) => (
                      <li key={risk}>{risk}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyStage>
              {running
                ? "Calculating finite, inspectable features from the selected window…"
                : failed
                  ? "Diagnosis did not complete. The last successful artifact remains available."
                  : "Run the study to populate regime, confidence, drivers, and data quality."}
            </EmptyStage>
          )}
        </StageCard>

        <StageCard
          stageKey="decide"
          name="Decide"
          description="Route the validated diagnosis through an owned playbook."
          stage={decideStage}
        >
          {run ? (
            <>
              <div className={styles.decisionLead}>
                <div>
                  <span>Research stance</span>
                  <strong>{humanize(run.decision.stance)}</strong>
                </div>
                <div className={styles.playbookTag}>
                  {run.decision.playbook.title} · {run.decision.playbook.version}
                </div>
              </div>
              <p className={styles.resultSummary}>{run.decision.thesis}</p>
              <div className={styles.semanticMetadata} aria-label="Decision semantic metadata">
                <span>
                  Template <code>{run.decision.templateVersion}</code>
                </span>
                <span>
                  Playbook origin <code>{run.decision.playbook.origin}</code>
                </span>
                <span>
                  Playbook hash <code>{run.decision.playbook.contentHash}</code>
                </span>
                <span>
                  Invalidation codes <code>{run.decision.invalidationCodes.join(" · ")}</code>
                </span>
                <span>
                  Risk-control codes <code>{run.decision.riskControlCodes.join(" · ")}</code>
                </span>
              </div>
              <div className={styles.scenarioGrid}>
                {run.decision.scenarios.map((scenario) => (
                  <article key={scenario.code} className={styles.scenarioCard}>
                    <p>{scenario.name}</p>
                    <code className={styles.semanticCode}>{scenario.code}</code>
                    <strong>{scenario.condition}</strong>
                    <span>{scenario.implication}</span>
                  </article>
                ))}
              </div>
              <div className={styles.decisionChecks}>
                <div>
                  <p className={styles.subheading}>Invalidation</p>
                  <ul>
                    {run.decision.invalidationConditions.map((condition) => (
                      <li key={condition}>{condition}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className={styles.subheading}>Risk controls</p>
                  <ul>
                    {run.decision.riskControls.map((control) => (
                      <li key={control}>{control}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <EmptyStage>
              {running
                ? "Waiting for Diagnose to validate before playbook routing begins."
                : failed
                  ? "Decision was skipped because the request failed closed."
                  : "Decide begins only after Diagnose completes and validates."}
            </EmptyStage>
          )}
        </StageCard>
      </div>
    </section>
  );
}
