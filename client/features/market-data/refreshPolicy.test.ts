import { describe, expect, it } from "@jest/globals";
import {
  MARKET_REFRESH_INTERVALS,
  getChartRefreshInterval,
  getQuoteRefreshInterval,
  getRangeAwareChartRefreshInterval,
  getRetryInterval,
} from "./refreshPolicy";

describe("market-data refresh policy", () => {
  it("refreshes active, extended, closed, and unknown markets at different cadences", () => {
    expect(getQuoteRefreshInterval([{ marketState: "REGULAR" }])).toBe(
      MARKET_REFRESH_INTERVALS.activeQuoteMs,
    );
    expect(
      getQuoteRefreshInterval([
        { marketState: "CLOSED" },
        { marketState: "POST" },
      ]),
    ).toBe(MARKET_REFRESH_INTERVALS.extendedQuoteMs);
    expect(
      getQuoteRefreshInterval([
        { marketState: "CLOSED" },
        { marketState: "CLOSED" },
      ]),
    ).toBe(MARKET_REFRESH_INTERVALS.closedMs);
    expect(getQuoteRefreshInterval([{ marketState: null }])).toBe(
      MARKET_REFRESH_INTERVALS.unknownQuoteMs,
    );
  });

  it("uses a slower chart cadence and bounded exponential retry backoff", () => {
    expect(getChartRefreshInterval("REGULAR")).toBe(
      MARKET_REFRESH_INTERVALS.activeChartMs,
    );
    expect(getChartRefreshInterval("PRE")).toBe(
      MARKET_REFRESH_INTERVALS.extendedChartMs,
    );
    expect(getChartRefreshInterval("CLOSED")).toBe(
      MARKET_REFRESH_INTERVALS.closedMs,
    );
    expect([0, 1, 2, 3, 9].map(getRetryInterval)).toEqual([
      30_000, 60_000, 120_000, 120_000, 120_000,
    ]);
  });

  it("slows polling as chart history gets larger", () => {
    expect(getRangeAwareChartRefreshInterval("REGULAR", "1d")).toBe(30_000);
    expect(getRangeAwareChartRefreshInterval("REGULAR", "5d")).toBe(60_000);
    expect(getRangeAwareChartRefreshInterval("REGULAR", "1m")).toBe(300_000);
    expect(getRangeAwareChartRefreshInterval("REGULAR", "3m")).toBe(900_000);
    expect(getRangeAwareChartRefreshInterval("REGULAR", "5y")).toBe(
      3_600_000,
    );
    expect(getRangeAwareChartRefreshInterval("CLOSED", "1d")).toBe(300_000);
  });
});
