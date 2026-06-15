import * as React from "react";
import {
  fetchMarketNews,
  type Article,
  type NewsResponseMeta,
} from "@/services/news";
import { getDemoMarketNewsArticles } from "@/lib/news/providers/demoMarketNewsProvider";
import type {
  MarketNewsMarketScope,
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

function buildDemoMeta(request: MarketNewsRequest): NewsResponseMeta {
  return {
    attemptedProviders: [],
    provider: "demo",
    providerLabel: "Demo",
    query:
      request.query ??
      request.ticker ??
      request.commodity ??
      request.industry ??
      request.country ??
      request.context,
    strictCategory: true,
    warnings: [
      "Demo stories are shown while live market news is loading or no provider key is configured.",
    ],
  };
}

export function useMarketNewsArticles({
  limit,
  marketScope,
  refreshKey,
  searchQuery,
  tickerSymbol,
  topic,
}: {
  limit: number;
  marketScope: MarketNewsMarketScope;
  refreshKey: number;
  searchQuery: string;
  tickerSymbol: string;
  topic: MarketNewsTopic;
}) {
  const request = React.useMemo(
    () => buildMarketNewsRequest(topic, searchQuery, tickerSymbol, marketScope),
    [marketScope, searchQuery, tickerSymbol, topic],
  );
  const demoArticles = React.useMemo(
    () => getDemoMarketNewsArticles({ ...request, pageSize: String(limit) }),
    [limit, request],
  );
  const demoMeta = React.useMemo(() => buildDemoMeta(request), [request]);
  const [articles, setArticles] = React.useState<Article[]>(demoArticles);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [meta, setMeta] = React.useState<NewsResponseMeta | null>(demoMeta);

  React.useEffect(() => {
    let alive = true;

    setArticles(demoArticles);
    setMeta(demoMeta);
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
          ...demoMeta,
          attemptedProviders: [],
          provider: "none",
          providerLabel: "Live provider failed",
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
  }, [demoArticles, demoMeta, limit, refreshKey, request]);

  return {
    articles,
    error,
    loading,
    meta,
    request,
  };
}
