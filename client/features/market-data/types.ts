import {
  MAX_MARKET_CHART_COMPARISON_SYMBOLS,
  getMarketChartRange,
  isMarketChartRangeId,
  type MarketChartInterval,
  type MarketChartRangeId,
} from "@/lib/market/chartRanges";

export interface MarketQuote {
  change: number | null;
  changePercent: number | null;
  currency: string | null;
  exchange: string | null;
  longName: string | null;
  marketState: string | null;
  previousClose: number | null;
  price: number | null;
  quoteTime: string | null;
  shortName: string | null;
  symbol: string;
}

export interface MarketQuotesResponse {
  quotes: MarketQuote[];
  unavailableSymbols: string[];
}

export interface MarketChartPoint {
  timeMs: number;
  value: number;
}

export interface MarketChartSnapshot {
  currency: string | null;
  exchange: string | null;
  interval: MarketChartInterval;
  marketState: string | null;
  points: MarketChartPoint[];
  previousClose: number | null;
  quoteTime: string | null;
  rangeId: MarketChartRangeId;
  regularMarketPrice: number | null;
  symbol: string;
}

export interface MarketChartsResponse {
  rangeId: MarketChartRangeId;
  snapshots: MarketChartSnapshot[];
  unavailableSymbols: string[];
}

type JsonRecord = Record<string, unknown>;
const MARKET_SYMBOL_PATTERN = /^[A-Z0-9^][A-Z0-9.^=_-]{0,19}$/;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return (
    value === null || (typeof value === "number" && Number.isFinite(value))
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function getMarketApiError(value: unknown): string | null {
  if (!isRecord(value) || typeof value.error !== "string") return null;
  const message = value.error.trim();
  return message || null;
}

export function isMarketQuote(value: unknown): value is MarketQuote {
  if (!isRecord(value)) return false;
  return (
    typeof value.symbol === "string" &&
    value.symbol.trim().length > 0 &&
    isNullableNumber(value.change) &&
    isNullableNumber(value.changePercent) &&
    isNullableString(value.currency) &&
    isNullableString(value.exchange) &&
    isNullableString(value.longName) &&
    isNullableString(value.marketState) &&
    isNullableNumber(value.previousClose) &&
    isNullableNumber(value.price) &&
    isNullableString(value.quoteTime) &&
    isNullableString(value.shortName)
  );
}

export function isMarketQuotesResponse(
  value: unknown,
): value is MarketQuotesResponse {
  if (!isRecord(value)) return false;
  return (
    Array.isArray(value.quotes) &&
    value.quotes.every(isMarketQuote) &&
    Array.isArray(value.unavailableSymbols) &&
    value.unavailableSymbols.every((symbol) => typeof symbol === "string")
  );
}

function isValidTimestamp(value: number): boolean {
  return Number.isFinite(value) && !Number.isNaN(new Date(value).getTime());
}

function isMarketChartPoint(value: unknown): value is MarketChartPoint {
  if (!isRecord(value)) return false;
  return (
    typeof value.timeMs === "number" &&
    isValidTimestamp(value.timeMs) &&
    typeof value.value === "number" &&
    Number.isFinite(value.value)
  );
}

function isMarketChartInterval(value: unknown): value is MarketChartInterval {
  return (
    value === "1m" ||
    value === "15m" ||
    value === "1h" ||
    value === "1d" ||
    value === "1wk" ||
    value === "1mo"
  );
}

export function isMarketChartSnapshot(
  value: unknown,
): value is MarketChartSnapshot {
  if (!isRecord(value)) return false;
  return (
    typeof value.symbol === "string" &&
    MARKET_SYMBOL_PATTERN.test(value.symbol) &&
    isNullableString(value.currency) &&
    isNullableString(value.exchange) &&
    isMarketChartInterval(value.interval) &&
    isNullableString(value.marketState) &&
    Array.isArray(value.points) &&
    value.points.every(isMarketChartPoint) &&
    isNullableNumber(value.previousClose) &&
    isNullableString(value.quoteTime) &&
    isMarketChartRangeId(value.rangeId) &&
    isNullableNumber(value.regularMarketPrice) &&
    getMarketChartRange(value.rangeId).interval === value.interval
  );
}

export function isMarketChartsResponse(
  value: unknown,
): value is MarketChartsResponse {
  if (!isRecord(value) || !isMarketChartRangeId(value.rangeId)) return false;
  if (
    !Array.isArray(value.snapshots) ||
    !value.snapshots.every(isMarketChartSnapshot) ||
    !Array.isArray(value.unavailableSymbols) ||
    !value.unavailableSymbols.every(
      (symbol) => typeof symbol === "string" && symbol.trim().length > 0,
    )
  ) {
    return false;
  }
  const symbols = [
    ...value.snapshots.map((snapshot) => snapshot.symbol),
    ...value.unavailableSymbols,
  ];
  if (
    symbols.length > MAX_MARKET_CHART_COMPARISON_SYMBOLS ||
    new Set(symbols).size !== symbols.length ||
    value.unavailableSymbols.some(
      (symbol) => !MARKET_SYMBOL_PATTERN.test(symbol),
    )
  ) {
    return false;
  }

  return value.snapshots.every(
    (snapshot) => snapshot.rangeId === value.rangeId,
  );
}
