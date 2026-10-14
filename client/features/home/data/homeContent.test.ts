import { describe, expect, it } from "@jest/globals";
import {
  homeCta,
  homeExperiencePoints,
  homeFooterGroups,
  homeMetadata,
  homePreviewMetrics,
  homeRouteLinks,
} from "./homeContent";

describe("homeContent", () => {
  it("keeps the front page entry points intentionally limited", () => {
    expect(homeRouteLinks.map((route) => route.href)).toEqual([
      "/Portfolio",
      "/Watchlist",
      "/MarketNews",
      "/Community",
    ]);
    expect(homeExperiencePoints).toHaveLength(4);
  });

  it("describes the real analytics with classifications instead of invented results", () => {
    expect(homePreviewMetrics).toEqual([
      { label: "Historical return", classification: "Historical" },
      { label: "Annualised volatility", classification: "Estimated" },
      { label: "Drawdown history", classification: "Historical" },
      { label: "Sharpe ratio", classification: "Estimated" },
      { label: "Alpha", classification: "Estimated" },
      { label: "Value at risk", classification: "Estimated" },
    ]);
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
      homeExperiencePoints,
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
