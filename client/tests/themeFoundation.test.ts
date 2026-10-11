import { theme } from "@/styles/theme";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeFoundation } from "@/styles/ThemeFoundation";
import { FIT_THEME_CSS, fitThemeVariables } from "@/styles/themeTokens";

const color = (name: keyof typeof fitThemeVariables) => fitThemeVariables[name];
const luminance = (hex: string) => {
  const values = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return values[0]! * 0.2126 + values[1]! * 0.7152 + values[2]! * 0.0722;
};
const contrast = (a: string, b: string) => {
  const values = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (values[1]! + 0.05) / (values[0]! + 0.05);
};

describe("shared theme readability and library integration", () => {
  it("emits identical CSS text in server markup, including quoted font names", () => {
    expect(
      renderToStaticMarkup(React.createElement(ThemeFoundation)),
    ).toContain(FIT_THEME_CSS);
  });
  it.each(["page-bg", "surface", "surface-soft", "field"])(
    "keeps ordinary labels readable on %s",
    (background) => {
      expect(
        contrast(
          color("--fit-color-text-label"),
          color(`--fit-color-${background}` as keyof typeof fitThemeVariables),
        ),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );
  it("uses the same MUI panel surface as CSS", () => {
    expect(theme.palette.background.paper).toBe(color("--fit-color-surface"));
  });
  it("keeps MUI primary ink readable on dark surfaces", () => {
    for (const surface of [
      "--fit-color-page-bg",
      "--fit-color-surface",
      "--fit-color-surface-soft",
    ] as const) {
      expect(
        contrast(theme.palette.primary.main, color(surface)),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("keeps primary and hover labels readable while retaining bright link ink", () => {
    for (const background of [
      "--fit-color-action",
      "--fit-color-action-hover",
    ] as const) {
      expect(
        contrast(color("--fit-color-on-action"), color(background)),
      ).toBeGreaterThanOrEqual(4.5);
    }
    expect(
      contrast(color("--fit-color-accent"), color("--fit-color-surface")),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(color("--fit-color-action-ink"), color("--fit-color-danger")),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
