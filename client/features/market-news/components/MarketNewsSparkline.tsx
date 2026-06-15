import styles from "../styles/marketNews.module.css";

export function MarketNewsSparkline({
  data,
  height = 28,
  width = 90,
}: {
  data: readonly number[];
  height?: number;
  width?: number;
}) {
  if (!data.length) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const step = data.length > 1 ? width / (data.length - 1) : 0;
  const y = (value: number) =>
    max === min ? height / 2 : height - ((value - min) / (max - min)) * height;
  const path = data
    .map((value, index) => `${index ? "L" : "M"} ${index * step} ${y(value)}`)
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
    >
      <path className={styles.sparklinePath} d={path} />
      <circle cx={width} cy={y(data[data.length - 1]!)} r="2.3" fill="currentColor" />
    </svg>
  );
}

