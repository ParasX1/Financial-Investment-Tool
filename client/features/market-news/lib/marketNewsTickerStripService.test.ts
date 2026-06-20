import { describe, expect, it, jest } from "@jest/globals";
import { resolveMarketNewsMarketScope } from "./marketNewsNavigation";
import { buildMarketNewsTickerStripSnapshot } from "./marketNewsTickerStripService";

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

describe("marketNewsTickerStripService", () => {
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
      "Live Yahoo Finance quote data was unavailable, so configured fallback quotes are shown.",
    );
    expect(snapshot.tickers[0]).toMatchObject({
      signal: "Core",
      symbol: "^AORD",
      value: "9,128.00",
    });
  });
});
