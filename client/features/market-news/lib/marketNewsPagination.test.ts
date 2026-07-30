import { describe, expect, it } from "@jest/globals";
import {
  MARKET_NEWS_TOPIC_PAGE_SIZE,
  clampMarketNewsPageIndex,
  getMarketNewsFetchLimit,
  getMarketNewsPageWindow,
} from "./marketNewsPagination";

describe("marketNewsPagination", () => {
  it("requests one extra story per page to detect whether the next page exists", () => {
    expect(MARKET_NEWS_TOPIC_PAGE_SIZE).toBe(12);
    expect(getMarketNewsFetchLimit(0)).toBe(13);
    expect(getMarketNewsFetchLimit(1)).toBe(25);
    expect(getMarketNewsFetchLimit(2)).toBe(37);
  });

  it("returns the visible page window without leaking the next-page sentinel story", () => {
    const articles = Array.from({ length: 25 }, (_, index) => ({
      id: `article-${index + 1}`,
    }));

    expect(getMarketNewsPageWindow(articles, 0).items).toHaveLength(12);
    expect(getMarketNewsPageWindow(articles, 0).items.at(-1)?.id).toBe(
      "article-12",
    );
    expect(getMarketNewsPageWindow(articles, 0).hasNextPage).toBe(true);

    expect(getMarketNewsPageWindow(articles, 1).items[0]?.id).toBe(
      "article-13",
    );
    expect(getMarketNewsPageWindow(articles, 1).items.at(-1)?.id).toBe(
      "article-24",
    );
    expect(getMarketNewsPageWindow(articles, 1).hasNextPage).toBe(true);

    expect(getMarketNewsPageWindow(articles, 2).items).toEqual([
      { id: "article-25" },
    ]);
    expect(getMarketNewsPageWindow(articles, 2).hasNextPage).toBe(false);
  });

  it("clamps the active page when a filter leaves fewer visible articles", () => {
    expect(clampMarketNewsPageIndex(2, 5)).toBe(0);
    expect(clampMarketNewsPageIndex(2, 25)).toBe(2);
    expect(clampMarketNewsPageIndex(-1, 25)).toBe(0);
  });
});
