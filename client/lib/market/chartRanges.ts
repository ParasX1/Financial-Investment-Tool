export const MAX_MARKET_CHART_COMPARISON_SYMBOLS = 4;

export const MARKET_CHART_RANGE_OPTIONS = [
  { id: "1d", interval: "1m", label: "1D", providerRange: "1d" },
  { id: "5d", interval: "15m", label: "5D", providerRange: "5d" },
  { id: "1m", interval: "1h", label: "1M", providerRange: "1mo" },
  { id: "3m", interval: "1d", label: "3M", providerRange: "3mo" },
  { id: "6m", interval: "1d", label: "6M", providerRange: "6mo" },
  { id: "ytd", interval: "1d", label: "YTD", providerRange: "ytd" },
  { id: "1y", interval: "1d", label: "1Y", providerRange: "1y" },
  { id: "5y", interval: "1wk", label: "5Y", providerRange: "5y" },
  { id: "max", interval: "1mo", label: "Max", providerRange: "max" },
] as const;

export type MarketChartRange = (typeof MARKET_CHART_RANGE_OPTIONS)[number];
export type MarketChartRangeId = MarketChartRange["id"];
export type MarketChartInterval = MarketChartRange["interval"];

const DEFAULT_MARKET_CHART_RANGE = MARKET_CHART_RANGE_OPTIONS[0];

export function isMarketChartRangeId(
  value: unknown,
): value is MarketChartRangeId {
  return (
    typeof value === "string" &&
    MARKET_CHART_RANGE_OPTIONS.some((option) => option.id === value)
  );
}

export function getMarketChartRange(value: unknown): MarketChartRange {
  if (!isMarketChartRangeId(value)) return DEFAULT_MARKET_CHART_RANGE;
  return (
    MARKET_CHART_RANGE_OPTIONS.find((option) => option.id === value) ??
    DEFAULT_MARKET_CHART_RANGE
  );
}
