import { describe, expect, it } from "@jest/globals";
import { mapYahooSymbolSearchResults } from "../../../pages/api/market/symbol-search";

describe("symbol search API rules", () => {
  it("keeps supported market instruments, normalizes them, and removes duplicates", () => {
    const results = mapYahooSymbolSearchResults([
      {
        exchDisp: "ASX",
        longname: "Commonwealth Bank",
        quoteType: "EQUITY",
        symbol: "cba.ax",
      },
      {
        exchDisp: "ASX",
        shortname: "Duplicate",
        quoteType: "EQUITY",
        symbol: "CBA.AX",
      },
      { exchDisp: "News", quoteType: "NEWS", symbol: "STORY" },
      {
        exchDisp: "NASDAQ",
        shortname: "Vanguard ETF",
        quoteType: "ETF",
        symbol: "VTI",
      },
    ]);

    expect(results).toEqual([
      {
        exchange: "ASX",
        name: "Commonwealth Bank",
        quoteType: "EQUITY",
        symbol: "CBA.AX",
      },
      {
        exchange: "NASDAQ",
        name: "Vanguard ETF",
        quoteType: "ETF",
        symbol: "VTI",
      },
    ]);
  });
});
