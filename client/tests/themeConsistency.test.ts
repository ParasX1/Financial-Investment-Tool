import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "@jest/globals";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FitPageHeader } from "@/components/shared/FitPageHeader";

const readClientSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

const readPortfolioStyles = (...relativePaths: string[]) =>
  relativePaths.map(readClientSource).join("\n");

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
      "--fit-color-surface",
      "--fit-color-field",
      "--fit-color-text-body",
      "--fit-color-accent-strong",
      "--fit-color-focus-ring",
    ].forEach((token) => expect(source).toContain(token));
    const screen = readClientSource(
      "features/top-picks/screens/TopPicksScreen.tsx",
    );
    expect(screen).toContain("<FitPageShell");
    expect(screen).toContain("<FitPageContent");
    expect(screen).toContain("<FitPageHeader");
  });

  it("keeps the redesigned Portfolio workspace on the shared FIT foundation", () => {
    const styles = readPortfolioStyles(
      "features/portfolio/styles/PortfolioWorkspaceShell.module.css",
      "features/portfolio/styles/PortfolioCommandBar.module.css",
      "features/portfolio/styles/PortfolioMetricCard.module.css",
      "features/portfolio/styles/PortfolioObservation.module.css",
      "features/portfolio/styles/PortfolioChart.module.css",
    );

    [
      "--fit-color-text-strong",
      "--fit-color-surface",
      "--fit-color-accent",
      "--fit-color-border-control",
    ].forEach((token) => expect(styles).toContain(`var(${token})`));
    const layout = readClientSource(
      "components/shared/FitPageContent.module.css",
    );
    expect(layout).toContain("min-height: 100dvh");
    expect(styles).not.toMatch(/--fit-color-[\w-]+\s*:/);
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

  it("renders Portfolio through the shared responsive page header with natural scrolling", () => {
    const screen = readClientSource(
      "features/portfolio/screens/PortfolioScreen.tsx",
    );
    const styles = readClientSource(
      "features/portfolio/styles/PortfolioWorkspaceShell.module.css",
    );
    const headerTag = openingTagContaining(screen, 'title="Portfolio"');

    expect(headerTag).toMatch(/^<FitPageHeader\b/);
    expect(headerTag).toContain('subtitle="Scan broadly. Investigate deeply."');
    const headerStyles = readClientSource(
      "components/shared/FitPageHeader.module.css",
    );
    expect(headerStyles).toMatch(/\.title\s*\{[\s\S]*?clamp\(/);
    expect(headerStyles).toContain("@media (max-width: 767px)");
    expect(styles).toContain("@media (max-width: 720px)");
    expect(styles).not.toMatch(/height:\s*100vh/);
  });

  it("gives shared headers one h1, readable supporting text and optional actions", () => {
    const markup = renderToStaticMarkup(
      React.createElement(FitPageHeader, {
        title: "Research page",
        subtitle: "An explanation that remains readable on narrow screens.",
        eyebrow: "Research context",
        actions: React.createElement(
          "button",
          { type: "button" },
          "Refresh data",
        ),
      }),
    );
    expect(markup.match(/<h1\b/g)).toHaveLength(1);
    expect(markup).toContain("Research page</h1>");
    expect(markup).toContain("Research context");
    expect(markup).toContain(
      "An explanation that remains readable on narrow screens.",
    );
    expect(markup).toContain("var(--fit-color-text-strong)");
    expect(markup).toContain("var(--fit-color-text-body)");
    expect(markup).toContain('type="button">Refresh data</button>');
  });

  it("associates Portfolio inputs and exposes the accessible data alternative", () => {
    const controls = [
      "features/portfolio/components/PortfolioCommandBar.tsx",
      "features/portfolio/components/PortfolioSymbolInput.tsx",
    ]
      .map(readClientSource)
      .join("\n");
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
    const shellStyles = readClientSource(
      "features/portfolio/styles/PortfolioWorkspaceShell.module.css",
    );
    const observationStyles = readClientSource(
      "features/portfolio/styles/PortfolioObservation.module.css",
    );
    const shellMobileRules = shellStyles.slice(
      shellStyles.indexOf("@media (max-width: 720px)"),
    );
    const observationMobileRules = observationStyles.slice(
      observationStyles.indexOf("@media (max-width: 720px)"),
    );

    expect(shellMobileRules).toMatch(
      /\.board[\s\S]*grid-template-columns:\s*1fr/,
    );
    expect(shellMobileRules).toMatch(/\.boardSlot,[\s\S]*min-height:\s*330px/);
    expect(observationMobileRules).toMatch(
      /\.observationWindow[\s\S]*position:\s*relative !important/,
    );
    expect(observationMobileRules).toMatch(
      /\.observationResize[\s\S]*display:\s*none/,
    );
  });
});
