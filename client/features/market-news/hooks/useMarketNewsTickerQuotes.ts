import * as React from "react";
import type { MarketNewsMarketScope, MarketNewsTicker } from "../types";
import { redactMarketNewsTickerFallback } from "../lib/marketNewsDynamicTickers";
import {
  resolveMarketNewsTickerQuoteRefreshState,
  resolveMarketNewsTickerStripState,
  type MarketNewsQuoteResponse,
  type MarketNewsSparklineResponse,
  type MarketNewsTickerStripState,
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

async function fetchTickerSnapshot(
  fallbackTicker: MarketNewsTicker,
  previousTicker?: MarketNewsTicker | null,
  init?: RequestInit,
) {
  const symbol = encodeURIComponent(fallbackTicker.symbol);
  const [quote, sparkline] = await Promise.all([
    fetchJson<MarketNewsQuoteResponse>(
      `/api/market/quote?symbol=${symbol}`,
      init,
    ),
    fetchJson<MarketNewsSparklineResponse>(
      `/api/market/sparkline?symbol=${symbol}`,
      init,
    ),
  ]);

  return resolveMarketNewsTickerQuoteRefreshState({
    fallbackTicker,
    live: { quote, sparkline },
    previousTicker,
  });
}

function fallbackTickerStripState(
  marketScope: MarketNewsMarketScope,
): MarketNewsTickerStripState {
  return {
    providerLabel: "Yahoo Finance",
    source: "fallback",
    tickers: marketScope.tickers.map(redactMarketNewsTickerFallback),
    updatedAt: null,
    warnings: [],
  };
}

export function useMarketNewsTickerQuotes(
  marketScope: MarketNewsMarketScope,
  watchlistSymbols: readonly string[] = [],
) {
  const [stripState, setStripState] = React.useState(() =>
    fallbackTickerStripState(marketScope),
  );
  const stripStateRef = React.useRef(stripState);
  const [loading, setLoading] = React.useState(true);
  const refreshMsRef = React.useRef(QUOTE_REFRESH_MS);
  const setNextStripState = React.useCallback(
    (nextState: MarketNewsTickerStripState) => {
      stripStateRef.current = nextState;
      setStripState(nextState);
    },
    [],
  );
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
    setNextStripState(fallbackTickerStripState(marketScope));
    setLoading(true);
  }, [marketScope, setNextStripState]);

  React.useEffect(() => {
    let alive = true;
    let controller: AbortController | null = null;
    let refreshTimer: number | undefined;

    function clearRefreshTimer() {
      if (refreshTimer !== undefined) {
        window.clearTimeout(refreshTimer);
        refreshTimer = undefined;
      }
    }

    function scheduleNextRefresh() {
      clearRefreshTimer();
      refreshTimer = window.setTimeout(() => {
        if (document.hidden) {
          scheduleNextRefresh();
          return;
        }

        void load(false);
      }, refreshMsRef.current);
    }

    async function load(showLoading: boolean) {
      clearRefreshTimer();
      controller?.abort();
      const activeController = new AbortController();
      controller = activeController;
      if (showLoading) setLoading(true);

      const searchParams = new URLSearchParams({ scope: marketScope.id });
      if (watchlistKey) {
        searchParams.set("watchlist", watchlistKey);
      }

      const snapshot = await fetchJson(
        `/api/market/ticker-strip?${searchParams.toString()}`,
        { signal: activeController.signal },
      );

      if (!alive || controller !== activeController) return;

      const nextState = resolveMarketNewsTickerStripState({
        fallbackTickers: marketScope.tickers.map(redactMarketNewsTickerFallback),
        payload: snapshot,
        previousState: stripStateRef.current,
      });

      setNextStripState(nextState);

      if (nextState.refreshMs) {
        refreshMsRef.current = nextState.refreshMs;
      }

      setLoading(false);
      scheduleNextRefresh();
    }

    void load(true);

    function refreshWhenVisible() {
      if (!document.hidden) void load(false);
    }

    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      alive = false;
      controller?.abort();
      clearRefreshTimer();
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [marketScope, setNextStripState, watchlistKey]);

  return {
    loading,
    providerLabel: stripState.providerLabel,
    source: stripState.source,
    tickers: stripState.tickers,
    updatedAt: stripState.updatedAt,
    warnings: stripState.warnings,
  };
}

export function useMarketNewsTickerQuote(ticker: MarketNewsTicker | null) {
  const [liveTicker, setLiveTicker] = React.useState<MarketNewsTicker | null>(
    ticker,
  );
  const liveTickerRef = React.useRef<MarketNewsTicker | null>(ticker);
  const [loading, setLoading] = React.useState(false);
  const [updatedAt, setUpdatedAt] = React.useState<Date | null>(null);

  React.useEffect(() => {
    liveTickerRef.current = ticker;
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
    let controller: AbortController | null = null;
    let refreshTimer: number | undefined;
    const activeTicker = ticker;

    function clearRefreshTimer() {
      if (refreshTimer !== undefined) {
        window.clearTimeout(refreshTimer);
        refreshTimer = undefined;
      }
    }

    function scheduleNextRefresh() {
      clearRefreshTimer();
      refreshTimer = window.setTimeout(() => {
        if (document.hidden) {
          scheduleNextRefresh();
          return;
        }

        void load(false);
      }, QUOTE_REFRESH_MS);
    }

    async function load(showLoading: boolean) {
      clearRefreshTimer();
      controller?.abort();
      const activeController = new AbortController();
      controller = activeController;
      if (showLoading) setLoading(true);
      const snapshot = await fetchTickerSnapshot(
        activeTicker,
        liveTickerRef.current,
        { signal: activeController.signal },
      );

      if (!alive || controller !== activeController) return;

      liveTickerRef.current = snapshot.ticker;
      setLiveTicker(snapshot.ticker);
      if (snapshot.recoveredLiveData) {
        setUpdatedAt(new Date());
      } else if (!snapshot.retainedPrevious) {
        setUpdatedAt(null);
      }
      setLoading(false);
      scheduleNextRefresh();
    }

    void load(true);

    function refreshWhenVisible() {
      if (!document.hidden) void load(false);
    }

    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      alive = false;
      controller?.abort();
      clearRefreshTimer();
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [ticker]);

  return { loading, ticker: liveTicker, updatedAt };
}
