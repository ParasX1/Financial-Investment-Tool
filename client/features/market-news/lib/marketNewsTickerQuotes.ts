import type { MarketQuote } from "@/features/market-data";
import {
  isUnavailableMarketNewsTicker,
  mergeMarketNewsTickerQuote,
  redactMarketNewsTickerFallback,
  resolveMarketNewsTickerQuoteRefreshState,
  resolveMarketNewsTickerQuoteState,
  type MarketNewsSparklineResponse,
  type MarketNewsTicker,
  type MarketNewsTickerStripSnapshot,
  type MarketNewsTickerStripSource,
} from "@/lib/news/tickerStrip";

export {
  mergeMarketNewsTickerQuote,
  resolveMarketNewsTickerQuoteRefreshState,
  resolveMarketNewsTickerQuoteState,
} from "@/lib/news/tickerStrip";
export type {
  MarketNewsQuoteResponse,
  MarketNewsSparklineResponse,
} from "@/lib/news/tickerStrip";

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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
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
    TICKER_STRIP_SOURCES.has(payload.source as MarketNewsTickerStripSource) &&
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

function normalizedTickerSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

export function overlayMarketNewsTickerQuotes(
  tickers: readonly MarketNewsTicker[],
  quotes: Readonly<Record<string, MarketQuote>>,
): MarketNewsTicker[] {
  return tickers.map((ticker) => {
    const quote = quotes[normalizedTickerSymbol(ticker.symbol)];
    if (!quote) return ticker;

    const merged = mergeMarketNewsTickerQuote(ticker, {
      quote: {
        change: quote.change,
        changePct: quote.changePercent,
        longName: quote.longName ?? undefined,
        marketState: quote.marketState ?? undefined,
        prevClose: quote.previousClose,
        price: quote.price,
        shortName: quote.shortName ?? undefined,
        symbol: quote.symbol,
      },
      sparkline: null,
    });

    if (isUnavailableMarketNewsTicker(merged)) return ticker;

    const {
      sparkline: _discardedSparkline,
      sparklineSource: _discardedSparklineSource,
      ...quoteFields
    } = merged;
    return { ...ticker, ...quoteFields };
  });
}

export function resolveMarketNewsTickerOverlayState(
  source: MarketNewsTickerStripSource,
  tickers: readonly MarketNewsTicker[],
  quotes: Readonly<Record<string, MarketQuote>>,
): Pick<MarketNewsTickerStripState, "source" | "tickers"> {
  const overlaidTickers = overlayMarketNewsTickerQuotes(tickers, quotes);
  const recoveredFallbackQuote =
    source === "fallback" &&
    overlaidTickers.some(
      (ticker, index) =>
        ticker !== tickers[index] && !isUnavailableMarketNewsTicker(ticker),
    );

  return {
    source: recoveredFallbackQuote ? "mixed" : source,
    tickers: overlaidTickers,
  };
}
