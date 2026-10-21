import { afterEach, describe, expect, it, jest } from "@jest/globals";
import type { NextApiResponse } from "next";
import { marketApiRateLimiter } from "@/lib/server/marketApiGuard";
import chartHandler from "@/pages/api/market/chart";
import chartsHandler from "@/pages/api/market/charts";
import quoteHandler from "@/pages/api/market/quote";
import quotesHandler from "@/pages/api/market/quotes";
import sparklineHandler from "@/pages/api/market/sparkline";
import symbolSearchHandler from "@/pages/api/market/symbol-search";
import tickerStripHandler from "@/pages/api/market/ticker-strip";
import trendingHandler from "@/pages/api/market/trending";
import watchlistQuotesHandler from "@/pages/api/market/watchlist-quotes";

const PRIVATE_NO_STORE = "private, no-store, max-age=0";
const requestBase = {
  headers: { "x-forwarded-for": "203.0.113.99" },
  socket: { remoteAddress: "198.51.100.42" },
};
const routes = [
  {
    name: "quote",
    handler: quoteHandler,
    namespace: "market-quote",
    query: { symbol: "AAPL" },
    invalidQuery: { symbol: "" },
    validatesBeforeAdmission: false,
    error: "Too many quote requests. Please wait a moment.",
  },
  {
    name: "quotes",
    handler: quotesHandler,
    namespace: "market-quotes",
    query: { symbols: "AAPL,MSFT" },
    invalidQuery: { symbols: "" },
    validatesBeforeAdmission: false,
    error: "Too many quote requests. Please wait a moment.",
  },
  {
    name: "chart",
    handler: chartHandler,
    namespace: "market-data",
    query: { symbol: "AAPL", range: "1d" },
    invalidQuery: { symbol: "AAPL", range: "invalid" },
    validatesBeforeAdmission: true,
    error: "Too many chart requests. Please wait a moment.",
  },
  {
    name: "charts",
    handler: chartsHandler,
    namespace: "market-data",
    query: { symbols: "AAPL,MSFT", range: "3m" },
    invalidQuery: { symbols: "AAPL,", range: "3m" },
    validatesBeforeAdmission: true,
    cost: 2,
    error: "Too many chart requests. Please wait a moment.",
  },
  {
    name: "sparkline",
    handler: sparklineHandler,
    namespace: "market-data",
    query: { symbol: "AAPL" },
    invalidQuery: { symbol: "" },
    validatesBeforeAdmission: true,
    error: "Too many chart requests. Please wait a moment.",
  },
  {
    name: "symbol-search",
    handler: symbolSearchHandler,
    namespace: "symbol-search",
    query: { q: "Apple" },
    invalidQuery: { q: "<script>" },
    validatesBeforeAdmission: false,
    error: "Too many searches. Please wait a moment.",
  },
  {
    name: "ticker-strip",
    handler: tickerStripHandler,
    namespace: "market-ticker-strip",
    query: { scope: "AU" },
    invalidQuery: { watchlist: "AAPL" },
    validatesBeforeAdmission: false,
    allowHeader: "GET, POST",
    error: "Too many market requests. Please wait a moment.",
  },
  {
    name: "trending",
    handler: trendingHandler,
    namespace: "market-trending",
    query: { region: "AU" },
    invalidQuery: { region: "A" },
    validatesBeforeAdmission: true,
    cost: 2,
    error: "Too many market requests. Please wait a moment.",
  },
];

function responseHarness() {
  const headers = new Map<string, string>();
  const response = {
    json: jest.fn(),
    setHeader: jest.fn((name: string, value: string) => {
      headers.set(name.toLowerCase(), value);
    }),
    status: jest.fn(),
  };
  response.status.mockReturnValue(response);
  return {
    headers,
    response: response as unknown as NextApiResponse,
  };
}

