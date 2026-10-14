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

  it("uses the shared accessible action and focus roles", () => {
    expect(source).toContain("var(--fit-color-action)");
    expect(source).toContain("var(--fit-color-on-action)");
    expect(source).toContain("var(--fit-color-focus-ring)");
    expect(source).not.toContain("\u0000");
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

  it("keeps essential content visible without a motion or observation script", () => {
    expect(cssBlock(source, ".heroContent")).not.toMatch(/opacity:\s*0/);
    expect(cssBlock(source, ".heroVisual")).not.toMatch(/opacity:\s*0/);
    expect(source).not.toMatch(/infinite|visibility:\s*hidden/);
    expect(source).toContain("prefers-reduced-motion: reduce");
  });
});
