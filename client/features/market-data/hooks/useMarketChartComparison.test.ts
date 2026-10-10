import { describe, expect, it } from "@jest/globals";
import {
  createMarketChartsRequestKey,
  getMarketChartsRefreshInterval,
} from "./useMarketChartComparison";

describe("market chart comparison helpers", () => {
  it("creates a bounded, ordered, deduplicated comparison request", () => {
    expect(
      createMarketChartsRequestKey(
        [" cba.ax ", "BHP.AX", "CBA.AX", "AAPL"],
        "3m",
      ),
    ).toBe(
      "/api/market/charts?symbols=CBA.AX%2CBHP.AX%2CAAPL&range=3m",
    );
    expect(
      createMarketChartsRequestKey(
        ["AAPL", "MSFT", "NVDA", "AMZN", "META"],
        "1d",
      ),
    ).toBeNull();
    expect(createMarketChartsRequestKey(["bad symbol"], "1d")).toBeNull();
    expect(createMarketChartsRequestKey([], "1d")).toBeNull();
  });

  it("uses the fastest cadence required by any compared market", () => {
    expect(
      getMarketChartsRefreshInterval({
        snapshots: [
          { marketState: "CLOSED" },
          { marketState: "REGULAR" },
        ],
      }),
    ).toBe(30_000);
    expect(
      getMarketChartsRefreshInterval({
        snapshots: [{ marketState: "CLOSED" }],
      }),
    ).toBe(300_000);
    expect(getMarketChartsRefreshInterval(undefined)).toBe(60_000);
    expect(
      getMarketChartsRefreshInterval(
        { snapshots: [{ marketState: "REGULAR" }] },
        "1m",
      ),
    ).toBe(300_000);
    expect(
      getMarketChartsRefreshInterval(
        { snapshots: [{ marketState: "REGULAR" }] },
        "3m",
      ),
    ).toBe(900_000);
    expect(
      getMarketChartsRefreshInterval(
        { snapshots: [{ marketState: "REGULAR" }] },
        "max",
      ),
    ).toBe(3_600_000);
  });
});
