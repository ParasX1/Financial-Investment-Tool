import type { Article, MarketNewsFetchResult } from "@/services/news";
import type { MarketNewsRequest } from "../types";
import {
  MARKET_NEWS_LOAD_ERROR,
  MARKET_NEWS_REFRESH_WARNING,
  beginMarketNewsArticleLoad,
  failMarketNewsArticleLoad,
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

function article(id: string): Article {
  return {
    id,
    image: null,
    publishedAt: "2026-06-21T04:00:00Z",
    source: "Market Desk",
    summary: "Market news summary",
    title: `Story ${id}`,
    url: `https://example.com/${id}`,
  };
}

function result(articles: Article[]): MarketNewsFetchResult {
  return {
    articles,
    meta: {
      attemptedProviders: ["google-news-rss"],
      provider: "google-news-rss",
      providerLabel: "Google News RSS",
      query: "cost of living",
      strictCategory: true,
      warnings: [],
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
});
