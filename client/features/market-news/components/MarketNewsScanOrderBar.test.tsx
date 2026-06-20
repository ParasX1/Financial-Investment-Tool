import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MARKET_NEWS_SORT_OPTIONS } from "../lib/marketNewsSort";
import { MarketNewsScanOrderBar } from "./MarketNewsScanOrderBar";

describe("MarketNewsScanOrderBar", () => {
  it("renders scan-order options as a compact pressed-button group", () => {
    const html = renderToStaticMarkup(
      <MarketNewsScanOrderBar
        activeSortId="relevance"
        options={MARKET_NEWS_SORT_OPTIONS}
        onSortChange={() => undefined}
      />,
    );

    expect(html).toContain("Scan order");
    expect(html).toContain("Latest");
    expect(html).toContain("Most relevant");
    expect(html).toContain("Watchlist first");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Provider match, ticker links, then newest stories.");
  });
});
