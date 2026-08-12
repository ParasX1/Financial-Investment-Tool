import { describe, expect, it } from "@jest/globals";
import { TOP_PICKS_COLUMNS, valueColor } from "./topPicksColumns";

describe("Top Picks metric semantics", () => {
  it("formats decimals and metric statuses honestly", () => {
    const byKey = Object.fromEntries(
      TOP_PICKS_COLUMNS.map((column) => [column.key, column]),
    );

    expect(byKey.ret1y.format?.(0.1234)).toBe("+12.3%");
    expect(byKey.volatility.format?.(0.215)).toBe("21.5%");
    expect(byKey.maxDD.format?.(-0.149)).toBe("-14.9%");
    expect(byKey.alpha.format?.(0.034)).toBe("+3.4%");
    expect(byKey.sharpe.format?.(null)).toBe("—");
    expect(byKey.sortino.format?.(null, "infinite")).toBe("Unbounded");
    expect(byKey.sortino.format?.(8.4, "limited_data")).toBe("—");
  });

  it("uses metric meaning rather than magnitude for visual semantics", () => {
    expect(valueColor("ret1y", 0.02)).toBe("#38d996");
    expect(valueColor("alpha", -0.01)).toBe("#ff5b7c");
    expect(valueColor("volatility", 0.2)).toContain("--fit-color-text-body");
    expect(valueColor("beta", null)).toContain("--fit-color-text-muted");
  });
});
