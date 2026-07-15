import * as React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";
import type { MarketChartSnapshot } from "@/features/market-data/types";
import type { WatchlistItem, WatchlistQuote } from "../types";
import {
  refreshMarketMonitor,
  WatchlistMarketMonitorView,
} from "./WatchlistMarketMonitor";


const item: WatchlistItem = {
  createdAt: "2026-07-15T00:00:00.000Z",
  note: "Review earnings",
  position: 0,
  symbol: "CBA.AX",
  targetPrice: 125,
  updatedAt: "2026-07-15T00:00:00.000Z",
  userId: "user-a",
};

const quote: WatchlistQuote = {
  change: 1,
  changePercent: 0.84,
  currency: "AUD",
  exchange: "ASX",
  longName: "Commonwealth Bank",
  marketState: "REGULAR",
  previousClose: 119,
  price: 120,
  quoteTime: "2026-07-15T04:00:00.000Z",
  shortName: null,
  symbol: "CBA.AX",
};

const chart: MarketChartSnapshot = {
  currency: "AUD",
  exchange: "ASX",
  marketState: "REGULAR",
  points: [
    { timeMs: Date.UTC(2026, 6, 15, 0, 0), value: 119 },
    { timeMs: Date.UTC(2026, 6, 15, 1, 0), value: 120 },
  ],
  previousClose: 119,
  quoteTime: "2026-07-15T04:00:00.000Z",
  regularMarketPrice: 120,
  symbol: "CBA.AX",
};

function chartState(overrides = {}) {
  return {
    data: chart,
    error: null,
    lastUpdated: new Date("2026-07-15T04:00:00.000Z"),
    loading: false,
    refresh: jest.fn(),
    refreshing: false,
    ...overrides,
  };
}

describe("WatchlistMarketMonitorView", () => {
  it("explains cadence and delay while presenting a focused beginner monitor", () => {
    const markup = renderToStaticMarkup(
      <WatchlistMarketMonitorView
        chartState={chartState()}
        item={item}
        onClose={jest.fn()}
        onRefreshQuotes={jest.fn()}
        quote={quote}
        quoteRefreshing={false}
      />,
    );

    expect(markup).toContain("CBA.AX Market Monitor");
    expect(markup).toContain("Prices every 15s");
    expect(markup).toContain("trend every 30s");
    expect(markup).toContain("Data may be delayed");
    expect(markup).toContain("/MarketNews?q=CBA.AX");
    expect(markup).not.toContain(">Live<");
    expect(markup).not.toContain("extended-hours price");
  });

  it("refreshes both quote and chart layers from one monitor action", () => {
    const refreshQuotes = jest.fn();
    const refreshChart = jest.fn();

    refreshMarketMonitor(refreshQuotes, refreshChart);

    expect(refreshQuotes).toHaveBeenCalledTimes(1);
    expect(refreshChart).toHaveBeenCalledTimes(1);
  });
  it.each([
    {
      expectedCadence: "Checks every 30s",
      expectedChange: "↓ −1.00 (−0.50%)",
      expectedState: "Pre-market",
      marketState: "PREPRE",
      quoteOverrides: {
        change: -1,
        changePercent: -0.5,
        currency: "INVALID",
        longName: null,
        quoteTime: null,
        shortName: "CBA",
      },
    },
    {
      expectedCadence: "Checks every 30s",
      expectedChange: "→ 0.00 (0.00%)",
      expectedState: "After hours",
      marketState: "POSTPOST",
      quoteOverrides: { change: 0, changePercent: 0 },
    },
  ])(
    "renders $expectedState cadence and directional context",
    ({
      expectedCadence,
      expectedChange,
      expectedState,
      marketState,
      quoteOverrides,
    }) => {
      const markup = renderToStaticMarkup(
        <WatchlistMarketMonitorView
          chartState={chartState()}
          item={item}
          onClose={jest.fn()}
          onRefreshQuotes={jest.fn()}
          quote={{ ...quote, ...quoteOverrides, marketState }}
          quoteRefreshing={false}
        />,
      );

      expect(markup).toContain(expectedState);
      expect(markup).toContain(expectedCadence);
      expect(markup).toContain(expectedChange);
    },
  );

  it("falls back to chart metadata and clearly labels closed or unknown data", () => {
    const closed = renderToStaticMarkup(
      <WatchlistMarketMonitorView
        chartState={chartState({
          data: {
            ...chart,
            currency: null,
            marketState: "CLOSED",
            previousClose: null,
            quoteTime: "not-a-date",
          },
        })}
        item={item}
        onClose={jest.fn()}
        onRefreshQuotes={jest.fn()}
        quote={null}
        quoteRefreshing={false}
      />,
    );
    const unknown = renderToStaticMarkup(
      <WatchlistMarketMonitorView
        chartState={chartState({ data: null })}
        item={item}
        onClose={jest.fn()}
        onRefreshQuotes={jest.fn()}
        quote={{
          ...quote,
          change: null,
          changePercent: null,
          longName: null,
          marketState: "HALTED",
          price: null,
          quoteTime: null,
          shortName: null,
        }}
        quoteRefreshing={false}
      />,
    );

    expect(closed).toContain("Market closed");
    expect(closed).toContain("refresh every 5 minutes");
    expect(closed).toContain("Quote time unavailable");
    expect(closed).toContain("CBA.AX market snapshot");
    expect(closed).toContain("Daily change unavailable");
    expect(unknown).toContain("Market status unavailable");
    expect(unknown).toContain("Refreshes every 60s");
    expect(unknown).toContain("Quote unavailable");
  });

  it("keeps the existing trend visible during background refresh", () => {
    const markup = renderToStaticMarkup(
      <WatchlistMarketMonitorView
        chartState={chartState({ refreshing: true })}
        item={item}
        onClose={jest.fn()}
        onRefreshQuotes={jest.fn()}
        quote={quote}
        quoteRefreshing={true}
      />,
    );

    expect(markup).toContain("Updating…");
    expect(markup).toContain("Updating trend…");
    expect(markup).toContain("disabled");
    expect(markup).toContain('data-testid="market-line"');
  });
  it("has honest loading, error, and empty chart states", () => {
    const loading = renderToStaticMarkup(
      <WatchlistMarketMonitorView
        chartState={chartState({ data: null, loading: true })}
        item={item}
        onClose={jest.fn()}
        onRefreshQuotes={jest.fn()}
        quote={quote}
        quoteRefreshing={false}
      />,
    );
    const error = renderToStaticMarkup(
      <WatchlistMarketMonitorView
        chartState={chartState({
          data: null,
          error: "Market chart is temporarily unavailable.",
        })}
        item={item}
        onClose={jest.fn()}
        onRefreshQuotes={jest.fn()}
        quote={quote}
        quoteRefreshing={false}
      />,
    );

    expect(loading).toContain("Loading one-day trend");
    expect(error).toContain("Market chart is temporarily unavailable.");
    const empty = renderToStaticMarkup(
      <WatchlistMarketMonitorView
        chartState={chartState({ data: null })}
        item={item}
        onClose={jest.fn()}
        onRefreshQuotes={jest.fn()}
        quote={quote}
        quoteRefreshing={false}
      />,
    );

    expect(error).toContain("Try chart again");
    expect(empty).toContain("Intraday trend is not available yet.");
  });
});
