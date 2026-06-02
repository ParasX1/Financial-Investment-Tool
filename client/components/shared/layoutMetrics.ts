// File purpose: Centralizes app chrome metrics shared by the main sidebar and page shells.
export const FIT_APP_SIDEBAR_WIDTHS = {
  desktopCollapsed: 64,
  compactCollapsed: 52,
  expanded: 232,
} as const;

export const FIT_APP_SIDEBAR_COMPACT_BREAKPOINT_PX = 768;

export const FIT_APP_SIDEBAR_MEDIA = {
  compact: `(max-width: ${FIT_APP_SIDEBAR_COMPACT_BREAKPOINT_PX - 1}px)`,
  hoverExpandable: "(hover: hover) and (pointer: fine)",
} as const;

export const FIT_APP_SIDEBAR_WIDTH_FALLBACK = `${FIT_APP_SIDEBAR_WIDTHS.desktopCollapsed}px`;

export const FIT_CONTENT_MAX_WIDTH_PX = 1180;
