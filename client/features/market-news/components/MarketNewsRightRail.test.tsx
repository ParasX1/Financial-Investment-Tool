import * as React from "react";
import { describe, expect, it } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";
import { MARKET_NEWS_MARKET_SCOPES } from "../data/marketNewsConfig";
import { MarketNewsRightRail } from "./MarketNewsRightRail";

describe("MarketNewsRightRail", () => {
  it("shows feed context without opening quote reference by default", () => {
    const marketScope = MARKET_NEWS_MARKET_SCOPES[0]!;
    const html = renderToStaticMarkup(
      <MarketNewsRightRail
        authenticated
        lookupDraft=""
        railSummary={{
          mentionedTickers: [
            {
              change: "+0.17 +0.10%",
              count: 2,
              inWatchlist: true,
              label: "CBA.AX",
              symbol: "CBA.AX",
              tone: "positive",
              value: "162.40",
            },
          ],
          totalLinkedStoryCount: 2,
          watchlistHitCount: 1,
          watchlistStoryCount: 2,
          watchlistTickers: [
            {
              change: "+0.17 +0.10%",
              count: 2,
              inWatchlist: true,
              label: "CBA.AX",
              symbol: "CBA.AX",
              tone: "positive",
              value: "162.40",
            },
          ],
        }}
        selectedTicker={null}
        watchlistError={null}
        watchlistLoading={false}
        watchlistSymbols={["CBA.AX"]}
        onLookupDraftChange={() => undefined}
        onQuoteReferenceChange={() => undefined}
        onTickerNewsRequest={() => undefined}
      />,
    );

    expect(html).not.toContain("Focus");
    expect(html).not.toContain("Consumer prices and rates.");
    expect(html).not.toContain("Source Check");
    expect(html).toContain("Watchlist impact");
    expect(html).toContain("Mentioned tickers");
    expect(html).toContain("2 shown");
    expect(html).toContain("CBA.AX");
    expect(html).toContain("Inspect quote");
    expect(html).not.toContain("Quote reference");
    expect(html).not.toContain("Show ticker news");
    expect(html).not.toContain("Continue In FIT");
    expect(html).not.toContain("Trending Tickers");
  });

  it("shows quote reference only after a ticker is explicitly selected", () => {
    const marketScope = MARKET_NEWS_MARKET_SCOPES[0]!;
    const selectedTicker = marketScope.tickers[1]!;
    const html = renderToStaticMarkup(
      <MarketNewsRightRail
        authenticated={false}
        lookupDraft="^AXJO"
        railSummary={{
          mentionedTickers: [],
          totalLinkedStoryCount: 0,
          watchlistHitCount: 0,
          watchlistStoryCount: 0,
          watchlistTickers: [],
        }}
        selectedTicker={selectedTicker}
        watchlistError={null}
        watchlistLoading={false}
        watchlistSymbols={[]}
        onLookupDraftChange={() => undefined}
        onQuoteReferenceChange={() => undefined}
        onTickerNewsRequest={() => undefined}
      />,
    );

    expect(html).toContain("Quote reference");
    expect(html).toContain(selectedTicker.symbol);
    expect(html).toContain("Show ticker news");
    expect(html).toContain("Quote context only");
  });

  it("makes a failed Watchlist integration explicit instead of showing an empty result", () => {
    const html = renderToStaticMarkup(
      <MarketNewsRightRail
        authenticated
        lookupDraft=""
        railSummary={{
          mentionedTickers: [],
          totalLinkedStoryCount: 0,
          watchlistHitCount: 0,
          watchlistStoryCount: 0,
          watchlistTickers: [],
        }}
        selectedTicker={null}
        watchlistError="Saved tickers could not be loaded. Watchlist news may be incomplete."
        watchlistLoading={false}
        watchlistSymbols={[]}
        onLookupDraftChange={() => undefined}
        onQuoteReferenceChange={() => undefined}
        onTickerNewsRequest={() => undefined}
      />,
    );

    expect(html).toContain("Saved tickers could not be loaded");
    expect(html).not.toContain("No watchlist tickers are linked");
  });
});
