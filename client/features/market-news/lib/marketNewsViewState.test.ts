import { describe, expect, it } from "@jest/globals";
import {
  applyMarketNewsLensChange,
  applyMarketNewsMarketScopeChange,
  applyMarketNewsQuoteLookup,
  applyMarketNewsQuoteReferenceChange,
  applyMarketNewsSearchClear,
  applyMarketNewsSearchSubmit,
  applyMarketNewsSortChange,
  applyMarketNewsTopicChange,
  deriveMarketNewsViewStateFromRoute,
  reconcileMarketNewsViewStateFromRoute,
  type MarketNewsViewState,
} from "./marketNewsViewState";

const baseState: MarketNewsViewState = {
  activeLensId: "ticker-linked",
  activeMarketScopeId: "australia",
  activeSortId: "relevance",
  activeTopicId: "cost-of-living",
  lookupDraft: "CBA.AX",
  quoteReferenceVisible: true,
  searchDraft: " asx 200 ",
  searchQuery: "",
  selectedSymbol: "CBA.AX",
  storyPageIndex: 3,
  tickerSymbol: "CBA.AX",
};

describe("marketNewsViewState", () => {
  it("derives route state without letting market scope become a news query", () => {
    expect(
      deriveMarketNewsViewStateFromRoute({
        lensId: "watchlist",
        marketScopeId: "us-markets",
        pageIndex: 2,
        searchQuery: "",
        sortId: "watchlist-first",
        tickerSymbol: "",
        topicId: "work",
      }),
    ).toMatchObject({
      activeMarketScopeId: "us-markets",
      activeTopicId: "work",
      searchQuery: "",
      selectedSymbol: "^GSPC",
      tickerSymbol: "",
      quoteReferenceVisible: false,
    });
  });

  it("uses the route quote as the selected symbol when opening ticker news", () => {
    expect(
      deriveMarketNewsViewStateFromRoute({
        lensId: "all",
        marketScopeId: "australia",
        pageIndex: 0,
        searchQuery: "",
        sortId: "latest",
        tickerSymbol: "NVDA",
        topicId: "technology",
      }),
    ).toMatchObject({
      activeMarketScopeId: "australia",
      activeTopicId: "technology",
      lookupDraft: "NVDA",
      selectedSymbol: "NVDA",
      tickerSymbol: "NVDA",
      quoteReferenceVisible: true,
    });
  });

  it("keeps local quote reference open across scan-only route changes", () => {
    expect(
      reconcileMarketNewsViewStateFromRoute(
        {
          ...baseState,
          quoteReferenceVisible: true,
          searchQuery: "",
          selectedSymbol: "NVDA",
          tickerSymbol: "",
        },
        {
          lensId: "high-relevance",
          marketScopeId: "us-markets",
          pageIndex: 1,
          searchQuery: "",
          sortId: "watchlist-first",
          tickerSymbol: "",
          topicId: "technology",
        },
      ),
    ).toMatchObject({
      activeLensId: "high-relevance",
      activeMarketScopeId: "us-markets",
      activeSortId: "watchlist-first",
      activeTopicId: "technology",
      quoteReferenceVisible: true,
      selectedSymbol: "NVDA",
      storyPageIndex: 1,
      tickerSymbol: "",
    });
  });

  it("preserves state identity when route reconciliation changes nothing", () => {
    const routeState = {
      lensId: "ticker-linked" as const,
      marketScopeId: "australia" as const,
      pageIndex: 3,
      searchQuery: "",
      sortId: "relevance" as const,
      tickerSymbol: "CBA.AX",
      topicId: "cost-of-living" as const,
    };
    const currentState = deriveMarketNewsViewStateFromRoute(routeState);

    expect(
      reconcileMarketNewsViewStateFromRoute(currentState, routeState),
    ).toBe(currentState);
  });

  it("uses route changes to leave ticker-news and search contexts explicitly", () => {
    expect(
      reconcileMarketNewsViewStateFromRoute(
        {
          ...baseState,
          quoteReferenceVisible: true,
          selectedSymbol: "NVDA",
          tickerSymbol: "NVDA",
        },
        {
          lensId: "all",
          marketScopeId: "australia",
          pageIndex: 0,
          searchQuery: "",
          sortId: "latest",
          tickerSymbol: "",
          topicId: "cost-of-living",
        },
      ),
    ).toMatchObject({
      quoteReferenceVisible: false,
      selectedSymbol: "^AORD",
      tickerSymbol: "",
    });

    expect(
      reconcileMarketNewsViewStateFromRoute(baseState, {
        lensId: "all",
        marketScopeId: "australia",
        pageIndex: 0,
        searchQuery: "inflation",
        sortId: "latest",
        tickerSymbol: "",
        topicId: "cost-of-living",
      }),
    ).toMatchObject({
      lookupDraft: "",
      quoteReferenceVisible: false,
      searchQuery: "inflation",
      selectedSymbol: "^AORD",
      tickerSymbol: "",
    });
  });

  it("keeps market scope changes limited to quote context unless ticker news is active", () => {
    expect(
      applyMarketNewsMarketScopeChange(
        {
          ...baseState,
          searchQuery: "inflation",
          tickerSymbol: "",
        },
        "us-markets",
      ),
    ).toMatchObject({
      activeMarketScopeId: "us-markets",
      searchQuery: "inflation",
      selectedSymbol: "^GSPC",
      tickerSymbol: "",
      quoteReferenceVisible: true,
    });

    expect(
      applyMarketNewsMarketScopeChange(baseState, "europe-markets"),
    ).toMatchObject({
      activeMarketScopeId: "europe-markets",
      searchQuery: "",
      selectedSymbol: "CBA.AX",
      tickerSymbol: "CBA.AX",
      quoteReferenceVisible: true,
    });
  });

  it("submits search as an independent user query and exits ticker mode", () => {
    expect(applyMarketNewsSearchSubmit(baseState)).toMatchObject({
      activeLensId: "all",
      searchDraft: " asx 200 ",
      searchQuery: "asx 200",
      storyPageIndex: 0,
      tickerSymbol: "",
      lookupDraft: "",
      quoteReferenceVisible: false,
    });
  });

  it("clears search and quote state without changing topic or market context", () => {
    expect(applyMarketNewsSearchClear(baseState)).toMatchObject({
      activeLensId: "all",
      activeMarketScopeId: "australia",
      activeTopicId: "cost-of-living",
      lookupDraft: "",
      searchDraft: "",
      searchQuery: "",
      storyPageIndex: 0,
      tickerSymbol: "",
      quoteReferenceVisible: false,
    });
  });

  it("quote lookup enters explicit ticker-news mode and clears search", () => {
    expect(applyMarketNewsQuoteLookup(baseState, " nvda ")).toMatchObject({
      activeLensId: "all",
      lookupDraft: "NVDA",
      searchDraft: "",
      searchQuery: "",
      selectedSymbol: "NVDA",
      storyPageIndex: 0,
      tickerSymbol: "NVDA",
      quoteReferenceVisible: true,
    });

    expect(applyMarketNewsQuoteLookup(baseState, "   ")).toBe(baseState);
  });

  it("quote reference selection does not change the active news query", () => {
    expect(
      applyMarketNewsQuoteReferenceChange(
        {
          ...baseState,
          quoteReferenceVisible: false,
          searchQuery: "inflation",
          tickerSymbol: "",
        },
        " nvda ",
      ),
    ).toMatchObject({
      lookupDraft: "NVDA",
      quoteReferenceVisible: true,
      searchQuery: "inflation",
      selectedSymbol: "NVDA",
      tickerSymbol: "",
    });

    expect(applyMarketNewsQuoteReferenceChange(baseState, "   ")).toBe(
      baseState,
    );
  });

  it("topic, lens, and sort changes reset only the state that should affect scanning", () => {
    expect(
      applyMarketNewsTopicChange(baseState, "personal-finance"),
    ).toMatchObject({
      activeLensId: "all",
      activeSortId: "relevance",
      activeTopicId: "personal-finance",
      lookupDraft: "",
      searchDraft: "",
      searchQuery: "",
      storyPageIndex: 0,
      tickerSymbol: "",
      quoteReferenceVisible: false,
    });

    expect(applyMarketNewsLensChange(baseState, "watchlist")).toMatchObject({
      activeLensId: "watchlist",
      activeSortId: "relevance",
      storyPageIndex: 0,
      tickerSymbol: "CBA.AX",
      quoteReferenceVisible: true,
    });

    expect(
      applyMarketNewsSortChange(baseState, "watchlist-first"),
    ).toMatchObject({
      activeLensId: "ticker-linked",
      activeSortId: "watchlist-first",
      storyPageIndex: 0,
      tickerSymbol: "CBA.AX",
      quoteReferenceVisible: true,
    });
  });

  it("keeps quote reference visibility when scan-only controls change", () => {
    const quoteReferenceState = {
      ...baseState,
      tickerSymbol: "",
      quoteReferenceVisible: true,
      selectedSymbol: "NVDA",
      lookupDraft: "NVDA",
    };

    expect(
      applyMarketNewsLensChange(quoteReferenceState, "watchlist"),
    ).toMatchObject({
      activeLensId: "watchlist",
      quoteReferenceVisible: true,
      selectedSymbol: "NVDA",
      tickerSymbol: "",
    });

    expect(
      applyMarketNewsSortChange(quoteReferenceState, "watchlist-first"),
    ).toMatchObject({
      activeSortId: "watchlist-first",
      quoteReferenceVisible: true,
      selectedSymbol: "NVDA",
      tickerSymbol: "",
    });
  });
});
