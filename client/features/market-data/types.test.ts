import { describe, expect, it } from "@jest/globals";
import { isMarketChartSnapshot, isMarketQuotesResponse } from "./types";

describe("market data runtime contracts", () => {
  it("accepts complete quote and chart payloads", () => {
    expect(
      isMarketQuotesResponse({
        quotes: [
          {
            change: 1,
            changePercent: 0.5,
            currency: "AUD",
            exchange: "ASX",
            longName: "Commonwealth Bank",
            marketState: "REGULAR",
            previousClose: 119,
            price: 120,
            quoteTime: "2026-07-15T04:00:00.000Z",
            shortName: null,
            symbol: "CBA.AX",
          },
        ],
        unavailableSymbols: [],
      }),
    ).toBe(true);
    expect(
      isMarketChartSnapshot({
        currency: "AUD",
        exchange: "ASX",
        marketState: "REGULAR",
        points: [{ timeMs: 1_752_550_400_000, value: 120 }],
        previousClose: 119,
        quoteTime: "2026-07-15T04:00:00.000Z",
        regularMarketPrice: 120,
        symbol: "CBA.AX",
      }),
    ).toBe(true);
  });

  it("rejects null, wrong collection types, and non-finite chart points", () => {
    expect(isMarketQuotesResponse(null)).toBe(false);
    expect(
      isMarketQuotesResponse({
        quotes: "not-an-array",
        unavailableSymbols: [],
      }),
    ).toBe(false);
    expect(
      isMarketChartSnapshot({
        currency: "AUD",
        exchange: "ASX",
        marketState: "REGULAR",
        points: [{ timeMs: 1, value: Number.NaN }],
        previousClose: 119,
        quoteTime: null,
        regularMarketPrice: 120,
        symbol: "CBA.AX",
      }),
    ).toBe(false);
  });
});
