import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resolveMarketNewsMarketScope } from "../lib/marketNewsNavigation";
import { useMarketNewsTickerQuotes } from "./useMarketNewsTickerQuotes";

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
  it("starts in updating state instead of claiming configured fallback before fetch", () => {
    const html = renderToStaticMarkup(<TickerQuoteProbe />);

    expect(html).toContain('data-loading="yes"');
    expect(html).toContain('data-source="fallback"');
    expect(html).toContain('data-first-value="Quote unavailable"');
    expect(html).toContain('data-change="No live data"');
    expect(html).not.toContain("9,128.00");
  });
});
