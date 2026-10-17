import { useEffect, useState } from "react";
import Modal from "react-bootstrap/Modal";
import { wrapDialogTabBoundary } from "@/components/shared/dialogFocus";
import {
  researchMetricDefinitions,
  researchCapturedOn,
  researchCompanyContext,
  researchMetrics,
  researchPeriod,
  researchSample,
  type ResearchMetric,
} from "../data/researchDesk";
import { ResearchDeskChart } from "./ResearchDeskChart";
import {
  ResearchMethodAndData,
  ResearchMetricFigures,
} from "./ResearchDeskData";
import styles from "../styles/ResearchDesk.module.css";

/** A frozen public example, independent of authentication and account data. */
export function HomePortfolioPreview() {
  const [selected, setSelected] = useState<ResearchMetric | null>(null);
  const [interactive, setInteractive] = useState(false);
  useEffect(() => setInteractive(true), []);
  const selectedDefinition = selected
    ? researchMetricDefinitions[selected]
    : null;
  const closeInspection = () => setSelected(null);

  return (
    <figure className={styles.desk} aria-labelledby="home-preview-title">
      <figcaption className={styles.topline}>
        <span className={styles.eyebrow}>The research desk</span>
        <span>Historical sample · Not live prices or account data.</span>
      </figcaption>
      <div className={styles.intro}>
        <p id="home-preview-title" className={styles.title}>
          Compare companies across return and risk.
        </p>
        <p>
          See the result, the day-to-day variation and the declines along the
          way.
        </p>
      </div>
      <div className={styles.context}>
        <ul className={styles.companies} aria-label="Compared companies">
          {researchSample.companies.map((company) => (
            <li key={company.symbol}>
              <span className={styles.companyKey} aria-hidden="true" />
              <span>
                {company.name}{" "}
                <span className={styles.symbol}>{company.symbol}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className={styles.period}>
          {researchPeriod}
          <span>
            {researchSample.dates.length} adjusted-close observations per
            company
          </span>
        </p>
      </div>
      <nav className={styles.measureLinks} aria-label="Sample measures">
        {researchMetrics.map((kind) => (
          <a key={kind} href={`#home-research-${kind}`}>
            {researchMetricDefinitions[kind].metric.label}
          </a>
        ))}
      </nav>
      <div className={styles.metricGrid}>
        {researchMetrics.map((kind) => {
          const definition = researchMetricDefinitions[kind];
          return (
            <section
              key={kind}
              id={`home-research-${kind}`}
              className={styles.metricCard}
              data-research-metric={kind}
              aria-labelledby={`home-research-${kind}-title`}
            >
              <header>
                <h4 id={`home-research-${kind}-title`}>
                  {definition.metric.label}
                </h4>
                <p className={styles.measureDescription}>
                  {definition.summaryLabel}
                </p>
              </header>
              <ResearchMetricFigures kind={kind} />
              <ResearchDeskChart kind={kind} />
              <p className={styles.interpretation}>
                {definition.interpretation}
              </p>
              <button
                type="button"
                className={styles.inspectButton}
                disabled={!interactive}
                aria-haspopup="dialog"
                aria-expanded={selected === kind}
                aria-controls={
                  selected === kind ? "home-research-dialog" : undefined
                }
                onClick={() => setSelected(kind)}
              >
                {definition.inspectLabel}
              </button>
              <ResearchMethodAndData kind={kind} />
            </section>
          );
        })}
      </div>
      <details className={styles.provenance}>
        <summary>About this historical sample</summary>
        <p>
          {researchSample.source.priceField} · {researchSample.source.provider}{" "}
          · Captured {researchCapturedOn}.
        </p>
        <p>
          FIT’s calculations use the same {researchPeriod} window for both
          companies. Return and drawdown use these {researchSample.dates.length}{" "}
          prices; annualised volatility uses {researchSample.dates.length - 1}{" "}
          daily returns and √{researchSample.annualisationDays}.
        </p>
        <p>
          These historical results are a starting point for research, not a
          prediction of future performance.
        </p>
      </details>
      <Modal
        show={selected !== null}
        onHide={closeInspection}
        animation={false}
        centered
        restoreFocus
        enforceFocus
        aria-labelledby="home-research-dialog-title"
        aria-describedby="home-research-dialog-context"
        dialogClassName={styles.dialog}
        contentClassName={styles.dialogContent}
        backdropClassName={styles.backdrop}
      >
        {selected && selectedDefinition ? (
          <div
            id="home-research-dialog"
            className={styles.dialogBody}
            onKeyDown={wrapDialogTabBoundary}
          >
            <div className={styles.dialogHeader}>
              <h2 id="home-research-dialog-title">
                {selectedDefinition.metric.label}
              </h2>
              <button
                type="button"
                className={styles.closeButton}
                aria-label="Close metric inspection"
                autoFocus
                onClick={closeInspection}
              >
                Close
              </button>
            </div>
            <p
              id="home-research-dialog-context"
              className={styles.dialogContext}
            >
              {researchCompanyContext}
              <br />
              {researchPeriod} · Historical sample
            </p>
            <p className={styles.measureDescription}>
              {selectedDefinition.summaryLabel}
            </p>
            <ResearchMetricFigures kind={selected} />
            <p className={styles.definition}>
              {selectedDefinition.metric.description}
            </p>
            <p className={styles.interpretation}>
              {selectedDefinition.interpretation}
            </p>
            <p className={styles.method}>{selectedDefinition.context}</p>
            <ResearchMethodAndData kind={selected} />
          </div>
        ) : null}
      </Modal>
    </figure>
  );
}
