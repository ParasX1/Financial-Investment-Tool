import { describe, expect, it } from "@jest/globals";
import { DEFAULT_MARKET_NEWS_TOPIC_ID } from "@/lib/news/catalog";
import { getMarketNewsRouteHref } from "./marketNews";

describe("getMarketNewsRouteHref", () => {
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

    expect(
      getMarketNewsRouteHref({ topicId: DEFAULT_MARKET_NEWS_TOPIC_ID }),
    ).toBe("/MarketNews");
  });

  it("prefers search text over ticker quote and normalizes quote casing", () => {
    expect(
      getMarketNewsRouteHref({
        searchQuery: "  inflation  ",
        tickerSymbol: "msft",
      }),
    ).toBe("/MarketNews?q=inflation");

    expect(
      getMarketNewsRouteHref({
        tickerSymbol: "msft",
      }),
    ).toBe("/MarketNews?quote=MSFT");
  });
});
