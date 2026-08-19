import { describe, expect, it, jest } from "@jest/globals";
import {
  fetchYahooQuoteSnapshots,
  mapYahooChartMetaQuote,
  normalizeYahooMarketSymbol,
} from "./yahooQuoteProvider";

const chartMeta = (overrides: Record<string, unknown> = {}) => ({
  chartPreviousClose: 169.3,
  currency: "AUD",
  currentTradingPeriod: {
    regular: { end: 1784098800, start: 1784077200 },
  },
  exchangeName: "ASX",
  fullExchangeName: "ASX",
  longName: "Commonwealth Bank of Australia",
  regularMarketPrice: 170,
  regularMarketTime: 1784095810,
  shortName: "CWLTH BANK FPO [CBA]",
  symbol: "CBA.AX",
  ...overrides,
});

function sparkResponse(rows: Array<{ meta: Record<string, unknown>; symbol: string }>) {
  return new Response(
    JSON.stringify({
      spark: {
        error: null,
        result: rows.map(({ meta, symbol }) => ({
          response: [{ meta }],
          symbol,
        })),
      },
    }),
    { status: 200 },
  );
}

function chartResponse(meta: Record<string, unknown>) {
  return new Response(
    JSON.stringify({ chart: { error: null, result: [{ meta }] } }),
    { status: 200 },
  );
}

describe("Yahoo quote provider adapter", () => {
  it("normalizes only safe Yahoo-style market symbols", () => {
    expect(normalizeYahooMarketSymbol(" cba.ax ")).toBe("CBA.AX");
    expect(normalizeYahooMarketSymbol("AUDUSD=X")).toBe("AUDUSD=X");
    expect(normalizeYahooMarketSymbol("https://169.254.169.254")).toBeNull();
    expect(normalizeYahooMarketSymbol("AAPL/../../secret")).toBeNull();
    expect(normalizeYahooMarketSymbol("AAPL?url=file://x")).toBeNull();
    expect(normalizeYahooMarketSymbol("AAPL\u0000")).toBeNull();
  });

  it("maps chart metadata and derives the daily move without losing zeroes", () => {
    expect(
      mapYahooChartMetaQuote(
        chartMeta({
          chartPreviousClose: 0,
          regularMarketPrice: 0,
        }),
        "CBA.AX",
        1784080000,
      ),
    ).toEqual({
      change: 0,
      changePercent: null,
      currency: "AUD",
      exchange: "ASX",
      longName: "Commonwealth Bank of Australia",
      marketState: "REGULAR",
      previousClose: 0,
      price: 0,
      quoteTime: "2026-07-15T06:10:10.000Z",
      shortName: "CWLTH BANK FPO [CBA]",
      symbol: "CBA.AX",
    });

    expect(
      mapYahooChartMetaQuote(
        chartMeta({ previousClose: 100 }),
        "CBA.AX",
        1784100000,
      ),
    ).toEqual(
      expect.objectContaining({
        change: 0.7,
        changePercent: expect.closeTo(0.413467, 5),
        marketState: "CLOSED",
        previousClose: 169.3,
        price: 170,
      }),
    );
    expect(() =>
      mapYahooChartMetaQuote(
        chartMeta({ symbol: "AAPL" }),
        "CBA.AX",
        1784100000,
      ),
    ).toThrow("Market data provider unavailable");
  });

  it("uses one batch spark request, preserves order, and marks omitted symbols unavailable", async () => {
    const fetchImpl = jest.fn<typeof fetch>().mockResolvedValue(
      sparkResponse([{ meta: chartMeta(), symbol: "CBA.AX" }]),
    );

    const result = await fetchYahooQuoteSnapshots(["BHP.AX", "CBA.AX"], {
      fetchImpl,
      now: () => 1784100000000,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain(
      "/v7/finance/spark?symbols=BHP.AX%2CCBA.AX&range=1d&interval=1d",
    );
    expect(result.map((quote) => quote.symbol)).toEqual(["BHP.AX", "CBA.AX"]);
    expect(result[0]).toEqual(expect.objectContaining({ price: null, symbol: "BHP.AX" }));
    expect(result[1]).toEqual(expect.objectContaining({ price: 170, symbol: "CBA.AX" }));
  });

  it("falls back to chart requests and isolates individual symbol failures", async () => {
    const fetchImpl = jest
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockResolvedValueOnce(chartResponse(chartMeta({ symbol: "BHP.AX" })))
      .mockResolvedValueOnce(new Response("limited", { status: 429 }));

    const result = await fetchYahooQuoteSnapshots(["BHP.AX", "CBA.AX"], {
      fallbackBatchSize: 2,
      fetchImpl,
      now: () => 1784100000000,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(String(fetchImpl.mock.calls[1]?.[0])).toContain(
      "/v8/finance/chart/BHP.AX?range=1d&interval=1d",
    );
    expect(result).toEqual([
      expect.objectContaining({ price: 170, symbol: "BHP.AX" }),
      expect.objectContaining({ price: null, symbol: "CBA.AX" }),
    ]);
  });

  it("fails safely when neither the batch nor any chart request is available", async () => {
    const fetchImpl = jest
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("provider secret", { status: 429 }));

    await expect(
      fetchYahooQuoteSnapshots(["AAPL", "CBA.AX"], {
        fallbackBatchSize: 2,
        fetchImpl,
      }),
    ).rejects.toThrow("Market data provider unavailable");
  });

  it("stops launching fallback batches after the shared deadline expires", async () => {
    const fetchImpl = jest
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockResolvedValue(new Response("limited", { status: 429 }));
    const clock = jest
      .fn<() => number>()
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(50)
      .mockReturnValueOnce(101);

    await expect(
      fetchYahooQuoteSnapshots(["AAPL", "CBA.AX", "BHP.AX", "USD"], {
        clock,
        fallbackBatchSize: 2,
        fetchImpl,
        timeoutMs: 100,
      }),
    ).rejects.toThrow("Market data provider unavailable");

    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it.each([404, 429, 500])(
    "does not fan out a batch HTTP %s into per-symbol requests",
    async (status) => {
      const fetchImpl = jest
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("unavailable", { status }));

      await expect(
        fetchYahooQuoteSnapshots(
          Array.from({ length: 20 }, (_, index) => `FAKE${index}`),
          { fetchImpl },
        ),
      ).rejects.toThrow("Market data provider unavailable");

      expect(fetchImpl).toHaveBeenCalledTimes(1);
    },
  );
});
