export type TopPicksMetric = number | null;

export const TOP_PICKS_METRIC_KEYS = [
  "ret1y",
  "sharpe",
  "sortino",
  "volatility",
  "maxDD",
  "beta",
  "alpha",
  "infoRatio",
] as const;

export type TopPicksSortKey = (typeof TOP_PICKS_METRIC_KEYS)[number];

export const TOP_PICKS_METRIC_STATUSES = [
  "ok",
  "infinite",
  "limited_data",
  "invalid",
  "unavailable",
] as const;

export type TopPicksMetricStatus = (typeof TOP_PICKS_METRIC_STATUSES)[number];

export type TopPicksMetricStatusMap = Partial<
  Record<TopPicksSortKey, TopPicksMetricStatus>
>;

export type TopPicksRow = {
  symbol: string;
  name: string;
  industry: string;
  ret1y: TopPicksMetric;
  sharpe: TopPicksMetric;
  sortino: TopPicksMetric;
  volatility: TopPicksMetric;
  maxDD: TopPicksMetric;
  beta: TopPicksMetric;
  alpha: TopPicksMetric;
  infoRatio: TopPicksMetric;
  metricStatus?: TopPicksMetricStatusMap;
};

export type TopPicksPrefs = {
  sort_key: TopPicksSortKey;
  sort_dir: "asc" | "desc";
  page_size: number;
};

export type TopPicksColumnKey = "rank" | "symbol" | "name" | TopPicksSortKey;

export type TopPicksMetricUnit = "percent" | "ratio";

export type TopPicksColumnDef = {
  key: TopPicksColumnKey;
  label: string;
  align?: "left" | "right" | "center";
  description?: string;
  unit?: TopPicksMetricUnit;
  format?: (value: TopPicksMetric, status?: TopPicksMetricStatus) => string;
  width?: number | string;
  defaultVisible?: boolean;
};

export type TopPicksSortState = {
  key: TopPicksSortKey;
  dir: "asc" | "desc";
};

export type TopPicksMetadata = Readonly<{
  benchmark?: string;
  generatedAt?: string;
  requestedStart?: string;
  requestedEnd?: string;
  annualisationDays?: number;
  riskFreeRate?: number;
  riskFreeRateSource?: string;
  riskFreeRateAsOf?: string;
  universeLimit?: number;
  universeCount?: number;
  availableCount?: number;
  minimumTrailingReturnObservations?: number;
  window?: "trailing_one_year";
  cacheStatus?: "hit" | "miss" | "stale";
  cacheTtlSeconds?: number;
  snapshotRefreshing?: boolean;
}>;

export type TopPicksResponse = {
  rows: TopPicksRow[];
  total: number;
  metadata: TopPicksMetadata;
  warnings: string[];
};
