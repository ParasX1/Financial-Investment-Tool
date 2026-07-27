import * as React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { MarketNewsSearchBar } from "./MarketNewsSearchBar";
import { MarketNewsRightRail } from "./MarketNewsRightRail";

const noop = () => undefined;

describe("Market News search inputs", () => {
  it("uses the shared search-field primitive for news and quote lookup", () => {
    const newsHtml = renderToStaticMarkup(
      <MarketNewsSearchBar
        draft=""
        searchQuery=""
        onClear={noop}
        onDraftChange={noop}
        onRefresh={noop}
        onSubmit={noop}
      />,
    );
    const quoteHtml = renderToStaticMarkup(
      <MarketNewsRightRail
        authenticated={false}
        lookupDraft=""
        railSummary={{
          mentionedTickers: [],
          totalLinkedStoryCount: 0,
          watchlistHitCount: 0,
          watchlistStoryCount: 0,
          watchlistTickers: [],
        }}
        selectedTicker={null}
        watchlistError={null}
        watchlistLoading={false}
        watchlistSymbols={[]}
        onLookupDraftChange={noop}
        onQuoteReferenceChange={noop}
        onTickerNewsRequest={noop}
      />,
    );

    expect(newsHtml).toContain("fit-search-field");
    expect(quoteHtml).toContain("fit-search-field");
  });

  it("normalizes native search chrome while preserving a visible keyboard focus state", () => {
    const css = readFileSync(
      join(process.cwd(), "styles", "globals.css"),
      "utf8",
    );

    expect(css).toMatch(/\.fit-search-field[\s\S]*appearance:\s*none/);
    expect(css).toMatch(
      /\.fit-search-field[\s\S]*border-color:\s*var\(--fit-color-border-control\)/,
    );
    expect(css).toMatch(/\.fit-search-field:focus-visible/);
    expect(css).toMatch(/@media\s*\(forced-colors:\s*active\)/);
    expect(css).toMatch(/::-webkit-search-(?:cancel-button|decoration)/);
  });
});
