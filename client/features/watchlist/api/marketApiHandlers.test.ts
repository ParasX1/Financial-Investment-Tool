import { afterEach, describe, expect, it, jest } from "@jest/globals";
import type { NextApiResponse } from "next";
import symbolSearchHandler from "../../../pages/api/market/symbol-search";
import watchlistQuotesHandler from "../../../pages/api/market/watchlist-quotes";

function responseHarness<T>() {
  const json = jest.fn();
  const setHeader = jest.fn();
  const response = {
    json,
    setHeader,
    status: jest.fn(),
  };
  response.status.mockReturnValue(response);
  return { json, response: response as unknown as NextApiResponse<T>, setHeader };
}

const requestBase = {
  headers: {},
  socket: { remoteAddress: "127.0.0.1" },
};

describe("watchlist market API handlers", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("rejects unsupported methods and invalid input before provider calls", async () => {
    const quoteResponse = responseHarness();
    const searchResponse = responseHarness();
    const fetchSpy = jest.spyOn(global, "fetch");

    await watchlistQuotesHandler(
      { ...requestBase, method: "POST", query: {} } as never,
      quoteResponse.response as never,
    );
    await symbolSearchHandler(
      { ...requestBase, method: "GET", query: { q: "<script>" } } as never,
      searchResponse.response as never,
    );

    expect(quoteResponse.response.status).toHaveBeenCalledWith(405);
    expect(quoteResponse.setHeader).toHaveBeenCalledWith("Allow", "GET");
    expect(searchResponse.response.status).toHaveBeenCalledWith(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps requested quote order and fills missing provider rows", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          spark: {
            error: null,
            result: [
              {
                response: [{
                  meta: {
                    currency: "AUD",
                    regularMarketPrice: 120,
                    symbol: "CBA.AX",
                  },
                }],
                symbol: "CBA.AX",
              },
            ],
          },
        }),
        { status: 200 },
      ),
    );
    const harness = responseHarness<{ quotes: unknown[] }>();

    await watchlistQuotesHandler(
      {
        ...requestBase,
        method: "GET",
        query: { symbols: "BHP.AX,CBA.AX" },
      } as never,
      harness.response as never,
    );

    expect(harness.response.status).toHaveBeenCalledWith(200);
    expect(harness.json).toHaveBeenCalledWith({
      quotes: [
        expect.objectContaining({ price: null, symbol: "BHP.AX" }),
        expect.objectContaining({ price: 120, symbol: "CBA.AX" }),
      ],
      unavailableSymbols: ["BHP.AX"],
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("redacts complete quote provider failures", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response("provider secret", { status: 429 }),
    );
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const harness = responseHarness();

    await watchlistQuotesHandler(
      {
        ...requestBase,
        method: "GET",
        query: { symbols: "AAPL,CBA.AX" },
      } as never,
      harness.response as never,
    );

    expect(harness.response.status).toHaveBeenCalledWith(502);
    expect(harness.json).toHaveBeenCalledWith({
      error: "Market data is temporarily unavailable.",
    });
    expect(JSON.stringify(harness.json.mock.calls)).not.toContain("provider secret");
  });

  it("sanitizes provider failures", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("provider secret"));
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const harness = responseHarness();

    await symbolSearchHandler(
      { ...requestBase, method: "GET", query: { q: "CBA" } } as never,
      harness.response as never,
    );

    expect(harness.response.status).toHaveBeenCalledWith(502);
    expect(harness.json).toHaveBeenCalledWith({
      error: "Symbol search is temporarily unavailable.",
    });
  });
});
