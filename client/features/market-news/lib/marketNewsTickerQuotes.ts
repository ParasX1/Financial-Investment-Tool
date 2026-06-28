import type { MarketNewsTicker } from "../types";
import { redactMarketNewsTickerFallback } from "./marketNewsDynamicTickers";
import type {
  MarketNewsTickerStripSnapshot,
  MarketNewsTickerStripSource,
} from "./marketNewsTickerStripService";

export interface MarketNewsQuoteResponse {
  symbol: string;
  price: number | null;
  prevClose?: number | null;
  change: number | null;
  changePct: number | null;
  currency?: string;
  marketState?: string;
  shortName?: string;
  longName?: string;
}

export interface MarketNewsSparklineResponse {
  symbol: string;
  points?: readonly { t: number; v: number }[];
  previousClose?: number | null;
  regularMarketPrice?: number | null;
}

export interface MarketNewsTickerStripState {
  providerLabel: string;
  refreshMs?: number;
  source: MarketNewsTickerStripSource;
  tickers: readonly MarketNewsTicker[];
  updatedAt: Date | null;
  warnings: readonly string[];
}

export const MARKET_NEWS_TICKER_STRIP_UNAVAILABLE_WARNING =
  "Live quote snapshots are temporarily unavailable.";
export const MARKET_NEWS_TICKER_STRIP_REFRESH_WARNING =
  "Could not refresh live quote snapshots. Showing the last loaded quotes.";

export interface MarketNewsTickerQuoteState {
  recoveredLiveData: boolean;
  retainedPrevious: boolean;
  ticker: MarketNewsTicker;
}

