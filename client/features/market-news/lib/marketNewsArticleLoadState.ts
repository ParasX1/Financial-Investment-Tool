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
export const MARKET_NEWS_OLDER_LOAD_ERROR =
  "Older stories could not be loaded. Try again without losing the stories above.";

export interface MarketNewsArticleLoadState {
  articles: Article[];
  error: string | null;
  loading: boolean;
  loadingOlder: boolean;
  meta: NewsResponseMeta | null;
  olderError: string | null;
  requestKey: string | null;
}

export const initialMarketNewsArticleState: MarketNewsArticleLoadState = {
  articles: [],
  error: null,
  loading: true,
  loadingOlder: false,
  meta: null,
  olderError: null,
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
    loadingOlder: false,
    meta: sameRequest ? previous.meta : null,
    olderError: null,
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
    loadingOlder: false,
    meta: result.meta,
    olderError: null,
    requestKey: getMarketNewsArticleRequestKey(request),
  };
}

function failedMeta(request: MarketNewsRequest): NewsResponseMeta {
  return {
    attemptedProviders: [],
    hasMore: false,
    nextCursor: null,
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
      ...meta.warnings.filter(
        (warning) => warning !== MARKET_NEWS_REFRESH_WARNING,
      ),
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
      loadingOlder: false,
      meta: metaWithRefreshWarning(previous.meta),
      olderError: null,
      requestKey,
    };
  }

  return {
    articles: [],
    error: MARKET_NEWS_LOAD_ERROR,
    loading: false,
    loadingOlder: false,
    meta: failedMeta(request),
    olderError: null,
    requestKey,
  };
}

function articleIdentityKeys(article: Article) {
  return [
    `id:${article.id}`,
    `url:${article.url}`,
    `title-source:${article.title.trim().toLowerCase()}\u0000${article.source
      .trim()
      .toLowerCase()}`,
  ];
}

function appendUniqueArticles(
  previous: readonly Article[],
  incoming: readonly Article[],
) {
  const seen = new Set(previous.flatMap(articleIdentityKeys));
  const appended = incoming.filter((article) => {
    const keys = articleIdentityKeys(article);
    if (keys.some((key) => seen.has(key))) return false;

    keys.forEach((key) => seen.add(key));
    return true;
  });

  return [...previous, ...appended];
}

export function beginMarketNewsOlderLoad(
  previous: MarketNewsArticleLoadState,
  request: MarketNewsRequest,
): MarketNewsArticleLoadState {
  if (previous.requestKey !== getMarketNewsArticleRequestKey(request)) {
    return previous;
  }

  return {
    ...previous,
    loadingOlder: true,
    olderError: null,
  };
}

export function appendMarketNewsArticleLoad(
  previous: MarketNewsArticleLoadState,
  request: MarketNewsRequest,
  result: MarketNewsFetchResult,
): MarketNewsArticleLoadState {
  if (previous.requestKey !== getMarketNewsArticleRequestKey(request)) {
    return previous;
  }

  return {
    ...previous,
    articles: appendUniqueArticles(previous.articles, result.articles),
    loadingOlder: false,
    meta: result.meta,
    olderError: null,
  };
}

export function failMarketNewsOlderLoad(
  previous: MarketNewsArticleLoadState,
  request: MarketNewsRequest,
): MarketNewsArticleLoadState {
  if (previous.requestKey !== getMarketNewsArticleRequestKey(request)) {
    return previous;
  }

  return {
    ...previous,
    loadingOlder: false,
    olderError: MARKET_NEWS_OLDER_LOAD_ERROR,
  };
}
