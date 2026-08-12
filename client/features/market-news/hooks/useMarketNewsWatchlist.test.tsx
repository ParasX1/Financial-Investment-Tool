import * as React from "react";
import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";

let savedState: {
  authenticated: boolean;
  failed: boolean;
  loading: boolean;
  symbols: string[];
};
let useMarketNewsWatchlist: typeof import("./useMarketNewsWatchlist")["useMarketNewsWatchlist"];

describe("useMarketNewsWatchlist", () => {
  beforeAll(() => {
    jest.doMock("@/features/watchlist", () => ({
      useSavedWatchlistSymbols: () => savedState,
    }));
    useMarketNewsWatchlist =
      require("./useMarketNewsWatchlist").useMarketNewsWatchlist;
  });

  beforeEach(() => {
    savedState = {
      authenticated: true,
      failed: false,
      loading: false,
      symbols: ["CBA.AX"],
    };
  });

  it("keeps the shared capability narrow and maps failures to reader context", () => {
    function Probe() {
      const state = useMarketNewsWatchlist();
      return (
        <span
          data-error={state.error ?? ""}
          data-symbols={state.symbols.join(",")}
        />
      );
    }

    expect(renderToStaticMarkup(<Probe />)).toContain('data-symbols="CBA.AX"');

    savedState = { ...savedState, failed: true, symbols: [] };
    const failureMarkup = renderToStaticMarkup(<Probe />);
    expect(failureMarkup).toContain(
      "Saved tickers could not be loaded. Watchlist news may be incomplete.",
    );
    expect(failureMarkup).not.toContain("database");
  });
});
