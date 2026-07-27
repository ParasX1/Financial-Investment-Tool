import { describe, expect, it } from "@jest/globals";
import {
  getMarketNewsRouteHref,
  parseMarketNewsRouteQuery,
} from "./marketNewsRouting";

describe("marketNewsRouting", () => {
  it("parses valid route state and normalizes ticker lookup state", () => {
    expect(
      parseMarketNewsRouteQuery({
        lens: "ticker-linked",
        market: "us-markets",
        quote: " cba.ax ",
        sort: "relevance",
        topic: "technology",
      }),
    ).toEqual({
      lensId: "ticker-linked",
      marketScopeId: "us-markets",
      pageIndex: 0,
      searchQuery: "",
      sortId: "relevance",
      tickerSymbol: "CBA.AX",
      topicId: "technology",
    });
  });

  it("lets explicit search override quote state in the route", () => {
    expect(
      parseMarketNewsRouteQuery({
        q: " asx 200 ",
        quote: "NVDA",
        topic: "cost-of-living",
      }),
    ).toMatchObject({
      pageIndex: 0,
      searchQuery: "asx 200",
      sortId: "latest",
      tickerSymbol: "",
      topicId: "cost-of-living",
    });
  });

  it("falls back to default state for invalid route values", () => {
    expect(
      parseMarketNewsRouteQuery({
        lens: "not-a-lens",
        market: "not-a-market",
        topic: "not-a-topic",
      }),
    ).toEqual({
      lensId: "all",
      marketScopeId: "australia",
      pageIndex: 0,
      searchQuery: "",
      sortId: "latest",
      tickerSymbol: "",
      topicId: "top-stories",
    });
  });

  it("maps the retired Money News route to the complete Money overview", () => {
    expect(parseMarketNewsRouteQuery({ topic: "money-news" }).topicId).toBe("money");
  });

  it("serializes only meaningful state into shareable Market News URLs", () => {
    expect(
      getMarketNewsRouteHref({
        lensId: "watchlist",
        marketScopeId: "europe-markets",
        pageIndex: 2,
        searchQuery: "RBA rates",
        sortId: "watchlist-first",
        tickerSymbol: "NVDA",
        topicId: "personal-finance",
      }),
    ).toBe(
      "/MarketNews?topic=personal-finance&market=europe-markets&q=RBA+rates&lens=watchlist&sort=watchlist-first&page=3",
    );

    expect(getMarketNewsRouteHref({})).toBe("/MarketNews");
  });
});
