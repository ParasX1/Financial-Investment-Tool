import { redactMarketNewsTickerFallback } from "./dynamicTickers";
import type {
  MarketNewsQuoteResponse,
  MarketNewsSparklineResponse,
  MarketNewsTicker,
  MarketNewsTickerQuoteState,
} from "./types";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function priceFractionDigits(symbol: string, price: number): number {
  if (symbol.endsWith("=X") || Math.abs(price) < 2) return 4;
  return 2;
}

function changeFractionDigits(symbol: string): number {
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

export function isUnavailableMarketNewsTicker(ticker: MarketNewsTicker) {
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

  if (
    !isFiniteNumber(price) ||
    !isFiniteNumber(change) ||
    !isFiniteNumber(changePct)
  ) {
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
      change,
      changeFractionDigits(ticker.symbol),
    )} ${signedNumber(changePct, 2)}%`,
    previousClose: isFiniteNumber(previousClose) ? previousClose : undefined,
    marketState: live.quote?.marketState ?? ticker.marketState,
    sparkline: resolvedSparkline,
    sparklineSource,
    tone: change > 0 ? "positive" : change < 0 ? "negative" : "neutral",
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
    recoveredLiveData:
      nextTicker !== ticker && !isUnavailableMarketNewsTicker(nextTicker),
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
    previousTicker.symbol.trim().toUpperCase() ===
      fallbackTicker.symbol.trim().toUpperCase()
  ) {
    return {
      recoveredLiveData: false,
      retainedPrevious: true,
      ticker: previousTicker,
    };
  }

  return nextState;
}
