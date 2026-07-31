import React from "react";
import type { MetricsResponse } from "@/lib/market-metrics";
import { formatMetricValue, METRIC_REGISTRY } from "../data/metricRegistry";
import type { PortfolioMetricType } from "../types";
import styles from "../styles/PortfolioScreen.module.css";

export type PortfolioKeyFigure = {
  label: string;
  value: string;
};

type TableModel = {
  columns: string[];
  rows: string[][];
  keyFigures: PortfolioKeyFigure[];
};

const buildSingleValueModel = (
  data: MetricsResponse,
  metricType: PortfolioMetricType,
): TableModel => {
  const metric = METRIC_REGISTRY[metricType];
  const values = data.series.singleValue ?? {};
  const statuses = data.series.singleValueStatuses ?? {};
  const entries = Object.entries(values);
  const sorted = [...entries].sort((left, right) =>
    metric.betterDirection === "lower"
      ? left[1] - right[1]
      : right[1] - left[1],
  );
  const leader = sorted[0];
  const statusText = (status: string) => {
    if (status === "infinite") return "Unbounded · no downside shortfall";
    if (status === "limited_data") return "Limited data";
    if (status === "invalid") return "Invalid sample";
    return status.replaceAll("_", " ");
  };
  const symbols = Array.from(
    new Set([...data.tickers, ...Object.keys(values), ...Object.keys(statuses)]),
  );
  const hasStatuses = Object.keys(statuses).length > 0;

  return {
    columns: [
      "Symbol",
      metric.label,
      ...(hasStatuses ? ["Observations"] : []),
    ],
    rows: symbols.flatMap((symbol) => {
      const value = values[symbol];
      const status = statuses[symbol];
      if (Number.isFinite(value)) {
        return [[
          symbol,
          formatMetricValue(metricType, value),
          ...(hasStatuses
            ? [status?.observations === undefined ? "—" : String(status.observations)]
            : []),
        ]];
      }
      if (!status) return [];
      return [[
        symbol,
        statusText(status.status),
        status.observations === undefined ? "—" : String(status.observations),
      ]];
    }),
    keyFigures: leader
      ? [
          {
            label:
              metric.betterDirection === "lower"
                ? "Lowest in comparison"
                : metric.betterDirection === "higher"
                  ? "Highest in comparison"
                  : "Largest reading",
            value: `${leader[0]} · ${formatMetricValue(metricType, leader[1])}`,
          },
        ]
      : Object.entries(statuses)
            .filter(([, status]) => status.status === "infinite")
            .slice(0, 1)
            .map(([symbol]) => ({
              label: "Unbounded Sortino",
              value: `${symbol} · no downside shortfall`,
            })),
  };
};
const buildTimeSeriesModel = (
  data: MetricsResponse,
  metricType: PortfolioMetricType,
): TableModel => {
  const entries = Object.entries(data.series.timeSeries ?? {});
  const summaries = entries.map(([symbol, points]) => {
    const values = points.map((point) => point.value);
    const ending = points[points.length - 1]?.value ?? 0;
    const low = values.length ? Math.min(...values) : 0;
    const high = values.length ? Math.max(...values) : 0;
    return { symbol, points, ending, low, high };
  });
  const isDrawdown = metricType === "MaxDrawdownAnalysis";
  const ranked = [...summaries].sort((left, right) =>
    isDrawdown ? left.low - right.low : right.ending - left.ending,
  );

  return {
    columns: [
      "Symbol",
      isDrawdown ? "Worst drawdown" : "Ending return",
      "Observations",
    ],
    rows: summaries.map((summary) => [
      summary.symbol,
      formatMetricValue(metricType, isDrawdown ? summary.low : summary.ending),
      String(summary.points.length),
    ]),
    keyFigures: ranked[0]
      ? [
          {
            label: isDrawdown ? "Deepest drawdown" : "Best ending return",
            value: `${ranked[0].symbol} · ${formatMetricValue(
              metricType,
              isDrawdown ? ranked[0].low : ranked[0].ending,
            )}`,
          },
        ]
      : [],
  };
};

