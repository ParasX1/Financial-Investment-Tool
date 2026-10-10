import * as React from "react";
import styles from "../styles/marketNews.module.css";

export function MarketNewsSparkline({
  data,
  height = 28,
  previousClose,
  width = 90,
}: {
  data: readonly number[];
  height?: number;
  previousClose?: number;
  width?: number;
}) {
  const svgId = React.useId().replace(/:/g, "");
  if (!data.length) return null;

  const hasPreviousClose =
    typeof previousClose === "number" && Number.isFinite(previousClose);
  const domainValues = hasPreviousClose ? [...data, previousClose] : data;
  const min = Math.min(...domainValues);
  const max = Math.max(...domainValues);
  const step = data.length > 1 ? width / (data.length - 1) : 0;
  const y = (value: number) =>
    max === min ? height / 2 : height - ((value - min) / (max - min)) * height;
  const path = data
    .map((value, index) => `${index ? "L" : "M"} ${index * step} ${y(value)}`)
    .join(" ");
  const referenceY = hasPreviousClose ? y(previousClose) : null;
  const positiveClipId = `${svgId}-positive`;
  const negativeClipId = `${svgId}-negative`;
  const finalValue = data[data.length - 1]!;
  const finalTone =
    hasPreviousClose && finalValue > previousClose
      ? "positive"
      : hasPreviousClose && finalValue < previousClose
        ? "negative"
        : "neutral";
  const finalPointClass =
    finalTone === "positive"
      ? styles.sparklinePositivePath
      : finalTone === "negative"
        ? styles.sparklineNegativePath
        : undefined;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
    >
      {referenceY !== null ? (
        <>
          <defs>
            <clipPath id={positiveClipId}>
              <rect x="0" y="0" width={width} height={referenceY} />
            </clipPath>
            <clipPath id={negativeClipId}>
              <rect
                x="0"
                y={referenceY}
                width={width}
                height={Math.max(0, height - referenceY)}
              />
            </clipPath>
          </defs>
          <line
            className={styles.sparklineReferenceLine}
            x1="0"
            x2={width}
            y1={referenceY}
            y2={referenceY}
            strokeDasharray="2 3"
          />
          <path
            className={`${styles.sparklinePath} ${styles.sparklinePositivePath}`}
            clipPath={`url(#${positiveClipId})`}
            d={path}
          />
          <path
            className={`${styles.sparklinePath} ${styles.sparklineNegativePath}`}
            clipPath={`url(#${negativeClipId})`}
            d={path}
          />
        </>
      ) : (
        <path className={styles.sparklinePath} d={path} />
      )}
      <circle
        className={finalPointClass}
        cx={width}
        cy={y(finalValue)}
        r="2.3"
        fill="currentColor"
      />
    </svg>
  );
}
