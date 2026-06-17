import type { MarketNewsTicker } from "../types";

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
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function priceFractionDigits(symbol: string, price: number): number {
  if (symbol.endsWith("=X") || Math.abs(price) < 2) return 4;
  return 2;
}

function changeFractionDigits(symbol: string, change: number): number {
  if (symbol.endsWith("=X") || Math.abs(change) < 1) return 4;
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

export function mergeMarketNewsTickerQuote(
  ticker: MarketNewsTicker,
  live: {
    quote: MarketNewsQuoteResponse | null;
    sparkline: MarketNewsSparklineResponse | null;
  },
): MarketNewsTicker {
  const nextSparkline = sparklineValues(live.sparkline);
  const firstSparklineValue = nextSparkline[0];
  const lastSparklineValue = nextSparkline[nextSparkline.length - 1];
  const price = isFiniteNumber(live.quote?.price)
    ? live.quote.price
    : lastSparklineValue;
  const change = live.quote?.change;
  const changePct = isFiniteNumber(live.quote?.changePct)
    ? live.quote.changePct
    : isFiniteNumber(firstSparklineValue) &&
        isFiniteNumber(lastSparklineValue) &&
        firstSparklineValue !== 0
      ? ((lastSparklineValue - firstSparklineValue) / firstSparklineValue) * 100
      : null;

  if (!isFiniteNumber(price) || !isFiniteNumber(changePct)) return ticker;

  const resolvedChange = isFiniteNumber(change)
    ? change
    : isFiniteNumber(live.quote?.prevClose)
      ? price - live.quote.prevClose
      : isFiniteNumber(firstSparklineValue)
        ? price - firstSparklineValue
      : null;

  if (!isFiniteNumber(resolvedChange)) return ticker;

  return {
    ...ticker,
    change: `${signedNumber(
      resolvedChange,
      changeFractionDigits(ticker.symbol, resolvedChange),
    )} ${signedNumber(changePct, 2)}%`,
    sparkline: nextSparkline.length > 1 ? nextSparkline : ticker.sparkline,
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
