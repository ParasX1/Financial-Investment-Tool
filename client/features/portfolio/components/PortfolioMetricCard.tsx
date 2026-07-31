import React, { useMemo } from "react";
import { METRIC_REGISTRY } from "../data/metricRegistry";
import { validateAnalysisRange } from "../lib/portfolioAnalytics";
import { getEffectiveCardSettings } from "../state/workspaceSelectors";
import type {
  PortfolioAnalysisInputs,
  PortfolioMetricCard as PortfolioMetricCardModel,
  PortfolioMetricType,
} from "../types";
import { usePortfolioMetric } from "../hooks/usePortfolioMetric";
import { PortfolioChart } from "./PortfolioChart";
import { getPortfolioTableModel } from "./PortfolioDataTable";
import { PortfolioMetricWorkspace } from "./PortfolioMetricWorkspace";
import styles from "../styles/PortfolioTraderWorkspace.module.css";

type CardVariant = "hero" | "standard" | "compact" | "focus" | "observer";

const statusLabel = {
  idle: "Waiting",
  loading: "Loading",
  stale: "Updating",
  success: "Ready",
  partial: "Partial",
  empty: "No data",
  invalid: "Check inputs",
  error: "Refresh failed",
} as const;

export const PortfolioMetricCard = ({
  card,
  symbols,
  globalInputs,
  today,
  variant,
  cardCount,
  onMetricChange,
  onOverride,
  onResetInputs,
  onFocus,
  onPromote,
  onDuplicate,
  onDelete,
}: {
  card: PortfolioMetricCardModel;
  symbols: string[];
  globalInputs: PortfolioAnalysisInputs;
  today: string;
  variant: CardVariant;
  cardCount: number;
  onMetricChange: (metricType: PortfolioMetricType) => void;
  onOverride: (patch: Partial<PortfolioAnalysisInputs>) => void;
  onResetInputs: () => void;
  onFocus: () => void;
  onPromote: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) => {
  const settings = getEffectiveCardSettings(card, globalInputs);
  const metric = METRIC_REGISTRY[card.metricType];
  const rangeError = validateAnalysisRange(
    settings.startDate,
    settings.endDate,
    today,
  );
  const symbolError =
    symbols.length > 0 && symbols.length < metric.minimumSymbols
      ? `${metric.label} needs ${metric.minimumSymbols} selected symbols.`
      : null;
  const validationError = rangeError ?? symbolError;
  const { status, data, error, retry, lastUpdated } = usePortfolioMetric({
    symbols,
    settings,
    validationError,
  });
  const tableModel = useMemo(
    () => (data ? getPortfolioTableModel(data, card.metricType) : null),
    [card.metricType, data],
  );
  const isFocus = variant === "focus";
  const compact = !isFocus;
  const custom = Object.keys(card.overrides).length > 0;
  const missingSymbols = data?.metadata?.missingSymbols ?? [];
  const sortinoStatuses = Object.entries(
    data?.series.singleValueStatuses ?? {},
  ).filter(([, value]) => value.status !== "ok");

  const renderBody = () => {
    if (!symbols.length) {
      return (
        <div className={styles.cardState}>
          <span aria-hidden="true">＋</span>
          <strong>Add a shared universe</strong>
          <p>The board will run this metric when you apply at least one symbol.</p>
        </div>
      );
    }
    if (validationError) {
      return (
        <div className={styles.cardState} role="status">
          <span aria-hidden="true">!</span>
          <strong>Input needed</strong>
          <p>{validationError}</p>
        </div>
      );
    }
    if (status === "loading" && !data) {
      return (
        <div className={styles.cardSkeleton} aria-busy="true">
          <span />
          <span />
          <span />
        </div>
      );
    }
    if (status === "error" && !data) {
      return (
        <div className={styles.cardState} role="alert">
          <span aria-hidden="true">!</span>
          <strong>Metric unavailable</strong>
          <p>{error}</p>
          <button type="button" onClick={retry}>
            Retry this card
          </button>
        </div>
      );
    }
    if ((status === "empty" || !data) && !sortinoStatuses.length) {
      return (
        <div className={styles.cardState}>
          <span aria-hidden="true">—</span>
          <strong>No usable result</strong>
          <p>Try a longer period or remove a symbol with sparse history.</p>
        </div>
      );
    }
    if (!data) return null;

    if (isFocus) {
      return (
        <PortfolioMetricWorkspace
          data={data}
          settings={settings}
          symbols={symbols}
        />
      );
    }
    return (
      <>
        <div className={styles.cardChart}>
          <PortfolioChart
            data={data}
            metricType={card.metricType}
            benchmark={settings.benchmark}
            compact={compact}
          />
          {status === "stale" && (
            <div className={styles.updatingBadge}>Updating · previous result</div>
          )}
        </div>
        <div className={styles.cardInsight}>
          <span>
            {tableModel?.keyFigures[0]?.label ?? "Method"}
            <strong>
              {tableModel?.keyFigures[0]?.value ?? metric.method}
            </strong>
          </span>
          {variant === "hero" && <p>{metric.interpretation}</p>}
        </div>
      </>
    );
  };

  return (
    <section
      className={`${styles.metricCard} ${styles[`metricCard_${variant}`]}`}
      aria-labelledby={`${card.id}-title`}
      data-card-id={card.id}
      data-metric={card.metricType}
    >
      <header className={styles.cardHeader}>
        <div className={styles.cardIdentity}>
          <span
            className={`${styles.classificationBadge} ${
              styles[`classification_${metric.classification}`]
            }`}
          >
            {metric.classification}
          </span>
          <select
            id={`${card.id}-title`}
            aria-label="Metric"
            value={card.metricType}
            onChange={(event) =>
              onMetricChange(event.target.value as PortfolioMetricType)
            }
          >
            {Object.values(METRIC_REGISTRY).map((definition) => (
              <option key={definition.id} value={definition.id}>
                {definition.label}
              </option>
            ))}
          </select>
          <span
            className={custom ? styles.customBadge : styles.linkedBadge}
            title={
              custom
                ? "This card has assumptions that differ from the command bar."
                : "This card follows the command bar inputs."
            }
          >
            {custom ? "Custom" : "Linked"}
          </span>
        </div>
        <div className={styles.cardActions}>
          <span
            className={`${styles.cardStatus} ${styles[`status_${status}`]}`}
          >
            {statusLabel[status]}
          </span>
          {variant !== "hero" && variant !== "focus" && (
            <button
              type="button"
              onClick={onPromote}
              aria-label={`Promote ${metric.label}`}
              title="Make primary"
            >
              ↑
            </button>
          )}
          {variant !== "focus" && (
            <button
              type="button"
              onClick={onFocus}
              aria-label={`Focus ${metric.label}`}
              title="Open Focus"
            >
              ↗
            </button>
          )}
          <details className={styles.cardMenu}>
            <summary aria-label={`${metric.label} card menu`}>•••</summary>
            <div>
              <button
                type="button"
                onClick={onDuplicate}
                disabled={cardCount >= 6}
              >
                Duplicate chart
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={cardCount <= 1}
              >
                Delete chart
              </button>
            </div>
          </details>
        </div>
      </header>

      <div className={styles.cardMeta}>
        <span>{metric.unit}</span>
        <span>{metric.minimumDays}+ observations</span>
        {metric.requiresBenchmark && <span>vs {settings.benchmark}</span>}
        {metric.usesConfidenceLevel && (
          <span>
            {Math.round((1 - settings.confidenceLevel) * 100)}% confidence
          </span>
        )}
        {lastUpdated && (
          <span>
            updated{" "}
            {new Intl.DateTimeFormat("en-AU", {
              hour: "2-digit",
              minute: "2-digit",
            }).format(lastUpdated)}
          </span>
        )}
      </div>

      {(missingSymbols.length > 0 ||
        sortinoStatuses.length > 0 ||
        (status === "error" && data)) && (
        <div className={styles.cardWarning} role="status">
          {missingSymbols.length > 0 &&
            `${missingSymbols.join(", ")} excluded for missing history.`}
          {sortinoStatuses.map(([symbol, value]) => (
            <span key={symbol}>
              {symbol}:{" "}
              {value.status === "infinite"
                ? "no downside shortfall; ratio is unbounded"
                : `${value.status.replaceAll("_", " ")}${
                    value.observations === undefined
                      ? ""
                      : ` (${value.observations} observations)`
                  }`}
            </span>
          ))}
          {status === "error" && data && (
            <span>
              Refresh failed; showing the previous result.{" "}
              <button type="button" onClick={retry}>
                Retry
              </button>
            </span>
          )}
        </div>
      )}

      {renderBody()}

      <details className={styles.cardSettings}>
        <summary>
          {custom ? "Local assumptions" : "Override linked assumptions"}
        </summary>
        <div className={styles.cardSettingsGrid}>
          <label>
            <span>From</span>
            <input
              type="date"
              value={settings.startDate}
              max={today}
              onChange={(event) =>
                onOverride({ startDate: event.target.value })
              }
            />
          </label>
          <label>
            <span>To</span>
            <input
              type="date"
              value={settings.endDate}
              max={today}
              onChange={(event) =>
                onOverride({ endDate: event.target.value })
              }
            />
          </label>
          {metric.requiresBenchmark && (
            <label>
              <span>Benchmark</span>
              <input
                value={settings.benchmark}
                onChange={(event) =>
                  onOverride({
                    benchmark: event.target.value.toUpperCase(),
                  })
                }
              />
            </label>
          )}
          {metric.usesRiskFreeRate && (
            <label>
              <span>Annual risk-free %</span>
              <input
                type="number"
                step="0.1"
                value={Number((settings.riskFreeRate * 100).toFixed(2))}
                onChange={(event) =>
                  onOverride({
                    riskFreeRate: Number(event.target.value) / 100,
                  })
                }
              />
            </label>
          )}
          {metric.usesConfidenceLevel && (
            <label>
              <span>VaR confidence</span>
              <select
                value={settings.confidenceLevel}
                onChange={(event) =>
                  onOverride({
                    confidenceLevel: Number(event.target.value),
                  })
                }
              >
                <option value={0.1}>90%</option>
                <option value={0.05}>95%</option>
                <option value={0.01}>99%</option>
              </select>
            </label>
          )}
          {custom && (
            <button type="button" onClick={onResetInputs}>
              Use all global inputs
            </button>
          )}
        </div>
      </details>

    </section>
  );
};
