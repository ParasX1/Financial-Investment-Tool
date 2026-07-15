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
  expect(openingTagStart).toBeGreaterThanOrEqual(0);
  expect(openingTagEnd).toBeGreaterThan(openingTagStart);

  return source.slice(openingTagStart, openingTagEnd + 1);
};

const themeContractCases: Array<[string, readonly string[]]> = [
  [
    "pages/TopPicks.tsx",
    [
      "--fit-font-family",
      "--fit-color-page-bg",
      "--fit-color-surface",
      "--fit-color-surface-soft",
      "--fit-color-field",
      "--fit-color-border-subtle",
      "--fit-color-border-control",
      "--fit-color-text-body",
      "--fit-color-text-muted",
      "--fit-color-accent-strong",
      "--fit-color-focus-ring",
      "--fit-type-size-panel-title",
      "--fit-type-size-body-sm",
    ],
  ],
  [
    "pages/dashboardView.tsx",
    [
      "--fit-font-family",
      "--fit-color-page-bg",
      "--fit-color-surface",
      "--fit-color-field",
      "--fit-color-border-subtle",
      "--fit-color-border-control",
      "--fit-color-text-body",
      "--fit-color-text-muted",
      "--fit-color-accent-strong",
      "--fit-color-focus-ring",
      "--fit-type-size-panel-title",
      "--fit-type-size-body-sm",
      "--fit-type-size-caption",
    ],
  ],
  [
    "components/StockCardComponent.tsx",
    [
      "--fit-font-family",
      "--fit-color-surface-soft",
      "--fit-color-field",
      "--fit-color-border-panel",
      "--fit-color-border-control",
      "--fit-color-text-muted",
      "--fit-color-accent-strong",
      "--fit-color-focus-ring",
      "--fit-type-size-body-sm",
      "--fit-type-size-caption",
    ],
  ],
  [
    "components/graphSettingsModal.tsx",
    [
      "--fit-font-family",
      "--fit-color-surface",
      "--fit-color-field",
      "--fit-color-border-subtle",
      "--fit-color-border-control",
      "--fit-color-text-body",
      "--fit-color-text-muted",
      "--fit-color-focus-ring",
      "--fit-type-size-panel-title",
    ],
  ],
];

describe("Portfolio Analytics and Top Picks theme contract", () => {
  it.each(themeContractCases)(
    "uses shared FIT tokens in %s",
    (relativePath, requiredTokens) => {
      const source = readClientSource(relativePath);

      requiredTokens.forEach((token) => expect(source).toContain(token));
    },
  );

  it("removes the legacy Top Picks white control and blue-purple CTA", () => {
    const source = readClientSource("pages/TopPicks.tsx");

    expect(source).not.toMatch(/bgcolor:\s*["']white["']/);
    expect(source).not.toContain(
      "linear-gradient(90deg, #3b82f6 0%, #9333ea 100%)",
    );
  });

  it("removes legacy Portfolio canvas and chart-card chrome", () => {
    const dashboard = readClientSource("pages/dashboardView.tsx");
    const chartCard = readClientSource("components/StockCardComponent.tsx");

    expect(dashboard).not.toMatch(/backgroundColor:\s*["']black["']/);
    expect(chartCard).not.toMatch(/bgcolor:\s*["']#111["']/);
    expect(chartCard).not.toMatch(/border:\s*["']1px solid #555["']/);
  });

  it("renders Top Picks through the shared page-header typography contract", () => {
    const source = readClientSource("pages/TopPicks.tsx");
    const headerTag = openingTagContaining(source, 'title="Top Picks"');

    expect(headerTag).toMatch(/^<FitPageHeader\b/);
    expect(headerTag).toContain(
      'subtitle="Ranked stocks based on risk-adjusted performance metrics"',
    );
  });

  it("renders Portfolio Analytics as a shared responsive page-title h1", () => {
    const source = readClientSource("pages/dashboardView.tsx");
    const titleTag = openingTagContaining(source, "Portfolio Analytics");

    expect(titleTag).toMatch(/^<h1\b/);
    expect(titleTag).toContain("fitType.pageTitle");
    expect(titleTag).toContain("text-balance");
    expect(titleTag).not.toMatch(
      /fontSize|fontWeight|lineHeight|letterSpacing/,
    );
  });

  it("keeps the shared page-title class responsive across mobile and desktop", () => {
    const primitives = readClientSource("components/shared/uiPrimitives.ts");
    const globals = readClientSource("styles/globals.css");
    const desktopMediaIndex = globals.indexOf("@media (min-width: 640px)");
    const mobileRules = globals.slice(0, desktopMediaIndex);
    const desktopRules = globals.slice(desktopMediaIndex);

    expect(primitives).toContain('pageTitle: "fit-type-page-title"');
    expect(mobileRules).toMatch(
      /\.fit-type-page-title\s*\{[^}]*--fit-type-size-page-title-mobile/s,
    );
    expect(desktopRules).toMatch(
      /\.fit-type-page-title\s*\{[^}]*--fit-type-size-page-title/s,
    );
  });

  it("keeps manual page shells and native controls in the shared dark scheme", () => {
    const topPicks = readClientSource("pages/TopPicks.tsx");
    const portfolio = readClientSource("pages/dashboardView.tsx");

    expect(topPicks).toContain("colorScheme: 'dark'");
    expect(portfolio).toContain("colorScheme: 'dark'");
  });

  it("uses the shared page glow token on both analytics page containers", () => {
    const topPicks = readClientSource("pages/TopPicks.tsx");
    const portfolio = readClientSource("pages/dashboardView.tsx");
    const topPicksMainTag = openingTagContaining(topPicks, 'component="main"');
    const portfolioMainTag = openingTagContaining(portfolio, 'component="main"');
    expect(topPicksMainTag).toContain("var(--fit-page-background)");
    expect(portfolioMainTag).toContain("var(--fit-page-background)");
  });

  it("uses shared type tokens for table and analytics UI chrome", () => {
    const topPicks = readClientSource("pages/TopPicks.tsx");
    const portfolio = readClientSource("pages/dashboardView.tsx");
    const chartCard = readClientSource("components/StockCardComponent.tsx");

    expect(topPicks).not.toMatch(/fontSize:\s*(?:14|15|16)\b/);
    expect(portfolio).not.toContain("color: '#8b8794'");
    expect(chartCard).not.toContain("fontSize: 'clamp(12px, 0.75vw, 14px)'");
    expect(chartCard).not.toContain("fontSize: 'clamp(11px, 0.7vw, 13px)'");
  });

  it("gives Portfolio chart icon buttons explicit accessible names", () => {
    const portfolio = readClientSource("pages/dashboardView.tsx");
    const chartCard = readClientSource("components/StockCardComponent.tsx");

    expect(portfolio).toContain('aria-label="Close chart window"');
    expect(chartCard).toContain(
      "aria-label={index === 0 ? 'Main view' : 'Switch to main view'}",
    );
    expect(chartCard).toContain(
      "aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}",
    );
    expect(chartCard).toContain('aria-label="Clear chart"');
  });

  it("associates Portfolio field labels without introducing heading levels", () => {
    const portfolio = readClientSource("pages/dashboardView.tsx");

    [
      "portfolio-stock-select",
      "portfolio-start-date",
      "portfolio-end-date",
    ].forEach((id) => {
      expect(portfolio).toContain(`htmlFor="${id}"`);
      expect(portfolio).toContain(`id="${id}"`);
    });
    expect(portfolio).not.toContain('variant="h5"');
    expect(portfolio).toContain("className={fitType.eyebrow}");
  });
});
