import { describe, expect, it } from "@jest/globals";
import {
  homeCta,
  homeExperiencePoints,
  homeFooterGroups,
  homeMetadata,
  homeRouteLinks,
} from "./homeContent";

describe("homeContent", () => {
  it("keeps the front page entry points intentionally limited", () => {
    expect(homeRouteLinks).toHaveLength(3);
    expect(homeExperiencePoints).toHaveLength(4);
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
