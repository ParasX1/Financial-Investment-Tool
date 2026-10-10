import type { NewsResponseMeta } from "@/lib/news/contracts";
import { MARKET_NEWS_LOAD_ERROR } from "./marketNewsArticleLoadState";
import { resolveMarketNewsTopic } from "./marketNewsNavigation";
import { buildMarketNewsDisplayState } from "./marketNewsDisplayState";
import type { MarketNewsLensOption, MarketNewsRequest } from "../types";

const costOfLivingTopic = resolveMarketNewsTopic("cost-of-living");

const allLens: MarketNewsLensOption = {
  count: 12,
  description: "Every headline that matched this topic or search.",
  id: "all",
  label: "All",
  selectable: true,
};

const tickerLens: MarketNewsLensOption = {
  count: 0,
  description: "Stories with market symbols attached.",
  id: "ticker-linked",
  label: "Ticker stories",
  selectable: false,
};

const topicRequest: MarketNewsRequest = {
  context: "Australian household finance cost of living",
  kind: "search",
  query: "Australia cost of living inflation wages bills interest rates",
  title: "Cost of Living",
  topicId: "cost-of-living",
  userSearch: false,
};

function meta(overrides: Partial<NewsResponseMeta> = {}): NewsResponseMeta {
  return {
    attemptedProviders: ["google-news-rss"],
    hasMore: true,
    nextCursor: "cursor-1",
    provider: "google-news-rss",
    providerLabel: "Google News RSS",
    query: "Australia cost of living inflation wages bills interest rates",
    strictCategory: true,
    warnings: [],
    ...overrides,
  };
}

describe("marketNewsDisplayState", () => {
  it("keeps normal topic context focused on the selected editorial category", () => {
    const state = buildMarketNewsDisplayState({
      activeLens: allLens,
      activeTopic: costOfLivingTopic,
      articleCount: 12,
      loading: false,
      meta: meta(),
      request: topicRequest,
      searchQuery: "",
      tickerSymbol: "",
      visibleArticleCount: 12,
    });

    expect(state.title).toBe("Cost of Living");
    expect(state.eyebrow).toBe("Household pressure");
    expect(state.summary).toBe(costOfLivingTopic.description);
    expect(state.coverageNotice).toBeUndefined();
    expect(state.providerWarning).toBeUndefined();
  });

  it("treats user search as a direct search rather than a category subsection", () => {
    const state = buildMarketNewsDisplayState({
      activeLens: allLens,
      activeTopic: costOfLivingTopic,
      articleCount: 0,
      loading: false,
      meta: meta({ query: "asx 200" }),
      request: {
        context: "asx 200",
        kind: "search",
        query: "asx 200",
        title: 'Search results for "asx 200"',
        userSearch: true,
      },
      searchQuery: "asx 200",
      tickerSymbol: "",
      visibleArticleCount: 0,
    });

    expect(state.title).toBe('Search results for "asx 200"');
    expect(state.eyebrow).toBe("Market search");
    expect(state.summary).toBe('Showing market news results for "asx 200".');
    expect(state.emptyState.title).toBe(
      'No Search results for "asx 200" stories found',
    );
    expect(state.emptyState.detail).toBe("Query checked: asx 200");
  });

  it("uses broader coverage language only when provider metadata says the match is not strict", () => {
    const state = buildMarketNewsDisplayState({
      activeLens: allLens,
      activeTopic: costOfLivingTopic,
      articleCount: 4,
      loading: false,
      meta: meta({
        strictCategory: false,
        warnings: [
          "Yahoo Finance RSS: showing broad finance headlines because this free feed does not expose exact FIT categories.",
        ],
      }),
      request: topicRequest,
      searchQuery: "",
      tickerSymbol: "",
      visibleArticleCount: 4,
    });

    expect(state.title).toBe("Broad finance headlines");
    expect(state.summary).toContain("broader finance headlines");
    expect(state.coverageNotice).toContain(
      "exact category coverage is limited",
    );
    expect(state.providerWarning).toContain("Yahoo Finance RSS");
  });

  it("prioritizes filter empty state when articles exist but the selected lens has no matches", () => {
    const state = buildMarketNewsDisplayState({
      activeLens: tickerLens,
      activeTopic: costOfLivingTopic,
      articleCount: 10,
      loading: false,
      meta: meta(),
      request: topicRequest,
      searchQuery: "",
      tickerSymbol: "",
      visibleArticleCount: 0,
    });

    expect(state.emptyState.title).toBe("No ticker stories in this view");
    expect(state.emptyState.message).toContain("Switch back to All");
    expect(state.emptyState.detail).toBe(tickerLens.description);
  });

  it("keeps failed provider state explicit before traders rely on the page", () => {
    const state = buildMarketNewsDisplayState({
      activeLens: allLens,
      activeTopic: costOfLivingTopic,
      articleCount: 0,
      loading: false,
      meta: meta({
        provider: "none",
        providerLabel: "Live provider unavailable",
        warnings: [MARKET_NEWS_LOAD_ERROR],
      }),
      request: topicRequest,
      searchQuery: "",
      tickerSymbol: "",
      visibleArticleCount: 0,
    });

    expect(state.emptyState.title).toBe("Live market news is not connected");
    expect(state.emptyState.detail).toBe(MARKET_NEWS_LOAD_ERROR);
  });
});
