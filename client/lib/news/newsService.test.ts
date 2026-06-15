import { describe, expect, it, jest } from "@jest/globals";
import { fetchMarketNewsWithProviders } from "./newsService";
import type { NewsProvider, ServerNewsRequest } from "./types";

const request: ServerNewsRequest = {
  context: "Australian household finance cost of living",
  kind: "search",
  pageSize: "18",
  query: "Australia cost of living inflation wages bills interest rates",
};

function provider({
  articles,
  configured = true,
  id,
  label,
  rejects,
}: {
  articles: any[];
  configured?: boolean;
  id: "marketaux" | "newsapi";
  label: string;
  rejects?: boolean;
}): NewsProvider {
  return {
    id,
    label,
    isConfigured: () => configured,
    fetchArticles: jest.fn(async () => {
      if (rejects) throw new Error(`${label} down`);
      return articles;
    }),
  };
}

describe("fetchMarketNewsWithProviders", () => {
  it("tries same-request providers but does not fabricate broad fallback news", async () => {
    const result = await fetchMarketNewsWithProviders(request, {
      providers: [
        provider({ articles: [], id: "marketaux", label: "MarketAux" }),
        provider({ articles: [], id: "newsapi", label: "NewsAPI" }),
      ],
    });

    expect(result.articles).toEqual([]);
    expect(result.meta).toMatchObject({
      attemptedProviders: ["marketaux", "newsapi"],
      provider: "newsapi",
      providerLabel: "NewsAPI",
      strictCategory: true,
    });
  });

  it("prefers MarketAux and only falls back to NewsAPI when needed", async () => {
    const result = await fetchMarketNewsWithProviders(request, {
      providers: [
        provider({ articles: [], id: "marketaux", label: "MarketAux" }),
        provider({
          articles: [
            {
              id: "1",
              image: null,
              publishedAt: "2026-06-16T04:00:00Z",
              source: "Market Desk",
              summary: "Cost of living summary",
              title: "Cost of living pressure remains in focus",
              url: "https://example.com/story",
            },
          ],
          id: "newsapi",
          label: "NewsAPI",
        }),
      ],
    });

    expect(result.articles).toHaveLength(1);
    expect(result.meta).toMatchObject({
      attemptedProviders: ["marketaux", "newsapi"],
      provider: "newsapi",
      providerLabel: "NewsAPI",
    });
  });

  it("filters provider articles before accepting them for a strict category", async () => {
    const result = await fetchMarketNewsWithProviders(request, {
      providers: [
        provider({
          articles: [
            {
              id: "broad",
              image: null,
              publishedAt: "2026-06-16T04:00:00Z",
              source: "Market Desk",
              summary: "General market setup",
              title: "Weekly Commentary: Bubble Kings",
              url: "https://example.com/broad",
            },
          ],
          id: "marketaux",
          label: "MarketAux",
        }),
        provider({
          articles: [
            {
              id: "cost",
              image: null,
              publishedAt: "2026-06-16T04:00:00Z",
              source: "Market Desk",
              summary: "Mortgage pressure and grocery bills remain high.",
              title: "Household budgets stay under pressure",
              url: "https://example.com/cost",
            },
          ],
          id: "newsapi",
          label: "NewsAPI",
        }),
      ],
    });

    expect(result.meta.provider).toBe("newsapi");
    expect(result.meta.warnings[0]).toContain("strict");
    expect(result.articles.map((article) => article.id)).toEqual(["cost"]);
  });

  it("returns strict demo articles when no server provider key exists", async () => {
    const result = await fetchMarketNewsWithProviders(request, {
      env: {},
      providers: [
        provider({
          articles: [],
          configured: false,
          id: "marketaux",
          label: "MarketAux",
        }),
      ],
    });

    expect(result.articles.length).toBeGreaterThan(0);
    expect(result.articles[0]?.provider).toBe("demo");
    expect(result.meta.provider).toBe("demo");
    expect(result.meta.warnings[0]).toContain("Demo stories");
  });

  it("surfaces an error when every configured provider fails", async () => {
    await expect(
      fetchMarketNewsWithProviders(request, {
        providers: [
          provider({
            articles: [],
            id: "marketaux",
            label: "MarketAux",
            rejects: true,
          }),
        ],
      }),
    ).rejects.toThrow("Market news providers failed");
  });
});
