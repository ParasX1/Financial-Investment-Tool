import type { MarketNewsTopicId } from "../types";

export const MARKET_NEWS_TOPIC_PAGE_SIZE = 12;
const NEXT_PAGE_SENTINEL_COUNT = 1;
const TOPIC_FEED_EXCLUDED_TOPIC_IDS: ReadonlySet<MarketNewsTopicId> = new Set();

export function isMarketNewsPagedTopic(topicId: MarketNewsTopicId) {
  return !TOPIC_FEED_EXCLUDED_TOPIC_IDS.has(topicId);
}

export function getMarketNewsFetchLimit(pageIndex: number) {
  const safePageIndex = Math.max(0, Math.floor(pageIndex));

  return (
    (safePageIndex + 1) * MARKET_NEWS_TOPIC_PAGE_SIZE +
    NEXT_PAGE_SENTINEL_COUNT
  );
}

export function getMarketNewsPageWindow<T>(
  items: readonly T[],
  pageIndex: number,
) {
  const safePageIndex = Math.max(0, Math.floor(pageIndex));
  const start = safePageIndex * MARKET_NEWS_TOPIC_PAGE_SIZE;
  const end = start + MARKET_NEWS_TOPIC_PAGE_SIZE;
  const pageItems = items.slice(start, end);

  return {
    end,
    hasNextPage: items.length > end,
    hasPreviousPage: safePageIndex > 0,
    items: pageItems,
    pageIndex: safePageIndex,
    start,
  };
}

export function clampMarketNewsPageIndex(
  pageIndex: number,
  itemCount: number,
) {
  const safeItemCount = Math.max(0, Math.floor(itemCount));
  const maxPageIndex = Math.max(
    0,
    Math.ceil(safeItemCount / MARKET_NEWS_TOPIC_PAGE_SIZE) - 1,
  );

  return Math.min(maxPageIndex, Math.max(0, Math.floor(pageIndex)));
}
