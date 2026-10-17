import * as React from "react";
import type { NormalizedMarketSeries } from "../lib/marketChartComparison";
import styles from "./MarketComparisonChart.module.css";

const WIDTH = 720;
const HEIGHT = 280;
const PADDING = { bottom: 38, left: 58, right: 18, top: 28 };
const SERIES_COLORS = [
  "var(--fit-color-accent-strong)",
  "#22c55e",
  "#f59e0b",
  "#f472b6",
] as const;

function formatPercent(value: number) {
  const rounded = Math.abs(value) < 0.005 ? 0 : value;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}%`;
}

function isValidTimestamp(value: number) {
  return Number.isFinite(value) && !Number.isNaN(new Date(value).getTime());
}

function getSeriesColor(index: number) {
  return SERIES_COLORS[index % SERIES_COLORS.length]!;
}

function formatDate(timeMs: number) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timeMs));
}

export function MarketComparisonChart({
  rangeLabel,
  series,
}: {
  rangeLabel: string;
  series: readonly NormalizedMarketSeries[];
}) {
  const titleId = React.useId();
  const descriptionId = React.useId();
  const usableSeries = series
    .map((item) => ({
      ...item,
      points: item.points
        .filter(
          (point) =>
            isValidTimestamp(point.timeMs) &&
            Number.isFinite(point.value),
        )
        .sort((left, right) => left.timeMs - right.timeMs),
    }))
    .filter((item) => item.points.length >= 2);

  if (!usableSeries.length) {
    return (
      <div className={styles.empty} role="status">
        Comparison trend is not available yet.
      </div>
    );
  }

  const allPoints = usableSeries.flatMap((item) => item.points);
  const firstTime = Math.min(...allPoints.map((point) => point.timeMs));
  const lastTime = Math.max(...allPoints.map((point) => point.timeMs));
  const values = [0, ...allPoints.map((point) => point.value)];
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const valuePadding = Math.max((rawMax - rawMin) * 0.12, 1);
  const minValue = rawMin - valuePadding;
  const maxValue = rawMax + valuePadding;
  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const timeSpan = Math.max(lastTime - firstTime, 1);
  const valueSpan = Math.max(maxValue - minValue, 1);
  const x = (timeMs: number) =>
    PADDING.left + ((timeMs - firstTime) / timeSpan) * plotWidth;
  const y = (value: number) =>
    PADDING.top + ((maxValue - value) / valueSpan) * plotHeight;
  const gridValues = Array.from(new Set([rawMax, 0, rawMin]));

  return (
    <div>
      <ul className={styles.legend} aria-label="Compared symbols">
        {usableSeries.map((item, index) => (
          <li key={item.symbol}>
            <span
              aria-hidden="true"
              className={styles.swatch}
              style={{ backgroundColor: getSeriesColor(index) }}
            />
            {item.symbol}
          </li>
        ))}
      </ul>
      <svg
        aria-labelledby={`${titleId} ${descriptionId}`}
        className={styles.chart}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      >
        <title id={titleId}>{`${rangeLabel} relative performance comparison`}</title>
        <desc id={descriptionId}>
          Percentage change from each symbol&apos;s first available point,
          from {formatDate(firstTime)} to {formatDate(lastTime)}.
        </desc>

        {gridValues.map((value) => (
          <g key={value}>
            <line
              className={
                value === 0 ? styles.baseline : styles.gridLine
              }
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={y(value)}
              y2={y(value)}
            />
            <text
              className={styles.axisLabel}
              x={PADDING.left - 8}
              y={y(value) + 4}
              textAnchor="end"
            >
              {value === 0 ? "0%" : formatPercent(value)}
            </text>
          </g>
        ))}

        {usableSeries.map((item, index) => {
          const path = item.points
            .map(
              (point, pointIndex) =>
                `${pointIndex === 0 ? "M" : "L"} ${x(point.timeMs).toFixed(2)} ${y(point.value).toFixed(2)}`,
            )
            .join(" ");
          return (
            <path
              key={item.symbol}
              className={styles.seriesLine}
              d={path}
              data-testid={`comparison-line-${item.symbol}`}
              style={{ stroke: getSeriesColor(index) }}
            />
          );
        })}

        <text
          className={styles.axisLabel}
          x={PADDING.left}
          y={HEIGHT - 10}
        >
          {formatDate(firstTime)}
        </text>
        <text
          className={styles.axisLabel}
          x={WIDTH - PADDING.right}
          y={HEIGHT - 10}
          textAnchor="end"
        >
          {formatDate(lastTime)}
        </text>
      </svg>
    </div>
  );
}
