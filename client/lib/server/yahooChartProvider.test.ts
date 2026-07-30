import { describe, expect, it, jest } from "@jest/globals";
import {
  fetchYahooChartSnapshot,
  YahooChartProviderError,
} from "./yahooChartProvider";

function chartResponse(overrides: Record<string, unknown> = {}) {
  return new Response(
    JSON.stringify({
      chart: {
        error: null,
        result: [
          {
            indicators: { quote: [{ close: [169.8, null, 170] }] },
            meta: {
              chartPreviousClose: 169.3,
              currency: "AUD",
              exchangeName: "ASX",
              longName: "Commonwealth Bank of Australia",
              marketState: "REGULAR",
              regularMarketPrice: 170,
              regularMarketTime: 1784095810,
              symbol: "CBA.AX",
            },
            timestamp: [1784094000, 1784094060, 1784094120],
            ...overrides,
          },
        ],
      },
    }),
    { status: 200 },
  );
}

describe("Yahoo chart provider", () => {
  it("fetches a one-day one-minute chart and standardizes timestamps as milliseconds", async () => {
    const fetchImpl = jest
      .fn<typeof fetch>()
      .mockResolvedValue(chartResponse());

    const snapshot = await fetchYahooChartSnapshot(" cba.ax ", {
      fetchImpl,
      rangeId: "1d",
      maxPoints: 240,
      timeoutMs: 5_000,
    });

    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain(
      "/v8/finance/chart/CBA.AX?range=1d&interval=1m",
    );
    expect(snapshot).toEqual(
      expect.objectContaining({
        currency: "AUD",
        exchange: "ASX",
        interval: "1m",
        marketState: "REGULAR",
        previousClose: 169.3,
        quoteTime: "2026-07-15T06:10:10.000Z",
        rangeId: "1d",
        regularMarketPrice: 170,
        symbol: "CBA.AX",
      }),
    );
    expect(snapshot.points).toEqual([
      { timeMs: 1784094000000, value: 169.8 },
      { timeMs: 1784094120000, value: 170 },
    ]);
  });

  it("maps a selected product range to a provider-safe range and interval", async () => {
    const fetchImpl = jest
      .fn<typeof fetch>()
      .mockResolvedValue(chartResponse());

    const snapshot = await fetchYahooChartSnapshot("CBA.AX", {
      fetchImpl,
      rangeId: "3m",
    });

    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain(
      "/v8/finance/chart/CBA.AX?range=3mo&interval=1d",
    );
    expect(snapshot).toMatchObject({ interval: "1d", rangeId: "3m" });
  });

  it("rejects unsafe symbols and mismatched provider identities without fetching arbitrary hosts", async () => {
    const fetchImpl = jest.fn<typeof fetch>();

    await expect(
      fetchYahooChartSnapshot("https://169.254.169.254", { fetchImpl }),
    ).rejects.toBeInstanceOf(YahooChartProviderError);
    expect(fetchImpl).not.toHaveBeenCalled();

    fetchImpl.mockResolvedValueOnce(
      chartResponse({
        meta: {
          regularMarketPrice: 314,
          symbol: "AAPL",
        },
      }),
    );
    await expect(
      fetchYahooChartSnapshot("CBA.AX", { fetchImpl }),
    ).rejects.toBeInstanceOf(YahooChartProviderError);
  });

  it("caps dense chart payloads while preserving the first and last point", async () => {
    const timestamps = Array.from(
      { length: 500 },
      (_, index) => 1784094000 + index * 60,
    );
    const closes = timestamps.map((_, index) => 100 + index / 10);
    const fetchImpl = jest.fn<typeof fetch>().mockResolvedValue(
      chartResponse({
        indicators: { quote: [{ close: closes }] },
        timestamp: timestamps,
      }),
    );

    const snapshot = await fetchYahooChartSnapshot("CBA.AX", {
      fetchImpl,
      maxPoints: 180,
    });

    expect(snapshot.points).toHaveLength(180);
    expect(snapshot.points[0]?.value).toBe(100);
    expect(snapshot.points.at(-1)?.value).toBe(149.9);
  });

  it("redacts upstream response bodies behind a structured provider error", async () => {
    const fetchImpl = jest
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("provider secret", { status: 429 }));

    await expect(
      fetchYahooChartSnapshot("CBA.AX", { fetchImpl }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "upstream",
        message: "Market chart provider unavailable",
        status: 429,
      }),
    );
  });
});
