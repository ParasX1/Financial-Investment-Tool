import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/news/search";
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

describe("/api/news/search", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("keeps legacy search requests private and marks them as user searches", async () => {
    mockNewsResult();
    const { headers, res } = createResponse();

    await handler(
      { query: { q: "CBA bank margin" } } as unknown as NextApiRequest,
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

  it("rejects empty searches before provider work starts", async () => {
    const { res } = createResponse();

    await handler({ query: { q: "   " } } as unknown as NextApiRequest, res);

    expect(mockFetchMarketNewsWithProviders).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "q is required" });
  });
});
