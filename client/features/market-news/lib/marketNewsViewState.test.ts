import { describe, expect, it } from "@jest/globals";
import {
  applyMarketNewsLensChange,
  applyMarketNewsMarketScopeChange,
  applyMarketNewsQuoteLookup,
  applyMarketNewsSearchClear,
  applyMarketNewsSearchSubmit,
  applyMarketNewsSortChange,
  applyMarketNewsTopicChange,
  deriveMarketNewsViewStateFromRoute,
  type MarketNewsViewState,
} from "./marketNewsViewState";

const baseState: MarketNewsViewState = {
  activeLensId: "ticker-linked",
  activeMarketScopeId: "australia",
  activeSortId: "relevance",
  activeTopicId: "cost-of-living",
  lookupDraft: "CBA.AX",
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
    });

    expect(
      applyMarketNewsMarketScopeChange(baseState, "europe-markets"),
    ).toMatchObject({
      activeMarketScopeId: "europe-markets",
      searchQuery: "",
      selectedSymbol: "CBA.AX",
      tickerSymbol: "CBA.AX",
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
    });

    expect(applyMarketNewsQuoteLookup(baseState, "   ")).toBe(baseState);
  });

  it("topic, lens, and sort changes reset only the state that should affect scanning", () => {
    expect(applyMarketNewsTopicChange(baseState, "money-news")).toMatchObject({
      activeLensId: "all",
      activeSortId: "relevance",
      activeTopicId: "money-news",
      lookupDraft: "",
      searchDraft: "",
      searchQuery: "",
      storyPageIndex: 0,
      tickerSymbol: "",
    });

    expect(applyMarketNewsLensChange(baseState, "watchlist")).toMatchObject({
      activeLensId: "watchlist",
      activeSortId: "relevance",
      storyPageIndex: 0,
      tickerSymbol: "CBA.AX",
    });

    expect(
      applyMarketNewsSortChange(baseState, "watchlist-first"),
    ).toMatchObject({
      activeLensId: "ticker-linked",
      activeSortId: "watchlist-first",
      storyPageIndex: 0,
      tickerSymbol: "CBA.AX",
    });
  });
});
