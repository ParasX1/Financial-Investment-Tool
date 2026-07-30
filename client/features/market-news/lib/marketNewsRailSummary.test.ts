import type { Article } from "@/services/news";
import type { MarketNewsTicker } from "../types";
import { buildMarketNewsRailSummary } from "./marketNewsRailSummary";

function article(
  id: string,
  relatedSymbols: readonly string[] = [],
): Article {
  return {
    id,
    image: null,
    provider: "google-news-rss",
    providerLabel: "Google News RSS",
    publishedAt: "2026-06-21T02:00:00Z",
    relatedSymbols: [...relatedSymbols],
    source: "Market Index",
    summary: "",
    title: `Story ${id}`,
    url: `https://example.com/${id}`,
  };
}

const tickers: MarketNewsTicker[] = [
  {
    change: "-82.40 -0.92%",
    label: "ASX 200",
    sparkline: [],
    symbol: "^AXJO",
    tone: "negative",
    value: "8,828.70",
  },
  {
    change: "+0.17 +0.10%",
    label: "CBA.AX",
    sparkline: [],
    symbol: "CBA.AX",
    tone: "positive",
    value: "162.40",
  },
];

describe("buildMarketNewsRailSummary", () => {
  it("summarises only ticker links that are present in the current stories", () => {
    const summary = buildMarketNewsRailSummary({
      articles: [
        article("one", ["CBA.AX", "^AXJO"]),
        article("two", ["CBA.AX"]),
        article("three", []),
      ],
      tickers,
      watchlistSymbols: ["CBA.AX", "NVDA"],
    });

    expect(summary.mentionedTickers).toEqual([
      expect.objectContaining({
        count: 2,
        inWatchlist: true,
        label: "CBA.AX",
        symbol: "CBA.AX",
      }),
      expect.objectContaining({
        count: 1,
        inWatchlist: false,
        label: "ASX 200",
        symbol: "^AXJO",
      }),
    ]);
    expect(summary.watchlistHitCount).toBe(1);
    expect(summary.watchlistStoryCount).toBe(2);
    expect(summary.watchlistTickers).toEqual([
      expect.objectContaining({
        count: 2,
        symbol: "CBA.AX",
      }),
    ]);
  });

  it("stays empty when the provider does not attach reliable ticker links", () => {
    const summary = buildMarketNewsRailSummary({
      articles: [article("one"), article("two")],
      tickers,
      watchlistSymbols: ["CBA.AX"],
    });

    expect(summary.mentionedTickers).toEqual([]);
    expect(summary.watchlistHitCount).toBe(0);
    expect(summary.watchlistStoryCount).toBe(0);
    expect(summary.watchlistTickers).toEqual([]);
  });

  it("keeps watchlist impact available even when the saved ticker is not in the top displayed mentions", () => {
    const summary = buildMarketNewsRailSummary({
      articles: [
        article("one", ["AAA", "BBB", "CCC", "DDD", "EEE", "FFF"]),
        article("two", ["AAA", "BBB", "CCC", "DDD", "EEE", "FFF"]),
        article("watch", ["WATCH.AX"]),
      ],
      tickers,
      watchlistSymbols: ["WATCH.AX"],
    });

    expect(summary.mentionedTickers).toHaveLength(6);
    expect(summary.mentionedTickers.map((ticker) => ticker.symbol)).not.toContain(
      "WATCH.AX",
    );
    expect(summary.watchlistTickers).toEqual([
      expect.objectContaining({
        symbol: "WATCH.AX",
      }),
    ]);
  });
});
