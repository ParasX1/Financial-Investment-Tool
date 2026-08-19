import { describe, expect, it } from "@jest/globals";
import {
  MARKET_NEWS_TICKER_STRIP_REFRESH_WARNING,
  mergeMarketNewsTickerQuote,
  overlayMarketNewsTickerQuotes,
  resolveMarketNewsTickerOverlayState,
  resolveMarketNewsTickerQuoteRefreshState,
  resolveMarketNewsTickerQuoteState,
  resolveMarketNewsTickerStripState,
} from "./marketNewsTickerQuotes";

describe("marketNewsTickerQuotes", () => {
  it("merges live Yahoo-style quote data into a market news ticker", () => {
    const ticker = {
      symbol: "^GSPC",
      label: "S&P 500",
      value: "6,005.88",
      change: "+34.42 +0.58%",
      tone: "positive" as const,
      sparkline: [1, 2, 3],
    };

    expect(
      mergeMarketNewsTickerQuote(ticker, {
        quote: {
          symbol: "^GSPC",
          price: 6123.456,
          prevClose: 6100,
          change: 23.456,
          changePct: 0.3845,
          marketState: "REGULAR",
        },
        sparkline: {
          symbol: "^GSPC",
          points: [
            { t: 1, v: 6110 },
            { t: 2, v: 6120 },
          ],
        },
      }),
    ).toEqual({
      ...ticker,
      value: "6,123.46",
      change: "+23.46 +0.38%",
      tone: "positive",
      sparkline: [6110, 6120],
      sparklineSource: "live",
      previousClose: 6100,
      marketState: "REGULAR",
    });
  });

  it("overlays shared adaptive quotes without replacing ticker sparkline context", () => {
    const ticker = {
      symbol: "CBA.AX",
      label: "CBA",
      value: "119.00",
      change: "-1.00 -0.83%",
      tone: "negative" as const,
      sparkline: [118, 119, 120],
      sparklineSource: "live" as const,
      signal: "Watchlist" as const,
    };

    expect(
      overlayMarketNewsTickerQuotes([ticker], {
        "CBA.AX": {
          change: 2,
          changePercent: 1.67,
          currency: "AUD",
          exchange: "ASX",
          longName: "Commonwealth Bank",
          marketState: "REGULAR",
          previousClose: 120,
          price: 122,
          quoteTime: "2026-07-15T04:00:00.000Z",
          shortName: "CBA",
          symbol: "CBA.AX",
        },
      }),
    ).toEqual([
      {
        ...ticker,
        change: "+2.00 +1.67%",
        label: "CBA",
        marketState: "REGULAR",
        previousClose: 120,
        tone: "positive",
        value: "122.00",
      },
    ]);
  });

  it("retains the last ticker snapshot when an adaptive quote is unavailable", () => {
    const ticker = {
      symbol: "CBA.AX",
      label: "CBA",
      value: "121.00",
      change: "+1.00 +0.83%",
      tone: "positive" as const,
      sparkline: [118, 119, 121],
      sparklineSource: "live" as const,
    };

    expect(
      overlayMarketNewsTickerQuotes([ticker], {
        "CBA.AX": {
          change: null,
          changePercent: null,
          currency: null,
          exchange: null,
          longName: null,
          marketState: null,
          previousClose: null,
          price: null,
          quoteTime: null,
          shortName: null,
          symbol: "CBA.AX",
        },
      })[0],
    ).toBe(ticker);
  });
  it("marks fallback ticker data mixed when adaptive quotes recover a price", () => {
    const fallbackTicker = {
      symbol: "CBA.AX",
      label: "CBA",
      value: "Quote unavailable",
      change: "No live data",
      tone: "neutral" as const,
      sparkline: [],
      sparklineSource: "fallback" as const,
    };

    const resolved = resolveMarketNewsTickerOverlayState(
      "fallback",
      [fallbackTicker],
      {
        "CBA.AX": {
          change: 2,
          changePercent: 1.67,
          currency: "AUD",
          exchange: "ASX",
          longName: "Commonwealth Bank",
          marketState: "REGULAR",
          previousClose: 120,
          price: 122,
          quoteTime: "2026-07-15T04:00:00.000Z",
          shortName: "CBA",
          symbol: "CBA.AX",
        },
      },
    );

    expect(resolved.source).toBe("mixed");
    expect(resolved.tickers[0]?.value).toBe("122.00");
  });

  it("redacts configured fallback prices when live quote fields are missing", () => {
    const ticker = {
      symbol: "AUDUSD=X",
      label: "AUD/USD",
      value: "0.7071",
      change: "+0.0028 +0.39%",
      tone: "positive" as const,
      sparkline: [20, 21, 22],
    };

    expect(
      mergeMarketNewsTickerQuote(ticker, {
        quote: null,
        sparkline: { symbol: "AUDUSD=X", points: [] },
      }),
    ).toEqual({
      symbol: "AUDUSD=X",
      label: "AUD/USD",
      value: "Quote unavailable",
      change: "No live data",
      tone: "neutral",
      sparkline: [],
      sparklineSource: "fallback",
    });
  });

  it("uses Yahoo chart previous close for sparse quote responses", () => {
    const ticker = {
      symbol: "NVDA",
      label: "Lookup selected",
      value: "Quote unavailable",
      change: "No live data",
      tone: "neutral" as const,
      sparkline: [],
      sparklineSource: "fallback" as const,
    };

    expect(
      mergeMarketNewsTickerQuote(ticker, {
        quote: {
          symbol: "NVDA",
          price: null,
          prevClose: null,
          change: null,
          changePct: null,
          shortName: "NVIDIA Corporation",
        },
        sparkline: {
          symbol: "NVDA",
          points: [
            { t: 1, v: 200 },
            { t: 2, v: 210 },
          ],
          previousClose: 205,
        },
      }),
    ).toEqual({
      ...ticker,
      change: "+5.00 +2.44%",
      label: "NVIDIA Corporation",
      previousClose: 205,
      sparkline: [200, 210],
      sparklineSource: "live",
      tone: "positive",
      value: "210.00",
    });
  });

  it("uses Yahoo chart metadata when intraday chart points are unavailable", () => {
    const ticker = {
      symbol: "CL=F",
      label: "Oil",
      value: "80.21",
      change: "-4.67 -5.50%",
      tone: "negative" as const,
      sparkline: [36, 34, 32, 31, 29, 28, 27, 25, 24, 22],
    };

    const merged = mergeMarketNewsTickerQuote(ticker, {
      quote: null,
      sparkline: {
        symbol: "CL=F",
        points: [],
        previousClose: 75.85,
        regularMarketPrice: 76.54,
      },
    });

    expect(merged).toMatchObject({
      ...ticker,
      change: "+0.69 +0.91%",
      previousClose: 75.85,
      sparkline: [],
      sparklineSource: "unavailable",
      tone: "positive",
      value: "76.54",
    });
    expect(merged.sparkline).toHaveLength(0);
  });

  it("does not infer Yahoo-style daily change from sparkline movement alone", () => {
    const ticker = {
      symbol: "NVDA",
      label: "Lookup selected",
      value: "Quote unavailable",
      change: "No live data",
      tone: "neutral" as const,
      sparkline: [],
      sparklineSource: "fallback" as const,
    };

    expect(
      mergeMarketNewsTickerQuote(ticker, {
        quote: {
          symbol: "NVDA",
          price: null,
          prevClose: null,
          change: null,
          changePct: null,
          shortName: "NVIDIA Corporation",
        },
        sparkline: {
          symbol: "NVDA",
          points: [
            { t: 1, v: 200 },
            { t: 2, v: 210 },
          ],
        },
      }),
    ).toEqual(ticker);
  });

  it("does not treat chart points as recovered live quote data without a daily baseline", () => {
    const ticker = {
      symbol: "NVDA",
      label: "Lookup selected",
      value: "Quote unavailable",
      change: "No live data",
      tone: "neutral" as const,
      sparkline: [],
      sparklineSource: "fallback" as const,
    };

    expect(
      resolveMarketNewsTickerQuoteState(ticker, {
        quote: null,
        sparkline: {
          symbol: "NVDA",
          points: [
            { t: 1, v: 200 },
            { t: 2, v: 210 },
          ],
        },
      }),
    ).toEqual({
      recoveredLiveData: false,
      retainedPrevious: false,
      ticker,
    });
  });

  it("keeps the last good selected ticker quote when a refresh has no displayable live data", () => {
    const fallbackTicker = {
      symbol: "NVDA",
      label: "Lookup selected",
      value: "Quote unavailable",
      change: "No live data",
      tone: "neutral" as const,
      sparkline: [],
    };
    const previousTicker = {
      ...fallbackTicker,
      change: "+5.00 +2.44%",
      label: "NVIDIA Corporation",
      previousClose: 205,
      sparkline: [200, 210],
      sparklineSource: "live" as const,
      tone: "positive" as const,
      value: "210.00",
    };

    expect(
      resolveMarketNewsTickerQuoteRefreshState({
        fallbackTicker,
        live: {
          quote: null,
          sparkline: { symbol: "NVDA", points: [] },
        },
        previousTicker,
      }),
    ).toEqual({
      recoveredLiveData: false,
      retainedPrevious: true,
      ticker: previousTicker,
    });
  });

  it("resets ticker strip state to fallback tickers when a later snapshot is invalid", () => {
    const fallbackTickers = [
      {
        change: "-1.00 -1.00%",
        label: "ALL ORDS",
        sparkline: [3, 2, 1],
        symbol: "^AORD",
        tone: "negative" as const,
        value: "9,000.00",
      },
    ];

    expect(
      resolveMarketNewsTickerStripState({
        fallbackTickers,
        payload: { bad: "payload" },
      }),
    ).toEqual({
      providerLabel: "Yahoo Finance",
      source: "fallback",
      tickers: [
        {
          change: "No live data",
          label: "ALL ORDS",
          sparkline: [],
          sparklineSource: "fallback",
          symbol: "^AORD",
          tone: "neutral",
          value: "Quote unavailable",
        },
      ],
      updatedAt: null,
      warnings: ["Live quote snapshots are temporarily unavailable."],
    });
  });

  it("treats partial ticker strip snapshots as invalid instead of leaking undefined UI state", () => {
    const fallbackTickers = [
      {
        change: "+1.00 +1.00%",
        label: "Fallback index",
        sparkline: [1, 2, 3],
        symbol: "^TEST",
        tone: "positive" as const,
        value: "100.00",
      },
    ];

    expect(
      resolveMarketNewsTickerStripState({
        fallbackTickers,
        payload: {
          tickers: [
            {
              change: "+2.00 +2.00%",
              label: "Half valid",
              sparkline: [2, 3, 4],
              symbol: "^HALF",
              tone: "positive",
              value: "200.00",
            },
          ],
        },
      }),
    ).toEqual({
      providerLabel: "Yahoo Finance",
      source: "fallback",
      tickers: [
        {
          change: "No live data",
          label: "Fallback index",
          sparkline: [],
          sparklineSource: "fallback",
          symbol: "^TEST",
          tone: "neutral",
          value: "Quote unavailable",
        },
      ],
      updatedAt: null,
      warnings: ["Live quote snapshots are temporarily unavailable."],
    });
  });

  it("keeps service-provided ticker strip refresh cadence with valid snapshots", () => {
    const state = resolveMarketNewsTickerStripState({
      fallbackTickers: [],
      payload: {
        providerLabel: "Yahoo Finance",
        refreshMs: 120_000,
        source: "live",
        strategy: "core-plus-dynamic-movers",
        tickers: [],
        updatedAt: "2026-06-21T01:02:03.000Z",
        warnings: [],
      },
    });

    expect(state.refreshMs).toBe(120_000);
    expect(state.updatedAt?.toISOString()).toBe("2026-06-21T01:02:03.000Z");
  });

  it("keeps the previous live ticker strip visible when a refresh payload is invalid", () => {
    const fallbackTickers = [
      {
        change: "-1.00 -1.00%",
        label: "ALL ORDS",
        sparkline: [3, 2, 1],
        symbol: "^AORD",
        tone: "negative" as const,
        value: "9,000.00",
      },
    ];
    const previousState = resolveMarketNewsTickerStripState({
      fallbackTickers,
      payload: {
        providerLabel: "Yahoo Finance",
        refreshMs: 60_000,
        source: "live",
        strategy: "core-plus-dynamic-movers",
        tickers: [
          {
            change: "+2.00 +2.00%",
            label: "Live index",
            sparkline: [1, 2, 3],
            symbol: "^LIVE",
            tone: "positive",
            value: "200.00",
          },
        ],
        updatedAt: "2026-06-21T01:02:03.000Z",
        warnings: [],
      },
    });

    expect(
      resolveMarketNewsTickerStripState({
        fallbackTickers,
        payload: { bad: "payload" },
        previousState,
      }),
    ).toMatchObject({
      providerLabel: "Yahoo Finance",
      source: "live",
      tickers: previousState.tickers,
      updatedAt: previousState.updatedAt,
      warnings: [MARKET_NEWS_TICKER_STRIP_REFRESH_WARNING],
    });
  });
});
