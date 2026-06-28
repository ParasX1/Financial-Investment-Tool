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
    expect(articleMarkup[0]).toContain(
      'aria-label="^AORD ALL ORDS quote snapshot"',
    );
    expect(articleMarkup[0]).not.toContain("`");
    expect(articleMarkup.join(" ")).toContain("^AORD");
    expect(articleMarkup.join(" ")).toContain("ALL ORDS");
    expect(articleMarkup.join(" ")).toContain("AUDUSD=X");
    expect(articleMarkup.join(" ")).toContain("AUD/USD");
    expect(articleMarkup.join(" ")).toContain("Quote unavailable");
    expect(articleMarkup.join(" ")).toContain("No live data");
    expect(articleMarkup.join(" ")).not.toContain("9,128.00");
    expect(articleMarkup.join(" ")).not.toContain("0.7071");
    expect(html).toContain('tabindex="0"');
    expect(html).toContain("Quotes pending");
    expect(html).toContain("Live quote data unavailable");
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
            previousClose: 41,
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
    expect(html).toContain("sparklineReferenceLine");
    expect(html).toContain("Yahoo Finance");
    expect(html).toContain("Updated");
    expect(html).not.toContain("Yahoo Finance live");
    expect(html).not.toContain("Yahoo Finance quotes updated");
    expect([...html.matchAll(/<button[\s\S]*?<\/button>/g)]).toHaveLength(3);
  });

  it("labels Yahoo metadata-only quotes without drawing a fake one-day line", () => {
    const australia = resolveMarketNewsMarketScope("australia");
    const html = renderToStaticMarkup(
      <MarketNewsTickerStrip
        dataSource="mixed"
        marketScope={australia}
        marketScopes={MARKET_NEWS_MARKET_SCOPES.slice(0, 2)}
        providerLabel="Yahoo Finance"
        tickers={[
          {
            symbol: "CL=F",
            label: "Oil",
            value: "76.54",
            change: "+0.69 +0.91%",
            previousClose: 75.85,
            tone: "positive",
            sparkline: [],
            sparklineSource: "unavailable",
            signal: "Macro",
          },
        ]}
        updatedAt={new Date("2026-06-21T01:02:03.000Z")}
        onMarketScopeChange={() => undefined}
      />,
    );

    expect(html).toContain("1D line unavailable");
    expect(html).toContain(
      "Yahoo 1D intraday line unavailable; quote uses price metadata.",
    );
    expect(html).not.toContain("sparklineReferenceLine");
  });

  it("shows non-regular Yahoo market states as lightweight ticker context", () => {
    const australia = resolveMarketNewsMarketScope("australia");
    const html = renderToStaticMarkup(
      <MarketNewsTickerStrip
        dataSource="mixed"
        marketScope={australia}
        marketScopes={MARKET_NEWS_MARKET_SCOPES.slice(0, 2)}
        providerLabel="Yahoo Finance"
        tickers={[
          {
            symbol: "GC=F",
            label: "Gold",
            value: "4,172.90",
            change: "-73.00 -1.72%",
            marketState: "POSTPOST",
            previousClose: 4245.9,
            tone: "negative",
            sparkline: [],
            sparklineSource: "unavailable",
            signal: "Macro",
          },
        ]}
        updatedAt={new Date("2026-06-21T01:02:03.000Z")}
        onMarketScopeChange={() => undefined}
      />,
    );

    expect(html).toContain("After hours");
    expect(html).not.toContain("POSTPOST");
  });

  it("does not add market-state clutter for regular-session ticker cards", () => {
    const australia = resolveMarketNewsMarketScope("australia");
    const html = renderToStaticMarkup(
      <MarketNewsTickerStrip
        dataSource="live"
        marketScope={australia}
        marketScopes={MARKET_NEWS_MARKET_SCOPES.slice(0, 2)}
        providerLabel="Yahoo Finance"
        tickers={[
          {
            symbol: "CBA.AX",
            label: "CBA",
            value: "162.40",
            change: "+0.17 +0.10%",
            marketState: "REGULAR",
            tone: "positive",
            sparkline: [1, 2, 3],
            signal: "Mover",
          },
        ]}
        updatedAt={new Date("2026-06-21T01:02:03.000Z")}
        onMarketScopeChange={() => undefined}
      />,
    );

    expect(html).not.toContain("Regular");
    expect(html).not.toContain("REGULAR");
  });

  it("keeps multiple quote source warnings accessible without expanding the strip", () => {
    const australia = resolveMarketNewsMarketScope("australia");
    const html = renderToStaticMarkup(
      <MarketNewsTickerStrip
        dataSource="mixed"
        marketScope={australia}
        marketScopes={MARKET_NEWS_MARKET_SCOPES.slice(0, 2)}
        providerLabel="Yahoo Finance"
        tickers={australia.tickers.slice(0, 1)}
        updatedAt={new Date("2026-06-21T01:02:03.000Z")}
        warnings={[
          "Some quote snapshots are unavailable because Yahoo Finance did not return live quote data.",
          "Some Yahoo 1D quote lines are unavailable.",
        ]}
        onMarketScopeChange={() => undefined}
      />,
    );

    expect(html).not.toContain("2 quote notes");
    expect(html).not.toContain("marketMoverStatusChip");
    expect(html).not.toContain("marketMoverWarningChip");
    expect(html).toContain("Updated");
    expect(html).toContain("mixed coverage");
    expect(html).toContain(
      "Some quote snapshots are unavailable because Yahoo Finance did not return live quote data.",
    );
    expect(html).not.toContain("Some fallback quotes");
    expect(html).not.toContain("+1 note");
    expect(html).toContain("Some Yahoo 1D quote lines are unavailable.");
  });
});
