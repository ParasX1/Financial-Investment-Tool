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

    expect(buttonMarkup).toHaveLength(3);
    expect(buttonMarkup.join(" ")).toContain(
      'aria-label="Quote snapshot scope: Australia"',
    );
    expect(buttonMarkup.join(" ")).toContain(
      'aria-label="Scroll quote snapshots left"',
    );
    expect(buttonMarkup.join(" ")).toContain(
      'aria-label="Scroll quote snapshots right"',
    );
    expect(buttonMarkup.join(" ")).toContain("Australia");
    expect(buttonMarkup.join(" ")).toContain("AU");
    expect(buttonMarkup.join(" ")).not.toContain("ALL ORDS");
    expect(buttonMarkup.join(" ")).not.toContain("AUD/USD");

    expect(articleMarkup).toHaveLength(2);
    expect(articleMarkup.join(" ")).toContain("^AORD");
    expect(articleMarkup.join(" ")).toContain("ALL ORDS");
    expect(articleMarkup.join(" ")).toContain("AUDUSD=X");
    expect(articleMarkup.join(" ")).toContain("AUD/USD");
    expect(html).toContain('tabindex="0"');
    expect(html).toContain("Yahoo Finance fallback quote mix");
  });

  it("renders lightweight labels for non-core dynamic ticker signals", () => {
    const australia = resolveMarketNewsMarketScope("australia");
    const html = renderToStaticMarkup(
      <MarketNewsTickerStrip
        dataSource="live"
        marketScope={australia}
        marketScopes={MARKET_NEWS_MARKET_SCOPES.slice(0, 2)}
        providerLabel="Yahoo Finance"
        tickers={[
          {
            symbol: "BHP.AX",
            label: "BHP",
            value: "42.00",
            change: "+1.00 +2.44%",
            tone: "positive",
            sparkline: [1, 2, 3],
            signal: "Mover",
          },
        ]}
        updatedAt={new Date("2026-06-21T01:02:03.000Z")}
        onMarketScopeChange={() => undefined}
      />,
    );

    expect(html).toContain("Mover");
    expect(html).toContain("Yahoo Finance live");
    expect([...html.matchAll(/<button[\s\S]*?<\/button>/g)]).toHaveLength(3);
  });
});
