import type { NextApiRequest, NextApiResponse } from "next";
import commodityHandler from "@/pages/api/news/commodity";
import generalHandler from "@/pages/api/news/general";
import industryHandler from "@/pages/api/news/industry";
import marketHandler from "@/pages/api/news/market";
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

const failingRoutes = [
  {
    handler: commodityHandler,
    label: "/api/news/commodity",
    query: { commodity: "gold" },
  },
  {
    handler: generalHandler,
    label: "/api/news/general",
    query: {},
  },
  {
    handler: industryHandler,
    label: "/api/news/industry",
    query: { industry: "technology" },
  },
  {
    handler: marketHandler,
    label: "/api/news/market",
    query: { kind: "general" },
  },
  {
    handler: regionalHandler,
    label: "/api/news/regional",
    query: { country: "au" },
  },
  {
    handler: searchHandler,
    label: "/api/news/search",
    query: { q: "CBA bank margin" },
  },
  {
    handler: tickerHandler,
    label: "/api/news/ticker",
    query: { ticker: "CBA.AX" },
  },
];

describe("news API route provider failures", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each(failingRoutes)(
    "$label returns a stable user-facing error without leaking provider details",
    async ({ handler, query }) => {
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      const providerError = new Error(
        "MarketAux upstream rejected MARKETAUX_API_KEY=m1n-secret",
      );
      mockFetchMarketNewsWithProviders.mockRejectedValueOnce(providerError);
      const { headers, res } = createResponse();

      await handler({ query } as unknown as NextApiRequest, res);

      expect(res.status).toHaveBeenCalledWith(502);
      expect(headers.get("cache-control")).toBe(
        "private, no-store, max-age=0",
      );
      expect(res.json).toHaveBeenCalledWith({
        error: "Market news is temporarily unavailable.",
      });
      expect(JSON.stringify((res.json as jest.Mock).mock.calls)).not.toContain(
        "MARKETAUX_API_KEY",
      );
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining("Market news"),
        providerError,
      );

      consoleError.mockRestore();
    },
  );
});
