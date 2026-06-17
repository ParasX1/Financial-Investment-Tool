import * as React from "react";
import {
  fetchMarketNews,
  type Article,
  type NewsResponseMeta,
} from "@/services/news";
import type {
  MarketNewsRequest,
  MarketNewsTopic,
} from "../types";
import { buildMarketNewsRequest } from "../lib/marketNewsNavigation";

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
  limit,
  refreshKey,
  searchQuery,
  tickerSymbol,
  topic,
}: {
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
  const [articles, setArticles] = React.useState<Article[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [meta, setMeta] = React.useState<NewsResponseMeta | null>(null);

  React.useEffect(() => {
    let alive = true;

    setLoading(true);
    setError(null);

    fetchMarketNewsRequest(request, limit, refreshKey)
      .then((result) => {
        if (!alive) return;

        setArticles(result.articles);
        setMeta(result.meta);
      })
      .catch((cause) => {
        if (!alive) return;
        const message =
          cause instanceof Error
            ? cause.message
            : "Market news could not be loaded.";

        setArticles([]);
        setMeta({
          attemptedProviders: [],
          provider: "none",
          providerLabel: "Live provider failed",
          query:
            request.query ??
            request.ticker ??
            request.commodity ??
            request.industry ??
            request.country ??
            request.context,
          strictCategory: true,
          warnings: [`Live market news failed: ${message}.`],
        });
        setError(message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [limit, refreshKey, request]);

  return {
    articles,
    error,
    loading,
    meta,
    request,
  };
}
