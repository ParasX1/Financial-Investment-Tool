import { DEFAULT_MARKET_NEWS_TOPIC_ID } from "@/lib/news/catalog";
import { defaultMarketNewsMarketScopeId } from "@/lib/news/tickerStrip/marketScopes";

export type MarketNewsRouteHrefState = Partial<{
  lensId: "all" | "watchlist" | "ticker-linked";
  marketScopeId: string;
  pageIndex: number;
  searchQuery: string;
  sortId: "latest" | "watchlist-first";
  tickerSymbol: string;
  topicId: string;
}>;

export function getMarketNewsRouteHref({
  lensId,
  marketScopeId,
  pageIndex,
  searchQuery,
  sortId,
  tickerSymbol,
  topicId,
}: MarketNewsRouteHrefState) {
  const params = new URLSearchParams();
  const nextTopicId = topicId ?? DEFAULT_MARKET_NEWS_TOPIC_ID;
  const nextMarketScopeId = marketScopeId ?? defaultMarketNewsMarketScopeId;
  const nextSearchQuery = searchQuery?.trim() ?? "";
  const nextTickerSymbol = nextSearchQuery
    ? ""
    : (tickerSymbol?.trim().toUpperCase() ?? "");

  if (nextTopicId !== DEFAULT_MARKET_NEWS_TOPIC_ID) {
    params.set("topic", nextTopicId);
  }

  if (nextMarketScopeId !== defaultMarketNewsMarketScopeId) {
    params.set("market", nextMarketScopeId);
  }

  if (nextSearchQuery) {
    params.set("q", nextSearchQuery);
  } else if (nextTickerSymbol) {
    params.set("quote", nextTickerSymbol);
  }

  if (lensId && lensId !== "all") {
    params.set("lens", lensId);
  }

  if (sortId && sortId !== "latest") {
    params.set("sort", sortId);
  }

  if (typeof pageIndex === "number" && pageIndex > 0) {
    params.set("page", String(pageIndex + 1));
  }

  const queryString = params.toString();

  return queryString ? `/MarketNews?${queryString}` : "/MarketNews";
}
