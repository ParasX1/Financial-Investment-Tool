import type { NewsResponseMeta } from "@/services/news";
import type {
  MarketNewsLensOption,
  MarketNewsRequest,
  MarketNewsTopic,
} from "../types";

export interface MarketNewsEmptyState {
  title: string;
  message: string;
  detail?: string;
}

export interface MarketNewsDisplayState {
  coverageNotice?: string;
  emptyState: MarketNewsEmptyState;
  eyebrow: string;
  providerWarning?: string;
  summary: string;
  title: string;
}

export function buildMarketNewsDisplayState({
  activeLens,
  activeTopic,
  articleCount,
  loading,
  meta,
  request,
  searchQuery,
  tickerSymbol,
  visibleArticleCount,
}: {
  activeLens: MarketNewsLensOption;
  activeTopic: MarketNewsTopic;
  articleCount: number;
  loading: boolean;
  meta: NewsResponseMeta | null;
  request: MarketNewsRequest;
  searchQuery: string;
  tickerSymbol: string;
  visibleArticleCount: number;
}): MarketNewsDisplayState {
  const cleanedSearch = searchQuery.trim();
  const isBroadCoverage = meta?.strictCategory === false;
  const title = isBroadCoverage ? "Broad finance headlines" : request.title;
  const eyebrow = cleanedSearch
    ? "Market search"
    : tickerSymbol
      ? "Ticker news"
      : activeTopic.eyebrow;
  const summary = getMarketNewsDisplaySummary({
    activeTopic,
    isBroadCoverage,
    searchQuery: cleanedSearch,
    tickerSymbol,
  });

  return {
    coverageNotice: isBroadCoverage
      ? "Showing broader finance headlines because exact category coverage is limited."
      : undefined,
    emptyState: getMarketNewsEmptyState({
      activeLens,
      articleCount,
      meta,
      title,
      visibleArticleCount,
    }),
    eyebrow,
    providerWarning: getMarketNewsProviderWarning({
      articleCount,
      loading,
      meta,
    }),
    summary,
    title,
  };
}

function getMarketNewsDisplaySummary({
  activeTopic,
  isBroadCoverage,
  searchQuery,
  tickerSymbol,
}: {
  activeTopic: MarketNewsTopic;
  isBroadCoverage: boolean;
  searchQuery: string;
  tickerSymbol: string;
}) {
  if (isBroadCoverage) {
    return "Showing broader finance headlines because the current free feed could not match this topic precisely.";
  }

  if (searchQuery) {
    return `Showing market news results for "${searchQuery}".`;
  }

  if (tickerSymbol) {
    return `Showing ticker-specific headlines for ${tickerSymbol}.`;
  }

  return activeTopic.description;
}

function getMarketNewsProviderWarning({
  articleCount,
  loading,
  meta,
}: {
  articleCount: number;
  loading: boolean;
  meta: NewsResponseMeta | null;
}) {
  if (loading && articleCount) {
    return "Updating this view while keeping the previous stories visible.";
  }

  if (meta?.provider === "demo") {
    return "Demo stories are synthetic placeholders for local development. Do not treat them as live market news.";
  }

  return meta?.warnings[0];
}

function getMarketNewsEmptyState({
  activeLens,
  articleCount,
  meta,
  title,
  visibleArticleCount,
}: {
  activeLens: MarketNewsLensOption;
  articleCount: number;
  meta: NewsResponseMeta | null;
  title: string;
  visibleArticleCount: number;
}): MarketNewsEmptyState {
  if (articleCount && !visibleArticleCount) {
    return {
      detail: activeLens.description,
      message:
        "This filter is strict, so it only shows headlines that match the selected signal. Switch back to All to see every story.",
      title: getMarketNewsLensEmptyTitle(activeLens.label),
    };
  }

  if (meta?.provider === "none") {
    return {
      detail: meta.warnings[0],
      message:
        "This environment could not reach a configured news source. Refresh, or connect a provider before relying on this page.",
      title: "Live market news is not connected",
    };
  }

  return {
    detail: meta?.query ? `Query checked: ${meta.query}` : undefined,
    message:
      "No current stories matched this topic or search. The page stays empty here instead of filling the feed with unrelated headlines.",
    title: `No ${title} stories found`,
  };
}

function getMarketNewsLensEmptyTitle(label: string) {
  const normalizedLabel = label.trim().toLowerCase();

  return normalizedLabel.endsWith("stories")
    ? `No ${normalizedLabel} in this view`
    : `No ${normalizedLabel} stories in this view`;
}
