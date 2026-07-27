import * as React from "react";
import {
  fetchMarketNews,
  fetchOlderMarketNews,
  type MarketNewsFetchParams,
} from "@/services/news";
import type { MarketNewsRequest, MarketNewsTopic } from "../types";
import {
  appendMarketNewsArticleLoad,
  beginMarketNewsArticleLoad,
  beginMarketNewsOlderLoad,
  failMarketNewsArticleLoad,
  failMarketNewsOlderLoad,
  getMarketNewsArticleRequestKey,
  getUniqueMarketNewsArticles,
  initialMarketNewsArticleState,
  succeedMarketNewsArticleLoad,
} from "../lib/marketNewsArticleLoadState";
import { buildMarketNewsRequest } from "../lib/marketNewsNavigation";

const NEWS_REFRESH_MS = 3 * 60 * 1000;
const MAX_EMPTY_CONTINUATION_SCANS = 3;

function clientRequest(request: MarketNewsRequest): MarketNewsFetchParams {
  return {
    commodity: request.commodity,
    context: request.context,
    country: request.country,
    industry: request.industry,
    kind: request.kind,
    marketScopeId: request.marketScopeId,
    query: request.query,
    ticker: request.ticker,
    topicId: request.topicId,
    userSearch: request.userSearch,
  };
}

async function fetchMarketNewsRequest(
  request: MarketNewsRequest,
  limit: number,
  refreshKey: number,
) {
  return fetchMarketNews(clientRequest(request), limit, refreshKey);
}

function fetchOlderMarketNewsRequest(
  request: MarketNewsRequest,
  limit: number,
  cursor: string,
) {
  return fetchOlderMarketNews(clientRequest(request), limit, cursor);
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
  const continuationInFlight = React.useRef(false);
  const requestKey = getMarketNewsArticleRequestKey(request);
  const activeRequestKey = React.useRef(requestKey);
  activeRequestKey.current = requestKey;
  const effectiveRefreshKey = refreshKey + autoRefreshKey;

  React.useEffect(() => {
    if (!enabled || !autoRefreshEnabled || typeof window === "undefined") {
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

  const loadOlder = React.useCallback(async () => {
    const firstCursor = loadState.meta?.nextCursor;
    if (
      continuationInFlight.current ||
      !loadState.meta?.hasMore ||
      !firstCursor
    ) {
      return [];
    }

    continuationInFlight.current = true;
    setLoadState((previous) => beginMarketNewsOlderLoad(previous, request));

    try {
      let cursor = firstCursor;
      let knownArticles = loadState.articles;

      for (let scan = 0; scan < MAX_EMPTY_CONTINUATION_SCANS; scan += 1) {
        const result = await fetchOlderMarketNewsRequest(
          request,
          limit,
          cursor,
        );

        if (activeRequestKey.current !== requestKey) return [];

        const nextCursor = result.meta.nextCursor;
        const addedArticles = getUniqueMarketNewsArticles(
          knownArticles,
          result.articles,
        );
        knownArticles = [...knownArticles, ...addedArticles];
        const continueScanning =
          !addedArticles.length &&
          result.meta.hasMore &&
          Boolean(nextCursor) &&
          nextCursor !== cursor &&
          scan + 1 < MAX_EMPTY_CONTINUATION_SCANS;

        setLoadState((previous) => {
          const appended = appendMarketNewsArticleLoad(
            previous,
            request,
            result,
          );
          return continueScanning
            ? beginMarketNewsOlderLoad(appended, request)
            : appended;
        });

        if (addedArticles.length || !result.meta.hasMore) {
          return addedArticles;
        }

        if (!nextCursor || nextCursor === cursor) return [];
        cursor = nextCursor;
      }

      return [];
    } catch (cause) {
      if (activeRequestKey.current !== requestKey) return [];

      console.warn("Older market news fetch failed", cause);
      setLoadState((previous) => failMarketNewsOlderLoad(previous, request));
      return [];
    } finally {
      continuationInFlight.current = false;
    }
  }, [limit, loadState.articles, loadState.meta, request, requestKey]);

  return {
    articles: loadState.articles,
    error: loadState.error,
    loadOlder,
    loading: !enabled || loadState.loading,
    loadingOlder: loadState.loadingOlder,
    meta: loadState.meta,
    olderError: loadState.olderError,
    request,
  };
}
