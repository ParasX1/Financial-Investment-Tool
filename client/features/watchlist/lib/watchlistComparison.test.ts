import { describe, expect, it } from "@jest/globals";
import {
  reconcileWatchlistComparisonSymbols,
  toggleWatchlistComparisonSymbol,
} from "./watchlistComparison";

describe("watchlist comparison selection", () => {
  it("toggles symbols immutably while preserving comparison order", () => {
    const current = ["CBA.AX", "BHP.AX"];

    expect(toggleWatchlistComparisonSymbol(current, "AAPL", 4)).toEqual([
      "CBA.AX",
      "BHP.AX",
      "AAPL",
    ]);
    expect(toggleWatchlistComparisonSymbol(current, "CBA.AX", 4)).toEqual([
      "BHP.AX",
    ]);
    expect(current).toEqual(["CBA.AX", "BHP.AX"]);
  });

  it("enforces the comparison limit and ignores invalid duplicates", () => {
    expect(
      toggleWatchlistComparisonSymbol(
        ["AAPL", "MSFT", "NVDA", "AMZN"],
        "META",
        4,
      ),
    ).toEqual(["AAPL", "MSFT", "NVDA", "AMZN"]);
  });

  it("reconciles removed watchlist items and keeps a useful default", () => {
    expect(
      reconcileWatchlistComparisonSymbols(
        ["CBA.AX", "REMOVED"],
        ["CBA.AX", "BHP.AX"],
      ),
    ).toEqual(["CBA.AX"]);
    expect(
      reconcileWatchlistComparisonSymbols([], ["BHP.AX", "CBA.AX"]),
    ).toEqual(["BHP.AX"]);
    expect(
      reconcileWatchlistComparisonSymbols(["CBA.AX"], []),
    ).toEqual([]);
  });
});
