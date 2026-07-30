import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/news/market";
import { fetchMarketNewsWithProviders } from "@/lib/news/newsService";

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
          context: "Australia money news banking tax superannuation savings",
          kind: "search",
          q: "Australia money news banking tax superannuation savings",
          topicId: "money-news",
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
        query: "Australia money news banking tax superannuation savings",
        topicId: "money-news",
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
          context: "Australia money news banking tax superannuation savings",
          kind: "search",
          q: "Australia money news banking tax superannuation savings",
          topicId: "money-news",
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
          topicId: "money-news",
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
        topicId: "money-news",
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
});
