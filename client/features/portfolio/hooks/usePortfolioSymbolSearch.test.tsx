import * as React from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { usePortfolioSymbolSearch } from "./usePortfolioSymbolSearch";

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("usePortfolioSymbolSearch", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("loads market symbol suggestions and hides stale results while the query changes", async () => {
    jest.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [
            {
              exchange: "NYSE Arca",
              name: "Vanguard S&P 500 ETF",
              quoteType: "ETF",
              symbol: "VOO",
            },
          ],
        }),
        { status: 200 },
      ),
    );
    let query = "voo";
    let latest: ReturnType<typeof usePortfolioSymbolSearch> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = usePortfolioSymbolSearch(query);
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
    });
    await act(async () => {
      jest.advanceTimersByTime(250);
      await flushPromises();
    });

    expect(fetch).toHaveBeenCalledWith("/api/market/symbol-search?q=voo", {
      signal: expect.any(AbortSignal),
    });
    expect(latest!.results[0]?.symbol).toBe("VOO");
    expect(latest!.results[0]?.quoteType).toBe("ETF");
    expect(latest!.hasSearched).toBe(true);

    query = "apple";
    await act(async () => {
      renderer!.update(<Probe />);
    });

    expect(latest!.results).toEqual([]);
    expect(latest!.hasSearched).toBe(false);
    act(() => renderer!.unmount());
  });
});
