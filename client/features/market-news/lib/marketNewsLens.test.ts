import { describe, expect, it } from "@jest/globals";
import type { Article } from "@/services/news";
import {
  articleMatchesWatchlist,
  buildMarketNewsLensOptions,
  filterArticlesByLens,
} from "./marketNewsLens";

const articles: Article[] = [
  {
    id: "watchlist-risk",
    image: null,
    publishedAt: "2026-06-16T04:00:00Z",
    relatedSymbols: ["CBA.AX", "^AXJO"],
    source: "Market Desk",
    summary: "Mortgage pressure hits banks.",
    title: "Bank margins face household pressure",
    url: "https://example.com/banks",
  },
  {
    id: "ticker-upside",
    image: null,
    publishedAt: "2026-06-16T04:10:00Z",
    relatedSymbols: ["NVDA"],
    source: "Market Desk",
    summary: "AI demand lifts semis.",
    title: "AI demand supports semiconductor shares",
    url: "https://example.com/semis",
  },
  {
    id: "macro",
    image: null,
    publishedAt: "2026-06-16T04:20:00Z",
    relatedSymbols: [],
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
  });

  it("builds lens options with counts", () => {
    expect(
      buildMarketNewsLensOptions({
        articles,
        watchlistSymbols: ["CBA.AX"],
      }).map((option) => [option.id, option.count, option.selectable]),
    ).toEqual([
      ["all", 3, true],
      ["watchlist", 1, true],
      ["ticker-linked", 2, true],
    ]);
  });

  it("keeps All selectable but disables empty signal filters", () => {
    expect(
      buildMarketNewsLensOptions({
        articles: [articles[2]!],
        watchlistSymbols: ["CBA.AX"],
      }).map((option) => [option.id, option.count, option.selectable]),
    ).toEqual([
      ["all", 1, true],
      ["watchlist", 0, false],
      ["ticker-linked", 0, false],
    ]);
  });
});
