import type { MarketChartPoint, MarketChartSnapshot } from "../types";

export interface NormalizedMarketSeries {
  points: MarketChartPoint[];
  symbol: string;
}

function normalizedPoints(
  points: readonly MarketChartPoint[],
): MarketChartPoint[] | null {
  const ordered = points
    .filter(
      (point) => Number.isFinite(point.timeMs) && Number.isFinite(point.value),
    )
    .sort((left, right) => left.timeMs - right.timeMs);
  const baseline = ordered[0]?.value;
  if (baseline === undefined || baseline <= 0) return null;

  return ordered.map((point) => ({
    timeMs: point.timeMs,
    value: ((point.value - baseline) / Math.abs(baseline)) * 100,
  }));
}

export function buildNormalizedMarketSeries(
  snapshots: readonly MarketChartSnapshot[],
): NormalizedMarketSeries[] {
  return snapshots.flatMap((snapshot) => {
    const points = normalizedPoints(snapshot.points);
    return points && points.length >= 2
      ? [{ points, symbol: snapshot.symbol }]
      : [];
  });
}
