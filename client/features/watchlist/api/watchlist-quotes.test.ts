import { describe, expect, it } from "@jest/globals";
import { parseWatchlistQuoteSymbols } from "../../../pages/api/market/watchlist-quotes";

describe("watchlist quotes API rules", () => {
  it("normalizes, deduplicates, rejects invalid symbols, and caps the batch", () => {
    const values = Array.from({ length: 25 }, (_, index) => `s${index}`);
    const parsed = parseWatchlistQuoteSymbols(
      [" cba.ax ", "CBA.AX", "bad<script>", ...values].join(","),
    );

    expect(parsed[0]).toBe("CBA.AX");
    expect(parsed).toHaveLength(20);
    expect(parsed).not.toContain("BAD<SCRIPT>");
  });
});
