import type {
  Article,
  MarketNewsFetchParams,
  MarketNewsFetchResult,
  NewsResponseMeta,
} from "@/lib/news/contracts";

export type {
  Article,
  MarketNewsFetchParams,
  MarketNewsFetchResult,
  NewsResponseMeta,
} from "@/lib/news/contracts";

export const MARKET_NEWS_MALFORMED_RESPONSE_ERROR =
  "Market news response was malformed.";

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isNewsResponseMeta(value: unknown): value is NewsResponseMeta {
  if (!value || typeof value !== "object") return false;

  const meta = value as Partial<NewsResponseMeta>;

  return (
    isStringArray(meta.attemptedProviders) &&
    typeof meta.hasMore === "boolean" &&
    (typeof meta.nextCursor === "string" || meta.nextCursor === null) &&
    (meta.hasMore ? Boolean(meta.nextCursor) : meta.nextCursor === null) &&
    typeof meta.provider === "string" &&
    typeof meta.providerLabel === "string" &&
    typeof meta.query === "string" &&
    typeof meta.strictCategory === "boolean" &&
    isStringArray(meta.warnings)
  );
}

function isMarketNewsFetchResult(
  value: unknown,
): value is MarketNewsFetchResult {
  if (!value || typeof value !== "object") return false;

  const payload = value as Partial<MarketNewsFetchResult>;

  return Array.isArray(payload.articles) && isNewsResponseMeta(payload.meta);
}

async function readNewsResponse(res: Response): Promise<MarketNewsFetchResult> {
  const data = await res.json().catch(() => {
    if (res.ok) throw new Error(MARKET_NEWS_MALFORMED_RESPONSE_ERROR);
    return {};
  });

  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch market news");
  }

  if (!isMarketNewsFetchResult(data)) {
    throw new Error(MARKET_NEWS_MALFORMED_RESPONSE_ERROR);
  }

  return data;
}

async function fetchMarketNewsPage(
  request: MarketNewsFetchParams,
  limit: number,
  refreshKey: number,
  cursor?: string,
): Promise<MarketNewsFetchResult> {
  const params = new URLSearchParams({
    context: request.context,
    kind: request.kind,
    pageSize: String(limit),
  });

  if (request.commodity) params.set("commodity", request.commodity);
  if (request.country) params.set("country", request.country);
  if (request.industry) params.set("industry", request.industry);
  if (request.marketScopeId) params.set("marketScopeId", request.marketScopeId);
  if (request.query) params.set("q", request.query);
  if (request.ticker) params.set("ticker", request.ticker);
  if (request.topicId) params.set("topicId", request.topicId);
  if (request.userSearch) params.set("userSearch", "true");
  if (cursor) params.set("cursor", cursor);
  if (refreshKey > 0) params.set("_refresh", String(refreshKey));

  const res = await fetch(`/api/news/market?${params.toString()}`, {
    cache: refreshKey > 0 ? "no-store" : "default",
  });

  return readNewsResponse(res);
}

export function fetchMarketNews(
  request: MarketNewsFetchParams,
  limit = 10,
  refreshKey = 0,
) {
  return fetchMarketNewsPage(request, limit, refreshKey);
}

export function fetchOlderMarketNews(
  request: MarketNewsFetchParams,
  limit: number,
  cursor: string,
) {
  return fetchMarketNewsPage(request, limit, 0, cursor);
}

export async function fetchGeneralNews(limit = 10): Promise<Article[]> {
  const result = await fetchMarketNews(
    {
      context: "finance markets business economy",
      kind: "general",
    },
    limit,
  );
  return result.articles;
}

export async function fetchRegionalNews(
  country = "au",
  limit = 10,
): Promise<Article[]> {
  const result = await fetchMarketNews(
    {
      context: `${country} market business economy`,
      country,
      kind: "regional",
    },
    limit,
  );
  return result.articles;
}

export async function fetchIndustryNews(
  industry = "technology",
  limit = 10,
): Promise<Article[]> {
  const result = await fetchMarketNews(
    {
      context: `${industry} sector stocks companies market news`,
      industry,
      kind: "industry",
    },
    limit,
  );
  return result.articles;
}

export async function fetchCommodityNews(
  commodity = "gold",
  limit = 10,
): Promise<Article[]> {
  const result = await fetchMarketNews(
    {
      commodity,
      context: `${commodity} commodities futures market supply demand`,
      kind: "commodity",
    },
    limit,
  );
  return result.articles;
}

export async function fetchTickerNews(
  ticker: string,
  limit = 10,
): Promise<Article[]> {
  const result = await fetchMarketNews(
    {
      context: `${ticker} company stock market news`,
      kind: "ticker",
      ticker,
    },
    limit,
  );
  return result.articles;
}

export async function fetchSearchNews(
  query: string,
  limit = 10,
  context?: string,
): Promise<Article[]> {
  const result = await fetchMarketNews(
    {
      context: context || query,
      kind: "search",
      query,
    },
    limit,
  );
  return result.articles;
}