const buildCorrelationModel = (data: MetricsResponse): TableModel => {
  const matrix = data.series.correlationMatrix ?? {};
  const pairs = Object.entries(matrix).flatMap(([left, row]) =>
    Object.entries(row)
      .filter(([right]) => left < right)
      .map(([right, value]) => ({ left, right, value })),
  );
  const lowest = [...pairs].sort((left, right) => left.value - right.value)[0];

  return {
    columns: ["Pair", "Correlation"],
    rows: pairs.map((pair) => [
      `${pair.left} / ${pair.right}`,
      formatMetricValue("MarketCorrelationAnalysis", pair.value),
    ]),
    keyFigures: lowest
      ? [
          {
            label: "Lowest-correlation pair",
            value: `${lowest.left} / ${lowest.right} · ${formatMetricValue(
              "MarketCorrelationAnalysis",
              lowest.value,
            )}`,
          },
        ]
      : [],
  };
};

const buildFrontierModel = (data: MetricsResponse): TableModel => {
  const portfolio = data.series.portfolio;
  if (!portfolio || portfolio.returns.length === 0) {
    return { columns: [], rows: [], keyFigures: [] };
  }

  const highlightRows = [
    ["Best sampled Sharpe", portfolio.max_sharpe_index],
    ["Lowest sampled volatility", portfolio.min_volatility_index],
  ] as const;
  const allocation = (index: number) =>
    portfolio.asset_order
      .map((symbol, assetIndex) => {
        const weight = portfolio.weights[index]?.[assetIndex];
        return Number.isFinite(weight)
          ? `${symbol} ${formatMetricValue(
              "EfficientFrontierVisualization",
              weight,
              true,
            )}`
          : null;
      })
      .filter(Boolean)
      .join(" · ");

  return {
    columns: ["Portfolio", "Return", "Volatility", "Sharpe", "Allocation"],
    rows: highlightRows.map(([label, index]) => [
      label,
      formatMetricValue(
        "EfficientFrontierVisualization",
        portfolio.returns[index],
      ),
      formatMetricValue(
        "EfficientFrontierVisualization",
        portfolio.risks[index],
      ),
      new Intl.NumberFormat("en-AU", {
        maximumFractionDigits: 2,
        signDisplay: "exceptZero",
      }).format(portfolio.sharpe_ratios[index]),
      allocation(index) || "Allocation unavailable",
    ]),
    keyFigures: highlightRows.map(([label, index]) => ({
      label,
      value: `${formatMetricValue(
        "EfficientFrontierVisualization",
        portfolio.returns[index],
      )} return · ${formatMetricValue(
        "EfficientFrontierVisualization",
        portfolio.risks[index],
      )} risk`,
    })),
  };
};

export const getPortfolioTableModel = (
  data: MetricsResponse,
  metricType: PortfolioMetricType,
) => {
  const chartKind = METRIC_REGISTRY[metricType].chartKind;
  if (chartKind === "bar") return buildSingleValueModel(data, metricType);
  if (chartKind === "line") return buildTimeSeriesModel(data, metricType);
  if (chartKind === "heatmap") return buildCorrelationModel(data);
  return buildFrontierModel(data);
};

export const PortfolioDataTable = ({ model }: { model: TableModel }) => (
  <details className={styles.dataSection}>
    <summary>View summary values and accessible data table</summary>
    <div className={styles.tableScroller}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            {model.columns.map((column) => (
              <th scope="col" key={column}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {model.rows.map((row, rowIndex) => (
            <tr key={`${row[0]}-${rowIndex}`}>
              {row.map((cell, cellIndex) =>
                cellIndex === 0 ? (
                  <th scope="row" key={cellIndex}>
                    {cell}
                  </th>
                ) : (
                  <td key={cellIndex}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </details>
);
