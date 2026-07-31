import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "@jest/globals";

const readClientSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

const openingTagContaining = (source: string, uniqueText: string) => {
  const textIndex = source.indexOf(uniqueText);
  expect(textIndex).toBeGreaterThanOrEqual(0);
  const openingTagStart = source.lastIndexOf("<", textIndex);
  const openingTagEnd = source.indexOf(">", openingTagStart);
  return source.slice(openingTagStart, openingTagEnd + 1);
};

describe("Portfolio Analytics and Top Picks theme contract", () => {
  it("keeps Top Picks on the shared FIT token system", () => {
    const source = [
      "features/top-picks/screens/TopPicksScreen.tsx",
      "features/top-picks/components/TopPicksTable.tsx",
      "features/top-picks/components/TopPicksToolbar.tsx",
      "features/top-picks/components/topPicksSx.ts",
    ]
      .map(readClientSource)
      .join("\n");

    [
      "--fit-font-family",
      "--fit-color-page-bg",
      "--fit-color-surface",
      "--fit-color-field",
      "--fit-color-text-body",
      "--fit-color-accent-strong",
      "--fit-color-focus-ring",
    ].forEach((token) => expect(source).toContain(token));
  });

  it("keeps the redesigned Portfolio workspace on the shared FIT foundation", () => {
    const styles = readClientSource(
      "features/portfolio/styles/PortfolioTraderWorkspace.module.css",
    );

    expect(styles).toContain("var(--fit-page-background)");
    expect(styles).toContain("var(--fit-font-family)");
    expect(styles).toContain("color-scheme: dark");
    expect(styles).toContain("min-height: 100dvh");
    expect(styles).not.toContain("#fc03d7");
  });

  it("removes the legacy Top Picks white control and blue-purple CTA", () => {
    const source = readClientSource(
      "features/top-picks/screens/TopPicksScreen.tsx",
    );

    expect(source).not.toMatch(/bgcolor:\s*["']white["']/);
    expect(source).not.toContain(
      "linear-gradient(90deg, #3b82f6 0%, #9333ea 100%)",
    );
  });

  it("preserves a six-card Board with shared Focus and Observation modes", () => {
    const route = readClientSource("pages/Portfolio.tsx");
    const screen = readClientSource(
      "features/portfolio/screens/PortfolioScreen.tsx",
    );

    expect(route).toContain("PortfolioScreen");
    expect(screen).toContain('aria-label="Multi-metric Portfolio board"');
    expect(screen).toContain("<PortfolioMetricCard");
    expect(screen).toContain("<PortfolioObservation");
    expect(screen).toContain('workspace.view.mode === "focus"');
    expect(screen).toContain('workspace.view.mode === "observation"');
  });

  it("renders Top Picks through the shared page-header typography contract", () => {
    const source = readClientSource(
      "features/top-picks/screens/TopPicksScreen.tsx",
    );
    const headerTag = openingTagContaining(source, 'title="Top Picks"');

    expect(headerTag).toMatch(/^<FitPageHeader\b/);
    expect(headerTag).toContain(
      'subtitle="Ranked stocks based on risk-adjusted performance metrics"',
    );
  });

  it("renders a responsive Portfolio h1 with natural page scrolling", () => {
    const screen = readClientSource(
      "features/portfolio/screens/PortfolioScreen.tsx",
    );
    const styles = readClientSource(
      "features/portfolio/styles/PortfolioTraderWorkspace.module.css",
    );
    const titleTag = openingTagContaining(
      screen,
      "Scan broadly. Investigate deeply.",
    );

    expect(titleTag).toMatch(/^<h1>/);
    expect(styles).toMatch(/\.traderHeader h1\s*\{[\s\S]*?clamp\(/);
    expect(styles).toContain("@media (max-width: 720px)");
    expect(styles).not.toMatch(/height:\s*100vh/);
  });

  it("associates Portfolio inputs and exposes the accessible data alternative", () => {
    const controls = readClientSource(
      "features/portfolio/components/PortfolioCommandBar.tsx",
    );
    const table = readClientSource(
      "features/portfolio/components/PortfolioDataTable.tsx",
    );

    [
      "portfolio-stock-select",
      "portfolio-start-date",
      "portfolio-end-date",
      "portfolio-benchmark",
      "portfolio-risk-free-rate",
      "portfolio-confidence",
    ].forEach((id) => {
      expect(controls).toContain(`htmlFor="${id}"`);
      expect(controls).toContain(`id="${id}"`);
    });
    expect(table).toContain("<table");
    expect(table).toContain('scope="col"');
    expect(table).toContain('scope="row"');
  });

  it("defines a readable single-column mobile Board and stacked Observation", () => {
    const styles = readClientSource(
      "features/portfolio/styles/PortfolioTraderWorkspace.module.css",
    );
    const mobileRules = styles.slice(
      styles.indexOf("@media (max-width: 720px)"),
    );

    expect(mobileRules).toMatch(/\.board[\s\S]*grid-template-columns:\s*1fr/);
    expect(mobileRules).toMatch(/\.boardSlot,[\s\S]*min-height:\s*330px/);
    expect(mobileRules).toMatch(
      /\.observationWindow[\s\S]*position:\s*relative !important/,
    );
    expect(mobileRules).toMatch(/\.observationResize[\s\S]*display:\s*none/);
  });
});
