import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function cssBlock(source: string, selector: string) {
  const selectorStart = source.indexOf(selector + " {");
  if (selectorStart < 0) return "";
  const blockStart = source.indexOf("{", selectorStart);
  const blockEnd = source.indexOf("}", blockStart);
  return source.slice(blockStart + 1, blockEnd);
}

describe("Home visual contract", () => {
  const source = readFileSync(
    join(process.cwd(), "features/home/styles/home.module.css"),
    "utf8",
  );

  it("keeps the shared brand glow visible over the landing hero", () => {
    expect(cssBlock(source, ".heroShade")).toContain("var(--home-brand-glow)");
  });

  it("shows a focus indicator when the skip link targets main content", () => {
    expect(cssBlock(source, ".page:focus-visible")).toMatch(
      /outline|box-shadow/,
    );
    expect(cssBlock(source, ".page:focus")).not.toContain("outline: none");
  });

  it("does not show hover affordances on disabled entry controls", () => {
    expect(source).toContain(".footerLink:not(:disabled):hover");
    expect(source).toContain(".navPrimary:not(:disabled):hover");
    expect(source).toContain(".navSecondary:not(:disabled):hover");
    expect(source).toContain(".primaryButton:not(:disabled):hover");
    expect(source).toContain(".routeTile:not(:disabled):hover");
    expect(source).not.toMatch(/(^|\n)\.routeTile:hover \{/);
  });
});
