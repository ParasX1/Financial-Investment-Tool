import * as React from "react";
import type { MarketChartPoint } from "../types";
import styles from "./MarketLineChart.module.css";

const WIDTH = 720;
const HEIGHT = 260;
const PADDING = { bottom: 34, left: 62, right: 18, top: 18 };

function formatPrice(value: number, currency: string | null) {
  try {
    return new Intl.NumberFormat(undefined, {
      ...(currency ? { currency, style: "currency" as const } : {}),
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return value.toFixed(2);
  }
}

function isValidTimestamp(value: number) {
  return Number.isFinite(value) && !Number.isNaN(new Date(value).getTime());
}

function formatTime(timeMs: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timeMs));
}

export function MarketLineChart({
  currency,
  points,
  previousClose,
  symbol,
}: {
  currency: string | null;
  points: readonly MarketChartPoint[];
  previousClose: number | null;
  symbol: string;
}) {
  const titleId = React.useId();
  const descriptionId = React.useId();
  const gradientId = React.useId().replace(/:/g, "");
  const usablePoints = points
    .filter(
      (point) =>
        isValidTimestamp(point.timeMs) && Number.isFinite(point.value),
    )
    .sort((left, right) => left.timeMs - right.timeMs);

  if (usablePoints.length < 2) {
    return (
      <div className={styles.empty} role="status">
        Intraday trend is not available yet.
      </div>
    );
  }

  const values = [
    ...usablePoints.map((point) => point.value),
    ...(previousClose !== null && Number.isFinite(previousClose)
      ? [previousClose]
      : []),
  ];
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const domainPadding = Math.max((rawMax - rawMin) * 0.12, rawMax * 0.002, 0.01);
  const minValue = rawMin - domainPadding;
  const maxValue = rawMax + domainPadding;
  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const firstTime = usablePoints[0]!.timeMs;
  const lastTime = usablePoints.at(-1)!.timeMs;
  const timeSpan = Math.max(lastTime - firstTime, 1);
  const valueSpan = Math.max(maxValue - minValue, 0.01);
  const x = (timeMs: number) =>
    PADDING.left + ((timeMs - firstTime) / timeSpan) * plotWidth;
  const y = (value: number) =>
    PADDING.top + ((maxValue - value) / valueSpan) * plotHeight;
  const linePath = usablePoints
    .map(
      (point, index) =>
        (index === 0 ? "M" : "L") +
        " " +
        x(point.timeMs).toFixed(2) +
        " " +
        y(point.value).toFixed(2),
    )
    .join(" ");
  const areaPath =
    linePath +
    " L " +
    x(lastTime).toFixed(2) +
    " " +
    (PADDING.top + plotHeight).toFixed(2) +
    " L " +
    x(firstTime).toFixed(2) +
    " " +
    (PADDING.top + plotHeight).toFixed(2) +
    " Z";
  const latestValue = usablePoints.at(-1)!.value;

  return (
    <svg
      aria-labelledby={titleId + " " + descriptionId}
      className={styles.chart}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      viewBox={"0 0 " + WIDTH + " " + HEIGHT}
    >
      <title id={titleId}>{`${symbol} one-day price trend`}</title>
      <desc id={descriptionId}>
        One-minute snapshots from {formatTime(firstTime)} to{" "}
        {formatTime(lastTime)}. Latest value {formatPrice(latestValue, currency)}
        {previousClose === null
          ? "."
          : "; previous close " + formatPrice(previousClose, currency) + "."}
      </desc>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--fit-color-accent-strong)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--fit-color-accent-strong)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 0.5, 1].map((ratio) => {
        const gridY = PADDING.top + ratio * plotHeight;
        return (
          <line
            key={ratio}
            className={styles.gridLine}
            x1={PADDING.left}
            x2={WIDTH - PADDING.right}
            y1={gridY}
            y2={gridY}
          />
        );
      })}

      {previousClose !== null ? (
        <>
          <line
            data-testid="previous-close-line"
            className={styles.previousClose}
            x1={PADDING.left}
            x2={WIDTH - PADDING.right}
            y1={y(previousClose)}
            y2={y(previousClose)}
          />
          <text
            className={styles.baselineLabel}
            x={WIDTH - PADDING.right}
            y={Math.max(y(previousClose) - 6, 12)}
            textAnchor="end"
          >
            Previous close
          </text>
        </>
      ) : null}

      <path d={areaPath} fill={"url(#" + gradientId + ")"} />
      <path
        className={styles.marketLine}
        d={linePath}
        data-testid="market-line"
      />
      <circle
        className={styles.latestPoint}
        cx={x(lastTime)}
        cy={y(latestValue)}
        r="4"
      />

      <text className={styles.axisLabel} x={PADDING.left} y={HEIGHT - 8}>
        {formatTime(firstTime)}
      </text>
      <text
        className={styles.axisLabel}
        x={WIDTH - PADDING.right}
        y={HEIGHT - 8}
        textAnchor="end"
      >
        {formatTime(lastTime)}
      </text>
      <text
        className={styles.axisLabel}
        x={PADDING.left - 8}
        y={PADDING.top + 4}
        textAnchor="end"
      >
        {formatPrice(rawMax, currency)}
      </text>
      <text
        className={styles.axisLabel}
        x={PADDING.left - 8}
        y={PADDING.top + plotHeight}
        textAnchor="end"
      >
        {formatPrice(rawMin, currency)}
      </text>
    </svg>
  );
}
