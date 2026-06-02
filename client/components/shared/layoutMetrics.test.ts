import {
  FIT_APP_SIDEBAR_COMPACT_BREAKPOINT_PX,
  FIT_APP_SIDEBAR_MEDIA,
  FIT_APP_SIDEBAR_WIDTH_FALLBACK,
  FIT_APP_SIDEBAR_WIDTHS,
  FIT_CONTENT_MAX_WIDTH_PX,
} from "./layoutMetrics";

describe("shared layout metrics", () => {
  it("defines app sidebar widths from one shared chrome contract", () => {
    expect(FIT_APP_SIDEBAR_WIDTHS).toEqual({
      desktopCollapsed: 64,
      compactCollapsed: 52,
      expanded: 232,
    });
    expect(FIT_APP_SIDEBAR_WIDTH_FALLBACK).toBe("64px");
  });

  it("derives the compact media query from the shared breakpoint", () => {
    expect(FIT_APP_SIDEBAR_COMPACT_BREAKPOINT_PX).toBe(768);
    expect(FIT_APP_SIDEBAR_MEDIA.compact).toBe("(max-width: 767px)");
  });

  it("keeps the shared content width available to page layouts", () => {
    expect(FIT_CONTENT_MAX_WIDTH_PX).toBeGreaterThan(0);
  });
});