describe("market route admission and privacy contracts", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("keeps watchlist quotes as the same handler as batched market quotes", () => {
    expect(watchlistQuotesHandler).toBe(quotesHandler);
  });

  it.each(routes)(
    "$name rejects unsupported methods before admission",
    async (route) => {
      const allow = jest.spyOn(marketApiRateLimiter, "allow");
      const fetchSpy = jest.spyOn(global, "fetch");
      const { headers, response } = responseHarness();

      await route.handler(
        { ...requestBase, method: "PATCH", query: route.query } as never,
        response as never,
      );

      expect(response.status).toHaveBeenCalledWith(405);
      expect(response.json).toHaveBeenCalledWith({
        error: "Method not allowed.",
      });
      expect(headers.get("allow")).toBe(route.allowHeader ?? "GET");
      expect(headers.get("cache-control")).toBe(PRIVATE_NO_STORE);
      expect(allow).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it.each(routes)(
    "$name preserves its rate-limit namespace, cost and error",
    async (route) => {
      const allow = jest
        .spyOn(marketApiRateLimiter, "allow")
        .mockReturnValue(false);
      const fetchSpy = jest.spyOn(global, "fetch");
      const { headers, response } = responseHarness();

      await route.handler(
        { ...requestBase, method: "GET", query: route.query } as never,
        response as never,
      );

      const args = [`${route.namespace}:198.51.100.42`];
      expect(allow.mock.calls).toEqual([
        route.cost === undefined ? args : [...args, route.cost],
      ]);
      expect(response.status).toHaveBeenCalledWith(429);
      expect(response.json).toHaveBeenCalledWith({ error: route.error });
      expect(headers.get("retry-after")).toBe("60");
      expect(headers.get("cache-control")).toBe(PRIVATE_NO_STORE);
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it.each(routes)(
    "$name keeps invalid-input validation at its admission stage",
    async (route) => {
      const allow = jest
        .spyOn(marketApiRateLimiter, "allow")
        .mockReturnValue(false);
      const fetchSpy = jest.spyOn(global, "fetch");
      const { headers, response } = responseHarness();

      await route.handler(
        { ...requestBase, method: "GET", query: route.invalidQuery } as never,
        response as never,
      );

      expect(response.status).toHaveBeenCalledWith(
        route.validatesBeforeAdmission ? 400 : 429,
      );
      expect(allow).toHaveBeenCalledTimes(
        route.validatesBeforeAdmission ? 0 : 1,
      );
      expect(headers.get("cache-control")).toBe(PRIVATE_NO_STORE);
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it.each(routes)(
    "$name keeps admitted invalid-input errors private",
    async (route) => {
      jest.spyOn(marketApiRateLimiter, "allow").mockReturnValue(true);
      const fetchSpy = jest.spyOn(global, "fetch");
      const { headers, response } = responseHarness();

      await route.handler(
        { ...requestBase, method: "GET", query: route.invalidQuery } as never,
        response as never,
      );

      expect(response.status).toHaveBeenCalledWith(400);
      expect(headers.get("cache-control")).toBe(PRIVATE_NO_STORE);
      expect(headers.has("retry-after")).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it.each([1, 2, 3, 4])(
    "charges a chart comparison for its %i distinct symbols",
    async (cost) => {
      const allow = jest
        .spyOn(marketApiRateLimiter, "allow")
        .mockReturnValue(false);
      const { response } = responseHarness();
      const symbols = ["AAPL", "MSFT", "NVDA", "AMZN"].slice(0, cost);

      await chartsHandler(
        {
          ...requestBase,
          method: "GET",
          query: { symbols: [" aapl ", ...symbols].join(","), range: "3m" },
        } as never,
        response as never,
      );

      expect(allow).toHaveBeenCalledWith("market-data:198.51.100.42", cost);
      expect(response.status).toHaveBeenCalledWith(429);
    },
  );

  it("admits personalized ticker POST requests through the same bucket", async () => {
    const allow = jest
      .spyOn(marketApiRateLimiter, "allow")
      .mockReturnValue(false);
    const fetchSpy = jest.spyOn(global, "fetch");
    const { headers, response } = responseHarness();

    await tickerStripHandler(
      {
        ...requestBase,
        body: { watchlistSymbols: ["AAPL"] },
        method: "POST",
        query: {},
      } as never,
      response as never,
    );

    expect(allow).toHaveBeenCalledWith("market-ticker-strip:198.51.100.42");
    expect(response.status).toHaveBeenCalledWith(429);
    expect(headers.get("cache-control")).toBe(PRIVATE_NO_STORE);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
