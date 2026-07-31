import { describe, expect, it } from "@jest/globals";
import { formatTopPicksAssumptions } from "./topPicksAssumptions";

describe("formatTopPicksAssumptions", () => {
  it("formats only safe ranking assumptions into a compact neutral line", () => {
    expect(
      formatTopPicksAssumptions({
        benchmark: "^AXJO",
        universeCount: 50,
        window: "trailing_one_year",
        riskFreeRate: 0.0435,
        riskFreeRateSource: "RBA cash rate target",
        riskFreeRateAsOf: "2026-06-17",
      }),
    ).toBe(
      "Ranked universe: 50 stocks • requested window: trailing one year • benchmark ^AXJO • risk-free rate 4.35% (RBA cash rate target, as of 2026-06-17)",
    );
  });

  it("does not claim assumptions when metadata is absent", () => {
    expect(formatTopPicksAssumptions({})).toBeNull();
  });
});
