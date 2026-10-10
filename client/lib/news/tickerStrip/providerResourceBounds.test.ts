import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { resolveMarketNewsMarketScope } from "./index";
import { buildMarketNewsTickerStripSnapshot } from "./snapshotService";

function livePayload(url: string) {
  if (url.includes("/trending/")) {
    return { finance: { result: [{ quotes: [{ symbol: "AAPL" }] }] } };
  }
  if (url.includes("/quote?")) {
    return {
      quoteResponse: {
        result: new URL(url).searchParams
          .get("symbols")!
          .split(",")
          .map((symbol) => ({
            symbol,
            regularMarketPrice: 101,
            regularMarketPreviousClose: 100,
          })),
      },
    };
  }
  return {
    chart: {
      result: [
        {
          indicators: { quote: [{ close: [100, 101] }] },
          meta: { previousClose: 100, regularMarketPrice: 101 },
          timestamp: [1, 2],
        },
      ],
    },
  };
}

describe("ticker snapshot provider resource boundaries", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it.each(["headers", "body"])(
    "returns display-safe fallback within eight seconds after stalled %s",
    async (stall) => {
      const cancel = jest.fn(() => undefined);
      const signals: AbortSignal[] = [];
      const fetcher = jest.fn(
        async (_: string | URL | Request, init?: RequestInit) => {
          signals.push(init!.signal!);
          if (stall === "headers")
            return new Promise<Response>(() => undefined);
          return new Response(new ReadableStream({ cancel }));
        },
      );
      let settled = false;
      let source: string | undefined;
      const result = buildMarketNewsTickerStripSnapshot({
        fetcher,
        marketScope: resolveMarketNewsMarketScope("us-markets"),
      });
      void result.then((snapshot) => {
        settled = true;
        source = snapshot.source;
      });
      await jest.advanceTimersByTimeAsync(8001);
      expect(settled).toBe(true);
      expect(source).toBe("fallback");
      expect(signals.every((signal) => signal.aborted)).toBe(true);
      expect(fetcher).toHaveBeenCalledTimes(2);
      if (stall === "body") expect(cancel).toHaveBeenCalledTimes(2);
    },
  );

  it("rejects oversized decoded quote bodies without marking fallback cards as live", async () => {
    const snapshot = await buildMarketNewsTickerStripSnapshot({
      fetcher: async (input) =>
        new Response(
          JSON.stringify({
            ...livePayload(String(input)),
            padding: "x".repeat(2 * 1024 * 1024),
          }),
        ),
      marketScope: resolveMarketNewsMarketScope("us-markets"),
    });
    expect(snapshot.source).toBe("fallback");
    expect(snapshot.updatedAt).toBeNull();
    expect(
      snapshot.tickers.every((ticker) => ticker.value === "Quote unavailable"),
    ).toBe(true);
  });

  it("returns fallback when provider JSON is malformed instead of rejecting the snapshot", async () => {
    const snapshot = await buildMarketNewsTickerStripSnapshot({
      fetcher: async () => new Response("{"),
      marketScope: resolveMarketNewsMarketScope("us-markets"),
    });
    expect(snapshot.source).toBe("fallback");
    expect(snapshot.updatedAt).toBeNull();
    expect(snapshot.tickers).toHaveLength(9);
  });

  it("keeps 20-symbol watchlist polling live while capping the nine-sparkline fanout", async () => {
    const watchlistSymbols = Array.from(
      { length: 20 },
      (_, index) => `SYMBOL${index}`,
    );
    const quotePools: string[][] = [];
    let active = 0;
    let peak = 0;
    const fetcher = jest.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/quote?")) {
        quotePools.push(new URL(url).searchParams.get("symbols")!.split(","));
      }
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
      return new Response(JSON.stringify(livePayload(url)));
    });
    const snapshots = [];
    for (let poll = 0; poll < 3; poll += 1) {
      const result = buildMarketNewsTickerStripSnapshot({
        fetcher,
        marketScope: resolveMarketNewsMarketScope("us-markets"),
        watchlistSymbols,
      });
      await jest.advanceTimersByTimeAsync(100);
      snapshots.push(await result);
      await jest.advanceTimersByTimeAsync(60_000);
    }
    expect(peak).toBeLessThanOrEqual(8);
    expect(quotePools).toHaveLength(3);
    for (const pool of quotePools)
      expect(pool).toEqual(expect.arrayContaining(watchlistSymbols));
    for (const snapshot of snapshots) {
      expect(snapshot.source).toBe("live");
      expect(snapshot.tickers).toHaveLength(9);
      expect(
        snapshot.tickers.some((ticker) => ticker.signal === "Watchlist"),
      ).toBe(true);
    }
    expect(fetcher).toHaveBeenCalledTimes(33);
  });
});
