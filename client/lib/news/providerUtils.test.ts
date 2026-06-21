import { describe, expect, it } from "@jest/globals";
import { dedupeArticles } from "./providerUtils";
import type { Article } from "@/services/news";

const baseArticle: Article = {
  id: "base",
  image: null,
  publishedAt: "2026-06-21T02:00:00Z",
  source: "Market Desk",
  summary: "",
  title: "Market headline",
  url: "https://example.com/base",
};

describe("providerUtils", () => {
  it("dedupes syndicated stories by canonical title as well as URL", () => {
    expect(
      dedupeArticles([
        {
          ...baseArticle,
          id: "mwm",
          source: "Michael West Media",
          title: "Oil and milk prices to spill the tea on inflation story - Michael West Media",
          url: "https://example.com/mwm",
        },
        {
          ...baseArticle,
          id: "yahoo",
          source: "Yahoo Finance Australia",
          title: "Oil and milk prices to spill the tea on inflation story - Yahoo Finance Australia",
          url: "https://example.com/yahoo",
        },
        {
          ...baseArticle,
          id: "unique",
          title: "Superannuation balances rise as retirees review tax settings",
          url: "https://example.com/unique",
        },
      ]).map((article) => article.id),
    ).toEqual(["mwm", "unique"]);
  });
});
