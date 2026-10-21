import * as React from "react";
import { getQuoteRefreshInterval } from "../refreshPolicy";
import {
  getMarketApiError,
  isMarketQuotesResponse,
  type MarketQuote,
  type MarketQuotesResponse,
} from "../types";
import { useMarketDataPolling } from "./useMarketDataPolling";

const SYMBOL_PATTERN = /^[A-Z0-9^][A-Z0-9.^=_-]{0,19}$/;
const MAX_SYMBOLS = 20;
const PARTIAL_QUOTES_UNAVAILABLE = "Some quotes are temporarily unavailable.";
const ALL_QUOTES_UNAVAILABLE = "Quotes are currently unavailable.";
const MARKET_DATA_UNAVAILABLE = "Market data is temporarily unavailable.";

function normalizeMarketSymbols(symbols: readonly string[]): string[] {
  return Array.from(
    new Set(
      symbols
        .map((symbol) => symbol.trim().toUpperCase())
        .filter((symbol) => SYMBOL_PATTERN.test(symbol)),
    ),
  )
    .sort()
    .slice(0, MAX_SYMBOLS);
}

export function createMarketQuotesRequestKey(
  symbols: readonly string[],
): string | null {
  const normalizedSymbols = normalizeMarketSymbols(symbols);
  return normalizedSymbols.length
    ? "/api/market/quotes?symbols=" +
        encodeURIComponent(normalizedSymbols.join(","))
    : null;
}

export function getMarketQuotesRefreshInterval(
  payload: MarketQuotesResponse | undefined,
): number {
  return getQuoteRefreshInterval(payload?.quotes ?? []);
}

export function indexMarketQuotes(payload: MarketQuotesResponse) {
  const quotes = Object.fromEntries(
    payload.quotes.map((quote) => [quote.symbol, quote] as const),
  ) as Record<string, MarketQuote>;
  const unavailableCount = payload.unavailableSymbols.length;

  return {
    quotes,
    warning:
      unavailableCount === 0
        ? null
        : unavailableCount === payload.quotes.length
          ? ALL_QUOTES_UNAVAILABLE
          : PARTIAL_QUOTES_UNAVAILABLE,
  };
}

async function fetchMarketQuotes(key: string): Promise<MarketQuotesResponse> {
  let response: Response;
  let payload: unknown;
  try {
    response = await fetch(key);
    payload = await response.json();
  } catch {
    throw new Error(MARKET_DATA_UNAVAILABLE);
  }
  if (!response.ok) {
    throw new Error(getMarketApiError(payload) || MARKET_DATA_UNAVAILABLE);
  }
  if (!isMarketQuotesResponse(payload)) {
    throw new Error(MARKET_DATA_UNAVAILABLE);
  }
  return payload;
}

export function resolveMarketQuotesActivity({
  initialLoading,
  refreshing,
}: {
  initialLoading: boolean;
  refreshing: boolean;
}) {
  return { loading: initialLoading, refreshing };
}

export function useMarketQuotes(symbols: readonly string[]) {
  const key = React.useMemo(
    () => createMarketQuotesRequestKey(symbols),
    [symbols],
  );
  const polling = useMarketDataPolling({
    fetcher: fetchMarketQuotes,
    key,
    refreshInterval: getMarketQuotesRefreshInterval,
  });
  const activity = resolveMarketQuotesActivity({
    initialLoading: polling.initialLoading,
    refreshing: polling.refreshing,
  });
  const indexed = React.useMemo(
    () =>
      key && polling.data
        ? indexMarketQuotes(polling.data)
        : { quotes: {} as Record<string, MarketQuote>, warning: null },
    [key, polling.data],
  );

  return {
    error: key ? (polling.error?.message ?? indexed.warning) : null,
    lastUpdated: key ? polling.lastUpdated : null,
    loading: key ? activity.loading : false,
    quotes: indexed.quotes,
    refresh: polling.refresh,
    refreshing: key ? activity.refreshing : false,
  };
}
