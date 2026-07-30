import { describe, expect, it, jest } from "@jest/globals";
import {
  buildMarketAuxUrl,
  mapMarketAuxArticles,
  marketAuxProvider,
} from "./marketAuxProvider";

describe("marketAuxProvider", () => {
  const request = {
    context: "Australia ASX market business economy",
    country: "au",
    kind: "regional" as const,
    marketScopeId: "australia",
    pageSize: "18",
    topicId: "australian-markets",
  };

  it("builds a strict MarketAux request without embedding secrets in source", () => {
    const url = new URL(
      buildMarketAuxUrl({
        apiKey: "test-key",
        request,
      }),
    );

    expect(url.origin + url.pathname).toBe(
      "https://api.marketaux.com/v1/news/all",
    );
    expect(url.searchParams.get("api_token")).toBe("test-key");
    expect(url.searchParams.get("countries")).toBe("au");
    expect(url.searchParams.get("limit")).toBe("72");
    expect(url.searchParams.get("search")).toContain("ASX");
    expect(url.searchParams.get("search")).toContain("Australian shares");
    expect(url.searchParams.get("must_have_entities")).toBe("true");
    expect(url.searchParams.get("published_after")).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });

  it("maps MarketAux entities into investor-facing article metadata", () => {
    expect(
      mapMarketAuxArticles([
        {
          description: "ASX banks rallied.",
          entities: [
            {
              match_score: 42,
              sentiment_score: 0.4,
              symbol: "CBA.AX",
            },
          ],
          image_url: "https://example.com/image.jpg",
          published_at: "2026-06-16T04:00:00Z",
          relevance_score: 8.4,
          source: "finance.example",
          title: "ASX banks lead local market higher",
          url: "https://example.com/asx-banks",
          uuid: "article-1",
        },
      ]),
    ).toEqual([
      {
        confidence: 8.4,
        id: "article-1",
        image: "https://example.com/image.jpg",
        provider: "marketaux",
        providerLabel: "MarketAux",
        publishedAt: "2026-06-16T04:00:00Z",
        relatedSymbols: ["CBA.AX"],
        sentiment: "positive",
        source: "finance.example",
        summary: "ASX banks rallied.",
        title: "ASX banks lead local market higher",
        url: "https://example.com/asx-banks",
      },
    ]);
  });

  it("keeps missing MarketAux timestamps visibly unknown", () => {
    expect(
      mapMarketAuxArticles([
        {
          source: "finance.example",
          title: "ASX banks lead local market higher",
          url: "https://example.com/undated-asx-banks",
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        publishedAt: "",
        title: "ASX banks lead local market higher",
      }),
    ]);
  });

  it("drops unsafe MarketAux story URLs and strips unsafe image URLs", () => {
    expect(
      mapMarketAuxArticles([
        {
          image_url: "https://example.com/safe.jpg",
          source: "finance.example",
          title: "Unsafe story should be ignored",
          url: "javascript:alert(1)",
        },
        {
          image_url: "data:text/html,hello",
          source: "finance.example",
          title: "Safe story keeps no unsafe image",
          url: "https://example.com/safe-story",
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        image: null,
        title: "Safe story keeps no unsafe image",
        url: "https://example.com/safe-story",
      }),
    ]);
  });

  it("uses MARKETAUX_API_KEY from server env and returns normalized articles", async () => {
    const fetcher = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            published_at: "2026-06-16T04:00:00Z",
            source: "finance.example",
            title: "Australian market wrap",
            url: "https://example.com/wrap",
          },
        ],
      }),
    } as Response);

    const articles = await marketAuxProvider.fetchArticles(request, {
      env: { MARKETAUX_API_KEY: "test-key" },
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0]?.[0])).toContain("api_token=test-key");
    expect(articles[0]).toMatchObject({
      provider: "marketaux",
      title: "Australian market wrap",
    });
  });
});
