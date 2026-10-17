export const MARKET_NEWS_TOPIC_PAGE_SIZE = 12;
export const MARKET_NEWS_TOPIC_RESULT_POOL_SIZE =
  MARKET_NEWS_TOPIC_PAGE_SIZE * 6;

export function getMarketNewsFetchLimit(_pageIndex: number) {
  return MARKET_NEWS_TOPIC_RESULT_POOL_SIZE;
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

export function clampMarketNewsPageIndex(pageIndex: number, itemCount: number) {
  const safeItemCount = Math.max(0, Math.floor(itemCount));
  const maxPageIndex = Math.max(
    0,
    Math.ceil(safeItemCount / MARKET_NEWS_TOPIC_PAGE_SIZE) - 1,
  );

  return Math.min(maxPageIndex, Math.max(0, Math.floor(pageIndex)));
}
