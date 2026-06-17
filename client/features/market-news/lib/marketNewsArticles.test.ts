import { describe, expect, it } from "@jest/globals";
import {
  formatArticleTime,
  getArticleDomain,
  getArticleInvestorCues,
  getSafeArticleHref,
} from "./marketNewsArticles";

describe("marketNewsArticles", () => {
  it("formats article time with a stable Australia/Sydney locale", () => {
    expect(formatArticleTime("2026-06-16T04:00:00.000Z")).toBe("16 Jun, 14:00");
  });

  it("falls back for invalid article dates", () => {
    expect(formatArticleTime("not-a-date")).toBe("Recently");
  });

  it("normalizes article source domains", () => {
    expect(getArticleDomain("https://www.example.com/markets/story")).toBe(
      "example.com",
    );
  });

  it("only allows http, https, and demo hash article links", () => {
    expect(getSafeArticleHref("https://example.com/story")).toBe(
      "https://example.com/story",
    );
    expect(getSafeArticleHref("http://example.com/story")).toBe(
      "http://example.com/story",
    );
    expect(getSafeArticleHref("#demo-market-news-cost")).toBe(
      "#demo-market-news-cost",
    );
    expect(getSafeArticleHref("javascript:alert(1)")).toBe(
      "#market-news-main",
    );
    expect(getSafeArticleHref("not a url")).toBe("#market-news-main");
  });

  it("derives compact investor cues from news metadata and headline text", () => {
    expect(
      getArticleInvestorCues(
        {
          id: "rates",
          image: null,
          publishedAt: "2026-06-16T23:00:00Z",
          relatedSymbols: ["CBA.AX"],
          sentiment: "negative",
          source: "Market Desk",
          summary: "RBA inflation pressure affects bank margins.",
          title: "Interest rates pressure ASX banks",
          url: "https://example.com/rates",
        },
        new Date("2026-06-17T01:00:00Z"),
      ),
    ).toEqual(["Fresh", "Ticker-linked", "Risk"]);

    expect(
      getArticleInvestorCues(
        {
          id: "macro",
          image: null,
          publishedAt: "2026-06-10T01:00:00Z",
          relatedSymbols: [],
          source: "Market Desk",
          summary: "Inflation and wages shape household budgets.",
          title: "RBA watches inflation and wages",
          url: "https://example.com/macro",
        },
        new Date("2026-06-17T01:00:00Z"),
      ),
    ).toEqual(["Rate-sensitive", "Macro"]);
  });
});
