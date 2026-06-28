import {
  MARKET_NEWS_MALFORMED_RESPONSE_ERROR,
  fetchMarketNews,
} from "./news";

const originalFetch = global.fetch;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

const validMeta = {
  attemptedProviders: ["google-news-rss"],
  provider: "google-news-rss",
  providerLabel: "Google News RSS",
  query: "cost of living",
  strictCategory: true,
  warnings: [],
};

describe("market news service client", () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("returns validated market news payloads", async () => {
    global.fetch = jest.fn(async () =>
      jsonResponse({
        articles: [
          {
            id: "story",
            image: null,
            publishedAt: "2026-06-21T04:00:00Z",
            source: "Market Desk",
            summary: "Summary",
            title: "Story",
            url: "https://example.com/story",
          },
        ],
        meta: validMeta,
      }),
    ) as jest.MockedFunction<typeof fetch>;

    const result = await fetchMarketNews({
      context: "cost of living",
      kind: "search",
      query: "cost of living",
      topicId: "cost-of-living",
    });

    expect(result.articles).toHaveLength(1);
    expect(result.meta.provider).toBe("google-news-rss");
  });

  it("rejects malformed JSON success responses instead of showing an empty feed", async () => {
    global.fetch = jest.fn(
      async () => new Response("<html>not json</html>", { status: 200 }),
    ) as jest.MockedFunction<typeof fetch>;

    await expect(
      fetchMarketNews({
        context: "cost of living",
        kind: "search",
        query: "cost of living",
      }),
    ).rejects.toThrow(MARKET_NEWS_MALFORMED_RESPONSE_ERROR);
  });

  it("rejects missing response metadata instead of fabricating an unknown provider", async () => {
    global.fetch = jest.fn(async () =>
      jsonResponse({
        articles: [],
      }),
    ) as jest.MockedFunction<typeof fetch>;

    await expect(
      fetchMarketNews({
        context: "cost of living",
        kind: "search",
        query: "cost of living",
      }),
    ).rejects.toThrow(MARKET_NEWS_MALFORMED_RESPONSE_ERROR);
  });
});
