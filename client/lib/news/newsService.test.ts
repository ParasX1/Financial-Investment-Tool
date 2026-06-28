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
        NEWS_PROVIDER_ORDER:
          "google-rss, gdelt, marketaux, google-rss, unknown",
      }).map((resolvedProvider) => resolvedProvider.id),
    ).toEqual(["google-news-rss", "gdelt", "marketaux"]);
  });

  it("uses fresh category-friendly provider order in development when no order is configured", () => {
    expect(
      resolveNewsProviders({ NODE_ENV: "development" }).map(
        (resolvedProvider) => resolvedProvider.id,
      ),
    ).toEqual([
      "google-news-rss",
      "gdelt",
      "yahoo-finance-rss",
      "marketaux",
      "newsapi",
    ]);
  });

  it("keeps production provider order focused on primary finance APIs", () => {
    expect(
      resolveNewsProviders({ NODE_ENV: "production" }).map(
        (resolvedProvider) => resolvedProvider.id,
      ),
    ).toEqual([
      "marketaux",
      "newsapi",
      "gdelt",
      "google-news-rss",
      "yahoo-finance-rss",
    ]);
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
      "gdelt-cost",
      "marketaux-cost",
    ]);
    expect(result.meta).toMatchObject({
      attemptedProviders: ["marketaux", "gdelt"],
      provider: "marketaux",
      providerLabel: "MarketAux + GDELT",
      strictCategory: true,
    });
  });

  it("keeps filling development results by default instead of stopping at two stories", async () => {
    const firstProvider = provider({
      articles: [
        {
          id: "cost-1",
          image: null,
          publishedAt: "2026-06-16T04:00:00Z",
          source: "Market Desk",
          summary: "Mortgage pressure remains high.",
          title: "Cost of living pressure stays in focus",
          url: "https://example.com/cost-1",
        },
        {
          id: "cost-2",
          image: null,
          publishedAt: "2026-06-16T04:10:00Z",
          source: "Market Desk",
          summary: "Household bills and inflation remain visible.",
          title: "Inflation keeps household budgets under pressure",
          url: "https://example.com/cost-2",
        },
      ],
      id: "google-news-rss",
      label: "Google News RSS",
    });
    const secondProvider = provider({
      articles: [
        {
          id: "cost-3",
          image: null,
          publishedAt: "2026-06-16T04:20:00Z",
          source: "Market Desk",
          summary: "Grocery bills remain high.",
          title: "Household budgets remain under pressure",
          url: "https://example.com/cost-3",
        },
      ],
      id: "gdelt",
      label: "GDELT",
    });

    const result = await fetchMarketNewsWithProviders(
      { ...request, pageSize: "12" },
      {
        env: {
          NODE_ENV: "development",
        },
        providers: [firstProvider, secondProvider],
      },
    );

    expect(result.articles.map((article) => article.id)).toEqual([
      "cost-3",
      "cost-2",
      "cost-1",
    ]);
    expect(secondProvider.fetchArticles).toHaveBeenCalled();
    expect(result.meta).toMatchObject({
      attemptedProviders: ["google-news-rss", "gdelt"],
      providerLabel: "Google News RSS + GDELT",
    });
  });

  it("keeps filling development topic feeds until the page sentinel is covered", async () => {
    const firstProvider = provider({
      articles: Array.from({ length: 8 }, (_, index) => ({
        id: `cost-google-${index + 1}`,
        image: null,
        publishedAt: "2026-06-16T04:00:00Z",
        source: "Market Desk",
        summary: "Mortgage pressure remains high.",
        title: `Cost of living pressure story ${index + 1}`,
        url: `https://example.com/cost-google-${index + 1}`,
      })),
      id: "google-news-rss",
      label: "Google News RSS",
    });
    const secondProvider = provider({
      articles: Array.from({ length: 5 }, (_, index) => ({
        id: `cost-gdelt-${index + 1}`,
        image: null,
        publishedAt: "2026-06-16T05:00:00Z",
        source: "Market Desk",
        summary: "Household bills and inflation remain visible.",
        title: `Inflation keeps household budgets under pressure ${index + 1}`,
        url: `https://example.com/cost-gdelt-${index + 1}`,
      })),
      id: "gdelt",
      label: "GDELT",
    });

    const result = await fetchMarketNewsWithProviders(
      { ...request, pageSize: "13" },
      {
        env: {
          NODE_ENV: "development",
        },
        providers: [firstProvider, secondProvider],
      },
    );

    expect(result.articles).toHaveLength(13);
    expect(secondProvider.fetchArticles).toHaveBeenCalled();
    expect(result.meta.providerLabel).toBe("Google News RSS + GDELT");
  });

  it("returns early in development after enough strict stories are available", async () => {
    const firstProvider = provider({
      articles: [
        {
          id: "cost-1",
          image: null,
          publishedAt: "2026-06-16T04:00:00Z",
          source: "Market Desk",
          summary: "Mortgage pressure remains high.",
          title: "Cost of living pressure stays in focus",
          url: "https://example.com/cost-1",
        },
        {
          id: "cost-2",
          image: null,
          publishedAt: "2026-06-16T04:10:00Z",
          source: "Market Desk",
          summary: "Household bills and inflation remain visible.",
          title: "Inflation keeps household budgets under pressure",
          url: "https://example.com/cost-2",
        },
      ],
      id: "google-news-rss",
      label: "Google News RSS",
    });
    const secondProvider = provider({
      articles: [
        {
          id: "cost-3",
          image: null,
          publishedAt: "2026-06-16T04:20:00Z",
          source: "Market Desk",
          summary: "Grocery bills remain high.",
          title: "Household budgets remain under pressure",
          url: "https://example.com/cost-3",
        },
      ],
      id: "marketaux",
      label: "MarketAux",
    });

    const result = await fetchMarketNewsWithProviders(
      { ...request, pageSize: "12" },
      {
        env: {
          NEWS_MIN_STRICT_ARTICLES: "2",
          NODE_ENV: "development",
        },
        providers: [firstProvider, secondProvider],
      },
    );

    expect(result.articles.map((article) => article.id)).toEqual([
      "cost-2",
      "cost-1",
    ]);
    expect(secondProvider.fetchArticles).not.toHaveBeenCalled();
  });

  it("keeps the freshest strict stories before trimming a provider candidate set", async () => {
    const result = await fetchMarketNewsWithProviders(
      { ...request, pageSize: "2", topicId: "cost-of-living" },
      {
        env: {
          NEWS_MIN_STRICT_ARTICLES: "2",
          NODE_ENV: "development",
        },
        providers: [
          provider({
            articles: [
              {
                id: "old-1",
                image: null,
                publishedAt: "2026-06-16T04:00:00Z",
                source: "Market Desk",
                summary: "Mortgage pressure remains high.",
                title: "Cost of living pressure story from last week",
                url: "https://example.com/old-1",
              },
              {
                id: "old-2",
                image: null,
                publishedAt: "2026-06-18T04:00:00Z",
                source: "Market Desk",
                summary: "Household bills and inflation remain visible.",
                title: "Inflation keeps household budgets under pressure",
                url: "https://example.com/old-2",
              },
              {
                id: "fresh-1",
                image: null,
                publishedAt: "2026-06-21T08:26:50Z",
                source: "Yahoo Finance Australia",
                summary: "",
                title: "Key group smashed by RBA rate hike",
                url: "https://example.com/fresh-1",
              },
              {
                id: "fresh-2",
                image: null,
                publishedAt: "2026-06-21T02:09:28Z",
                source: "Michael West Media",
                summary: "",
                title:
                  "Oil and milk prices to spill the tea on inflation story",
                url: "https://example.com/fresh-2",
              },
            ],
            id: "google-news-rss",
            label: "Google News RSS",
          }),
        ],
      },
    );

    expect(result.articles.map((article) => article.id)).toEqual([
      "fresh-1",
      "fresh-2",
    ]);
  });

  it("keeps undated strict provider stories behind dated stories", async () => {
    const result = await fetchMarketNewsWithProviders(request, {
      providers: [
        provider({
          articles: [
            {
              id: "undated",
              image: null,
              publishedAt: "",
              source: "Market Desk",
              summary: "Cost of living summary",
              title: "Cost of living pressure with no timestamp",
              url: "https://example.com/undated",
            },
            {
              id: "dated",
              image: null,
              publishedAt: "2026-06-21T04:00:00Z",
              source: "Market Desk",
              summary: "Cost of living summary",
              title: "Cost of living pressure with a timestamp",
              url: "https://example.com/dated",
            },
          ],
          id: "newsapi",
          label: "NewsAPI",
        }),
      ],
    });

    expect(result.articles.map((article) => article.id)).toEqual([
      "dated",
      "undated",
    ]);
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

  it("falls back after a provider outage without leaking internal failure details", async () => {
    const consoleWarn = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    try {
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

      expect(result.articles.map((article) => article.id)).toEqual([
        "google-cost",
      ]);
      expect(result.meta).toMatchObject({
        provider: "google-news-rss",
        providerLabel: "Google News RSS",
        strictCategory: true,
      });
      expect(result.meta.warnings[0]).toBe("GDELT: temporarily unavailable.");
      expect(result.meta.warnings[0]).not.toContain("GDELT down");
      expect(consoleWarn).toHaveBeenCalledWith(
        "Market news provider failed",
        expect.objectContaining({
          message: "GDELT down",
          provider: "gdelt",
        }),
      );
    } finally {
      consoleWarn.mockRestore();
    }
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

  it("surfaces a generic error when every configured provider fails", async () => {
    const consoleWarn = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    try {
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
      ).rejects.toThrow(/^Market news providers failed$/);
    } finally {
      consoleWarn.mockRestore();
    }
  });
});
