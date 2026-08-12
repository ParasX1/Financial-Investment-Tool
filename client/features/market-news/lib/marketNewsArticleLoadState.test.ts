import type { Article, MarketNewsFetchResult } from "@/lib/news/contracts";
import type { MarketNewsRequest } from "../types";
import {
  MARKET_NEWS_LOAD_ERROR,
  MARKET_NEWS_OLDER_LOAD_ERROR,
  MARKET_NEWS_REFRESH_WARNING,
  appendMarketNewsArticleLoad,
  beginMarketNewsArticleLoad,
  beginMarketNewsOlderLoad,
  failMarketNewsArticleLoad,
  failMarketNewsOlderLoad,
  initialMarketNewsArticleState,
  succeedMarketNewsArticleLoad,
} from "./marketNewsArticleLoadState";

const topicRequest: MarketNewsRequest = {
  context: "Australian household finance cost of living",
  kind: "search",
  query: "Australia cost of living inflation wages bills interest rates",
  title: "Cost of Living",
  topicId: "cost-of-living",
  userSearch: false,
};

const nextTopicRequest: MarketNewsRequest = {
  context: "technology sector AI software semiconductor stocks",
  industry: "technology",
  kind: "industry",
  title: "Technology",
  topicId: "technology",
};

function article(id: string, overrides: Partial<Article> = {}): Article {
  return {
    id,
    image: null,
    publishedAt: "2026-06-21T04:00:00Z",
    source: "Market Desk",
    summary: "Market news summary",
    title: `Story ${id}`,
    url: `https://example.com/${id}`,
    ...overrides,
  };
}

function result(
  articles: Article[],
  metaOverrides: Partial<MarketNewsFetchResult["meta"]> = {},
): MarketNewsFetchResult {
  return {
    articles,
    meta: {
      attemptedProviders: ["google-news-rss"],
      hasMore: true,
      nextCursor: "cursor-1",
      provider: "google-news-rss",
      providerLabel: "Google News RSS",
      query: "cost of living",
      strictCategory: true,
      warnings: [],
      ...metaOverrides,
    },
  };
}

describe("marketNewsArticleLoadState", () => {
  it("clears stale stories when loading a different request", () => {
    const previous = succeedMarketNewsArticleLoad(
      initialMarketNewsArticleState,
      topicRequest,
      result([article("cost")]),
    );

    const state = beginMarketNewsArticleLoad(previous, nextTopicRequest);

    expect(state.articles).toEqual([]);
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it("keeps same-request stories visible while refreshing", () => {
    const previous = succeedMarketNewsArticleLoad(
      initialMarketNewsArticleState,
      topicRequest,
      result([article("cost")]),
    );

    const state = beginMarketNewsArticleLoad(previous, topicRequest);

    expect(state.articles.map((item) => item.id)).toEqual(["cost"]);
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it("returns a stable user-facing failure state for initial load failures", () => {
    const state = failMarketNewsArticleLoad(
      initialMarketNewsArticleState,
      topicRequest,
    );

    expect(state.articles).toEqual([]);
    expect(state.error).toBe(MARKET_NEWS_LOAD_ERROR);
    expect(state.loading).toBe(false);
    expect(state.meta).toMatchObject({
      provider: "none",
      providerLabel: "Live provider unavailable",
      warnings: [MARKET_NEWS_LOAD_ERROR],
    });
  });

  it("keeps previous stories on same-request refresh failures", () => {
    const previous = succeedMarketNewsArticleLoad(
      initialMarketNewsArticleState,
      topicRequest,
      result([article("cost")]),
    );

    const state = failMarketNewsArticleLoad(previous, topicRequest);

    expect(state.articles.map((item) => item.id)).toEqual(["cost"]);
    expect(state.error).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.meta?.warnings[0]).toBe(MARKET_NEWS_REFRESH_WARNING);
  });

  it("immutably appends and dedupes an older batch", () => {
    const existing = article("existing");
    const previous = succeedMarketNewsArticleLoad(
      initialMarketNewsArticleState,
      topicRequest,
      result([existing]),
    );
    const previousArticles = previous.articles;
    const loading = beginMarketNewsOlderLoad(previous, topicRequest);

    expect(loading.loadingOlder).toBe(true);
    const state = appendMarketNewsArticleLoad(
      loading,
      topicRequest,
      result(
        [
          article("existing", { url: "https://example.com/id-duplicate" }),
          article("url-duplicate", { url: existing.url }),
          article("title-duplicate", {
            source: existing.source,
            title: existing.title,
          }),
          article("new"),
        ],
        { nextCursor: "cursor-2" },
      ),
    );

    expect(state.articles.map((item) => item.id)).toEqual(["existing", "new"]);
    expect(state.articles).not.toBe(previousArticles);
    expect(previous.articles).toBe(previousArticles);
    expect(previous.articles.map((item) => item.id)).toEqual(["existing"]);
    expect(state.loadingOlder).toBe(false);
    expect(state.olderError).toBeNull();
    expect(state.meta?.nextCursor).toBe("cursor-2");
  });

  it("ignores a late older response for a different request", () => {
    const previous = succeedMarketNewsArticleLoad(
      initialMarketNewsArticleState,
      nextTopicRequest,
      result([article("technology")]),
    );

    const state = appendMarketNewsArticleLoad(
      previous,
      topicRequest,
      result([article("late-cost-story")]),
    );

    expect(state).toBe(previous);
  });

  it("keeps loaded stories and exposes a retryable older-load error", () => {
    const previous = beginMarketNewsOlderLoad(
      succeedMarketNewsArticleLoad(
        initialMarketNewsArticleState,
        topicRequest,
        result([article("existing")]),
      ),
      topicRequest,
    );

    const state = failMarketNewsOlderLoad(previous, topicRequest);

    expect(state.articles.map((item) => item.id)).toEqual(["existing"]);
    expect(state.loadingOlder).toBe(false);
    expect(state.olderError).toBe(MARKET_NEWS_OLDER_LOAD_ERROR);
    expect(state.meta?.hasMore).toBe(true);
  });
});