const TICKER_STRIP_SOURCES = new Set<MarketNewsTickerStripSource>([
  "fallback",
  "live",
  "mixed",
]);
const TICKER_TONES = new Set<MarketNewsTicker["tone"]>([
  "negative",
  "neutral",
  "positive",
]);
const TICKER_SIGNALS = new Set<NonNullable<MarketNewsTicker["signal"]>>([
  "Core",
  "Macro",
  "Mover",
  "Watchlist",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isMarketNewsTicker(value: unknown): value is MarketNewsTicker {
  if (!isRecord(value)) return false;

  const signal = value.signal;
  const previousClose = value.previousClose;
  const sparklineSource = value.sparklineSource;
  const marketState = value.marketState;

  return (
    typeof value.symbol === "string" &&
    typeof value.label === "string" &&
    typeof value.value === "string" &&
    typeof value.change === "string" &&
    typeof value.tone === "string" &&
    TICKER_TONES.has(value.tone as MarketNewsTicker["tone"]) &&
    Array.isArray(value.sparkline) &&
    value.sparkline.every(isFiniteNumber) &&
    (previousClose === undefined || isFiniteNumber(previousClose)) &&
    (sparklineSource === undefined ||
      sparklineSource === "live" ||
      sparklineSource === "unavailable" ||
      sparklineSource === "fallback") &&
    (marketState === undefined || typeof marketState === "string") &&
    (signal === undefined ||
      (typeof signal === "string" &&
        TICKER_SIGNALS.has(signal as NonNullable<MarketNewsTicker["signal"]>)))
  );
}

function parseSnapshotUpdatedAt(value: string | null) {
  if (!value) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isMarketNewsTickerStripSnapshot(
  payload: unknown,
): payload is MarketNewsTickerStripSnapshot {
  if (!isRecord(payload)) return false;

  return (
    typeof payload.providerLabel === "string" &&
    payload.providerLabel.trim().length > 0 &&
    typeof payload.refreshMs === "number" &&
    Number.isFinite(payload.refreshMs) &&
    payload.refreshMs > 0 &&
    typeof payload.source === "string" &&
    TICKER_STRIP_SOURCES.has(
      payload.source as MarketNewsTickerStripSource,
    ) &&
    payload.strategy === "core-plus-dynamic-movers" &&
    (typeof payload.updatedAt === "string" || payload.updatedAt === null) &&
    Array.isArray(payload.tickers) &&
    payload.tickers.every(isMarketNewsTicker) &&
    isStringArray(payload.warnings)
  );
}

export function resolveMarketNewsTickerStripState({
  fallbackTickers,
  payload,
  previousState,
}: {
  fallbackTickers: readonly MarketNewsTicker[];
  payload: unknown;
  previousState?: MarketNewsTickerStripState;
}): MarketNewsTickerStripState {
  if (isMarketNewsTickerStripSnapshot(payload)) {
    return {
      providerLabel: payload.providerLabel,
      refreshMs: payload.refreshMs,
      source: payload.source,
      tickers: payload.tickers,
      updatedAt: parseSnapshotUpdatedAt(payload.updatedAt),
      warnings: payload.warnings,
    };
  }

  if (
    previousState &&
    previousState.source !== "fallback" &&
    previousState.tickers.length > 0
  ) {
    return {
      ...previousState,
      warnings: [
        MARKET_NEWS_TICKER_STRIP_REFRESH_WARNING,
        ...previousState.warnings.filter(
          (warning) => warning !== MARKET_NEWS_TICKER_STRIP_REFRESH_WARNING,
        ),
      ],
    };
  }

  return {
    providerLabel: "Yahoo Finance",
    source: "fallback",
    tickers: fallbackTickers.map(redactMarketNewsTickerFallback),
    updatedAt: null,
    warnings: [MARKET_NEWS_TICKER_STRIP_UNAVAILABLE_WARNING],
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function priceFractionDigits(symbol: string, price: number): number {
  if (symbol.endsWith("=X") || Math.abs(price) < 2) return 4;
  return 2;
}

function changeFractionDigits(symbol: string, change: number): number {
  if (symbol.endsWith("=X")) return 4;
  return 2;
}

function signedNumber(value: number, digits: number): string {
  const formatted = Math.abs(value).toLocaleString("en-AU", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });

  return `${value >= 0 ? "+" : "-"}${formatted}`;
}

function sparklineValues(sparkline: MarketNewsSparklineResponse | null) {
  return (
    sparkline?.points?.map((point) => point.v).filter(isFiniteNumber) ?? []
  );
}

function normalizedTickerSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function isUnavailableTicker(ticker: MarketNewsTicker) {
  return (
    ticker.value === "Quote unavailable" && ticker.change === "No live data"
  );
}

export function mergeMarketNewsTickerQuote(
  ticker: MarketNewsTicker,
  live: {
    quote: MarketNewsQuoteResponse | null;
    sparkline: MarketNewsSparklineResponse | null;
  },
): MarketNewsTicker {
  const nextSparkline = sparklineValues(live.sparkline);
  const lastSparklineValue = nextSparkline[nextSparkline.length - 1];
  const previousClose = isFiniteNumber(live.quote?.prevClose)
    ? live.quote.prevClose
    : isFiniteNumber(live.sparkline?.previousClose)
      ? live.sparkline.previousClose
      : null;
  const chartPrice = isFiniteNumber(live.sparkline?.regularMarketPrice)
    ? live.sparkline.regularMarketPrice
    : null;
  const price = isFiniteNumber(live.quote?.price)
    ? live.quote.price
    : isFiniteNumber(lastSparklineValue)
      ? lastSparklineValue
      : chartPrice;
  const change = isFiniteNumber(live.quote?.change)
    ? live.quote.change
    : isFiniteNumber(price) && isFiniteNumber(previousClose)
      ? price - previousClose
      : null;
  const changePct = isFiniteNumber(live.quote?.changePct)
    ? live.quote.changePct
    : isFiniteNumber(price) &&
        isFiniteNumber(previousClose) &&
        previousClose !== 0
      ? ((price - previousClose) / previousClose) * 100
      : null;

  if (!isFiniteNumber(price) || !isFiniteNumber(changePct)) {
    return redactMarketNewsTickerFallback(ticker);
  }

  const resolvedChange = change;

  if (!isFiniteNumber(resolvedChange)) {
    return redactMarketNewsTickerFallback(ticker);
  }

  const resolvedSparkline =
    nextSparkline.length > 1
      ? nextSparkline
      : isFiniteNumber(previousClose)
        ? []
        : ticker.sparkline;
  const sparklineSource =
    nextSparkline.length > 1
      ? "live"
      : isFiniteNumber(previousClose)
        ? "unavailable"
        : ticker.sparklineSource;

  return {
    ...ticker,
    change: `${signedNumber(
      resolvedChange,
      changeFractionDigits(ticker.symbol, resolvedChange),
    )} ${signedNumber(changePct, 2)}%`,
    previousClose: isFiniteNumber(previousClose) ? previousClose : undefined,
    marketState: live.quote?.marketState ?? ticker.marketState,
    sparkline: resolvedSparkline,
    sparklineSource,
    tone:
      resolvedChange > 0
        ? "positive"
        : resolvedChange < 0
          ? "negative"
          : "neutral",
    value: price.toLocaleString("en-AU", {
      maximumFractionDigits: priceFractionDigits(ticker.symbol, price),
      minimumFractionDigits: priceFractionDigits(ticker.symbol, price),
    }),
    label: live.quote?.shortName ?? live.quote?.longName ?? ticker.label,
  };
}

export function resolveMarketNewsTickerQuoteState(
  ticker: MarketNewsTicker,
  live: {
    quote: MarketNewsQuoteResponse | null;
    sparkline: MarketNewsSparklineResponse | null;
  },
): MarketNewsTickerQuoteState {
  const nextTicker = mergeMarketNewsTickerQuote(ticker, live);

  return {
    recoveredLiveData: nextTicker !== ticker && !isUnavailableTicker(nextTicker),
    retainedPrevious: false,
    ticker: nextTicker,
  };
}

export function resolveMarketNewsTickerQuoteRefreshState({
  fallbackTicker,
  live,
  previousTicker,
}: {
  fallbackTicker: MarketNewsTicker;
  live: {
    quote: MarketNewsQuoteResponse | null;
    sparkline: MarketNewsSparklineResponse | null;
  };
  previousTicker?: MarketNewsTicker | null;
}): MarketNewsTickerQuoteState {
  const nextState = resolveMarketNewsTickerQuoteState(fallbackTicker, live);

  if (nextState.recoveredLiveData) return nextState;

  if (
    previousTicker &&
    normalizedTickerSymbol(previousTicker.symbol) ===
      normalizedTickerSymbol(fallbackTicker.symbol)
  ) {
    return {
      recoveredLiveData: false,
      retainedPrevious: true,
      ticker: previousTicker,
    };
  }

  return nextState;
}
