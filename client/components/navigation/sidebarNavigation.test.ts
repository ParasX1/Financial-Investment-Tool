import { describe, expect, it } from "@jest/globals";
import {
  SIDEBAR_MAIN_NAV_ITEMS,
  isSidebarNavItemActive,
} from "./sidebarNavigation";

describe("Sidebar navigation metadata", () => {
  it("uses the canonical Portfolio route while keeping the legacy alias active", () => {
    const portfolio = SIDEBAR_MAIN_NAV_ITEMS.find(
      (item) => item.label === "Portfolio",
    );

    expect(portfolio).toBeDefined();
    expect(portfolio?.href).toBe("/Portfolio");
    expect(isSidebarNavItemActive(portfolio!, "/Portfolio")).toBe(true);
    expect(isSidebarNavItemActive(portfolio!, "/dashboardView")).toBe(true);
    expect(isSidebarNavItemActive(portfolio!, "/TopPicks")).toBe(false);
  });

  it("keeps nested Community routes active", () => {
    const community = SIDEBAR_MAIN_NAV_ITEMS.find(
      (item) => item.label === "Community",
    );

    expect(community).toBeDefined();
    expect(isSidebarNavItemActive(community!, "/Community/Create")).toBe(true);
  });
});
