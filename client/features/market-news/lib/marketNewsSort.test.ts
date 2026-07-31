import { describe, expect, it } from "@jest/globals";
import type { Article } from "@/lib/news/contracts";
import { sortMarketNewsArticles } from "./marketNewsSort";

function article(
  id: string,
  overrides: Partial<Article> = {},
): Article {
  return {
    id,
    provider: "demo",
    providerLabel: "Demo",
    publishedAt: "2026-06-01T00:00:00.000Z",
    relatedSymbols: [],
    source: "Source",
    summary: "",
    title: id,
    url: `#${id}`,
    ...overrides,
  };
}

describe("marketNewsSort", () => {
  it("orders latest stories by published time without mutating the input", () => {
    const articles = [
      article("old", { publishedAt: "2026-05-01T00:00:00.000Z" }),
      article("new", { publishedAt: "2026-06-01T00:00:00.000Z" }),
    ];

    expect(
      sortMarketNewsArticles({
        articles,
        sortId: "latest",
        watchlistSymbols: [],
      }).map((item) => item.id),
    ).toEqual(["new", "old"]);
    expect(articles.map((item) => item.id)).toEqual(["old", "new"]);
  });

  it("puts watchlist-linked stories first without hiding the rest", () => {
    const articles = [
      article("market", {
        publishedAt: "2026-06-03T00:00:00.000Z",
      }),
      article("watchlist", {
        publishedAt: "2026-06-01T00:00:00.000Z",
        relatedSymbols: ["CBA.AX"],
      }),
      article("ticker", {
        publishedAt: "2026-06-02T00:00:00.000Z",
        relatedSymbols: ["NVDA"],
      }),
    ];

    expect(
      sortMarketNewsArticles({
        articles,
        sortId: "watchlist-first",
        watchlistSymbols: ["cba.ax"],
      }).map((item) => item.id),
    ).toEqual(["watchlist", "ticker", "market"]);
  });
});
