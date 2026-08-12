import * as React from "react";
import { FitPageHeader } from "@/components/shared/FitPageHeader";
import { FitPageShell } from "@/components/shared/FitPageShell";
import { FIT_CONTENT_MAX_WIDTH_PX } from "@/components/shared/uiPrimitives";
import { useAuth } from "@/features/auth";
import type { QuantAnalysisApi } from "../api/quantAnalysisApi";
import { EvidenceRail } from "./EvidenceRail";
import { ResearchSetup } from "./ResearchSetup";
import { RunHistory } from "./RunHistory";
import { StageWorkspace } from "./StageWorkspace";
import {
  createClientRunId,
  useQuantAnalysisController,
} from "../hooks/useQuantAnalysisController";
import {
  OBJECTIVE_LABELS,
  PERIOD_LABELS,
  statusLabel,
} from "../lib/quantDisplay";
import styles from "../styles/quantAnalysisStyles";

export function QuantAnalysisScreen({
  api,
  clientRunIdFactory = createClientRunId,
  sessionStorage,
}: {
  api?: QuantAnalysisApi;
  clientRunIdFactory?: () => string;
  sessionStorage?: Storage;
} = {}) {
  const { loading: authLoading, user } = useAuth();
  const controller = useQuantAnalysisController({
    api,
    authLoading,
    clientRunIdFactory,
    storage: sessionStorage,
    userId: user?.id ?? null,
  });
  const enabledProvider = controller.capabilities?.providers.find(
    (provider) => provider.enabled,
  );
  const summaryRun = controller.activeRun;

  return (
    <FitPageShell
      className={styles.shell}
      skipLabel="Skip to Quant Studio"
      skipTargetId="quant-analysis-main"
    >
      <main id="quant-analysis-main" tabIndex={-1} className={styles.page}>
        <div
          className={styles.pageInner}
          style={{ maxWidth: FIT_CONTENT_MAX_WIDTH_PX }}
        >
          <div className={styles.titleRow}>
            <FitPageHeader
              title="Quant Studio"
              subtitle="Form a bounded hypothesis, inspect point-in-time evidence, and verify a scenario-based research decision."
              subtitleClassName="max-w-[52rem]"
              className={styles.pageHeader}
            />
            <div className={styles.modeLedger} aria-label="Provider mode">
              <span
                className={styles.modeDot}
                data-enabled={Boolean(enabledProvider)}
                aria-hidden="true"
              />
              <div>
                <strong>{enabledProvider?.label ?? "Provider unavailable"}</strong>
                <span>
                  {controller.capabilities?.remoteGenerationEnabled
                    ? "Remote generation enabled"
                    : "Remote generation off"}
                </span>
              </div>
            </div>
          </div>

          <section className={styles.topSummary} aria-label="Current research summary">
            <div>
              <span>Symbol</span>
              <strong>{summaryRun?.request.symbol ?? controller.form.symbol}</strong>
            </div>
            <div>
              <span>Benchmark</span>
              <strong>{summaryRun?.request.benchmark ?? controller.form.benchmark}</strong>
            </div>
            <div>
              <span>Window</span>
              <strong>
                {PERIOD_LABELS[summaryRun?.request.period ?? controller.form.period]}
              </strong>
            </div>
            <div>
              <span>Objective</span>
              <strong>
                {OBJECTIVE_LABELS[
                  summaryRun?.request.objective ?? controller.form.objective
                ]}
              </strong>
            </div>
            <div>
              <span>{summaryRun ? "Displayed run" : "Run state"}</span>
              <strong>
                {summaryRun
                  ? statusLabel(summaryRun.status)
                  : controller.running
                    ? "Running"
                    : "Ready"}
              </strong>
            </div>
          </section>

          {controller.capabilitiesLoading ? (
            <div className={styles.loadingPanel} role="status" aria-live="polite">
              <span className={styles.loadingLine} aria-hidden="true" />
              <div>
                <strong>Loading research controls</strong>
                <p>Reading the server-owned symbols, periods, objectives, and provider mode.</p>
              </div>
              <button type="button" data-testid="run-study" disabled>
                Run study
              </button>
            </div>
          ) : controller.capabilitiesError || !controller.capabilities ? (
            <section className={styles.errorPanel} role="alert">
              <div>
                <p className={styles.eyebrow}>Controls unavailable</p>
                <h2>Quant Studio could not start safely.</h2>
                <p>
                  {controller.capabilitiesError ??
                    "The server did not return a usable capabilities contract."}
                </p>
              </div>
              <button type="button" onClick={controller.retryCapabilities}>
                Retry controls
              </button>
            </section>
          ) : controller.sessionError ? (
            <section className={styles.errorPanel} role="alert">
              <div>
                <p className={styles.eyebrow}>Session unavailable</p>
                <h2>Quant Studio could not isolate this account safely.</h2>
                <p>Sign out, sign in again, and retry before running research.</p>
              </div>
            </section>
          ) : !controller.sessionReady ? (
            <div className={styles.loadingPanel} role="status" aria-live="polite">
              <span className={styles.loadingLine} aria-hidden="true" />
              <div>
                <strong>Securing research session</strong>
                <p>
                  Isolating this tab&apos;s history, active artifact, and
                  comparisons for the current account.
                </p>
              </div>
              <button type="button" data-testid="run-study" disabled>
                Run study
              </button>
            </div>
          ) : (
            <>
              {controller.runFailure ? (
                <section className={styles.runError} role="alert" aria-live="assertive">
                  <div>
                    <strong>Run not saved</strong>
                    <p>{controller.runFailure.message}</p>
                    {controller.runFailure.traceId ? (
                      <code>Trace {controller.runFailure.traceId}</code>
                    ) : null}
                    {controller.runFailure.retryAfterSeconds !== undefined ? (
                      <span>
                        Try again in {controller.runFailure.retryAfterSeconds} seconds.
                      </span>
                    ) : null}
                  </div>
                  {controller.runFailure.request ? (
                    <button
                      type="button"
                      data-testid="retry-run"
                      onClick={() => void controller.retryRun()}
                      disabled={controller.running}
                    >
                      Retry same run
                    </button>
                  ) : null}
                </section>
              ) : null}

              <div className={styles.workbench}>
                <div className={styles.setupColumn}>
                  <ResearchSetup
                    capabilities={controller.capabilities}
                    errors={controller.formErrors}
                    form={controller.form}
                    running={controller.running}
                    onChange={controller.updateForm}
                    onSubmit={controller.runStudy}
                  />
                  <div className={styles.sessionNote}>
                    <strong>Account-isolated and session-local</strong>
                    <p>
                      Up to {controller.historyLimit} redacted artifacts survive refresh in this
                      tab for this account or the separate signed-out scope. Server history is
                      off; nothing is written directly to Supabase.
                    </p>
                  </div>
                </div>

                <StageWorkspace
                  form={controller.form}
                  run={controller.activeRun}
                  running={controller.running}
                  failed={Boolean(controller.runFailure)}
                />

                <EvidenceRail run={controller.activeRun} />
              </div>

              <RunHistory
                comparison={controller.comparison}
                comparisonRunIds={controller.comparisonRunIds}
                comparisonRuns={controller.comparisonRuns}
                historyLimit={controller.historyLimit}
                runs={controller.history}
                onToggleComparison={controller.toggleComparison}
              />
            </>
          )}
        </div>
      </main>
    </FitPageShell>
  );
}
