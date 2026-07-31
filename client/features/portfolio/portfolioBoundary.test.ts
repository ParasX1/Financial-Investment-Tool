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
  it("keeps screen rendering separate from workspace orchestration", () => {
    const screenSource = source(
      "features/portfolio/screens/PortfolioScreen.tsx",
    );

    expect(screenSource).toContain("usePortfolioWorkspaceController");
    expect(screenSource).not.toMatch(
      /\b(?:useEffect|useMemo|useState|localStorage|loadPortfolioConfig|savePortfolioConfig|portfolioWorkspaceReducer)\b/,
    );
  });

  it("splits workspace state into cohesive feature-local modules", () => {
    [
      "features/portfolio/state/workspaceDefaults.ts",
      "features/portfolio/state/workspaceReducer.ts",
      "features/portfolio/state/workspaceMigrations.ts",
      "features/portfolio/state/workspaceStorage.ts",
      "features/portfolio/state/workspaceSelectors.ts",
      "features/portfolio/hooks/usePortfolioWorkspaceController.ts",
    ].forEach((path) => {
      expect(existsSync(join(clientRoot, path))).toBe(true);
    });

    expect(source("features/portfolio/lib/workspaceModel.ts")).not.toContain(
      "switch (action.type)",
    );
  });
});
