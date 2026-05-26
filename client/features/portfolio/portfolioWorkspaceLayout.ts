import type { PortfolioPanelLayout, PortfolioPanelLayoutPatch } from "./types";
import { PORTFOLIO_PANEL_COUNT } from "./types";

export const PORTFOLIO_PANEL_MIN_WIDTH = 320;
export const PORTFOLIO_PANEL_MIN_HEIGHT = 260;
export const PORTFOLIO_PANEL_MAX_WIDTH = 920;
export const PORTFOLIO_PANEL_MAX_HEIGHT = 720;
export const PORTFOLIO_WORKSPACE_GAP = 16;
export const PORTFOLIO_WORKSPACE_DEFAULT_WIDTH = 1180;

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getPortfolioPanelId(index: number) {
  return `portfolio-panel-${index}`;
}

export function createDefaultPortfolioPanelLayout(
  workspaceWidth = PORTFOLIO_WORKSPACE_DEFAULT_WIDTH,
): PortfolioPanelLayout[] {
  const usableWidth = Math.max(workspaceWidth, 760);
  const mainWidth = clampNumber(
    Math.round(usableWidth * 0.58),
    520,
    Math.min(PORTFOLIO_PANEL_MAX_WIDTH, usableWidth),
  );
  const sideWidth = clampNumber(
    usableWidth - mainWidth - PORTFOLIO_WORKSPACE_GAP,
    PORTFOLIO_PANEL_MIN_WIDTH,
    PORTFOLIO_PANEL_MAX_WIDTH,
  );
  const thirdWidth = clampNumber(
    Math.floor((usableWidth - PORTFOLIO_WORKSPACE_GAP * 2) / 3),
    PORTFOLIO_PANEL_MIN_WIDTH,
    PORTFOLIO_PANEL_MAX_WIDTH,
  );

  const layouts: Array<
    Omit<PortfolioPanelLayout, "id" | "index" | "visible" | "zIndex">
  > = [
    { x: 0, y: 0, width: mainWidth, height: 456 },
    {
      x: mainWidth + PORTFOLIO_WORKSPACE_GAP,
      y: 0,
      width: sideWidth,
      height: 260,
    },
    {
      x: mainWidth + PORTFOLIO_WORKSPACE_GAP,
      y: 276,
      width: sideWidth,
      height: 260,
    },
    { x: 0, y: 560, width: thirdWidth, height: 286 },
    {
      x: thirdWidth + PORTFOLIO_WORKSPACE_GAP,
      y: 560,
      width: thirdWidth,
      height: 286,
    },
    {
      x: (thirdWidth + PORTFOLIO_WORKSPACE_GAP) * 2,
      y: 560,
      width: thirdWidth,
      height: 286,
    },
  ];

  return layouts.map((layout, index) => ({
    ...layout,
    id: getPortfolioPanelId(index),
    index,
    visible: true,
    zIndex: index + 1,
  }));
}

function coerceNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function coercePanelLayout(
  value: unknown,
  fallback: PortfolioPanelLayout,
  workspaceWidth: number,
): PortfolioPanelLayout {
  const raw =
    value && typeof value === "object"
      ? (value as Partial<PortfolioPanelLayout>)
      : {};
  const maxWidth = Math.max(
    Math.min(workspaceWidth, PORTFOLIO_PANEL_MAX_WIDTH),
    PORTFOLIO_PANEL_MIN_WIDTH,
  );
  const width = clampNumber(
    coerceNumber(raw.width, fallback.width),
    Math.min(PORTFOLIO_PANEL_MIN_WIDTH, maxWidth),
    maxWidth,
  );
  const height = clampNumber(
    coerceNumber(raw.height, fallback.height),
    PORTFOLIO_PANEL_MIN_HEIGHT,
    PORTFOLIO_PANEL_MAX_HEIGHT,
  );
  const maxX = Math.max(0, workspaceWidth - width);

  return {
    ...fallback,
    x: clampNumber(coerceNumber(raw.x, fallback.x), 0, maxX),
    y: Math.max(0, coerceNumber(raw.y, fallback.y)),
    width,
    height,
    visible: typeof raw.visible === "boolean" ? raw.visible : fallback.visible,
    zIndex: Math.max(1, Math.round(coerceNumber(raw.zIndex, fallback.zIndex))),
  };
}

export function normalisePortfolioPanelLayouts(
  value: unknown,
  workspaceWidth = PORTFOLIO_WORKSPACE_DEFAULT_WIDTH,
): PortfolioPanelLayout[] {
  const defaults = createDefaultPortfolioPanelLayout(workspaceWidth);
  const rawLayouts = Array.isArray(value) ? value : [];

  return defaults.map((fallback) => {
    const raw = rawLayouts.find((layout) => {
      if (!layout || typeof layout !== "object") return false;
      const candidate = layout as Partial<PortfolioPanelLayout>;
      return candidate.id === fallback.id || candidate.index === fallback.index;
    });

    return coercePanelLayout(raw, fallback, workspaceWidth);
  });
}

export function patchPortfolioPanelLayout(
  layouts: PortfolioPanelLayout[],
  id: string,
  patch: PortfolioPanelLayoutPatch,
  workspaceWidth = PORTFOLIO_WORKSPACE_DEFAULT_WIDTH,
) {
  return normalisePortfolioPanelLayouts(
    layouts.map((layout) =>
      layout.id === id
        ? {
            ...layout,
            ...patch,
          }
        : layout,
    ),
    workspaceWidth,
  );
}

export function bringPortfolioPanelToFront(
  layouts: PortfolioPanelLayout[],
  id: string,
) {
  const maxZIndex = layouts.reduce(
    (max, layout) => Math.max(max, layout.zIndex),
    PORTFOLIO_PANEL_COUNT,
  );

  return layouts.map((layout) =>
    layout.id === id ? { ...layout, zIndex: maxZIndex + 1 } : layout,
  );
}

export function getPortfolioWorkspaceHeight(layouts: PortfolioPanelLayout[]) {
  const visibleBottom = layouts
    .filter((layout) => layout.visible)
    .reduce((bottom, layout) => Math.max(bottom, layout.y + layout.height), 0);

  return Math.max(560, visibleBottom + PORTFOLIO_WORKSPACE_GAP);
}

export function arePortfolioPanelLayoutsEqual(
  left: PortfolioPanelLayout[],
  right: PortfolioPanelLayout[],
) {
  if (left.length !== right.length) return false;

  return left.every((layout, index) => {
    const other = right[index];

    return (
      Boolean(other) &&
      layout.id === other.id &&
      layout.index === other.index &&
      layout.x === other.x &&
      layout.y === other.y &&
      layout.width === other.width &&
      layout.height === other.height &&
      layout.visible === other.visible &&
      layout.zIndex === other.zIndex
    );
  });
}
