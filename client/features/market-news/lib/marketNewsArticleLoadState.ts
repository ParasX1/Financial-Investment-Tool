import type {
  Article,
  MarketNewsFetchResult,
  NewsResponseMeta,
} from "@/services/news";
import type { MarketNewsRequest } from "../types";

export const MARKET_NEWS_LOAD_ERROR =
  "Market news could not be loaded right now.";
export const MARKET_NEWS_REFRESH_WARNING =
  "Could not refresh live market news. Showing the last loaded stories.";

export interface MarketNewsArticleLoadState {
  articles: Article[];
  error: string | null;
  loading: boolean;
  meta: NewsResponseMeta | null;
  requestKey: string | null;
}

export const initialMarketNewsArticleState: MarketNewsArticleLoadState = {
  articles: [],
  error: null,
  loading: true,
  meta: null,
  requestKey: null,
};

function compact(value: string | undefined) {
  return value?.trim() ?? "";
}

export function getMarketNewsArticleRequestKey(request: MarketNewsRequest) {
  return JSON.stringify({
    commodity: compact(request.commodity),
    context: compact(request.context),
    country: compact(request.country),
    industry: compact(request.industry),
    kind: request.kind,
    marketScopeId: compact(request.marketScopeId),
    query: compact(request.query),
    ticker: compact(request.ticker),
    topicId: compact(request.topicId),
    userSearch: Boolean(request.userSearch),
  });
}

export function beginMarketNewsArticleLoad(
  previous: MarketNewsArticleLoadState,
  request: MarketNewsRequest,
): MarketNewsArticleLoadState {
  const requestKey = getMarketNewsArticleRequestKey(request);
  const sameRequest = previous.requestKey === requestKey;

  return {
    articles: sameRequest ? previous.articles : [],
    error: null,
    loading: true,
    meta: sameRequest ? previous.meta : null,
    requestKey,
  };
}

export function succeedMarketNewsArticleLoad(
  _previous: MarketNewsArticleLoadState,
  request: MarketNewsRequest,
  result: MarketNewsFetchResult,
): MarketNewsArticleLoadState {
  return {
    articles: result.articles,
    error: null,
    loading: false,
    meta: result.meta,
    requestKey: getMarketNewsArticleRequestKey(request),
  };
}

function failedMeta(request: MarketNewsRequest): NewsResponseMeta {
  return {
    attemptedProviders: [],
    provider: "none",
    providerLabel: "Live provider unavailable",
    query:
      request.query ??
      request.ticker ??
      request.commodity ??
      request.industry ??
      request.country ??
      request.context,
    strictCategory: true,
    warnings: [MARKET_NEWS_LOAD_ERROR],
  };
}

function metaWithRefreshWarning(meta: NewsResponseMeta | null) {
  if (!meta) return meta;

  return {
    ...meta,
    warnings: [
      MARKET_NEWS_REFRESH_WARNING,
      ...meta.warnings.filter((warning) => warning !== MARKET_NEWS_REFRESH_WARNING),
    ],
  };
}

export function failMarketNewsArticleLoad(
  previous: MarketNewsArticleLoadState,
  request: MarketNewsRequest,
): MarketNewsArticleLoadState {
  const requestKey = getMarketNewsArticleRequestKey(request);
  const canKeepPreviousStories =
    previous.requestKey === requestKey && previous.articles.length > 0;

  if (canKeepPreviousStories) {
    return {
      articles: previous.articles,
      error: null,
      loading: false,
      meta: metaWithRefreshWarning(previous.meta),
      requestKey,
    };
  }

  return {
    articles: [],
    error: MARKET_NEWS_LOAD_ERROR,
    loading: false,
    meta: failedMeta(request),
    requestKey,
  };
}
