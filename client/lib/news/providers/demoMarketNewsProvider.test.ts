import { describe, expect, it } from "@jest/globals";
import { getDemoMarketNewsArticles } from "./demoMarketNewsProvider";

describe("demoMarketNewsProvider", () => {
  it("returns strict topic-specific demo articles for local development", () => {
    const articles = getDemoMarketNewsArticles({
      context: "technology sector AI software semiconductor stocks",
      kind: "industry",
      pageSize: "18",
      topicId: "technology",
    });

    expect(articles.length).toBeGreaterThan(0);
    expect(articles[0]).toMatchObject({
      provider: "demo",
      providerLabel: "Demo",
      source: "FIT Demo Desk",
    });
    expect(articles.map((article) => article.title).join(" ")).toContain("AI");
  });

  it("keeps same-topic demo stories as distinct articles", () => {
    const articles = getDemoMarketNewsArticles({
      context: "Australian household finance cost of living",
      kind: "search",
      pageSize: "18",
      query: "Australia cost of living inflation wages bills interest rates",
      topicId: "cost-of-living",
      userSearch: false,
    });

    expect(articles).toHaveLength(3);
    expect(new Set(articles.map((article) => article.url)).size).toBe(3);
  });

  it("keeps ticker demo drill-down scoped to the selected symbol", () => {
    expect(
      getDemoMarketNewsArticles({
        context: "CBA.AX company stock market news",
        kind: "ticker",
        pageSize: "18",
        ticker: "cba.ax",
      })[0],
    ).toMatchObject({
      relatedSymbols: ["CBA.AX"],
      title:
        "CBA.AX watch: latest portfolio-relevant headlines will appear here",
    });
  });
});
