import * as React from "react";
import {
  fetchCommodityNews,
  fetchGeneralNews,
  fetchIndustryNews,
  fetchRegionalNews,
  fetchSearchNews,
  fetchTickerNews,
  type Article,
} from "@/services/news";
import type { MarketNewsRequest, MarketNewsTopic } from "../types";
import { buildMarketNewsRequest } from "../lib/marketNewsNavigation";

async function fetchMarketNewsRequest(
  request: MarketNewsRequest,
  limit: number,
) {
  if (request.kind === "regional") {
    return fetchRegionalNews(request.country ?? "au", limit);
  }

  if (request.kind === "industry") {
    return fetchIndustryNews(request.industry ?? "technology", limit);
  }

  if (request.kind === "commodity") {
    return fetchCommodityNews(request.commodity ?? "gold", limit);
  }

  if (request.kind === "search") {
    return fetchSearchNews(
      request.query ?? request.context,
      limit,
      request.context,
    );
  }

  if (request.kind === "ticker") {
    return fetchTickerNews(request.ticker ?? request.context, limit);
  }

  return fetchGeneralNews(limit);
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
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;

    setLoading(true);
    setError(null);

    fetchMarketNewsRequest(request, limit)
      .then((nextArticles) => {
        if (alive) setArticles(nextArticles);
      })
      .catch((cause) => {
        if (!alive) return;
        setArticles([]);
        setError(
          cause instanceof Error
            ? cause.message
            : "Market news could not be loaded.",
        );
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
    request,
  };
}
