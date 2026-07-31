import {
  MARKET_NEWS_MALFORMED_RESPONSE_ERROR,
  fetchMarketNews,
  fetchOlderMarketNews,
} from "./marketNewsClient";

const originalFetch = global.fetch;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

const validMeta = {
  attemptedProviders: ["google-news-rss"],
  hasMore: true,
  nextCursor: "opaque-cursor",
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
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/news/market?"),
      { cache: "default" },
    );
  });

  it("bypasses browser and shared caches only for an explicit refresh", async () => {
    global.fetch = jest.fn(async () =>
      jsonResponse({
        articles: [],
        meta: validMeta,
      }),
    ) as jest.MockedFunction<typeof fetch>;

    await fetchMarketNews(
      {
        context: "cost of living",
        kind: "search",
        query: "cost of living",
        topicId: "cost-of-living",
      },
      72,
      1,
    );

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("_refresh=1"),
      { cache: "no-store" },
    );
  });

  it("requests an older batch with an opaque continuation cursor", async () => {
    global.fetch = jest.fn(async () =>
      jsonResponse({
        articles: [],
        meta: {
          ...validMeta,
          hasMore: false,
          nextCursor: null,
        },
      }),
    ) as jest.MockedFunction<typeof fetch>;

    await fetchOlderMarketNews(
      {
        context: "cost of living",
        kind: "search",
        query: "cost of living",
        topicId: "cost-of-living",
      },
      72,
      "opaque-cursor",
    );

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("cursor=opaque-cursor"),
      { cache: "default" },
    );
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

  it("rejects responses that omit the continuation contract", async () => {
    const {
      hasMore: _hasMore,
      nextCursor: _nextCursor,
      ...legacyMeta
    } = validMeta;
    global.fetch = jest.fn(async () =>
      jsonResponse({
        articles: [],
        meta: legacyMeta,
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
