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
import { usePortfolioSymbolSearch } from "../../portfolio/hooks/usePortfolioSymbolSearch";
import { useWatchlistSymbolSearch } from "../../watchlist/hooks/useWatchlistSymbolSearch";
import { useMarketSymbolSearch } from "./useMarketSymbolSearch";

type SearchState = {
  error: string | null;
  hasSearched: boolean;
  loading: boolean;
  results: readonly { symbol: string }[];
};
type SearchHook = (query: string) => SearchState;

const renderers: ReactTestRenderer[] = [];
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const unavailableMessage = "Symbol search is temporarily unavailable.";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function searchResponse(symbol: string) {
  return new Response(
    JSON.stringify({
      results: [
        {
          exchange: "NasdaqGS",
          name: `${symbol} company`,
          quoteType: "EQUITY",
          symbol,
        },
      ],
    }),
    { status: 200 },
  );
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function mountSearch(useSearch: SearchHook, initialQuery: string) {
  let state!: SearchState;
  let renderer!: ReactTestRenderer;

  function Probe({ query }: { query: string }) {
    state = useSearch(query);
    return null;
  }

  await act(async () => {
    renderer = TestRenderer.create(<Probe query={initialQuery} />);
  });
  renderers.push(renderer);

  return {
    get state() {
      return state;
    },
    async update(query: string) {
      await act(async () => {
        renderer.update(<Probe query={query} />);
      });
    },
    async advance(milliseconds: number) {
      await act(async () => {
        jest.advanceTimersByTime(milliseconds);
        await flushPromises();
      });
    },
    unmount() {
      act(() => renderer.unmount());
      renderers.splice(renderers.indexOf(renderer), 1);
    },
  };
}

describe.each<[string, SearchHook]>([
  ["Shared market symbol search", useMarketSymbolSearch],
  ["Portfolio compatibility hook", usePortfolioSymbolSearch],
  ["Watchlist compatibility hook", useWatchlistSymbolSearch],
])("%s", (_name, useSearch) => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: globalThis,
    });
  });

  afterEach(() => {
    act(() => {
      renderers.splice(0).forEach((renderer) => renderer.unmount());
    });
    jest.clearAllTimers();
    jest.restoreAllMocks();
    jest.useRealTimers();
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", originalWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  });

  it("normalizes spaces and encodes the query after exactly 250 ms", async () => {
    const pending = deferred<Response>();
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockReturnValue(pending.promise);
    const search = await mountSearch(useSearch, "  Apple \t &  Co\n ");

    expect(search.state).toEqual({
      error: null,
      hasSearched: false,
      loading: false,
      results: [],
    });
    await search.advance(249);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(search.state.loading).toBe(false);
    await search.advance(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/market/symbol-search?q=Apple%20%26%20Co",
      { signal: expect.any(AbortSignal) },
    );
    expect(search.state.loading).toBe(true);
    expect(search.state.hasSearched).toBe(false);

    await act(async () => {
      pending.resolve(searchResponse("AAPL"));
      await flushPromises();
    });
    expect(search.state).toEqual({
      error: null,
      hasSearched: true,
      loading: false,
      results: [
        {
          exchange: "NasdaqGS",
          name: "AAPL company",
          quoteType: "EQUITY",
          symbol: "AAPL",
        },
      ],
    });
  });

  it("keeps an equivalent normalized query's timer and pending request", async () => {
    const pending = deferred<Response>();
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockReturnValue(pending.promise);
    const search = await mountSearch(useSearch, " apple  inc ");
    await search.advance(200);
    await search.update("apple\tinc");
    await search.advance(49);
    expect(fetchMock).not.toHaveBeenCalled();
    await search.advance(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const signal = fetchMock.mock.calls[0][1]?.signal;
    await search.update(" apple inc ");
    expect(signal?.aborted).toBe(false);
    await act(async () => {
      pending.resolve(searchResponse("AAPL"));
      await flushPromises();
    });
    await search.advance(250);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(search.state.results[0]?.symbol).toBe("AAPL");
  });

  it("restarts the debounce for a changed query and cancels earlier timers", async () => {
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(searchResponse("MSFT"));
    const search = await mountSearch(useSearch, "apple");
    await search.advance(200);
    await search.update("microsoft");
    await search.advance(249);
    expect(fetchMock).not.toHaveBeenCalled();
    await search.advance(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/market/symbol-search?q=microsoft",
    );
    expect(search.state.results[0]?.symbol).toBe("MSFT");
  });

  it("does not request an initial blank query or a query cleared before debounce", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch");
    const search = await mountSearch(useSearch, " \t\n ");
    await search.advance(250);
    expect(fetchMock).not.toHaveBeenCalled();
    await search.update("apple");
    await search.advance(249);
    await search.update("\t ");
    await search.advance(250);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(search.state).toEqual({
      error: null,
      hasSearched: false,
      loading: false,
      results: [],
    });
  });

  it("hides completed results immediately and clears them for a blank query", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(searchResponse("AAPL"));
    const search = await mountSearch(useSearch, "apple");
    await search.advance(250);
    expect(search.state.results[0]?.symbol).toBe("AAPL");
    await search.update("microsoft");
    expect(search.state.results).toEqual([]);
    expect(search.state.hasSearched).toBe(false);
    expect(search.state.loading).toBe(false);
    await search.update(" ");
    expect(search.state).toEqual({
      error: null,
      hasSearched: false,
      loading: false,
      results: [],
    });
  });

  it("marks an empty successful response as searched", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200 }),
      );
    const search = await mountSearch(useSearch, "no match");
    await search.advance(250);
    expect(search.state).toEqual({
      error: null,
      hasSearched: true,
      loading: false,
      results: [],
    });
  });

  it.each(["success", "error"] as const)(
    "ignores a delayed old %s and its completion while the new request is pending",
    async (outcome) => {
      const oldRequest = deferred<Response>();
      const newRequest = deferred<Response>();
      const fetchMock = jest
        .spyOn(globalThis, "fetch")
        .mockReturnValueOnce(oldRequest.promise)
        .mockReturnValueOnce(newRequest.promise);
      const search = await mountSearch(useSearch, "apple");
      await search.advance(250);
      const oldSignal = fetchMock.mock.calls[0][1]?.signal;
      expect(search.state.loading).toBe(true);
      await search.update("microsoft");
      expect(oldSignal?.aborted).toBe(true);
      // A query change preserves the loading state during the next debounce.
      expect(search.state.loading).toBe(true);
      await search.advance(250);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      await act(async () => {
        if (outcome === "success") oldRequest.resolve(searchResponse("AAPL"));
        else oldRequest.reject(new Error("Old request failed"));
        await flushPromises();
      });
      expect(search.state).toEqual({
        error: null,
        hasSearched: false,
        loading: true,
        results: [],
      });

      await act(async () => {
        newRequest.resolve(searchResponse("MSFT"));
        await flushPromises();
      });
      expect(search.state.results[0]?.symbol).toBe("MSFT");
      expect(search.state.error).toBeNull();
      expect(search.state.loading).toBe(false);
      expect(search.state.hasSearched).toBe(true);
    },
  );

  it.each(["success", "error"] as const)(
    "keeps the newer result when an old request delivers a delayed %s",
    async (outcome) => {
      const oldRequest = deferred<Response>();
      jest
        .spyOn(globalThis, "fetch")
        .mockReturnValueOnce(oldRequest.promise)
        .mockResolvedValueOnce(searchResponse("MSFT"));
      const search = await mountSearch(useSearch, "apple");
      await search.advance(250);
      await search.update("microsoft");
      await search.advance(250);
      expect(search.state.results[0]?.symbol).toBe("MSFT");

      await act(async () => {
        if (outcome === "success") oldRequest.resolve(searchResponse("AAPL"));
        else oldRequest.reject(new Error("Old request failed"));
        await flushPromises();
      });
      expect(search.state.results[0]?.symbol).toBe("MSFT");
      expect(search.state.error).toBeNull();
      expect(search.state.loading).toBe(false);
      expect(search.state.hasSearched).toBe(true);
    },
  );

  it.each(["success", "error"] as const)(
    "aborts a pending request and keeps blank state after delayed %s",
    async (outcome) => {
      const pending = deferred<Response>();
      const fetchMock = jest
        .spyOn(globalThis, "fetch")
        .mockReturnValue(pending.promise);
      const search = await mountSearch(useSearch, "apple");
      await search.advance(250);
      const signal = fetchMock.mock.calls[0][1]?.signal;
      await search.update("\t ");
      expect(signal?.aborted).toBe(true);
      await act(async () => {
        if (outcome === "success") pending.resolve(searchResponse("AAPL"));
        else pending.reject(new Error("Old request failed"));
        await flushPromises();
      });
      expect(search.state).toEqual({
        error: null,
        hasSearched: false,
        loading: false,
        results: [],
      });
      await search.advance(250);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it("cancels the debounce and aborts active requests on unmount", async () => {
    const pending = deferred<Response>();
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockReturnValue(pending.promise);
    const debouncing = await mountSearch(useSearch, "apple");
    await debouncing.advance(249);
    debouncing.unmount();
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(fetchMock).not.toHaveBeenCalled();

    const searching = await mountSearch(useSearch, "microsoft");
    await searching.advance(250);
    const signal = fetchMock.mock.calls[0][1]?.signal;
    expect(signal?.aborted).toBe(false);
    searching.unmount();
    expect(signal?.aborted).toBe(true);
    await act(async () => {
      pending.reject(new Error("Request ended after unmount"));
      await flushPromises();
    });
  });

  it.each<[string, () => Promise<Response>, string]>([
    [
      "provider response",
      () =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Provider offline" }), {
            status: 503,
          }),
        ),
      "Provider offline",
    ],
    [
      "error payload on success",
      () =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Provider offline" }), {
            status: 200,
          }),
        ),
      "Provider offline",
    ],
    [
      "response without provider error",
      () => Promise.resolve(new Response(JSON.stringify({}), { status: 503 })),
      unavailableMessage,
    ],
    [
      "network error",
      () => Promise.reject(new Error("Network offline")),
      "Network offline",
    ],
    [
      "unknown rejection",
      () => Promise.reject("Network offline"),
      unavailableMessage,
    ],
    [
      "empty error message",
      () => Promise.reject(new Error()),
      unavailableMessage,
    ],
    [
      "JSON parsing",
      () => {
        const response = searchResponse("AAPL");
        jest
          .spyOn(response, "json")
          .mockRejectedValue(new Error("Invalid response JSON"));
        return Promise.resolve(response);
      },
      "Invalid response JSON",
    ],
  ])(
    "reports %s failures and clears state when the query is blank",
    async (_kind, request, message) => {
      const fetchMock = jest
        .spyOn(globalThis, "fetch")
        .mockImplementation(request);
      const search = await mountSearch(useSearch, "apple");
      await search.advance(250);
      expect(search.state).toEqual({
        error: message,
        hasSearched: true,
        loading: false,
        results: [],
      });
      await search.update(" ");
      expect(search.state).toEqual({
        error: null,
        hasSearched: false,
        loading: false,
        results: [],
      });
      await search.advance(250);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it("retries after a query change, preserving the previous error until the next request starts", async () => {
    const retry = deferred<Response>();
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("Provider offline"))
      .mockReturnValueOnce(retry.promise);
    const search = await mountSearch(useSearch, "apple");
    await search.advance(250);
    expect(search.state.error).toBe("Provider offline");
    await search.update(" apple ");
    await search.advance(250);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await search.update("microsoft");
    expect(search.state.error).toBe("Provider offline");
    expect(search.state.hasSearched).toBe(false);
    await search.advance(249);
    expect(search.state.error).toBe("Provider offline");
    await search.advance(1);
    expect(search.state.error).toBeNull();
    expect(search.state.loading).toBe(true);
    await act(async () => {
      retry.resolve(searchResponse("MSFT"));
      await flushPromises();
    });
    expect(search.state.results[0]?.symbol).toBe("MSFT");
    expect(search.state.hasSearched).toBe(true);
  });
});
