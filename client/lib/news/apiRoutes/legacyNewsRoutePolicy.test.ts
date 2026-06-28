import type { NextApiRequest, NextApiResponse } from "next";
import commodityHandler from "@/pages/api/news/commodity";
import industryHandler from "@/pages/api/news/industry";
import regionalHandler from "@/pages/api/news/regional";
import searchHandler from "@/pages/api/news/search";
import tickerHandler from "@/pages/api/news/ticker";
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

describe("legacy news route cache policy", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    {
      handler: commodityHandler,
      label: "/api/news/commodity",
      query: {
        commodity: "commodities",
        context: "commodity markets energy metals agriculture",
        topicId: "commodities",
      },
      request: { commodity: "commodities", kind: "commodity" },
    },
    {
      handler: industryHandler,
      label: "/api/news/industry",
      query: {
        context: "technology sector AI software semiconductor stocks",
        industry: "technology",
        topicId: "technology",
      },
      request: { industry: "technology", kind: "industry" },
    },
    {
      handler: regionalHandler,
      label: "/api/news/regional",
      query: {
        context: "Australia ASX market business economy",
        country: "au",
        topicId: "australian-markets",
      },
      request: { country: "au", kind: "regional" },
    },
    {
      handler: searchHandler,
      label: "/api/news/search",
      query: {
        context: "Australia money news banking tax superannuation savings",
        q: "Australia money news banking tax superannuation savings",
        topicId: "money-news",
      },
      request: {
        kind: "search",
        query: "Australia money news banking tax superannuation savings",
        userSearch: false,
      },
    },
  ])("$label uses shared cache for recognized topic requests", async ({
    handler,
    query,
    request,
  }) => {
    mockNewsResult();
    const { headers, res } = createResponse();

    await handler({ query } as unknown as NextApiRequest, res);

    expect(headers.get("cache-control")).toBe(
      "s-maxage=900, stale-while-revalidate=1800",
    );
    expect(mockFetchMarketNewsWithProviders).toHaveBeenCalledWith(
      expect.objectContaining(request),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("keeps ticker-specific legacy news private", async () => {
    mockNewsResult();
    const { headers, res } = createResponse();

    await tickerHandler(
      { query: { ticker: "CBA.AX" } } as unknown as NextApiRequest,
      res,
    );

    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(mockFetchMarketNewsWithProviders).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "ticker",
        ticker: "CBA.AX",
      }),
    );
  });

  it("keeps manual refreshes private even for public topic requests", async () => {
    mockNewsResult();
    const { headers, res } = createResponse();

    await regionalHandler(
      {
        query: {
          _refresh: "1",
          context: "Australia ASX market business economy",
          country: "au",
          topicId: "australian-markets",
        },
      } as unknown as NextApiRequest,
      res,
    );

    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0");
  });
});
