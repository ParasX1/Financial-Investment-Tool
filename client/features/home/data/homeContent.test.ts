import {
  homeExperiencePoints,
  homeFooterLinks,
  homeNavItems,
  homeRouteLinks,
} from "./homeContent";

describe("homeContent", () => {
  it("keeps nav links scoped to sections rendered by the front page", () => {
    expect(homeNavItems.map((item) => item.href)).toEqual([
      "#product",
      "#experience",
    ]);
  });

  it("keeps the front page entry points intentionally limited", () => {
    expect(homeRouteLinks).toHaveLength(3);
    expect(homeNavItems).toHaveLength(2);
    expect(homeExperiencePoints).toHaveLength(4);
  });

  it("links only to real FIT product routes", () => {
    const allowedRoutes = new Set([
      "/Community",
      "/Guide",
      "/Help",
      "/MarketNews",
      "/Profile",
      "/dashboardView",
    ]);
    const allRoutes = [
      ...homeRouteLinks.map((link) => link.href),
      ...homeFooterLinks.map((link) => link.href),
    ];

    expect(allRoutes.every((route) => allowedRoutes.has(route))).toBe(true);
  });

  it("avoids unsupported marketing placeholders from the previous front page", () => {
    const text = JSON.stringify({
      homeExperiencePoints,
      homeFooterLinks,
    });

    expect(text).not.toMatch(
      /15K|2\.4B|Pricing|Careers|Legal|Assets Analyzed|Real routes|Private by default/i,
    );
  });
});
