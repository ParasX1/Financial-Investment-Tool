import type { ReactNode } from "react";
import styles from "../styles/HomeToolProofs.module.css";

function ToolProof({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.proof}>
      <p className={styles.label}>{label}</p>
      {children}
    </div>
  );
}

export function HomeTopPicksProof() {
  return (
    <ToolProof label="A simple workflow">
      <ol className={styles.steps}>
        <li>Choose a window</li>
        <li>Sort a measure</li>
        <li>Export page CSV</li>
      </ol>
    </ToolProof>
  );
}

export function HomeWatchlistProof() {
  return (
    <ToolProof label="Example research note">
      <p className={styles.context}>AAPL</p>
      <p className={styles.excerpt}>Next earnings: check margins.</p>
    </ToolProof>
  );
}

export function HomeNewsProof() {
  return (
    <ToolProof label="A story in context">
      <dl className={styles.newsContext}>
        <div>
          <dt>Source</dt>
          <dd>Who published it?</dd>
        </div>
        <div>
          <dt>Published</dt>
          <dd>When was it written?</dd>
        </div>
        <div>
          <dt>Related ticker</dt>
          <dd>When available</dd>
        </div>
      </dl>
    </ToolProof>
  );
}

export function HomeGuideProof() {
  return (
    <ToolProof label="From the guide">
      <p className={styles.term}>Max drawdown</p>
      <p className={styles.excerpt}>
        The largest fall from a peak to a low during the selected period.
      </p>
    </ToolProof>
  );
}

export function HomeCommunityProof() {
  return (
    <ToolProof label="Example question">
      <p className={styles.context}>AAPL · Long term</p>
      <p className={styles.excerpt}>
        What would you check alongside a strong historical return?
      </p>
      <p className={styles.prompt}>Add a source to support your reasoning.</p>
    </ToolProof>
  );
}
