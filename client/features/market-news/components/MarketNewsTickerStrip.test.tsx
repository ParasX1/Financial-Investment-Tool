import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MARKET_NEWS_MARKET_SCOPES } from "../data/marketNewsConfig";
import { resolveMarketNewsMarketScope } from "../lib/marketNewsNavigation";
import { MarketNewsTickerStrip } from "./MarketNewsTickerStrip";

function renderTickerStrip() {
  const australia = resolveMarketNewsMarketScope("australia");

  return renderToStaticMarkup(
    <MarketNewsTickerStrip
      marketScope={australia}
      marketScopes={MARKET_NEWS_MARKET_SCOPES.slice(0, 2)}
      tickers={australia.tickers.slice(0, 2)}
      onMarketScopeChange={() => undefined}
    />,
  );
}

describe("MarketNewsTickerStrip", () => {
  it("renders one compact scope control and quote snapshots as display-only cards", () => {
    const html = renderTickerStrip();
    const buttonMarkup = [...html.matchAll(/<button[\s\S]*?<\/button>/g)].map(
      ([markup]) => markup,
    );
    const articleMarkup = [
      ...html.matchAll(/<article[\s\S]*?<\/article>/g),
    ].map(([markup]) => markup);

    expect(buttonMarkup).toHaveLength(1);
    expect(buttonMarkup.join(" ")).toContain("Australia");
    expect(buttonMarkup.join(" ")).toContain("AU");
    expect(buttonMarkup.join(" ")).not.toContain("ALL ORDS");
    expect(buttonMarkup.join(" ")).not.toContain("AUD/USD");

    expect(articleMarkup).toHaveLength(2);
    expect(articleMarkup.join(" ")).toContain("ALL ORDS");
    expect(articleMarkup.join(" ")).toContain("AUD/USD");
  });
});
