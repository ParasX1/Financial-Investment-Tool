import { afterEach, describe, expect, it, jest } from "@jest/globals";
import {
  clearMarketChartCache,
  fetchCachedYahooChartSnapshot,
  getMarketChartCacheTtl,
  MARKET_CHART_MAX_IN_FLIGHT,
} from "./marketChartCache";

function chartResponse(symbol: string, price = 105) {
  return new Response(
    JSON.stringify({
      chart: {
        error: null,
        result: [
          {
            indicators: { quote: [{ close: [100, price] }] },
            meta: {
              currency: "AUD",
              regularMarketPrice: price,
              symbol,
            },
            timestamp: [1784094000, 1784094060],
          },
        ],
      },
    }),
    { status: 200 },
  );
}

describe("market chart server cache", () => {
  afterEach(() => {
    clearMarketChartCache();
    jest.restoreAllMocks();
  });

  it("coalesces in-flight work and reuses a fresh symbol-range snapshot", async () => {
    let release: ((response: Response) => void) | undefined;
    const fetchImpl = jest.fn(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    );

    const first = fetchCachedYahooChartSnapshot("CBA.AX", {
      fetchImpl,
      now: () => 1_000,
      rangeId: "3m",
    });
    const second = fetchCachedYahooChartSnapshot("CBA.AX", {
      fetchImpl,
      now: () => 1_000,
      rangeId: "3m",
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    release?.(chartResponse("CBA.AX"));
    const [firstSnapshot, secondSnapshot] = await Promise.all([first, second]);
    expect(secondSnapshot).toBe(firstSnapshot);

    const cached = await fetchCachedYahooChartSnapshot("CBA.AX", {
      fetchImpl,
      now: () => 2_000,
      rangeId: "3m",
    });
    expect(cached).toBe(firstSnapshot);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("expires cached data and gives long ranges a longer bounded TTL", async () => {
    let now = 1_000;
    const fetchImpl = jest
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(chartResponse("AAPL", 105))
      .mockResolvedValueOnce(chartResponse("AAPL", 110));

    const first = await fetchCachedYahooChartSnapshot("AAPL", {
      fetchImpl,
      now: () => now,
      rangeId: "1d",
    });
    now += getMarketChartCacheTtl("1d") + 1;
    const refreshed = await fetchCachedYahooChartSnapshot("AAPL", {
      fetchImpl,
      now: () => now,
      rangeId: "1d",
    });

    expect(first.regularMarketPrice).toBe(105);
    expect(refreshed.regularMarketPrice).toBe(110);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(getMarketChartCacheTtl("max")).toBeGreaterThan(
      getMarketChartCacheTtl("1d"),
    );
  });

  it("bounds distinct upstream work while still coalescing matching requests", async () => {
    const fetchImpl = jest.fn(
      () => new Promise<Response>(() => undefined),
    );
    const pending = Array.from(
      { length: MARKET_CHART_MAX_IN_FLIGHT },
      (_, index) =>
        fetchCachedYahooChartSnapshot(`S${index}`, {
          fetchImpl,
          rangeId: "1d",
        }),
    );

    expect(fetchImpl).toHaveBeenCalledTimes(MARKET_CHART_MAX_IN_FLIGHT);
    expect(
      fetchCachedYahooChartSnapshot("S0", { fetchImpl, rangeId: "1d" }),
    ).toBe(pending[0]);
    await expect(
      fetchCachedYahooChartSnapshot("OVERFLOW", {
        fetchImpl,
        rangeId: "1d",
      }),
    ).rejects.toThrow("Market chart request capacity reached");
  });
});
