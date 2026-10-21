import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function source(fileName: string) {
  return readFileSync(join(__dirname, fileName), "utf8");
}

describe("Market News data boundaries", () => {
  it("consumes saved symbols without owning Watchlist persistence or auth", () => {
    const watchlistHook = source("useMarketNewsWatchlist.ts");

    expect(watchlistHook).toContain('from "@/features/watchlist"');
    expect(watchlistHook).not.toMatch(/@\/features\/watchlist\//);
    expect(watchlistHook).not.toContain("createWatchlistRepository");
    expect(watchlistHook).not.toContain("@/lib/supabase");
    expect(watchlistHook).not.toContain("@/features/auth");
  });

  it("uses the shared market-data public API instead of its internals", () => {
    const tickerHook = source("useMarketNewsTickerQuotes.ts");
    const tickerModel = readFileSync(
      join(__dirname, "..", "lib", "marketNewsTickerQuotes.ts"),
      "utf8",
    );

    expect(tickerHook).toContain('from "@/features/market-data"');
    expect(tickerModel).toContain('from "@/features/market-data"');
    expect(tickerHook).not.toMatch(/@\/features\/market-data\//);
    expect(tickerModel).not.toMatch(/@\/features\/market-data\//);
  });
});
