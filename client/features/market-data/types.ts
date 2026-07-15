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
  marketState: string | null;
  points: MarketChartPoint[];
  previousClose: number | null;
  quoteTime: string | null;
  regularMarketPrice: number | null;
  symbol: string;
}

type JsonRecord = Record<string, unknown>;

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

function isMarketChartPoint(value: unknown): value is MarketChartPoint {
  if (!isRecord(value)) return false;
  return (
    typeof value.timeMs === "number" &&
    Number.isFinite(value.timeMs) &&
    typeof value.value === "number" &&
    Number.isFinite(value.value)
  );
}

export function isMarketChartSnapshot(
  value: unknown,
): value is MarketChartSnapshot {
  if (!isRecord(value)) return false;
  return (
    typeof value.symbol === "string" &&
    value.symbol.trim().length > 0 &&
    isNullableString(value.currency) &&
    isNullableString(value.exchange) &&
    isNullableString(value.marketState) &&
    Array.isArray(value.points) &&
    value.points.every(isMarketChartPoint) &&
    isNullableNumber(value.previousClose) &&
    isNullableString(value.quoteTime) &&
    isNullableNumber(value.regularMarketPrice)
  );
}
