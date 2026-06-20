import { describe, expect, it } from "@jest/globals";
import { MARKET_NEWS_MARKET_SCOPES } from "../data/marketNewsConfig";
import {
  buildMarketNewsTickerFallback,
  selectMarketNewsTickerSymbols,
} from "./marketNewsDynamicTickers";

const australia = MARKET_NEWS_MARKET_SCOPES.find(
  (scope) => scope.id === "australia",
)!;

describe("marketNewsDynamicTickers", () => {
  it("keeps core anchors first, ranks watchlist movers next, and preserves macro context", () => {
    expect(
      selectMarketNewsTickerSymbols({
        marketScope: australia,
        trendingSymbols: ["CBA.AX", "BHP.AX", "^AXJO", "GC=F", "TLS.AX"],
        watchlistSymbols: ["NVDA", "CBA.AX"],
      }),
    ).toEqual([
      { signal: "Core", symbol: "^AORD" },
      { signal: "Core", symbol: "^AXJO" },
      { signal: "Core", symbol: "AUDUSD=X" },
      { signal: "Watchlist", symbol: "NVDA" },
      { signal: "Watchlist", symbol: "CBA.AX" },
      { signal: "Macro", symbol: "CL=F" },
      { signal: "Macro", symbol: "GC=F" },
      { signal: "Macro", symbol: "BTC-AUD" },
    ]);
  });

  it("falls back to configured dynamic movers when trending is empty", () => {
    expect(
      selectMarketNewsTickerSymbols({
        marketScope: australia,
        trendingSymbols: [],
        watchlistSymbols: [],
      }).map((ticker) => ticker.symbol),
    ).toEqual([
      "^AORD",
      "^AXJO",
      "AUDUSD=X",
      "BHP.AX",
      "CBA.AX",
      "CL=F",
      "GC=F",
      "BTC-AUD",
    ]);
  });

  it("builds display-safe fallback tickers for symbols that are not in static config", () => {
    expect(
      buildMarketNewsTickerFallback({
        marketScope: australia,
        signal: "Mover",
        symbol: "nvda",
      }),
    ).toEqual({
      symbol: "NVDA",
      label: "NVDA",
      value: "Quote unavailable",
      change: "No live data",
      tone: "neutral",
      sparkline: [],
      signal: "Mover",
    });
  });
});
