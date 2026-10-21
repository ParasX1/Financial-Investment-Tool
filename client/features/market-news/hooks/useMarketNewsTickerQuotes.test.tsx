import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resolveMarketNewsMarketScope } from "@/lib/news/tickerStrip";
import {
  buildMarketNewsTickerStripRequest,
  useMarketNewsTickerQuotes,
} from "./useMarketNewsTickerQuotes";

function TickerQuoteProbe() {
  const state = useMarketNewsTickerQuotes(
    resolveMarketNewsMarketScope("australia"),
  );

  return (
    <span
      data-change={state.tickers[0]?.change}
      data-first-value={state.tickers[0]?.value}
      data-loading={state.loading ? "yes" : "no"}
      data-source={state.source}
    />
  );
}

describe("useMarketNewsTickerQuotes", () => {
  it("keeps personalized Watchlist symbols out of request URLs", () => {
    const publicRequest = buildMarketNewsTickerStripRequest("australia", []);
    expect(publicRequest.url).toBe("/api/market/ticker-strip?scope=australia");
    expect(publicRequest.init.method).toBe("GET");

    const personalizedRequest = buildMarketNewsTickerStripRequest(
      "australia",
      ["CBA.AX", "NVDA"],
    );
    expect(personalizedRequest.url).toBe(
      "/api/market/ticker-strip?scope=australia",
    );
    expect(personalizedRequest.url).not.toContain("CBA.AX");
    expect(personalizedRequest.init).toMatchObject({
      body: JSON.stringify({ watchlistSymbols: ["CBA.AX", "NVDA"] }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  });

  it("starts in updating state instead of claiming configured fallback before fetch", () => {
    const html = renderToStaticMarkup(<TickerQuoteProbe />);

    expect(html).toContain('data-loading="yes"');
    expect(html).toContain('data-source="fallback"');
    expect(html).toContain('data-first-value="Quote unavailable"');
    expect(html).toContain('data-change="No live data"');
    expect(html).not.toContain("9,128.00");
  });
});
