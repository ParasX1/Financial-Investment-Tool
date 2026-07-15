import { describe, expect, it } from "@jest/globals";
import {
  createMarketChartRequestKey,
  getMarketChartRefreshInterval,
} from "./useMarketChart";

describe("shared market chart helpers", () => {
  it("creates a safe one-symbol chart request", () => {
    expect(createMarketChartRequestKey(" cba.ax ")).toBe(
      "/api/market/chart?symbol=CBA.AX",
    );
    expect(createMarketChartRequestKey("bad symbol")).toBeNull();
    expect(createMarketChartRequestKey(null)).toBeNull();
  });

  it("uses chart-specific active, extended, closed, and unknown cadences", () => {
    expect(getMarketChartRefreshInterval({ marketState: "REGULAR" })).toBe(
      30_000,
    );
    expect(getMarketChartRefreshInterval({ marketState: "PRE" })).toBe(60_000);
    expect(getMarketChartRefreshInterval({ marketState: "CLOSED" })).toBe(
      300_000,
    );
    expect(getMarketChartRefreshInterval(undefined)).toBe(60_000);
  });
});
