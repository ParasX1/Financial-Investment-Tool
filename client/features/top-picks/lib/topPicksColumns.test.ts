import { describe, expect, it } from "@jest/globals";
import {
  getDefaultVisibleTopPicksColumns,
  TOP_PICKS_COLUMNS,
  valueColor,
} from "./topPicksColumns";

describe("topPicksColumns", () => {
  it("returns a stable default visible column set", () => {
    expect(getDefaultVisibleTopPicksColumns()).toEqual([
      "rank",
      "symbol",
      "name",
      "ret1y",
      "sharpe",
      "sortino",
      "volatility",
      "maxDD",
      "beta",
      "alpha",
      "infoRatio",
    ]);
  });

  it("assigns semantic value colors by metric meaning", () => {
    expect(valueColor("ret1y", 2)).toBe("#38d996");
    expect(valueColor("alpha", -1)).toBe("#ff5b7c");
    expect(valueColor("volatility", 20)).toContain("--fit-color-text-body");
    expect(valueColor("beta", 1.1)).toBe("#e2e7f2");
  });

  it("defines accessible metric meanings and units", () => {
    const byKey = Object.fromEntries(
      TOP_PICKS_COLUMNS.map((column) => [column.key, column]),
    );

    expect(byKey.ret1y).toMatchObject({
      label: "Price return",
      unit: "percent",
      description: "Price return for the selected Top Picks window.",
    });
    expect(byKey.sharpe.label).toBe("Sharpe ratio");
    expect(byKey.sharpe.description).toContain("configured risk-free rate");
    expect(byKey.sortino.label).toBe("Sortino ratio");
    expect(byKey.sortino.description).toContain("downside deviation");
    expect(byKey.volatility).toMatchObject({
      label: "Annualised volatility",
      unit: "percent",
      description: "Annualized volatility.",
    });
    expect(byKey.maxDD.label).toBe("Max drawdown");
    expect(byKey.maxDD.description).toContain("Peak-to-trough");
    expect(byKey.beta.label).toBe("Beta exposure");
    expect(byKey.beta.description).toContain("configured benchmark");
    expect(byKey.alpha).toMatchObject({
      label: "Alpha vs benchmark",
      unit: "percent",
      description: "Annualized alpha versus the configured benchmark.",
    });
    expect(byKey.infoRatio.label).toBe("Information ratio");
    expect(byKey.infoRatio.description).toBe(
      "Information Ratio = annualized active return / tracking error.",
    );
  });
});
