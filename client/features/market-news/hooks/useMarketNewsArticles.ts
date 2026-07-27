import * as React from "react";
import { fetchMarketNews } from "@/services/news";
import type {
  MarketNewsRequest,
  MarketNewsTopic,
} from "../types";
import {
  beginMarketNewsArticleLoad,
  failMarketNewsArticleLoad,
  initialMarketNewsArticleState,
  succeedMarketNewsArticleLoad,
} from "../lib/marketNewsArticleLoadState";
import { buildMarketNewsRequest } from "../lib/marketNewsNavigation";

const NEWS_REFRESH_MS = 3 * 60 * 1000;

async function fetchMarketNewsRequest(
  request: MarketNewsRequest,
  limit: number,
  refreshKey: number,
) {
  return fetchMarketNews(
    {
      commodity: request.commodity,
      context: request.context,
      country: request.country,
      industry: request.industry,
      kind: request.kind,
      query: request.query,
      ticker: request.ticker,
      topicId: request.topicId,
      userSearch: request.userSearch,
      marketScopeId: request.marketScopeId,
    },
    limit,
    refreshKey,
  );
}

export function useMarketNewsArticles({
  autoRefreshEnabled = true,
  enabled = true,
  limit,
  refreshKey,
  searchQuery,
  tickerSymbol,
  topic,
}: {
  autoRefreshEnabled?: boolean;
  enabled?: boolean;
  limit: number;
  refreshKey: number;
  searchQuery: string;
  tickerSymbol: string;
  topic: MarketNewsTopic;
}) {
  const request = React.useMemo(
    () => buildMarketNewsRequest(topic, searchQuery, tickerSymbol),
    [searchQuery, tickerSymbol, topic],
  );
  const [loadState, setLoadState] = React.useState(
    initialMarketNewsArticleState,
  );
  const [autoRefreshKey, setAutoRefreshKey] = React.useState(0);
  const effectiveRefreshKey = refreshKey + autoRefreshKey;

  React.useEffect(() => {
    if (
      !enabled ||
      !autoRefreshEnabled ||
      typeof window === "undefined"
    ) {
      return;
    }

    const refreshWhenVisible = () => {
      if (document.hidden) return;
      setAutoRefreshKey((key) => key + 1);
    };
    const interval = window.setInterval(refreshWhenVisible, NEWS_REFRESH_MS);

    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [autoRefreshEnabled, enabled]);

  React.useEffect(() => {
    if (!enabled) return;

    let alive = true;

    setLoadState((previous) => beginMarketNewsArticleLoad(previous, request));

    fetchMarketNewsRequest(request, limit, effectiveRefreshKey)
      .then((result) => {
        if (!alive) return;

        setLoadState((previous) =>
          succeedMarketNewsArticleLoad(previous, request, result),
        );
      })
      .catch((cause) => {
        if (!alive) return;

        console.warn("Market news article fetch failed", cause);
        setLoadState((previous) =>
          failMarketNewsArticleLoad(previous, request),
        );
      });

    return () => {
      alive = false;
    };
  }, [enabled, effectiveRefreshKey, limit, request]);

  return {
    articles: loadState.articles,
    error: loadState.error,
    loading: !enabled || loadState.loading,
    meta: loadState.meta,
    request,
  };
}
