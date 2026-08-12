import { describe, expect, it } from "@jest/globals";
import { formatArticleTime, getSafeArticleHref } from "./marketNewsArticles";

describe("marketNewsArticles", () => {
  it("formats article time with a stable Australia/Sydney locale", () => {
    expect(formatArticleTime("2026-06-16T04:00:00.000Z")).toBe("16 Jun, 14:00");
  });

  it("falls back for invalid article dates", () => {
    expect(formatArticleTime("not-a-date")).toBe("Recently");
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
});
