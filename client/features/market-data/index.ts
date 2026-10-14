export { MarketComparisonChart } from "./components/MarketComparisonChart";
export { MarketLineChart } from "./components/MarketLineChart";
export { useMarketChart } from "./hooks/useMarketChart";
export { useMarketChartComparison } from "./hooks/useMarketChartComparison";
export { useMarketQuotes } from "./hooks/useMarketQuotes";
export { useMarketSymbolSearch } from "./hooks/useMarketSymbolSearch";
export {
  buildNormalizedMarketSeries,
  type NormalizedMarketSeries,
} from "./lib/marketChartComparison";
export type {
  MarketChartPoint,
  MarketChartSnapshot,
  MarketChartsResponse,
  MarketQuote,
  MarketQuotesResponse,
  MarketSymbolSearchResult,
} from "./types";
export {
  MARKET_CHART_RANGE_OPTIONS,
  getMarketChartRange,
  isMarketChartRangeId,
  type MarketChartRange,
  type MarketChartRangeId,
} from "@/lib/market/chartRanges";
