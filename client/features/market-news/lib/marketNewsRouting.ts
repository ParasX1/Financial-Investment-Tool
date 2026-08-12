import type { ParsedUrlQuery } from "querystring";
import { MARKET_NEWS_NAV_GROUPS } from "../data/marketNewsConfig";
import {
  MARKET_NEWS_MARKET_SCOPES,
  defaultMarketNewsMarketScopeId,
} from "@/lib/news/tickerStrip";
import type {
  MarketNewsLensId,
  MarketNewsMarketScopeId,
  MarketNewsSortId,
  MarketNewsTopicId,
} from "../types";
import { defaultMarketNewsTopicId } from "./marketNewsNavigation";

const MARKET_NEWS_LENS_IDS: readonly MarketNewsLensId[] = [
  "all",
  "watchlist",
  "ticker-linked",
];

const MARKET_NEWS_SORT_IDS: readonly MarketNewsSortId[] = [
  "latest",
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
