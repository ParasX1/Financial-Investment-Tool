import { describe, expect, it, jest } from "@jest/globals";
import { buildNewsApiCandidates, newsApiProvider } from "./newsApiProvider";
import type { ServerNewsRequest } from "../types";

const searchRequest: ServerNewsRequest = {
  context: "Australian household finance cost of living",
  kind: "search",
  pageSize: "2",
  query: "Australia cost of living inflation",
  topicId: "cost-of-living",
};

const regionalRequest: ServerNewsRequest = {
  context: "Australia ASX market business economy",
  country: "au",
  kind: "regional",
  pageSize: "5",
  topicId: "australian-markets",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

describe("newsApiProvider", () => {
  it("builds regional candidates before strict everything search", () => {
    const candidates = buildNewsApiCandidates(regionalRequest);

    expect(candidates[0]).toMatchObject({
      endpoint: "top-headlines",
      params: {
        category: "business",
        country: "au",
      },
    });
    expect(candidates[1]).toMatchObject({
      endpoint: "everything",
      params: {
        language: "en",
        sortBy: "publishedAt",
      },
    });
    expect(candidates[1]?.params.q).toContain("ASX");
    expect(candidates[1]?.params.q).not.toContain("Major US equity");
  });

  it("expands known ticker symbols in NewsAPI everything queries", () => {
    const candidates = buildNewsApiCandidates({
      context: "company stock market news",
      kind: "ticker",
      pageSize: "5",
      ticker: "TEAM",
    });

    expect(candidates[0]?.params.q).toBe('TEAM OR "Atlassian"');
  });

  it("expands wider market scope symbols in ticker queries", () => {
    const candidates = buildNewsApiCandidates({
      context: "crypto market news",
      kind: "ticker",
      pageSize: "5",
      ticker: "ETH-AUD",
    });

    expect(candidates[0]?.params.q).toBe('ETH-AUD OR "Ethereum Australia"');
  });

  it("maps, filters, and dedupes provider articles", async () => {
    const fetcher = jest.fn(async () =>
      jsonResponse({
        articles: [
          {
            description: "Household cost pressure remains visible.",
            publishedAt: "2026-06-16T04:00:00Z",
            source: { name: "Market Desk" },
            title: "Cost of living remains a market signal",
            url: "https://example.com/cost",
            urlToImage: "https://example.com/cost.jpg",
          },
          {
            description: "Duplicate URL should be collapsed.",
            publishedAt: "2026-06-16T04:05:00Z",
            source: { name: "Market Desk" },
            title: "Cost of living duplicate",
            url: "https://example.com/cost",
          },
          {
            title: "[Removed]",
            url: "https://example.com/removed",
          },
          {
            title: "Missing URL is ignored",
          },
        ],
      }),
    ) as unknown as typeof fetch;

    const articles = await newsApiProvider.fetchArticles(searchRequest, {
      env: { NEWSAPI_KEY: "test-key" },
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = (fetcher as unknown as jest.Mock).mock.calls[0]!;
    expect(new URL(String(url)).searchParams.get("pageSize")).toBe("2");
    expect(init).toMatchObject({
      headers: { "X-Api-Key": "test-key" },
    });
    expect(articles).toEqual([
      expect.objectContaining({
        id: "https://example.com/cost",
        image: "https://example.com/cost.jpg",
        provider: "newsapi",
        providerLabel: "NewsAPI",
        source: "Market Desk",
        title: "Cost of living remains a market signal",
      }),
    ]);
  });

  it("infers related symbols from NewsAPI titles and descriptions", async () => {
    const fetcher = jest.fn(async () =>
      jsonResponse({
        articles: [
          {
            description:
              "Volatility index falls as small caps catch a bid in New York.",
            publishedAt: "2026-06-16T05:00:00Z",
            source: { name: "Market Desk" },
            title: "VIX slides while Russell 2000 extends gains",
            url: "https://example.com/risk",
          },
        ],
      }),
    ) as unknown as typeof fetch;

    const articles = await newsApiProvider.fetchArticles(
      {
        context: "US markets",
        kind: "search",
        pageSize: "5",
        query: "US markets VIX Russell 2000",
      },
      {
        env: { NEWSAPI_KEY: "test-key" },
        fetcher,
      },
    );

    expect(articles[0]?.relatedSymbols).toEqual(
      expect.arrayContaining(["^RUT", "^VIX"]),
    );
  });

  it("tries the strict everything candidate when regional headlines are empty", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ articles: [] }))
      .mockResolvedValueOnce(
        jsonResponse({
          articles: [
            {
              description: "ASX market summary.",
              publishedAt: "2026-06-16T04:00:00Z",
              source: { name: "Market Desk" },
              title: "ASX investors watch banks and miners",
              url: "https://example.com/asx",
            },
          ],
        }),
      ) as unknown as typeof fetch;

    const articles = await newsApiProvider.fetchArticles(regionalRequest, {
      env: { NEWSAPI_KEY: "test-key" },
      fetcher,
    });

    expect((fetcher as unknown as jest.Mock).mock.calls).toHaveLength(2);
    expect(articles[0]?.url).toBe("https://example.com/asx");
  });

  it("surfaces NewsAPI HTTP failures", async () => {
    const fetcher = jest.fn(async () =>
      jsonResponse({ message: "limited" }, 429),
    ) as unknown as typeof fetch;

    await expect(
      newsApiProvider.fetchArticles(searchRequest, {
        env: { NEWSAPI_KEY: "test-key" },
        fetcher,
      }),
    ).rejects.toThrow("NewsAPI 429");
  });
});
