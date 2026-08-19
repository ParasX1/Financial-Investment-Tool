import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/news/market";
import { encodeMarketNewsContinuationCursor } from "@/lib/news/newsContinuation";
import { fetchMarketNewsWithProviders } from "@/lib/news/newsService";
import { marketNewsApiRateLimiter } from "@/lib/server/marketApiGuard";

jest.mock("@/lib/news/newsService", () => ({
  fetchMarketNewsWithProviders: jest.fn(),
}));

const mockFetchMarketNewsWithProviders =
  fetchMarketNewsWithProviders as jest.MockedFunction<
    typeof fetchMarketNewsWithProviders
  >;

function createResponse() {
  const headers = new Map<string, string>();
  const res = {
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn((name: string, value: string) => {
      headers.set(name.toLowerCase(), value);
      return res;
    }),
    status: jest.fn().mockReturnThis(),
  } as unknown as NextApiResponse;

  return { headers, res };
}

function mockNewsResult() {
  mockFetchMarketNewsWithProviders.mockResolvedValue({
    articles: [],
    meta: {
      attemptedProviders: [],
      provider: "demo",
      providerLabel: "Demo",
      query: "markets",
      strictCategory: true,
      warnings: [],
    },
  });
}

describe("/api/news/market", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("rejects unsupported request kinds before provider work starts", async () => {
    const { res } = createResponse();

    await handler(
      { query: { kind: "unsupported" } } as unknown as NextApiRequest,
      res,
    );

    expect(mockFetchMarketNewsWithProviders).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Unsupported market news request",
    });
  });

  it("rejects non-GET requests before provider work starts", async () => {
    const { headers, res } = createResponse();

    await handler(
      {
        method: "POST",
        query: { kind: "general" },
      } as unknown as NextApiRequest,
      res,
    );

    expect(mockFetchMarketNewsWithProviders).not.toHaveBeenCalled();
    expect(headers.get("allow")).toBe("GET");
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: "Method not allowed." });
  });

  it("requires a query for search requests", async () => {
    const { res } = createResponse();

    await handler(
      { query: { kind: "search" } } as unknown as NextApiRequest,
      res,
    );

    expect(mockFetchMarketNewsWithProviders).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "q is required" });
  });

  it("requires a ticker for ticker requests", async () => {
    const { res } = createResponse();

    await handler(
      { query: { kind: "ticker" } } as unknown as NextApiRequest,
      res,
    );

    expect(mockFetchMarketNewsWithProviders).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "ticker is required" });
  });

  it("keeps user-submitted searches out of shared cache", async () => {
    mockNewsResult();
    const { headers, res } = createResponse();

    await handler(
      {
        query: {
          kind: "search",
          q: "CBA bank margin",
          userSearch: "true",
        },
      } as unknown as NextApiRequest,
      res,
    );

    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(mockFetchMarketNewsWithProviders).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "search",
        query: "CBA bank margin",
        userSearch: true,
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("uses shared short-lived cache for server-recognized topic requests", async () => {
    mockNewsResult();
    const { headers, res } = createResponse();

    await handler(
      {
        query: {
          industry: "technology",
          kind: "industry",
          topicId: "technology",
        },
      } as unknown as NextApiRequest,
      res,
    );

    expect(headers.get("cache-control")).toBe(
      "s-maxage=900, stale-while-revalidate=1800",
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("uses shared cache for public search-style topic requests", async () => {
    mockNewsResult();
    const { headers, res } = createResponse();

    await handler(
      {
        query: {
          context: "personal finance household money Australia",
          kind: "search",
          q: "personal finance Australia mortgage retirement insurance savings",
          topicId: "personal-finance",
          userSearch: "false",
        },
      } as unknown as NextApiRequest,
      res,
    );

    expect(headers.get("cache-control")).toBe(
      "s-maxage=900, stale-while-revalidate=1800",
    );
    expect(mockFetchMarketNewsWithProviders).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "search",
        query:
          "personal finance Australia mortgage retirement insurance savings",
        topicId: "personal-finance",
        userSearch: false,
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("does not share-cache provider failures for public topic requests", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const providerError = new Error("Google News RSS 503");
    mockFetchMarketNewsWithProviders.mockRejectedValueOnce(providerError);
    const { headers, res } = createResponse();

    await handler(
      {
        query: {
          context: "personal finance household money Australia",
          kind: "search",
          q: "personal finance Australia mortgage retirement insurance savings",
          topicId: "personal-finance",
          userSearch: "false",
        },
      } as unknown as NextApiRequest,
      res,
    );

    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      error: "Market news is temporarily unavailable.",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Market news provider error",
      providerError,
    );

    consoleError.mockRestore();
  });

  it("does not trust userSearch=false for arbitrary search requests", async () => {
    mockNewsResult();
    const { headers, res } = createResponse();

    await handler(
      {
        query: {
          kind: "search",
          q: "CBA bank margin",
          userSearch: "false",
        },
      } as unknown as NextApiRequest,
      res,
    );

    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(mockFetchMarketNewsWithProviders).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "search",
        query: "CBA bank margin",
        userSearch: true,
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("does not treat a topicId as public unless the query matches the preset", async () => {
    mockNewsResult();
    const { headers, res } = createResponse();

    await handler(
      {
        query: {
          kind: "search",
          q: "CBA bank margin",
          topicId: "personal-finance",
          userSearch: "false",
        },
      } as unknown as NextApiRequest,
      res,
    );

    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(mockFetchMarketNewsWithProviders).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "search",
        query: "CBA bank margin",
        topicId: "personal-finance",
        userSearch: true,
      }),
    );
  });

  it("bypasses cache for manual refresh requests", async () => {
    mockNewsResult();
    const { headers, res } = createResponse();

    await handler(
      {
        query: {
          _refresh: "1",
          kind: "general",
        },
      } as unknown as NextApiRequest,
      res,
    );

    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("rate limits repeated provider fanout from the same client", async () => {
    mockNewsResult();
    let lastResponse = createResponse();

    for (let requestNumber = 0; requestNumber < 21; requestNumber += 1) {
      lastResponse = createResponse();
      await handler(
        {
          headers: { "x-forwarded-for": "203.0.113.74" },
          method: "GET",
          query: { kind: "general" },
          socket: {},
        } as unknown as NextApiRequest,
        lastResponse.res,
      );
    }

    expect(mockFetchMarketNewsWithProviders).toHaveBeenCalledTimes(20);
    expect(lastResponse.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0",
    );
    expect(lastResponse.headers.get("retry-after")).toBe("60");
    expect(lastResponse.res.status).toHaveBeenCalledWith(429);
    expect(lastResponse.res.json).toHaveBeenCalledWith({
      error: "Too many market news requests. Please wait a moment.",
    });
  });

  it("rate limits provider fanout when the client address is unavailable", async () => {
    const allow = jest
      .spyOn(marketNewsApiRateLimiter, "allow")
      .mockReturnValueOnce(false);
    const { headers, res } = createResponse();

    await handler(
      {
        headers: {},
        method: "GET",
        query: { kind: "general" },
        socket: {},
      } as unknown as NextApiRequest,
      res,
    );

    expect(allow).toHaveBeenCalledWith("market-news:unknown");
    expect(mockFetchMarketNewsWithProviders).not.toHaveBeenCalled();
    expect(headers.get("retry-after")).toBe("60");
    expect(res.status).toHaveBeenCalledWith(429);

    allow.mockRestore();
  });

  it("rejects malformed continuation cursors before provider work starts", async () => {
    const { res } = createResponse();

    await handler(
      {
        method: "GET",
        query: {
          context: "markets",
          cursor: "not-a-valid-cursor",
          kind: "general",
          pageSize: "72",
        },
      } as unknown as NextApiRequest,
      res,
    );

    expect(mockFetchMarketNewsWithProviders).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid cursor." });
  });

  it("decodes a request-bound cursor into an exact keyset boundary", async () => {
    mockNewsResult();
    const { res } = createResponse();
    const baseRequest = {
      context: "markets",
      kind: "general" as const,
      pageSize: "72",
    };
    const cursor = encodeMarketNewsContinuationCursor(baseRequest, {
      publishedAt: "2026-06-21T04:00:00.000Z",
      stableKey: "story-72\u0000https://example.com/story-72",
    });

    await handler(
      {
        method: "GET",
        query: {
          context: "markets",
          cursor,
          kind: "general",
          pageSize: "72",
        },
      } as unknown as NextApiRequest,
      res,
    );

    expect(mockFetchMarketNewsWithProviders).toHaveBeenCalledWith(
      expect.objectContaining({
        continuationCursor: cursor,
        publishedBefore: "2026-06-21T04:00:00.000Z",
        publishedBeforeKey: "story-72\u0000https://example.com/story-72",
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("adds continuation metadata from the oldest live article", async () => {
    mockFetchMarketNewsWithProviders.mockResolvedValueOnce({
      articles: [
        {
          id: "story-1",
          image: null,
          publishedAt: "2026-06-21T04:00:00.000Z",
          source: "Market Desk",
          summary: "Markets update",
          title: "Markets story",
          url: "https://example.com/story-1",
        },
      ],
      meta: {
        attemptedProviders: ["google-news-rss"],
        provider: "google-news-rss",
        providerLabel: "Google News RSS",
        query: "markets",
        strictCategory: true,
        warnings: [],
      },
    });
    const { res } = createResponse();

    await handler(
      {
        method: "GET",
        query: { context: "markets", kind: "general", pageSize: "72" },
      } as unknown as NextApiRequest,
      res,
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({
          hasMore: true,
          nextCursor: expect.any(String),
        }),
      }),
    );
  });
});
