import { describe, expect, it } from "@jest/globals";
import {
  MAX_MARKET_CHART_COMPARISON_SYMBOLS,
  MARKET_CHART_RANGE_OPTIONS,
  getMarketChartRange,
  isMarketChartRangeId,
} from "./chartRanges";

describe("market chart ranges", () => {
  it("offers familiar finance ranges with provider-safe intervals", () => {
    expect(
      MARKET_CHART_RANGE_OPTIONS.map(({ id, interval, providerRange }) => [
        id,
        providerRange,
        interval,
      ]),
    ).toEqual([
      ["1d", "1d", "1m"],
      ["5d", "5d", "15m"],
      ["1m", "1mo", "1h"],
      ["3m", "3mo", "1d"],
      ["6m", "6mo", "1d"],
      ["ytd", "ytd", "1d"],
      ["1y", "1y", "1d"],
      ["5y", "5y", "1wk"],
      ["max", "max", "1mo"],
    ]);
    expect(MAX_MARKET_CHART_COMPARISON_SYMBOLS).toBe(4);
  });

  it("validates external range values instead of forwarding arbitrary input", () => {
    expect(isMarketChartRangeId("3m")).toBe(true);
    expect(isMarketChartRangeId("script")).toBe(false);
    expect(getMarketChartRange("5y")).toMatchObject({
      id: "5y",
      label: "5Y",
    });
    expect(getMarketChartRange(undefined)).toMatchObject({
      id: "1d",
      label: "1D",
    });
  });
});
