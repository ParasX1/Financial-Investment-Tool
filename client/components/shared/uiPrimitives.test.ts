import {
  FIT_CONTENT_MAX_WIDTH_PX,
  cn,
  fitField,
  fitLayout,
  fitSurface,
  fitText,
} from "./uiPrimitives";

describe("shared UI primitives", () => {
  it("joins class names while filtering falsey entries", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("keeps app layout primitives tied to the shared sidebar variable", () => {
    expect(FIT_CONTENT_MAX_WIDTH_PX).toBeGreaterThan(0);
    expect(fitLayout.appMain).toContain("--app-sidebar-width");
  });

  it("uses shared FIT CSS variables for common surface, text, and field primitives", () => {
    expect(fitSurface.panel).toContain("--fit-color-surface");
    expect(fitText.strong).toContain("--fit-color-text-strong");
    expect(fitField.control).toContain("--fit-color-field");
  });
});
