import { describe, expect, it, jest } from "@jest/globals";
import {
  fetchMarketNewsWithProviders,
  resolveNewsProviders,
} from "./newsService";
import type { NewsProvider, NewsProviderId, ServerNewsRequest } from "./types";

const request: ServerNewsRequest = {
  context: "Australian household finance cost of living",
  kind: "search",
  pageSize: "18",
  query: "Australia cost of living inflation wages bills interest rates",
};

function provider({
  articles,
  broadFallback,
  configured = true,
  id,
  label,
  rejects,
}: {
  articles: any[];
  configured?: boolean;
  id: Exclude<NewsProviderId, "demo">;
  label: string;
  broadFallback?: boolean;
  rejects?: boolean;
}): NewsProvider {
  return {
    allowBroadFallback: broadFallback
      ? (request) => !request.userSearch && request.kind !== "ticker"
      : undefined,
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
  it("resolves provider order from env without leaking provider details into callers", () => {
    expect(
      resolveNewsProviders({
        NEWS_PROVIDER_ORDER: "google-rss, gdelt, marketaux, google-rss, unknown",
      }).map((resolvedProvider) => resolvedProvider.id),
    ).toEqual(["google-news-rss", "gdelt", "marketaux"]);
  });

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

  it("fills a partial strict provider result with later strict providers", async () => {
    const result = await fetchMarketNewsWithProviders(
      { ...request, pageSize: "2" },
      {
        providers: [
          provider({
            articles: [
              {
                id: "marketaux-cost",
                image: null,
                publishedAt: "2026-06-16T04:00:00Z",
                source: "Market Desk",
                summary: "Mortgage pressure remains high.",
                title: "Cost of living pressure stays in focus",
                url: "https://example.com/marketaux-cost",
              },
            ],
            id: "marketaux",
            label: "MarketAux",
          }),
          provider({
            articles: [
              {
                id: "gdelt-cost",
                image: null,
                provider: "gdelt",
                providerLabel: "GDELT",
                publishedAt: "2026-06-16T04:10:00Z",
                source: "example.com",
                summary: "Household bills and inflation remain visible.",
                title: "Inflation keeps household budgets under pressure",
                url: "https://example.com/gdelt-cost",
              },
            ],
            id: "gdelt",
            label: "GDELT",
          }),
        ],
      },
    );

    expect(result.articles.map((article) => article.id)).toEqual([
      "marketaux-cost",
      "gdelt-cost",
    ]);
    expect(result.meta).toMatchObject({
      attemptedProviders: ["marketaux", "gdelt"],
      provider: "marketaux",
      providerLabel: "MarketAux + GDELT",
      strictCategory: true,
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

  it("falls back to development RSS after a GDELT outage without leaving strict category mode", async () => {
    const result = await fetchMarketNewsWithProviders(request, {
      providers: [
        provider({
          articles: [],
          id: "gdelt",
          label: "GDELT",
          rejects: true,
        }),
        provider({
          articles: [
            {
              id: "google-cost",
              image: null,
              provider: "google-news-rss",
              providerLabel: "Google News RSS",
              publishedAt: "2026-06-16T04:00:00Z",
              source: "Yahoo Finance Australia",
              summary: "Mortgage pressure and grocery bills remain high.",
              title: "Cost of living pressure hits household budgets",
              url: "https://news.google.com/rss/articles/cost",
            },
          ],
          id: "google-news-rss",
          label: "Google News RSS",
        }),
      ],
    });

    expect(result.articles.map((article) => article.id)).toEqual(["google-cost"]);
    expect(result.meta).toMatchObject({
      provider: "google-news-rss",
      providerLabel: "Google News RSS",
      strictCategory: true,
    });
    expect(result.meta.warnings[0]).toContain("GDELT down");
  });

  it("does not let broad fallback preempt later strict providers", async () => {
    const result = await fetchMarketNewsWithProviders(request, {
      providers: [
        provider({
          articles: [
            {
              id: "yahoo-broad",
              image: null,
              provider: "yahoo-finance-rss",
              providerLabel: "Yahoo Finance RSS",
              publishedAt: "2026-06-16T04:00:00Z",
              source: "Yahoo Finance",
              summary: "Broad finance headline.",
              title: "Apple shares rise as investors watch demand",
              url: "https://finance.yahoo.com/news/apple-demand.html",
            },
          ],
          broadFallback: true,
          id: "yahoo-finance-rss",
          label: "Yahoo Finance RSS",
        }),
        provider({
          articles: [
            {
              id: "strict-cost",
              image: null,
              publishedAt: "2026-06-16T04:00:00Z",
              source: "Market Desk",
              summary: "Mortgage pressure and grocery bills remain high.",
              title: "Household budgets stay under pressure",
              url: "https://example.com/cost",
            },
          ],
          id: "marketaux",
          label: "MarketAux",
        }),
      ],
    });

    expect(result.articles.map((article) => article.id)).toEqual([
      "strict-cost",
    ]);
    expect(result.meta).toMatchObject({
      provider: "marketaux",
      strictCategory: true,
    });
  });

  it("does not use broad Yahoo RSS fallback for user search", async () => {
    const result = await fetchMarketNewsWithProviders(
      { ...request, userSearch: true },
      {
        providers: [
          provider({
            articles: [
              {
                id: "yahoo-broad",
                image: null,
                provider: "yahoo-finance-rss",
                providerLabel: "Yahoo Finance RSS",
                publishedAt: "2026-06-16T04:00:00Z",
                source: "Yahoo Finance",
                summary: "Broad finance headline.",
                title: "Apple shares rise as investors watch demand",
                url: "https://finance.yahoo.com/news/apple-demand.html",
              },
            ],
            broadFallback: true,
            id: "yahoo-finance-rss",
            label: "Yahoo Finance RSS",
          }),
        ],
      },
    );

    expect(result.articles).toEqual([]);
    expect(result.meta.strictCategory).toBe(true);
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
