import { describe, expect, it } from "@jest/globals";
import type { MarketChartSnapshot } from "../types";
import { buildNormalizedMarketSeries } from "./marketChartComparison";

function snapshot(
  symbol: string,
  values: readonly number[],
): MarketChartSnapshot {
  return {
    currency: symbol === "AAPL" ? "USD" : "AUD",
    exchange: null,
    interval: "1d",
    marketState: "CLOSED",
    points: values.map((value, index) => ({
      timeMs: Date.UTC(2026, 0, index + 1),
      value,
    })),
    previousClose: null,
    quoteTime: null,
    rangeId: "3m",
    regularMarketPrice: values.at(-1) ?? null,
    symbol,
  };
}

describe("market chart comparison normalization", () => {
  it("compares different currencies and price scales as percentage performance", () => {
    expect(
      buildNormalizedMarketSeries([
        snapshot("CBA.AX", [100, 110]),
        snapshot("AAPL", [200, 180]),
      ]),
    ).toEqual([
      {
        points: [
          { timeMs: Date.UTC(2026, 0, 1), value: 0 },
          { timeMs: Date.UTC(2026, 0, 2), value: 10 },
        ],
        symbol: "CBA.AX",
      },
      {
        points: [
          { timeMs: Date.UTC(2026, 0, 1), value: 0 },
          { timeMs: Date.UTC(2026, 0, 2), value: -10 },
        ],
        symbol: "AAPL",
      },
    ]);
  });

  it("drops unusable zero-baseline series instead of inventing performance", () => {
    expect(buildNormalizedMarketSeries([snapshot("ZERO", [0, 1])])).toEqual(
      [],
    );
  });
});
