import { describe, expect, it, jest } from "@jest/globals";
import {
  fetchMarketNewsWithProviders,
  resolveNewsProviders,
} from "./newsService";
import type { Article } from "@/services/news";
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
          "google-rss, gdelt, removed-source, google-rss, unknown",
      }).map((resolvedProvider) => resolvedProvider.id),
    ).toEqual(["google-news-rss", "gdelt"]);
  });

  it("uses fresh category-friendly provider order in development when no order is configured", () => {
    expect(
      resolveNewsProviders({ NODE_ENV: "development" }).map(
        (resolvedProvider) => resolvedProvider.id,
      ),
    ).toEqual(["google-news-rss", "yahoo-finance-rss"]);
  });

  it("uses the same Google-first provider order in production", () => {
    expect(
      resolveNewsProviders({ NODE_ENV: "production" }).map(
        (resolvedProvider) => resolvedProvider.id,
      ),
    ).toEqual(["google-news-rss", "yahoo-finance-rss"]);
  });

  it("does not stop before the requested page sentinel can be filled", async () => {
    const firstProvider = provider({
      articles: Array.from({ length: 10 }, (_, index) => ({
        id: `cost-google-${index + 1}`,
        image: null,
        publishedAt: "2026-07-24T04:00:00Z",
        source: "Yahoo Finance Australia",
        summary: "Mortgage pressure remains high for Australian households.",
        title: `Cost of living pressure story ${index + 1}`,
        url: `https://example.com/cost-google-${index + 1}`,
      })),
      id: "google-news-rss",
      label: "Google News RSS",
    });
    const secondProvider = provider({
      articles: Array.from({ length: 3 }, (_, index) => ({
        id: `cost-gdelt-${index + 1}`,
        image: null,
        publishedAt: "2026-07-24T05:00:00Z",
        source: "ABC News",
        summary: "Household bills and inflation remain visible.",
        title: `Australian household budgets under pressure ${index + 1}`,
        url: `https://example.com/cost-gdelt-${index + 1}`,
      })),
      id: "gdelt",
      label: "GDELT",
    });

    const result = await fetchMarketNewsWithProviders(
      { ...request, pageSize: "13", topicId: "cost-of-living" },
      {
        env: { NODE_ENV: "development" },
        providers: [firstProvider, secondProvider],
      },
    );

    expect(result.articles).toHaveLength(13);
    expect(secondProvider.fetchArticles).toHaveBeenCalled();
    expect(result.meta.attemptedProviders).toEqual([
      "google-news-rss",
      "gdelt",
    ]);
  });

  it("tries same-request providers but does not fabricate broad fallback news", async () => {
    const result = await fetchMarketNewsWithProviders(request, {
      providers: [
        provider({ articles: [], id: "primary", label: "Primary Source" }),
        provider({ articles: [], id: "secondary", label: "Secondary Source" }),
      ],
    });

    expect(result.articles).toEqual([]);
    expect(result.meta).toMatchObject({
      attemptedProviders: ["primary", "secondary"],
      provider: "secondary",
      providerLabel: "Secondary Source",
      strictCategory: true,
    });
  });

  it("continues to a later provider when the first has no strict matches", async () => {
    const result = await fetchMarketNewsWithProviders(request, {
      providers: [
        provider({ articles: [], id: "primary", label: "Primary Source" }),
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
          id: "secondary",
          label: "Secondary Source",
        }),
      ],
    });

    expect(result.articles).toHaveLength(1);
    expect(result.meta).toMatchObject({
      attemptedProviders: ["primary", "secondary"],
      provider: "secondary",
      providerLabel: "Secondary Source",
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
                id: "google-cost",
                image: null,
                publishedAt: "2026-06-16T04:00:00Z",
                source: "Market Desk",
                summary: "Mortgage pressure remains high.",
                title: "Cost of living pressure stays in focus",
                url: "https://example.com/google-cost",
              },
            ],
            id: "google-news-rss",
            label: "Google News RSS",
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
      "google-cost",
    ]);
    expect(result.meta).toMatchObject({
      attemptedProviders: ["google-news-rss", "gdelt"],
      provider: "google-news-rss",
      providerLabel: "Google News RSS + GDELT",
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

  it("ignores the retired partial-page threshold and fills the requested result size", async () => {
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
          NEWS_MIN_STRICT_ARTICLES: "2",
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
          id: "google-news-rss",
          label: "Google News RSS",
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
          id: "google-news-rss",
          label: "Google News RSS",
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
          id: "gdelt",
          label: "GDELT",
        }),
      ],
    });

    expect(result.meta.provider).toBe("gdelt");
    expect(result.meta.warnings).toEqual([]);
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
          id: "gdelt",
          label: "GDELT",
        }),
      ],
    });

    expect(result.articles.map((article) => article.id)).toEqual([
      "strict-cost",
    ]);
    expect(result.meta).toMatchObject({
      provider: "gdelt",
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
          id: "google-news-rss",
          label: "Google News RSS",
        }),
      ],
    });

    expect(result.articles.length).toBeGreaterThan(0);
    expect(result.articles[0]?.provider).toBe("demo");
    expect(result.meta.provider).toBe("demo");
    expect(result.meta.warnings[0]).toContain("Demo stories");
  });

  it("keeps the page usable with labelled demo stories when every provider fails", async () => {
    const consoleWarn = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    try {
      const result = await fetchMarketNewsWithProviders(request, {
        providers: [
          provider({
            articles: [],
            id: "google-news-rss",
            label: "Google News RSS",
            rejects: true,
          }),
        ],
      });

      expect(result.articles.length).toBeGreaterThan(0);
      expect(result.articles[0]?.provider).toBe("demo");
      expect(result.meta).toMatchObject({
        attemptedProviders: ["google-news-rss"],
        provider: "demo",
        providerLabel: "Demo",
        strictCategory: true,
      });
      expect(result.meta.warnings[0]).toBe(
        "Live market news is temporarily unavailable. Demo stories are shown instead.",
      );
    } finally {
      consoleWarn.mockRestore();
    }
  });

  it("starts secondary providers together after the primary source underfills", async () => {
    let resolveSecondary: ((articles: Article[]) => void) | undefined;
    let resolveTertiary: ((articles: Article[]) => void) | undefined;
    const primary = provider({
      articles: [],
      id: "primary",
      label: "Primary",
    });
    const secondary: NewsProvider = {
      id: "secondary",
      label: "Secondary",
      isConfigured: () => true,
      fetchArticles: jest.fn(
        () =>
          new Promise<Article[]>((resolve) => {
            resolveSecondary = resolve;
          }),
      ),
    };
    const tertiary: NewsProvider = {
      id: "tertiary",
      label: "Tertiary",
      isConfigured: () => true,
      fetchArticles: jest.fn(
        () =>
          new Promise<Article[]>((resolve) => {
            resolveTertiary = resolve;
          }),
      ),
    };

    const pendingResult = fetchMarketNewsWithProviders(request, {
      providers: [primary, secondary, tertiary],
    });

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    const startedTogether = Boolean(resolveSecondary && resolveTertiary);

    resolveSecondary?.([]);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    resolveTertiary?.([]);
    await pendingResult;

    expect(startedTogether).toBe(true);
  });

  it("uses a stable article key when publication timestamps are equal", async () => {
    const result = await fetchMarketNewsWithProviders(
      {
        ...request,
        pageSize: "2",
        topicId: "cost-of-living",
      },
      {
        providers: [
          provider({
            articles: [
              {
                id: "story-b",
                image: null,
                publishedAt: "2026-07-24T04:00:00Z",
                source: "Yahoo Finance Australia",
                summary: "Mortgage pressure remains high for households.",
                title: "Cost of living pressure story B",
                url: "https://example.com/story-b",
              },
              {
                id: "story-a",
                image: null,
                publishedAt: "2026-07-24T04:00:00Z",
                source: "Yahoo Finance Australia",
                summary: "Mortgage pressure remains high for households.",
                title: "Cost of living pressure story A",
                url: "https://example.com/story-a",
              },
            ],
            id: "google-news-rss",
            label: "Google News RSS",
          }),
        ],
      },
    );

    expect(result.articles.map((article) => article.id)).toEqual([
      "story-a",
      "story-b",
    ]);
  });
});
