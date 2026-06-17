import * as React from "react";
import type { MarketNewsTicker } from "../types";
import {
  mergeMarketNewsTickerQuote,
  type MarketNewsQuoteResponse,
  type MarketNewsSparklineResponse,
} from "../lib/marketNewsTickerQuotes";

const QUOTE_REFRESH_MS = 60_000;

async function fetchJson<T extends object>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const payload = (await response.json()) as T | { error?: string };
    if ("error" in payload && payload.error) return null;
    return payload as T;
  } catch {
    return null;
  }
}

async function fetchTickerSnapshot(ticker: MarketNewsTicker) {
  const symbol = encodeURIComponent(ticker.symbol);
  const [quote, sparkline] = await Promise.all([
    fetchJson<MarketNewsQuoteResponse>(`/api/market/quote?symbol=${symbol}`),
    fetchJson<MarketNewsSparklineResponse>(
      `/api/market/sparkline?symbol=${symbol}`,
    ),
  ]);

  return mergeMarketNewsTickerQuote(ticker, { quote, sparkline });
}

export function useMarketNewsTickerQuotes(
  tickers: readonly MarketNewsTicker[],
) {
  const [liveTickers, setLiveTickers] =
    React.useState<readonly MarketNewsTicker[]>(tickers);
  const [loading, setLoading] = React.useState(false);
  const [updatedAt, setUpdatedAt] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setLiveTickers(tickers);
  }, [tickers]);

  React.useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      const nextTickers = await Promise.all(
        tickers.map((ticker) => fetchTickerSnapshot(ticker)),
      );

      if (!alive) return;

      setLiveTickers(nextTickers);
      setUpdatedAt(new Date());
      setLoading(false);
    }

    void load();
    const interval = window.setInterval(load, QUOTE_REFRESH_MS);

    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [tickers]);

  return { loading, tickers: liveTickers, updatedAt };
}

export function useMarketNewsTickerQuote(ticker: MarketNewsTicker | null) {
  const [liveTicker, setLiveTicker] = React.useState<MarketNewsTicker | null>(
    ticker,
  );
  const [loading, setLoading] = React.useState(false);
  const [updatedAt, setUpdatedAt] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setLiveTicker(ticker);
    if (!ticker) {
      setLoading(false);
      setUpdatedAt(null);
    }
  }, [ticker]);

  React.useEffect(() => {
    if (!ticker) {
      setLoading(false);
      return;
    }

    let alive = true;
    const activeTicker = ticker;

    async function load() {
      setLoading(true);
      const nextTicker = await fetchTickerSnapshot(activeTicker);

      if (!alive) return;

      setLiveTicker(nextTicker);
      setUpdatedAt(new Date());
      setLoading(false);
    }

    void load();
    const interval = window.setInterval(load, QUOTE_REFRESH_MS);

    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [ticker]);

  return { loading, ticker: liveTicker, updatedAt };
}
