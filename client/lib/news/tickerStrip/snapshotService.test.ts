import { describe, expect, it, jest } from "@jest/globals";
import {
  buildMarketNewsTickerStripSnapshot,
  resolveMarketNewsMarketScope,
} from "./index";

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}

function quoteRow(symbol: string, changePct: number, price = 100) {
  const previousClose = price / (1 + changePct / 100);

  return {
    currency: "USD",
    longName: symbol,
    marketState: "REGULAR",
    regularMarketPreviousClose: previousClose,
    regularMarketPrice: price,
    shortName: symbol,
    symbol,
  };
}

describe("tickerStrip snapshot service", () => {
  it("builds one live ticker strip snapshot with stable anchors, ranked movers, and macro context", async () => {
    const fetcher = jest.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.includes("/v1/finance/trending/region/")) {
        return jsonResponse({
          finance: {
            result: [
              {
                quotes: [
                  { symbol: "CBA.AX" },
                  { symbol: "BHP.AX" },
                  { symbol: "TLS.AX" },
                ],
              },
            ],
          },
        });
      }

      if (url.includes("/v7/finance/quote")) {
        const symbols =
          new URL(url).searchParams.get("symbols")?.split(",") ?? [];

        return jsonResponse({
          quoteResponse: {
            result: symbols.map((symbol) =>
              quoteRow(symbol, symbol === "BHP.AX" ? 4.5 : 1.25),
            ),
          },
        });
      }

      if (url.includes("/v8/finance/chart/")) {
        const timestamps = Array.from({ length: 80 }, (_, index) => index + 1);

        return jsonResponse({
          chart: {
            result: [
              {
                timestamp: timestamps,
                indicators: {
                  quote: [{ close: timestamps.map((point) => 98 + point) }],
                },
              },
            ],
          },
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    const snapshot = await buildMarketNewsTickerStripSnapshot({
      fetcher,
      marketScope: resolveMarketNewsMarketScope("australia"),
      now: () => new Date("2026-06-21T01:02:03.000Z"),
      watchlistSymbols: ["NVDA"],
    });

    expect(snapshot).toMatchObject({
      providerLabel: "Yahoo Finance",
      refreshMs: 60_000,
      scopeId: "australia",
      source: "live",
      strategy: "core-plus-dynamic-movers",
      updatedAt: "2026-06-21T01:02:03.000Z",
    });
    expect(
      snapshot.tickers.map((ticker) => ({
        signal: ticker.signal,
        symbol: ticker.symbol,
      })),
    ).toEqual([
      { signal: "Core", symbol: "^AORD" },
      { signal: "Core", symbol: "^AXJO" },
      { signal: "Core", symbol: "AUDUSD=X" },
      { signal: "Watchlist", symbol: "NVDA" },
      { signal: "Mover", symbol: "BHP.AX" },
      { signal: "Macro", symbol: "CL=F" },
      { signal: "Macro", symbol: "GC=F" },
      { signal: "Macro", symbol: "BTC-AUD" },
    ]);
    expect(
      Math.max(...snapshot.tickers.map((ticker) => ticker.sparkline.length)),
    ).toBeLessThanOrEqual(42);
    expect(snapshot.tickers[0]?.previousClose).toBeCloseTo(
      100 / (1 + 1.25 / 100),
    );
  });

  it("keeps display-safe fallback tickers when Yahoo requests fail", async () => {
    const snapshot = await buildMarketNewsTickerStripSnapshot({
      fetcher: jest.fn(async () => {
        throw new Error("network unavailable");
      }),
      marketScope: resolveMarketNewsMarketScope("australia"),
      now: () => new Date("2026-06-21T01:02:03.000Z"),
      watchlistSymbols: [],
    });

    expect(snapshot.source).toBe("fallback");
    expect(snapshot.updatedAt).toBeNull();
    expect(snapshot.warnings).toContain(
      "Live Yahoo Finance quote data was unavailable, so quote cards show no live data.",
    );
    expect(snapshot.tickers[0]).toMatchObject({
      change: "No live data",
      signal: "Core",
      sparkline: [],
      sparklineSource: "fallback",
      symbol: "^AORD",
      tone: "neutral",
      value: "Quote unavailable",
    });
  });

  it("does not mark Yahoo chart points as live when daily quote fields are missing", async () => {
    const fetcher = jest.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.includes("/v1/finance/trending/region/")) {
        return jsonResponse({ finance: { result: [{ quotes: [] }] } });
      }

      if (url.includes("/v7/finance/quote")) {
        return new Response(JSON.stringify({ quoteResponse: { result: [] } }), {
          status: 401,
        });
      }

      if (url.includes("/v8/finance/chart/")) {
        return jsonResponse({
          chart: {
            result: [
              {
                indicators: {
                  quote: [{ close: [100, 101, 102] }],
                },
                meta: {},
                timestamp: [1, 2, 3],
              },
            ],
          },
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    const snapshot = await buildMarketNewsTickerStripSnapshot({
      fetcher,
      marketScope: resolveMarketNewsMarketScope("australia"),
      now: () => new Date("2026-06-21T01:02:03.000Z"),
      watchlistSymbols: [],
    });

    expect(snapshot.source).toBe("fallback");
    expect(snapshot.updatedAt).toBeNull();
    expect(snapshot.warnings).toContain(
      "Live Yahoo Finance quote data was unavailable, so quote cards show no live data.",
    );
    expect(snapshot.tickers[0]).toMatchObject({
      change: "No live data",
      sparkline: [],
      sparklineSource: "fallback",
      symbol: "^AORD",
      tone: "neutral",
      value: "Quote unavailable",
    });
  });

  it("uses chart metadata for futures when Yahoo returns no 1d intraday points", async () => {
    const fetcher = jest.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.includes("/v1/finance/trending/region/")) {
        return jsonResponse({ finance: { result: [{ quotes: [] }] } });
      }

      if (url.includes("/v7/finance/quote")) {
        return new Response(JSON.stringify({ quoteResponse: { result: [] } }), {
          status: 401,
        });
      }

      if (url.includes("/v8/finance/chart/CL%3DF")) {
        return jsonResponse({
          chart: {
            result: [
              {
                indicators: { quote: [{ close: [] }] },
                meta: {
                  chartPreviousClose: 75.85,
                  previousClose: 75.85,
                  regularMarketPrice: 76.54,
                },
                timestamp: [],
              },
            ],
          },
        });
      }

      if (url.includes("/v8/finance/chart/GC%3DF")) {
        return jsonResponse({
          chart: {
            result: [
              {
                indicators: { quote: [{ close: [] }] },
                meta: {
                  chartPreviousClose: 4245.9,
                  previousClose: 4245.9,
                  regularMarketPrice: 4172.9,
                },
                timestamp: [],
              },
            ],
          },
        });
      }

      return jsonResponse({
        chart: {
          result: [
            {
              indicators: { quote: [{ close: [] }] },
              meta: {},
              timestamp: [],
            },
          ],
        },
      });
    });

    const snapshot = await buildMarketNewsTickerStripSnapshot({
      fetcher,
      marketScope: resolveMarketNewsMarketScope("australia"),
      now: () => new Date("2026-06-21T01:02:03.000Z"),
      watchlistSymbols: [],
    });
    const oil = snapshot.tickers.find((ticker) => ticker.symbol === "CL=F");
    const gold = snapshot.tickers.find((ticker) => ticker.symbol === "GC=F");

    expect(snapshot.source).toBe("mixed");
    expect(snapshot.warnings).toContain(
      "Some Yahoo 1D quote lines are unavailable, so those cards show price metadata without a sparkline.",
    );
    expect(oil).toMatchObject({
      change: "+0.69 +0.91%",
      previousClose: 75.85,
      sparkline: [],
      sparklineSource: "unavailable",
      tone: "positive",
      value: "76.54",
    });
    expect(gold).toMatchObject({
      change: "-73.00 -1.72%",
      previousClose: 4245.9,
      sparkline: [],
      sparklineSource: "unavailable",
      tone: "negative",
      value: "4,172.90",
    });
  });

  it("does not replace an empty Yahoo 1d futures chart with 5d points", async () => {
    const fetcher = jest.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.includes("/v1/finance/trending/region/")) {
        return jsonResponse({ finance: { result: [{ quotes: [] }] } });
      }

      if (url.includes("/v7/finance/quote")) {
        return new Response(JSON.stringify({ quoteResponse: { result: [] } }), {
          status: 401,
        });
      }

      if (url.includes("/v8/finance/chart/CL%3DF")) {
        const isFallbackRange = url.includes("range=5d");

        return jsonResponse({
          chart: {
            result: [
              {
                indicators: {
                  quote: [
                    {
                      close: isFallbackRange ? [75.8, 75.9, 76.2, 76.54] : [],
                    },
                  ],
                },
                meta: {
                  chartPreviousClose: isFallbackRange ? 80.75 : 75.85,
                  previousClose: 75.85,
                  regularMarketPrice: 76.54,
                },
                timestamp: isFallbackRange ? [1, 2, 3, 4] : [],
              },
            ],
          },
        });
      }

      if (url.includes("/v8/finance/chart/GC%3DF")) {
        const isFallbackRange = url.includes("range=5d");

        return jsonResponse({
          chart: {
            result: [
              {
                indicators: {
                  quote: [
                    {
                      close: isFallbackRange ? [4246, 4230, 4200, 4172.9] : [],
                    },
                  ],
                },
                meta: {
                  chartPreviousClose: isFallbackRange ? 4328 : 4245.9,
                  previousClose: 4245.9,
                  regularMarketPrice: 4172.9,
                },
                timestamp: isFallbackRange ? [1, 2, 3, 4] : [],
              },
            ],
          },
        });
      }

      return jsonResponse({
        chart: {
          result: [
            {
              indicators: { quote: [{ close: [] }] },
              meta: {},
              timestamp: [],
            },
          ],
        },
      });
    });

    const snapshot = await buildMarketNewsTickerStripSnapshot({
      fetcher,
      marketScope: resolveMarketNewsMarketScope("australia"),
      now: () => new Date("2026-06-22T01:02:03.000Z"),
      watchlistSymbols: [],
    });
    const oil = snapshot.tickers.find((ticker) => ticker.symbol === "CL=F");
    const gold = snapshot.tickers.find((ticker) => ticker.symbol === "GC=F");

    expect(oil).toMatchObject({
      previousClose: 75.85,
      sparkline: [],
      sparklineSource: "unavailable",
      value: "76.54",
    });
    expect(gold).toMatchObject({
      previousClose: 4245.9,
      sparkline: [],
      sparklineSource: "unavailable",
      value: "4,172.90",
    });
    expect(snapshot.warnings).toContain(
      "Some Yahoo 1D quote lines are unavailable, so those cards show price metadata without a sparkline.",
    );
    expect(
      fetcher.mock.calls.some(([url]) => String(url).includes("range=5d")),
    ).toBe(false);
  });
});
