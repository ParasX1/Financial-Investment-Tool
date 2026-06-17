import { describe, expect, it } from "@jest/globals";
import { mergeMarketNewsTickerQuote } from "./marketNewsTickerQuotes";

describe("marketNewsTickerQuotes", () => {
  it("merges live Yahoo-style quote data into a market news ticker", () => {
    const ticker = {
      symbol: "^GSPC",
      label: "S&P 500",
      value: "6,005.88",
      change: "+34.42 +0.58%",
      tone: "positive" as const,
      sparkline: [1, 2, 3],
    };

    expect(
      mergeMarketNewsTickerQuote(ticker, {
        quote: {
          symbol: "^GSPC",
          price: 6123.456,
          prevClose: 6100,
          change: 23.456,
          changePct: 0.3845,
        },
        sparkline: {
          symbol: "^GSPC",
          points: [
            { t: 1, v: 6110 },
            { t: 2, v: 6120 },
          ],
        },
      }),
    ).toEqual({
      ...ticker,
      value: "6,123.46",
      change: "+23.46 +0.38%",
      tone: "positive",
      sparkline: [6110, 6120],
    });
  });

  it("keeps configured fallback data when live quote fields are missing", () => {
    const ticker = {
      symbol: "AUDUSD=X",
      label: "AUD/USD",
      value: "0.7071",
      change: "+0.0028 +0.39%",
      tone: "positive" as const,
      sparkline: [20, 21, 22],
    };

    expect(
      mergeMarketNewsTickerQuote(ticker, {
        quote: null,
        sparkline: { symbol: "AUDUSD=X", points: [] },
      }),
    ).toEqual(ticker);
  });

  it("uses sparkline endpoints as a price fallback for sparse quote responses", () => {
    const ticker = {
      symbol: "NVDA",
      label: "Lookup selected",
      value: "Quote unavailable",
      change: "No live data",
      tone: "neutral" as const,
      sparkline: [],
    };

    expect(
      mergeMarketNewsTickerQuote(ticker, {
        quote: {
          symbol: "NVDA",
          price: null,
          prevClose: null,
          change: null,
          changePct: null,
          shortName: "NVIDIA Corporation",
        },
        sparkline: {
          symbol: "NVDA",
          points: [
            { t: 1, v: 200 },
            { t: 2, v: 210 },
          ],
        },
      }),
    ).toEqual({
      ...ticker,
      change: "+10.00 +5.00%",
      label: "NVIDIA Corporation",
      sparkline: [200, 210],
      tone: "positive",
      value: "210.00",
    });
  });
});
