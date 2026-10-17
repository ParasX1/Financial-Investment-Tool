import { describe, expect, it } from "@jest/globals";
import {
  homeCta,
  homeFooterGroups,
  homeMetadata,
  homePreviewMetrics,
  homeRouteLinks,
} from "./homeContent";

describe("homeContent", () => {
  it("makes all five gated tools discoverable from the front page", () => {
    expect(homeRouteLinks.map((route) => route.href)).toEqual([
      "/Portfolio",
      "/TopPicks",
      "/Watchlist",
      "/MarketNews",
      "/Community",
    ]);
    expect(homeRouteLinks.every((route) => route.gated)).toBe(true);
  });

  it("explains the three measures shown by the portfolio illustration", () => {
    expect(homePreviewMetrics.map((metric) => metric.label)).toEqual([
      "Historical return",
      "Volatility",
      "Drawdown",
    ]);
    expect(
      homePreviewMetrics.every((metric) => metric.description.length > 30),
    ).toBe(true);
  });

  it("links only to real FIT routes and sections", () => {
    const allowedRoutes = new Set([
      "#experience",
      "#product",
      "/Community",
      "/Guide",
      "/Help",
      "/MarketNews",
      "/Profile",
      "/Portfolio",
      "/TopPicks",
      "/Watchlist",
    ]);
    const allRoutes = [
      ...homeRouteLinks.map((link) => link.href),
      ...homeFooterGroups.flatMap((group) =>
        group.items.map((item) => item.href),
      ),
    ];

    expect(allRoutes.every((route) => allowedRoutes.has(route))).toBe(true);
  });

  it("uses specific, beginner-friendly language without hype or unsupported claims", () => {
    const text = JSON.stringify({
      homeCta,
      homeFooterGroups,
      homeMetadata,
      homeRouteLinks,
    });

    expect(text).not.toMatch(
      /15K|2\.4B|Assets Analyzed|Master your|empowers investors|smarter decisions|modern investing|optimize portfolios|Ready to get FIT/i,
    );
    expect(text).toMatch(/students and newer investors/i);
  });

  it("keeps product entry copy focused on decisions instead of feature lists", () => {
    expect(homeRouteLinks.every((route) => !("highlights" in route))).toBe(
      true,
    );
  });
});
