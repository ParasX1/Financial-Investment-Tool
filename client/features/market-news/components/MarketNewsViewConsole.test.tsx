import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarketNewsViewConsole } from "./MarketNewsViewConsole";

describe("MarketNewsViewConsole", () => {
  it("keeps normal provider and coverage metadata out of the topic header", () => {
    const html = renderToStaticMarkup(
      <MarketNewsViewConsole
        activeLensLabel="Ticker stories"
        activeSortLabel="Watchlist first"
        eyebrow="Innovation watch"
        summary="Technology sector headlines and market-moving innovation stories."
        title="Technology"
      >
        <div>Scan order controls</div>
        <div>News filter controls</div>
      </MarketNewsViewConsole>,
    );

    expect(html).toContain("Technology");
    expect(html).not.toContain("Shown");
    expect(html).not.toContain("Provider");
    expect(html).not.toContain("Coverage");
    expect(html).not.toContain("Google News RSS");
    expect(html).not.toContain("Topic matched");
    expect(html).not.toContain("statusGrid");
    expect(html).not.toContain("statusCard");
  });

  it("surfaces broad-coverage warnings only when the feed needs reader context", () => {
    const html = renderToStaticMarkup(
      <MarketNewsViewConsole
        activeLensLabel="All"
        activeSortLabel="Latest"
        eyebrow="Market search"
        notice="Showing broader finance headlines because exact category coverage is limited."
        summary="Broader market stories while exact category coverage is unavailable."
        title="Broad finance headlines"
      >
        <div>Scan order</div>
      </MarketNewsViewConsole>,
    );

    expect(html).toContain("Showing broader finance headlines");
    expect(html).toContain("viewNotice");
  });

  it("keeps scan order and filters in a default-collapsed expandable panel", () => {
    const html = renderToStaticMarkup(
      <MarketNewsViewConsole
        activeLensLabel="All"
        activeSortLabel="Latest"
        eyebrow="Household pressure"
        summary="Consumer prices, rates, wages, bills, and saving decisions."
        title="Cost of Living"
      >
        <div>Scan order</div>
        <div>News filters</div>
      </MarketNewsViewConsole>,
    );

    expect(html).toContain("<details");
    expect(html).not.toContain("<details open");
    expect(html).toContain("Feed controls");
    expect(html).toContain("Order");
    expect(html).toContain("Latest");
    expect(html).toContain("Filter");
    expect(html).toContain("All");
    expect(html).toContain("Scan order");
    expect(html).toContain("News filters");
  });
});
