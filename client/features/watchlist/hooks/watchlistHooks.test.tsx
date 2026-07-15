import * as React from "react";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { useWatchlistQuotes } from "./useWatchlistQuotes";
import { useWatchlistSymbolSearch } from "./useWatchlistSymbolSearch";

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("watchlist market hooks", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("loads quotes, exposes refresh, and clears state for an empty list", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          quotes: [
            {
              change: 1,
              changePercent: 0.5,
              currency: "AUD",
              exchange: "ASX",
              longName: "Commonwealth Bank",
              marketState: "REGULAR",
              previousClose: 119,
              price: 120,
              quoteTime: "2026-07-15T04:00:00.000Z",
              shortName: null,
              symbol: "CBA.AX",
            },
          ],
        }),
        { status: 200 },
      ),
    );
    let symbols: readonly string[] = [" cba.ax "];
    let latest: ReturnType<typeof useWatchlistQuotes> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useWatchlistQuotes(symbols);
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/market/watchlist-quotes?symbols=CBA.AX",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(latest!.quotes["CBA.AX"]?.price).toBe(120);
    expect(latest!.lastUpdated).toBeInstanceOf(Date);

    await act(async () => {
      latest!.refresh();
      await flushPromises();
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);

    symbols = [];
    await act(async () => {
      renderer!.update(<Probe />);
      await flushPromises();
    });
    expect(latest!.quotes).toEqual({});
    expect(latest!.lastUpdated).toBeNull();
    renderer!.unmount();
  });

  it("keeps successful rows while explaining partial quote failures and recovery", async () => {
    const cbaQuote = {
      change: 1,
      changePercent: 0.5,
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
    const bhpUnavailable = {
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
      symbol: "BHP.AX",
    };
    jest.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        quotes: [bhpUnavailable, cbaQuote],
        unavailableSymbols: ["BHP.AX"],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        quotes: [{ ...bhpUnavailable, price: 42 }, cbaQuote],
        unavailableSymbols: [],
      }), { status: 200 }));
    let latest: ReturnType<typeof useWatchlistQuotes> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useWatchlistQuotes(["BHP.AX", "CBA.AX"]);
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });

    expect(latest!.quotes["CBA.AX"]?.price).toBe(120);
    expect(latest!.quotes["BHP.AX"]?.price).toBeNull();
    expect(latest!.error).toBe("Some quotes are temporarily unavailable.");

    await act(async () => {
      latest!.refresh();
      await flushPromises();
    });

    expect(latest!.quotes["BHP.AX"]?.price).toBe(42);
    expect(latest!.error).toBeNull();
    renderer!.unmount();
  });

  it("explains when every requested quote is unavailable", async () => {
    const unavailableQuote = (symbol: string) => ({
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
      symbol,
    });
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        quotes: [unavailableQuote("BHP.AX"), unavailableQuote("CBA.AX")],
        unavailableSymbols: ["BHP.AX", "CBA.AX"],
      }), { status: 200 }),
    );
    let latest: ReturnType<typeof useWatchlistQuotes> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useWatchlistQuotes(["BHP.AX", "CBA.AX"]);
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });

    expect(latest!.error).toBe("Quotes are currently unavailable.");
    expect(Object.keys(latest!.quotes)).toEqual(["BHP.AX", "CBA.AX"]);
    renderer!.unmount();
  });

  it("does not expose stale search results while a new query is pending", async () => {
    Object.defineProperty(global, "window", {
      configurable: true,
      value: global,
    });
    jest.useFakeTimers();
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              exchange: "ASX",
              name: "Commonwealth Bank",
              quoteType: "EQUITY",
              symbol: "CBA.AX",
            },
          ],
        }),
        { status: 200 },
      ),
    );
    let query = "cba";
    let latest: ReturnType<typeof useWatchlistSymbolSearch> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useWatchlistSymbolSearch(query);
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
    });
    await act(async () => {
      jest.advanceTimersByTime(250);
      await flushPromises();
    });
    expect(latest!.results[0]?.symbol).toBe("CBA.AX");
    expect(latest!.hasSearched).toBe(true);

    query = "bhp";
    await act(async () => {
      renderer!.update(<Probe />);
    });
    expect(latest!.results).toEqual([]);
    expect(latest!.hasSearched).toBe(false);
    renderer!.unmount();
  });

  it("surfaces provider and fallback quote failures without discarding hook recovery", async () => {
    jest.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ error: "Quotes are temporarily offline." }),
        { status: 502 },
      ))
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 502 }))
      .mockRejectedValueOnce("network unavailable");
    let latest: ReturnType<typeof useWatchlistQuotes> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useWatchlistQuotes(["CBA.AX"]);
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });
    expect(latest!.error).toBe("Quotes are temporarily offline.");

    await act(async () => {
      latest!.refresh();
      await flushPromises();
    });
    expect(latest!.error).toBe("Market data is temporarily unavailable.");

    await act(async () => {
      latest!.refresh();
      await flushPromises();
    });
    expect(latest!.error).toBe("Market data is temporarily unavailable.");
    renderer!.unmount();
  });

  it("clears search state and reports explicit and fallback search failures", async () => {
    Object.defineProperty(global, "window", { configurable: true, value: global });
    jest.useFakeTimers();
    jest.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ error: "Symbol provider is offline." }),
        { status: 503 },
      ))
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 503 }))
      .mockRejectedValueOnce("network unavailable");
    let query = "cba";
    let latest: ReturnType<typeof useWatchlistSymbolSearch> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useWatchlistSymbolSearch(query);
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
    });
    await act(async () => {
      jest.advanceTimersByTime(250);
      await flushPromises();
    });
    expect(latest!.error).toBe("Symbol provider is offline.");
    expect(latest!.hasSearched).toBe(true);

    query = "bhp";
    await act(async () => {
      renderer!.update(<Probe />);
    });
    await act(async () => {
      jest.advanceTimersByTime(250);
      await flushPromises();
    });
    expect(latest!.error).toBe("Symbol search is temporarily unavailable.");

    query = "wes";
    await act(async () => {
      renderer!.update(<Probe />);
    });
    await act(async () => {
      jest.advanceTimersByTime(250);
      await flushPromises();
    });
    expect(latest!.error).toBe("Symbol search is temporarily unavailable.");

    query = "";
    await act(async () => {
      renderer!.update(<Probe />);
      await flushPromises();
    });
    expect(latest!.error).toBeNull();
    expect(latest!.results).toEqual([]);
    renderer!.unmount();
  });
});
