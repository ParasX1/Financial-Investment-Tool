export const MARKET_REFRESH_INTERVALS = Object.freeze({
  activeChartMs: 30_000,
  activeQuoteMs: 15_000,
  closedMs: 300_000,
  extendedChartMs: 60_000,
  extendedQuoteMs: 30_000,
  maxRetryMs: 120_000,
  retryBaseMs: 30_000,
  unknownQuoteMs: 60_000,
});

type MarketStateValue = { marketState: string | null | undefined };

const EXTENDED_STATES = new Set(["PRE", "PREPRE", "POST", "POSTPOST"]);

function normalizedState(value: string | null | undefined) {
  return value?.trim().toUpperCase() ?? "";
}

export function getQuoteRefreshInterval(
  quotes: readonly MarketStateValue[],
): number {
  const states = quotes.map((quote) => normalizedState(quote.marketState));
  if (states.includes("REGULAR")) return MARKET_REFRESH_INTERVALS.activeQuoteMs;
  if (states.some((state) => EXTENDED_STATES.has(state))) {
    return MARKET_REFRESH_INTERVALS.extendedQuoteMs;
  }
  if (states.length > 0 && states.every((state) => state === "CLOSED")) {
    return MARKET_REFRESH_INTERVALS.closedMs;
  }
  return MARKET_REFRESH_INTERVALS.unknownQuoteMs;
}

export function getChartRefreshInterval(
  marketState: string | null | undefined,
): number {
  const state = normalizedState(marketState);
  if (state === "REGULAR") return MARKET_REFRESH_INTERVALS.activeChartMs;
  if (EXTENDED_STATES.has(state)) {
    return MARKET_REFRESH_INTERVALS.extendedChartMs;
  }
  if (state === "CLOSED") return MARKET_REFRESH_INTERVALS.closedMs;
  return MARKET_REFRESH_INTERVALS.extendedChartMs;
}

export function getRetryInterval(retryCount: number): number {
  const safeRetryCount = Math.max(0, Math.floor(retryCount));
  return Math.min(
    MARKET_REFRESH_INTERVALS.retryBaseMs * 2 ** safeRetryCount,
    MARKET_REFRESH_INTERVALS.maxRetryMs,
  );
}
