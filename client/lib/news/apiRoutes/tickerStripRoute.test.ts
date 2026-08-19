import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/market/ticker-strip";
import { buildMarketNewsTickerStripSnapshot } from "@/lib/news/tickerStrip";

jest.mock("@/lib/news/tickerStrip", () => ({
  ...jest.requireActual("@/lib/news/tickerStrip"),
  buildMarketNewsTickerStripSnapshot: jest.fn(),
}));

const mockBuildMarketNewsTickerStripSnapshot =
  buildMarketNewsTickerStripSnapshot as jest.MockedFunction<
    typeof buildMarketNewsTickerStripSnapshot
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

function createRequest({
  body,
  method = "GET",
  query = {},
}: {
  body?: unknown;
  method?: string;
  query?: NextApiRequest["query"];
} = {}) {
  return {
    body,
    headers: {},
    method,
    query,
    socket: { remoteAddress: "127.0.0.1" },
  } as unknown as NextApiRequest;
}

describe("/api/market/ticker-strip", () => {
  beforeEach(() => {
    mockBuildMarketNewsTickerStripSnapshot.mockResolvedValue({
      scopeId: "australia",
      providerLabel: "Yahoo Finance",
      refreshMs: 60_000,
      source: "live",
      strategy: "core-plus-dynamic-movers",
      tickers: [],
      updatedAt: "2026-06-21T00:00:00.000Z",
      warnings: [],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("allows shared short-lived caching for public scope snapshots", async () => {
    const { headers, res } = createResponse();

    await handler(createRequest({ query: { scope: "australia" } }), res);

    expect(headers.get("cache-control")).toBe(
      "s-maxage=45, stale-while-revalidate=120",
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockBuildMarketNewsTickerStripSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ watchlistSymbols: [] }),
    );
  });

  it("accepts personalized symbols in a private POST body", async () => {
    const { headers, res } = createResponse();

    await handler(
      createRequest({
        body: { watchlistSymbols: [" cba.ax ", "bad symbol", "NVDA", "NVDA"] },
        method: "POST",
        query: {
          scope: "australia",
        },
      }),
      res,
    );

    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockBuildMarketNewsTickerStripSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ watchlistSymbols: ["CBA.AX", "NVDA"] }),
    );
  });

  it("rejects unsupported methods and invalid personalized bodies", async () => {
    const unsupported = createResponse();
    await handler(createRequest({ method: "DELETE" }), unsupported.res);
    expect(unsupported.res.status).toHaveBeenCalledWith(405);
    expect(mockBuildMarketNewsTickerStripSnapshot).not.toHaveBeenCalled();

    const invalid = createResponse();
    await handler(
      createRequest({
        body: { watchlistSymbols: "CBA.AX" },
        method: "POST",
      }),
      invalid.res,
    );
    expect(invalid.res.status).toHaveBeenCalledWith(400);
    expect(mockBuildMarketNewsTickerStripSnapshot).not.toHaveBeenCalled();

    const leakedQuery = createResponse();
    await handler(
      createRequest({ query: { watchlist: "CBA.AX" } }),
      leakedQuery.res,
    );
    expect(leakedQuery.res.status).toHaveBeenCalledWith(400);
    expect(mockBuildMarketNewsTickerStripSnapshot).not.toHaveBeenCalled();
  });

  it("redacts ticker strip build errors from client responses", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const providerError = new Error("Yahoo token rejected API_SECRET=hidden");
    mockBuildMarketNewsTickerStripSnapshot.mockRejectedValueOnce(providerError);
    const { headers, res } = createResponse();

    await handler(createRequest({ query: { scope: "australia" } }), res);

    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      error: "Market ticker snapshots are temporarily unavailable.",
    });
    expect(JSON.stringify((res.json as jest.Mock).mock.calls)).not.toContain(
      "API_SECRET",
    );
    expect(consoleError).toHaveBeenCalledWith("Market ticker strip error", {
      name: "Error",
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("API_SECRET");

    consoleError.mockRestore();
  });
});
