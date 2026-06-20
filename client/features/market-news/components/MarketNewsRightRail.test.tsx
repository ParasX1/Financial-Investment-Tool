import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MARKET_NEWS_MARKET_SCOPES } from "../data/marketNewsConfig";
import { MarketNewsRightRail } from "./MarketNewsRightRail";

describe("MarketNewsRightRail", () => {
  it("keeps quote snapshot actions separate from explicit ticker-news actions", () => {
    const marketScope = MARKET_NEWS_MARKET_SCOPES[0]!;
    const selectedTicker = marketScope.tickers[0]!;
    const html = renderToStaticMarkup(
      <MarketNewsRightRail
        authenticated={false}
        lookupDraft=""
        marketScope={marketScope}
        selectedTicker={selectedTicker}
        tickers={marketScope.tickers}
        watchlistLoading={false}
        watchlistSymbols={[]}
        onLookupDraftChange={() => undefined}
        onQuoteReferenceChange={() => undefined}
        onTickerNewsRequest={() => undefined}
      />,
    );

    expect(html).not.toContain("Focus");
    expect(html).not.toContain("Consumer prices and rates.");
    expect(html).not.toContain("Source Check");
    expect(html).toContain("Quote snapshots");
    expect(html).toContain("Select quote");
    expect(html).toContain("Show ticker news");
    expect(html).not.toContain("Continue In FIT");
    expect(html).not.toContain("Trending Tickers");
  });
});
