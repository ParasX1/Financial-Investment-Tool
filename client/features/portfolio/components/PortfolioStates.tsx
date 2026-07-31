import React from "react";
import styles from "../styles/PortfolioScreen.module.css";

type PortfolioErrorStateProps = {
  message: string;
  onRetry: () => void;
};

export const PortfolioLoadingState = ({
  metricLabel,
}: {
  metricLabel: string;
}) => (
  <div className={styles.state} aria-busy="true" aria-live="polite">
    <div className={styles.statePulse} aria-hidden="true" />
    <p className={styles.stateEyebrow}>Running analysis</p>
    <h2>Loading {metricLabel}…</h2>
    <p>Fetching aligned market history and preparing the comparison.</p>
  </div>
);

export const PortfolioEmptyState = () => (
  <div className={styles.state}>
    <div className={styles.stateMarker} aria-hidden="true">
      01
    </div>
    <p className={styles.stateEyebrow}>Build a comparison</p>
    <h2>Choose up to five stocks</h2>
    <p>
      Add symbols above, choose a useful history range, then explore one metric
      at a time.
    </p>
  </div>
);

export const PortfolioNoDataState = ({
  onUseOneYear,
}: {
  onUseOneYear: () => void;
}) => (
  <div className={styles.state}>
    <div className={styles.stateMarker} aria-hidden="true">
      —
    </div>
    <p className={styles.stateEyebrow}>No usable history</p>
    <h2>No metric data was returned</h2>
    <p>Try a longer period or remove a symbol with limited trading history.</p>
    <button type="button" onClick={onUseOneYear}>
      Use one year
    </button>
  </div>
);

export const PortfolioErrorState = ({
  message,
  onRetry,
}: PortfolioErrorStateProps) => (
  <div className={`${styles.state} ${styles.stateError}`} role="alert">
    <div className={styles.stateMarker} aria-hidden="true">
      !
    </div>
    <p className={styles.stateEyebrow}>Analysis interrupted</p>
    <h2>We couldn&apos;t load this metric</h2>
    <p>{message}</p>
    <button type="button" onClick={onRetry}>
      Try again
    </button>
  </div>
);
