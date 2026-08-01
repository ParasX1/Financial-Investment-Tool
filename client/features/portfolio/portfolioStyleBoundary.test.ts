import { describe, expect, it } from "@jest/globals";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const featureRoot = __dirname;
const stylesRoot = join(featureRoot, "styles");

const readFeatureSource = (relativePath: string) =>
  readFileSync(join(featureRoot, relativePath), "utf8");

const styleModules = [
  {
    file: "PortfolioWorkspaceShell.module.css",
    owner: "screens/PortfolioScreen.tsx",
    selectors: [".page", ".board", ".focusView"],
    foreignSelectors: [".commandBar", ".metricCard", ".observation"],
  },
  {
    file: "PortfolioCommandBar.module.css",
    owner: "components/PortfolioCommandBar.tsx",
    selectors: [".commandBar", ".commandPrimary", ".globalAssumptions"],
    foreignSelectors: [".board", ".metricCard", ".observation"],
  },
  {
    file: "PortfolioMetricCard.module.css",
    owner: "components/PortfolioMetricCard.tsx",
    selectors: [".metricCard", ".cardHeader", ".cardSettings"],
    foreignSelectors: [".board", ".commandBar", ".observation"],
  },
  {
    file: "PortfolioChart.module.css",
    owner: "components/PortfolioChart.tsx",
    selectors: [".chartCanvas", ".chartCanvasCompact", ".chartSelection"],
    foreignSelectors: [".board", ".commandBar", ".metricCard", ".observation"],
  },
  {
    file: "PortfolioMetricWorkspace.module.css",
    owner: "components/PortfolioMetricWorkspace.tsx",
    selectors: [".workspace", ".chartStage", ".insightPanel"],
    foreignSelectors: [
      ".board",
      ".commandBar",
      ".metricCard",
      ".observation",
      ".dataSection",
      ".state",
    ],
  },
  {
    file: "PortfolioDataTable.module.css",
    owner: "components/PortfolioDataTable.tsx",
    selectors: [".dataSection", ".tableScroller", ".dataTable"],
    foreignSelectors: [
      ".board",
      ".commandBar",
      ".metricCard",
      ".observation",
      ".workspace",
      ".state",
    ],
  },
  {
    file: "PortfolioStates.module.css",
    owner: "components/PortfolioStates.tsx",
    selectors: [".state", ".stateMarker", ".stateError"],
    foreignSelectors: [
      ".board",
      ".commandBar",
      ".metricCard",
      ".observation",
      ".workspace",
      ".dataSection",
    ],
  },
  {
    file: "PortfolioObservation.module.css",
    owner: "components/PortfolioObservation.tsx",
    selectors: [".observation", ".observationToolbar", ".observationWindow"],
    foreignSelectors: [".board", ".commandBar", ".metricCard"],
  },
] as const;

describe("Portfolio stylesheet boundaries", () => {
  it("keeps each workspace surface in an owner-specific CSS module", () => {
    styleModules.forEach(({ file, owner, selectors, foreignSelectors }) => {
      const stylePath = join(stylesRoot, file);
      expect(existsSync(stylePath)).toBe(true);

      const styles = readFileSync(stylePath, "utf8");
      selectors.forEach((selector) => expect(styles).toContain(selector));
      foreignSelectors.forEach((selector) =>
        expect(styles).not.toContain(selector),
      );

      const importPath = `../styles/${file}`;
      expect(readFeatureSource(owner)).toContain(importPath);
    });
  });

  it("does not restore retired catch-all Portfolio stylesheets", () => {
    [
      "PortfolioTraderWorkspace.module.css",
      "PortfolioScreen.module.css",
    ].forEach((file) => expect(existsSync(join(stylesRoot, file))).toBe(false));

    styleModules.forEach(({ file }) => {
      const lineCount = readFileSync(join(stylesRoot, file), "utf8").split(
        /\r?\n/,
      ).length;
      expect(lineCount).toBeLessThanOrEqual(500);
    });
  });

  it("defines every Portfolio custom property used by an owner module", () => {
    const styles = styleModules
      .map(({ file }) => readFileSync(join(stylesRoot, file), "utf8"))
      .join("\n");
    const usedProperties = [
      ...styles.matchAll(/var\((--portfolio-[a-z0-9-]+)/g),
    ].map((match) => match[1]);
    const definedProperties = new Set(
      [...styles.matchAll(/(--portfolio-[a-z0-9-]+)\s*:/g)].map(
        (match) => match[1],
      ),
    );

    expect(
      [...new Set(usedProperties)].filter(
        (property) => !definedProperties.has(property),
      ),
    ).toEqual([]);
  });
});
