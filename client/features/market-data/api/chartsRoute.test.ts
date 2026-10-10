import type { NextApiRequest, NextApiResponse } from "next";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import handler from "@/pages/api/market/charts";

function responseHarness() {
  const response = {
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
  } as unknown as NextApiResponse;
  return response;
}

function request(
  symbols: string,
  range = "3m",
  method = "GET",
): NextApiRequest {
  return {
    headers: { "x-forwarded-for": "203.0.113.88" },
    method,
    query: { range, symbols },
    socket: {},
  } as unknown as NextApiRequest;
}

function chartResponse(symbol: string) {
  return new Response(
    JSON.stringify({
      chart: {
        error: null,
        result: [
          {
            indicators: { quote: [{ close: [100, 105] }] },
            meta: {
              currency: symbol === "AAPL" ? "USD" : "AUD",
              regularMarketPrice: 105,
              symbol,
            },
            timestamp: [1784094000, 1784094060],
          },
        ],
      },
    }),
    { status: 200 },
  );
}

describe("/api/market/charts", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns an ordered bounded comparison with partial failures", async () => {
    jest.spyOn(global, "fetch").mockImplementation(async (input) => {
      const symbol = decodeURIComponent(
        new URL(String(input)).pathname.split("/").at(-1) ?? "",
      );
      return symbol === "BHP.AX"
        ? new Response("unavailable", { status: 429 })
        : chartResponse(symbol);
    });
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const response = responseHarness();

    await handler(request("CBA.AX,BHP.AX,AAPL"), response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      rangeId: "3m",
      snapshots: [
        expect.objectContaining({ symbol: "CBA.AX" }),
        expect.objectContaining({ symbol: "AAPL" }),
      ],
      unavailableSymbols: ["BHP.AX"],
    });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it.each([
    ["", "3m"],
    ["bad symbol", "3m"],
    ["AAPL,MSFT,NVDA,AMZN,META", "3m"],
    ["AAPL", "arbitrary"],
  ])(
    "rejects unsafe or oversized comparison input: %s / %s",
    async (symbols, range) => {
      const fetchSpy = jest.spyOn(global, "fetch");
      const response = responseHarness();

      await handler(request(symbols, range), response);

      expect(response.status).toHaveBeenCalledWith(400);
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );
});
