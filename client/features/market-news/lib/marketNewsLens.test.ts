import { describe, expect, it } from "@jest/globals";
import type { Article } from "@/services/news";
import {
  articleMatchesWatchlist,
  buildMarketNewsLensOptions,
  filterArticlesByLens,
} from "./marketNewsLens";

const articles: Article[] = [
  {
    confidence: 0.91,
    id: "watchlist-risk",
    image: null,
    publishedAt: "2026-06-16T04:00:00Z",
    relatedSymbols: ["CBA.AX", "^AXJO"],
    sentiment: "negative",
    source: "Market Desk",
    summary: "Mortgage pressure hits banks.",
    title: "Bank margins face household pressure",
    url: "https://example.com/banks",
  },
  {
    confidence: 0.5,
    id: "ticker-upside",
    image: null,
    publishedAt: "2026-06-16T04:10:00Z",
    relatedSymbols: ["NVDA"],
    sentiment: "positive",
    source: "Market Desk",
    summary: "AI demand lifts semis.",
    title: "AI demand supports semiconductor shares",
    url: "https://example.com/semis",
  },
  {
    confidence: null,
    id: "macro",
    image: null,
    publishedAt: "2026-06-16T04:20:00Z",
    relatedSymbols: [],
    sentiment: "neutral",
    source: "Market Desk",
    summary: "Macro overview.",
    title: "Global investors assess rates",
    url: "https://example.com/macro",
  },
];

describe("marketNewsLens", () => {
  it("matches watchlist symbols case-insensitively", () => {
    expect(articleMatchesWatchlist(articles[0]!, ["cba.ax"])).toBe(true);
    expect(articleMatchesWatchlist(articles[1]!, ["cba.ax"])).toBe(false);
  });

  it("filters articles by trader lens", () => {
    expect(
      filterArticlesByLens({
        articles,
        lensId: "watchlist",
        watchlistSymbols: ["CBA.AX"],
      }).map((article) => article.id),
    ).toEqual(["watchlist-risk"]);

    expect(
      filterArticlesByLens({
        articles,
        lensId: "ticker-linked",
        watchlistSymbols: [],
      }).map((article) => article.id),
    ).toEqual(["watchlist-risk", "ticker-upside"]);

    expect(
      filterArticlesByLens({
        articles,
        lensId: "high-relevance",
        watchlistSymbols: [],
      }).map((article) => article.id),
    ).toEqual(["watchlist-risk"]);
  });

  it("builds lens options with counts", () => {
    expect(
      buildMarketNewsLensOptions({
        articles,
        watchlistSymbols: ["CBA.AX"],
      }).map((option) => [option.id, option.count]),
    ).toEqual([
      ["all", 3],
      ["watchlist", 1],
      ["ticker-linked", 2],
      ["high-relevance", 1],
      ["negative", 1],
      ["positive", 1],
    ]);
  });
});
