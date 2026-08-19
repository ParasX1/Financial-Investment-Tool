import { describe, expect, it } from "@jest/globals";
import {
  getSelectedSearchSymbol,
  getVisibleSearchResults,
} from "./watchlistSearch";

const cba = { symbol: "CBA.AX" };

describe("watchlist symbol selection", () => {
  it("never exposes results that belong to a previous query", () => {
    expect(getVisibleSearchResults("cba", "bhp", [cba])).toEqual([]);
    expect(getVisibleSearchResults("cba", "cba", [cba])).toEqual([cba]);
  });

  it("requires a provider-backed selected result before adding", () => {
    expect(getSelectedSearchSymbol([], 0)).toBeNull();
    expect(getSelectedSearchSymbol([cba], -1)).toBeNull();
    expect(getSelectedSearchSymbol([cba], 0)).toBe("CBA.AX");
  });
});
