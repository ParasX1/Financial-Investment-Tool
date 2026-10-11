import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "@jest/globals";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FitPageContent } from "@/components/shared/FitPageContent";
import { fitSurface } from "@/components/shared/uiPrimitives";
import { FIT_THEME_CSS, fitThemeVariables } from "@/styles/themeTokens";

const readClientSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

const cssBlock = (source: string, selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blockStart = source.search(new RegExp(`(?:^|\\n)\\s*${escaped} \\{`));
  expect(blockStart).toBeGreaterThanOrEqual(0);
  const blockEnd = source.indexOf("}", blockStart);
  expect(blockEnd).toBeGreaterThan(blockStart);
  return source.slice(blockStart, blockEnd + 1);
};

const styleFiles = (directory: string): string[] =>
  readdirSync(join(process.cwd(), directory), { withFileTypes: true }).flatMap(
    (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory()
        ? styleFiles(path)
        : entry.name.endsWith(".css")
          ? [path]
          : [];
    },
  );

describe("site-wide inherited canvas and layout contract", () => {
  it("publishes one canvas token from the application theme foundation", () => {
    expect(FIT_THEME_CSS.match(/--fit-page-background\s*:/g)).toHaveLength(1);
    expect(fitThemeVariables["--fit-page-background"]).toContain(
      fitThemeVariables["--fit-color-page-bg"],
    );
    const app = readClientSource("pages/_app.tsx");
    expect(app).toContain("<ThemeFoundation />");
    expect(app).toContain("<ThemeProvider theme={theme}>");

    // A new page can inherit the theme without being added to a route manifest.
    for (const path of [
      ...styleFiles("styles"),
      ...styleFiles("components"),
      ...styleFiles("features"),
    ]) {
      expect({
        path,
        redefinesCanvas: /--fit-page-background\s*:/.test(
          readClientSource(path),
        ),
      }).toEqual({ path, redefinesCanvas: false });
    }
  });

  it("keeps the root canvas, native controls and scrollbar on the shared dark theme", () => {
    const globals = readClientSource("styles/globals.css");
    expect(cssBlock(globals, "html")).toContain("color-scheme: dark;");
    expect(cssBlock(globals, "html")).toContain(
      "background-color: var(--fit-color-page-bg);",
    );
    expect(cssBlock(globals, "body")).toContain(
      "background: var(--fit-page-background);",
    );
    expect(cssBlock(globals, "html")).toContain(
      "scrollbar-color: var(--fit-color-text-label) var(--fit-color-page-bg);",
    );
    expect(cssBlock(globals, "html::-webkit-scrollbar-track")).toContain(
      "background: var(--fit-color-page-bg);",
    );
  });

  it("connects the shared shell to the global canvas class without a private palette", () => {
    const shell = readClientSource("components/shared/FitPageShell.tsx");
    expect(fitSurface.page.split(" ")).toContain("fit-page-background");
    expect(fitSurface.page).toContain("var(--fit-color-text-strong)");
    expect(shell).toContain("fitSurface.page");
    expect(shell).not.toMatch(/background(?:Color)?\s*:/);
    expect(
      cssBlock(readClientSource("styles/globals.css"), ".fit-page-background"),
    ).toContain("background: var(--fit-page-background);");
  });

  it.each(["standard", "data"] as const)(
    "preserves a focusable main landmark and caller attributes at %s density",
    (density) => {
      const props: React.ComponentProps<typeof FitPageContent> = {
        id: "example-main",
        density,
        "aria-busy": true,
        contentClassName: "example-content",
        children: React.createElement("p", null, "Readable page content"),
      };
      const markup = renderToStaticMarkup(
        React.createElement(FitPageContent, props),
      );
      expect(markup.match(/<main\b/g)).toHaveLength(1);
      expect(markup).toContain('id="example-main"');
      expect(markup).toContain('tabindex="-1"');
      expect(markup).toContain('aria-busy="true"');
      expect(markup).toContain("example-content");
      expect(markup).toContain("Readable page content");
    },
  );

  it("owns responsive navigation spacing and content width while inheriting the canvas", () => {
    const styles = readClientSource(
      "components/shared/FitPageContent.module.css",
    );
    const main = cssBlock(styles, ".main");
    expect(main).toContain("min-width: 0;");
    expect(main).toContain("min-height: 100dvh;");
    expect(main).toContain("padding-inline-start: var(--app-sidebar-width");
    expect(main).not.toMatch(/background(?:-color)?\s*:/);
    expect(cssBlock(styles, ".content")).toContain(
      "max-width: var(--fit-content-width);",
    );
    expect(styles).toContain("@media (max-width: 767px)");
  });

  it("uses the same canvas on the standalone Home shell", () => {
    expect(
      cssBlock(
        readClientSource("features/home/styles/home.module.css"),
        ".shell",
      ),
    ).toContain("background: var(--fit-page-background);");
  });

  it("keeps the Portfolio entrypoint and legacy alias on the shared layout", () => {
    expect(readClientSource("pages/Portfolio.tsx")).toContain(
      "export default PortfolioScreen",
    );
    expect(readClientSource("pages/dashboardView.tsx")).toContain(
      'export { default } from "./Portfolio"',
    );
    const screen = readClientSource(
      "features/portfolio/screens/PortfolioScreen.tsx",
    );
    expect(screen).toContain("<FitPageShell");
    expect(screen).toContain("<FitPageContent");
  });
});
