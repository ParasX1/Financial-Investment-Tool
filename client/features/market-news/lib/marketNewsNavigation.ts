import { MARKET_NEWS_NAV_GROUPS } from "../data/marketNewsConfig";
import type { MarketNewsMarketScope } from "@/lib/news/tickerStrip";
import type {
  MarketNewsGroupId,
  MarketNewsNavGroup,
  MarketNewsRequest,
  MarketNewsTopic,
  MarketNewsTopicId,
} from "../types";

export const defaultMarketNewsTopicId: MarketNewsTopicId =
  MARKET_NEWS_NAV_GROUPS[0]!.topics[0]!.id;

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

export function buildMarketNewsRequest(
  topic: MarketNewsTopic,
  searchQuery: string,
  tickerSymbol = "",
  _marketScope?: MarketNewsMarketScope,
): MarketNewsRequest {
  const cleanedSearch = searchQuery.trim();
  const cleanedTicker = tickerSymbol.trim().toUpperCase();

  if (cleanedSearch) {
    return {
      kind: "search",
      query: cleanedSearch,
      context: cleanedSearch,
      title: `Search results for "${cleanedSearch}"`,
      userSearch: true,
    };
  }

  if (cleanedTicker) {
    return {
      kind: "ticker",
      ticker: cleanedTicker,
      context: `${cleanedTicker} company stock market news`,
      title: `${cleanedTicker} News`,
    };
  }

  if (topic.source.kind === "regional") {
    return {
      kind: "regional",
      country: topic.source.country,
      context: topic.source.context,
      title: topic.label,
      topicId: topic.id,
    };
  }

  if (topic.source.kind === "industry") {
    return {
      kind: "industry",
      industry: topic.source.industry,
      context: topic.source.context,
      title: topic.label,
      topicId: topic.id,
    };
  }

  if (topic.source.kind === "commodity") {
    return {
      kind: "commodity",
      commodity: topic.source.commodity,
      context: topic.source.context,
      title: topic.label,
      topicId: topic.id,
    };
  }

  if (topic.source.kind === "search") {
    return {
      kind: "search",
      query: topic.source.query,
      context: topic.source.context,
      title: topic.label,
      topicId: topic.id,
      userSearch: false,
    };
  }

  return {
    kind: "general",
    context: topic.source.context,
    title: topic.label,
    topicId: topic.id,
  };
}
