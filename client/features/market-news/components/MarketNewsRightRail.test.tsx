import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MARKET_NEWS_MARKET_SCOPES } from "../data/marketNewsConfig";
import { MarketNewsRightRail } from "./MarketNewsRightRail";

describe("MarketNewsRightRail", () => {
  it("avoids duplicating the active topic summary and labels ticker actions accurately", () => {
    const marketScope = MARKET_NEWS_MARKET_SCOPES[0]!;
    const html = renderToStaticMarkup(
      <MarketNewsRightRail
        authenticated={false}
        lookupDraft=""
        marketScope={marketScope}
        selectedTicker={marketScope.tickers[0]!}
        tickers={marketScope.tickers}
        watchlistLoading={false}
        watchlistSymbols={[]}
        onLookupDraftChange={() => undefined}
        onQuoteLookup={() => undefined}
      />,
    );

    expect(html).not.toContain("Focus");
    expect(html).not.toContain("Consumer prices and rates.");
    expect(html).not.toContain("Source Check");
    expect(html).toContain("Ticker shortcuts");
    expect(html).not.toContain("Trending Tickers");
  });
});
