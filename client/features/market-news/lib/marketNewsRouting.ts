import type { ParsedUrlQuery } from "querystring";
import {
  MARKET_NEWS_MARKET_SCOPES,
  MARKET_NEWS_NAV_GROUPS,
} from "../data/marketNewsConfig";
import type {
  MarketNewsLensId,
  MarketNewsMarketScopeId,
  MarketNewsSortId,
  MarketNewsTopicId,
} from "../types";
import {
  defaultMarketNewsMarketScopeId,
  defaultMarketNewsTopicId,
} from "./marketNewsNavigation";

const MARKET_NEWS_LENS_IDS: readonly MarketNewsLensId[] = [
  "all",
  "watchlist",
  "ticker-linked",
  "high-relevance",
  "positive",
  "negative",
];

const MARKET_NEWS_SORT_IDS: readonly MarketNewsSortId[] = [
  "latest",
  "relevance",
  "watchlist-first",
];

const LEGACY_TOPIC_ALIASES: Readonly<Record<string, MarketNewsTopicId>> = {
  "money-news": "money",
};

function firstQueryValue(value: ParsedUrlQuery[string] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function validTopicId(value: string | undefined): MarketNewsTopicId {
  const topics = MARKET_NEWS_NAV_GROUPS.flatMap((group) => [...group.topics]);
  const normalizedValue = value
    ? (LEGACY_TOPIC_ALIASES[value] ?? value)
    : value;

  return (
    topics.find((topic) => topic.id === normalizedValue)?.id ??
    defaultMarketNewsTopicId
  );
}

function validMarketScopeId(
  value: string | undefined,
): MarketNewsMarketScopeId {
  return (
    MARKET_NEWS_MARKET_SCOPES.find((scope) => scope.id === value)?.id ??
    defaultMarketNewsMarketScopeId
  );
}

function validLensId(value: string | undefined): MarketNewsLensId {
  return MARKET_NEWS_LENS_IDS.find((lensId) => lensId === value) ?? "all";
}

function validSortId(value: string | undefined): MarketNewsSortId {
  return MARKET_NEWS_SORT_IDS.find((sortId) => sortId === value) ?? "latest";
}

export interface MarketNewsRouteState {
  lensId: MarketNewsLensId;
  marketScopeId: MarketNewsMarketScopeId;
  pageIndex: number;
  searchQuery: string;
  sortId: MarketNewsSortId;
  tickerSymbol: string;
  topicId: MarketNewsTopicId;
}

function parsePageIndex(value: string | undefined) {
  const pageNumber = Number(value);

  if (!Number.isInteger(pageNumber) || pageNumber < 1) return 0;

  return pageNumber - 1;
}

export function parseMarketNewsRouteQuery(
  query: ParsedUrlQuery,
): MarketNewsRouteState {
  const searchQuery = (firstQueryValue(query.q) ?? "").trim();
  const tickerSymbol = searchQuery
    ? ""
    : (firstQueryValue(query.quote) ?? "").trim().toUpperCase();

  return {
    lensId: validLensId(firstQueryValue(query.lens)),
    marketScopeId: validMarketScopeId(firstQueryValue(query.market)),
    pageIndex: parsePageIndex(firstQueryValue(query.page)),
    searchQuery,
    sortId: validSortId(firstQueryValue(query.sort)),
    tickerSymbol,
    topicId: validTopicId(firstQueryValue(query.topic)),
  };
}

export function getMarketNewsRouteHref({
  lensId,
  marketScopeId,
  pageIndex,
  searchQuery,
  sortId,
  tickerSymbol,
  topicId,
}: Partial<MarketNewsRouteState>) {
  const params = new URLSearchParams();
  const nextTopicId = topicId ?? defaultMarketNewsTopicId;
  const nextMarketScopeId = marketScopeId ?? defaultMarketNewsMarketScopeId;
  const nextSearchQuery = searchQuery?.trim() ?? "";
  const nextTickerSymbol = nextSearchQuery
    ? ""
    : (tickerSymbol?.trim().toUpperCase() ?? "");

  if (nextTopicId !== defaultMarketNewsTopicId) {
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
