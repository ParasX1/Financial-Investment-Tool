import {
  MARKET_NEWS_MARKET_SCOPES,
  MARKET_NEWS_NAV_GROUPS,
} from "../data/marketNewsConfig";
import type {
  MarketNewsGroupId,
  MarketNewsMarketScope,
  MarketNewsMarketScopeId,
  MarketNewsNavGroup,
  MarketNewsRequest,
  MarketNewsTopic,
  MarketNewsTopicId,
} from "../types";

export const defaultMarketNewsTopicId: MarketNewsTopicId =
  MARKET_NEWS_NAV_GROUPS[0]!.topics[0]!.id;
export const defaultMarketNewsMarketScopeId: MarketNewsMarketScopeId =
  MARKET_NEWS_MARKET_SCOPES[0]!.id;

export function getMarketNewsTopics(
  groups: readonly MarketNewsNavGroup[] = MARKET_NEWS_NAV_GROUPS,
): MarketNewsTopic[] {
  return groups.flatMap((group) => [...group.topics]);
}

export function resolveMarketNewsTopic(
  topicId: string | null | undefined,
  groups: readonly MarketNewsNavGroup[] = MARKET_NEWS_NAV_GROUPS,
): MarketNewsTopic {
  return (
    getMarketNewsTopics(groups).find((topic) => topic.id === topicId) ??
    getMarketNewsTopics(groups).find(
      (topic) => topic.id === defaultMarketNewsTopicId,
    ) ??
    groups[0]!.topics[0]!
  );
}

export function getMarketNewsGroupForTopic(
  topicId: MarketNewsTopicId | string,
  groups: readonly MarketNewsNavGroup[] = MARKET_NEWS_NAV_GROUPS,
): MarketNewsNavGroup | undefined {
  return groups.find((group) =>
    group.topics.some((topic) => topic.id === topicId),
  );
}

export function getMarketNewsGroupIdForTopic(
  topicId: MarketNewsTopicId | string,
): MarketNewsGroupId {
  return (
    getMarketNewsGroupForTopic(topicId)?.id ?? MARKET_NEWS_NAV_GROUPS[0]!.id
  );
}

export function resolveMarketNewsMarketScope(
  scopeId: string | null | undefined,
  scopes: readonly MarketNewsMarketScope[] = MARKET_NEWS_MARKET_SCOPES,
): MarketNewsMarketScope {
  return (
    scopes.find((scope) => scope.id === scopeId) ??
    scopes.find((scope) => scope.id === defaultMarketNewsMarketScopeId) ??
    scopes[0]!
  );
}

export function buildMarketNewsRequest(
  topic: MarketNewsTopic,
  searchQuery: string,
  tickerSymbol = "",
  marketScope?: MarketNewsMarketScope,
): MarketNewsRequest {
  const cleanedSearch = searchQuery.trim();
  const cleanedTicker = tickerSymbol.trim().toUpperCase();
  const scopePrefix = marketScope
    ? `${marketScope.label} ${marketScope.description} ${marketScope.tickers
        .slice(0, 4)
        .map((ticker) => `${ticker.label} ${ticker.symbol}`)
        .join(" ")}`
    : "";
  const scopedContext = [scopePrefix, topic.source.context]
    .filter(Boolean)
    .join(" ");
  const scopedTitle =
    marketScope && marketScope.id !== defaultMarketNewsMarketScopeId
      ? `${topic.label} - ${marketScope.label}`
      : topic.label;
  const scopedQuery = (query: string) =>
    [marketScope?.label, query, scopePrefix].filter(Boolean).join(" ");

  if (cleanedSearch) {
    return {
      kind: "search",
      query: cleanedSearch,
      context: scopedContext || topic.source.context,
      title: `Search results for "${cleanedSearch}"`,
      marketScopeId: marketScope?.id,
      topicId: topic.id,
      userSearch: true,
    };
  }

  if (cleanedTicker) {
    return {
      kind: "ticker",
      ticker: cleanedTicker,
      context: `${cleanedTicker} company stock market news`,
      marketScopeId: marketScope?.id,
      title: `${cleanedTicker} News`,
      topicId: topic.id,
    };
  }

  if (topic.source.kind === "regional") {
    return {
      kind: "regional",
      country: topic.source.country,
      context: scopedContext || topic.source.context,
      marketScopeId: marketScope?.id,
      title: scopedTitle,
      topicId: topic.id,
    };
  }

  if (topic.source.kind === "industry") {
    return {
      kind: "industry",
      industry: topic.source.industry,
      context: scopedContext || topic.source.context,
      marketScopeId: marketScope?.id,
      title: scopedTitle,
      topicId: topic.id,
    };
  }

  if (topic.source.kind === "commodity") {
    return {
      kind: "commodity",
      commodity: topic.source.commodity,
      context: scopedContext || topic.source.context,
      marketScopeId: marketScope?.id,
      title: scopedTitle,
      topicId: topic.id,
    };
  }

  if (topic.source.kind === "search") {
    return {
      kind: "search",
      query: marketScope ? scopedQuery(topic.source.query) : topic.source.query,
      context: scopedContext || topic.source.context,
      marketScopeId: marketScope?.id,
      title: scopedTitle,
      topicId: topic.id,
      userSearch: false,
    };
  }

  return {
    kind: "general",
    context: scopedContext || topic.source.context,
    marketScopeId: marketScope?.id,
    title: scopedTitle,
    topicId: topic.id,
  };
}
