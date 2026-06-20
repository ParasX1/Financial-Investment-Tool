import * as React from "react";
import type { MarketNewsMarketScope, MarketNewsTicker } from "../types";
import type {
  MarketNewsTickerStripSnapshot,
  MarketNewsTickerStripSource,
} from "../lib/marketNewsTickerStripService";
import {
  mergeMarketNewsTickerQuote,
  type MarketNewsQuoteResponse,
  type MarketNewsSparklineResponse,
} from "../lib/marketNewsTickerQuotes";

const QUOTE_REFRESH_MS = 60_000;

async function fetchJson<T extends object>(
  url: string,
  init?: RequestInit,
): Promise<T | null> {
  try {
    const response = await fetch(url, init);
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

  const hasLiveQuote =
    typeof quote?.price === "number" ||
    typeof quote?.change === "number" ||
    typeof quote?.changePct === "number";
  const hasLiveSparkline = Boolean(sparkline?.points?.length);

  return {
    recoveredLiveData: hasLiveQuote || hasLiveSparkline,
    ticker: mergeMarketNewsTickerQuote(ticker, { quote, sparkline }),
  };
}

function isMarketNewsTickerStripSnapshot(
  payload: unknown,
): payload is MarketNewsTickerStripSnapshot {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      Array.isArray((payload as MarketNewsTickerStripSnapshot).tickers),
  );
}

export function useMarketNewsTickerQuotes(
  marketScope: MarketNewsMarketScope,
  watchlistSymbols: readonly string[] = [],
) {
  const [liveTickers, setLiveTickers] =
    React.useState<readonly MarketNewsTicker[]>(marketScope.tickers);
  const [loading, setLoading] = React.useState(false);
  const [updatedAt, setUpdatedAt] = React.useState<Date | null>(null);
  const [source, setSource] =
    React.useState<MarketNewsTickerStripSource>("fallback");
  const [providerLabel, setProviderLabel] = React.useState("Yahoo Finance");
  const [warnings, setWarnings] = React.useState<readonly string[]>([]);
  const refreshMsRef = React.useRef(QUOTE_REFRESH_MS);
  const watchlistKey = React.useMemo(
    () =>
      watchlistSymbols
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean)
        .sort()
        .join(","),
    [watchlistSymbols],
  );

  React.useEffect(() => {
    setLiveTickers(marketScope.tickers);
    setUpdatedAt(null);
    setSource("fallback");
    setWarnings([]);
  }, [marketScope]);

  React.useEffect(() => {
    let alive = true;
    let controller: AbortController | null = null;

    async function load(showLoading: boolean) {
      controller?.abort();
      const activeController = new AbortController();
      controller = activeController;
      if (showLoading) setLoading(true);

      const searchParams = new URLSearchParams({ scope: marketScope.id });
      if (watchlistKey) {
        searchParams.set("watchlist", watchlistKey);
      }

      const snapshot = await fetchJson<MarketNewsTickerStripSnapshot>(
        `/api/market/ticker-strip?${searchParams.toString()}`,
        { signal: activeController.signal },
      );

      if (!alive || controller !== activeController) return;

      if (isMarketNewsTickerStripSnapshot(snapshot)) {
        setLiveTickers(snapshot.tickers);
        setProviderLabel(snapshot.providerLabel);
        setSource(snapshot.source);
        setWarnings(snapshot.warnings);
        setUpdatedAt(snapshot.updatedAt ? new Date(snapshot.updatedAt) : null);
        refreshMsRef.current = snapshot.refreshMs || QUOTE_REFRESH_MS;
      } else {
        setSource("fallback");
        setWarnings(["Live quote snapshots are temporarily unavailable."]);
      }

      setLoading(false);
    }

    void load(true);
    const interval = window.setInterval(() => {
      if (document.hidden) return;
      void load(false);
    }, refreshMsRef.current);

    function refreshWhenVisible() {
      if (!document.hidden) void load(false);
    }

    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      alive = false;
      controller?.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [marketScope.id, watchlistKey]);

  return {
    loading,
    providerLabel,
    source,
    tickers: liveTickers,
    updatedAt,
    warnings,
  };
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
      const snapshot = await fetchTickerSnapshot(activeTicker);

      if (!alive) return;

      setLiveTicker(snapshot.ticker);
      setUpdatedAt(snapshot.recoveredLiveData ? new Date() : null);
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
