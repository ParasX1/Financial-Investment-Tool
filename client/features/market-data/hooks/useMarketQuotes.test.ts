import { describe, expect, it } from "@jest/globals";
import type { MarketQuote } from "../types";
import {
  createMarketQuotesRequestKey,
  getMarketQuotesRefreshInterval,
  indexMarketQuotes,
  resolveMarketQuotesActivity,
} from "./useMarketQuotes";

function quote(
  symbol: string,
  marketState: string | null,
  price: number | null,
): MarketQuote {
  return {
    change: null,
    changePercent: null,
    currency: null,
    exchange: null,
    longName: null,
    marketState,
    previousClose: null,
    price,
    quoteTime: null,
    shortName: null,
    symbol,
  };
}

describe("shared market quote helpers", () => {
  it("normalizes, deduplicates, sorts, and caps quote request symbols", () => {
    expect(
      createMarketQuotesRequestKey([
        " msft ",
        "AAPL",
        "MSFT",
        "",
        "bad symbol",
      ]),
    ).toBe("/api/market/quotes?symbols=AAPL%2CMSFT");
    expect(createMarketQuotesRequestKey([])).toBeNull();
  });

  it("uses the fastest market state across the batch and retains unavailable symbols", () => {
    const response = {
      quotes: [quote("AAPL", "REGULAR", 210), quote("CBA.AX", "CLOSED", 180)],
      unavailableSymbols: ["USD"],
    };

    expect(getMarketQuotesRefreshInterval(response)).toBe(15_000);
    expect(indexMarketQuotes(response).quotes.AAPL?.price).toBe(210);
    expect(indexMarketQuotes(response).warning).toBe(
      "Some quotes are temporarily unavailable.",
    );
  });

  it("slows closed and unknown markets without disabling refresh", () => {
    expect(
      getMarketQuotesRefreshInterval({
        quotes: [quote("CBA.AX", "CLOSED", 180)],
        unavailableSymbols: [],
      }),
    ).toBe(300_000);
    expect(getMarketQuotesRefreshInterval(undefined)).toBe(60_000);
  });

  it("keeps background refresh separate from the initial loading state", () => {
    expect(
      resolveMarketQuotesActivity({
        initialLoading: false,
        refreshing: true,
      }),
    ).toEqual({ loading: false, refreshing: true });
    expect(
      resolveMarketQuotesActivity({
        initialLoading: true,
        refreshing: false,
      }),
    ).toEqual({ loading: true, refreshing: false });
  });
});
