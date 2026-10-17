import React, { useMemo } from "react";
import type { MetricsResponse } from "@/lib/market-metrics";
import { METRIC_REGISTRY } from "../data/metricRegistry";
import type { PortfolioAnalysisSettings } from "../types";
import { PortfolioChart } from "./PortfolioChart";
import {
  getPortfolioTableModel,
  PortfolioDataTable,
} from "./PortfolioDataTable";
import styles from "../styles/PortfolioMetricWorkspace.module.css";

export const PortfolioMetricWorkspace = ({
  data,
  settings,
  symbols,
}: {
  data: MetricsResponse;
  settings: PortfolioAnalysisSettings;
  symbols: string[];
}) => {
  const metric = METRIC_REGISTRY[settings.metricType];
  const tableModel = useMemo(
    () => getPortfolioTableModel(data, settings.metricType),
    [data, settings.metricType],
  );
  const assumptions = [
    `${settings.startDate} to ${settings.endDate}`,
    metric.requiresBenchmark ? `Benchmark ${settings.benchmark}` : null,
    metric.usesRiskFreeRate
      ? `Risk-free ${(settings.riskFreeRate * 100).toFixed(1)}%`
      : null,
    metric.usesConfidenceLevel
      ? `${Math.round((1 - settings.confidenceLevel) * 100)}% confidence`
      : null,
  ].filter(Boolean);

  return (
    <>
      <section className={styles.workspace} aria-labelledby="metric-title">
        <div className={styles.visualColumn}>
          <header className={styles.workspaceHeader}>
            <div>
              <p className={styles.eyebrow}>{metric.category}</p>
              <h2 id="metric-title">{metric.label}</h2>
              <p>{metric.description}</p>
            </div>
            <div className={styles.workspaceMeta}>
              <span>{symbols.length} symbols</span>
              <span>{metric.unit}</span>
              <span>{metric.minimumDays}+ trading days</span>
            </div>
          </header>
          <div className={styles.chartStage}>
            <PortfolioChart
              data={data}
              metricType={settings.metricType}
              benchmark={settings.benchmark}
            />
          </div>
        </div>

        <aside
          className={styles.insightPanel}
          aria-label="Metric interpretation"
        >
          <section className={styles.insightBlock}>
            <span className={styles.insightLabel}>How to read it</span>
            <h3>{metric.interpretation}</h3>
          </section>
          <section className={styles.insightBlock}>
            <span className={styles.insightLabel}>Key figures</span>
            {tableModel.keyFigures.length ? (
              tableModel.keyFigures.map((figure) => (
                <div className={styles.keyFigure} key={figure.label}>
                  <span>{figure.label}</span>
                  <strong>{figure.value}</strong>
                </div>
              ))
            ) : (
              <p>No comparison figure is available for this response.</p>
            )}
          </section>
          <section className={styles.insightBlock}>
            <span className={styles.insightLabel}>Assumptions</span>
            <ul>
              {assumptions.map((assumption) => (
                <li key={assumption}>{assumption}</li>
              ))}
            </ul>
          </section>
          <section className={styles.insightBlock}>
            <span className={styles.insightLabel}>Keep in mind</span>
            <p>{metric.caveat}</p>
            <p>This analysis is educational and is not a recommendation.</p>
          </section>
        </aside>
      </section>
      <PortfolioDataTable model={tableModel} />
    </>
  );
};
