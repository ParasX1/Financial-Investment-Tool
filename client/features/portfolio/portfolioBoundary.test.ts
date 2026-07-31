import { describe, expect, it } from "@jest/globals";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const clientRoot = join(__dirname, "..", "..");

const source = (relativePath: string) =>
  readFileSync(join(clientRoot, relativePath), "utf8");

describe("Portfolio feature boundary", () => {
  it("keeps the Next route thin and behind the feature public API", () => {
    const routeSource = source("pages/dashboardView.tsx");

    expect(routeSource).toMatch(/from\s+["']@\/features\/portfolio["']/);
    expect(routeSource).not.toMatch(/from\s+["']@\/features\/portfolio\//);
  });

  it("owns its preferences and frontier renderer inside the feature", () => {
    const screenSource = source(
      "features/portfolio/screens/PortfolioScreen.tsx",
    );
    const chartSource = source(
      "features/portfolio/components/PortfolioChart.tsx",
    );

    expect(screenSource).not.toContain("@/services/portfolioPrefs");
    expect(chartSource).not.toContain("@/components/scatterplot");
  });

  it("does not depend on retired Portfolio UI from shared components", () => {
    const featureFiles = [
      "features/portfolio/types.ts",
      "features/portfolio/hooks/usePortfolioMetric.ts",
      "features/portfolio/components/PortfolioChart.tsx",
      "features/portfolio/components/PortfolioDataTable.tsx",
      "features/portfolio/components/PortfolioMetricWorkspace.tsx",
    ];

    featureFiles.forEach((path) => {
      expect(source(path)).not.toMatch(
        /@\/components\/(?:fetchMetrics|graphSettingsModal|scatterplot)/,
      );
    });
  });

  it("removes verified unreachable legacy Portfolio modules", () => {
    [
      "components/StockCardComponent.tsx",
      "components/graphSettingsModal.tsx",
      "components/GraphSettingsContext.tsx",
      "features/portfolio/boardTypes.ts",
      "features/portfolio/components/MetricNavigation.tsx",
      "features/portfolio/components/PortfolioControls.tsx",
    ].forEach((path) => {
      expect(existsSync(join(clientRoot, path))).toBe(false);
    });
  });
});
