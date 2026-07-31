import React from "react";
import { METRIC_GROUPS, METRIC_REGISTRY } from "../data/metricRegistry";
import type { PortfolioMetricType } from "../types";
import styles from "../styles/PortfolioScreen.module.css";

export const MetricNavigation = ({
  selected,
  onSelect,
}: {
  selected: PortfolioMetricType;
  onSelect: (metric: PortfolioMetricType) => void;
}) => (
  <nav className={styles.metricNav} aria-label="Portfolio metrics">
    {METRIC_GROUPS.map((group) => (
      <div className={styles.metricGroup} key={group.label}>
        <span>{group.label}</span>
        <div>
          {group.metrics.map((metricId) => {
            const metric = METRIC_REGISTRY[metricId];
            const isSelected = selected === metricId;

            return (
              <button
                key={metricId}
                type="button"
                aria-current={isSelected ? "page" : undefined}
                className={
                  isSelected ? styles.metricButtonActive : styles.metricButton
                }
                onClick={() => onSelect(metricId)}
              >
                {metric.shortLabel}
              </button>
            );
          })}
        </div>
      </div>
    ))}
  </nav>
);
