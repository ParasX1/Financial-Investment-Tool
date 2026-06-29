import {
  homeCta,
  homeExperiencePoints,
  homeFooterGroups,
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
      "/dashboardView",
    ]);
    const allRoutes = [
      ...homeRouteLinks.map((link) => link.href),
      ...homeFooterGroups.flatMap((group) =>
        group.items.map((item) => item.href),
      ),
    ];

    expect(allRoutes.every((route) => allowedRoutes.has(route))).toBe(true);
  });

  it("avoids unsupported marketing placeholders from the previous front page", () => {
    const text = JSON.stringify({
      homeCta,
      homeExperiencePoints,
      homeFooterGroups,
    });

    expect(text).not.toMatch(
      /15K|2\.4B|Pricing|Careers|Legal|Assets Analyzed|Real routes|Private by default/i,
    );
  });
});
