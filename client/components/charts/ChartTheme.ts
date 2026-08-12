export const STOCK_SERIES_COLORS = [
  "#56b4e9",
  "#e69f00",
  "#009e73",
  "#cc79a7",
  "#f0e442",
];

export const CHART_AXIS_COLOR =
  "var(--fit-color-text-label, rgba(255,255,255,0.5))";
export const CHART_GRID_COLOR =
  "var(--fit-color-border-subtle, rgba(255,255,255,0.12))";
export const CHART_TEXT_COLOR =
  "var(--fit-color-text-muted, rgba(255,255,255,0.65))";
export const CHART_ZERO_LINE_COLOR =
  "var(--fit-color-text-body, rgba(255,255,255,0.72))";
export const CHART_TOOLTIP_BACKGROUND =
  "var(--fit-color-surface-soft, #111114)";
export const CHART_POINT_BACKGROUND = "var(--fit-color-surface, #09090b)";

export const getChartSeriesColor = (
  index: number,
  palette = STOCK_SERIES_COLORS,
) => {
  const usablePalette = palette.length ? palette : STOCK_SERIES_COLORS;
  const safeIndex = Number.isFinite(index) ? Math.trunc(index) : 0;
  const normalizedIndex =
    ((safeIndex % usablePalette.length) + usablePalette.length) %
    usablePalette.length;

  return usablePalette[normalizedIndex]!;
};

export const getZeroAnchoredDomain = (
  values: readonly number[],
  paddingRatio = 0.1,
): [number, number] => {
  const finiteValues = values.filter(Number.isFinite);

  if (!finiteValues.length) {
    return [-1, 1];
  }

  const rawMinimum = Math.min(0, ...finiteValues);
  const rawMaximum = Math.max(0, ...finiteValues);

  if (rawMinimum === rawMaximum) {
    return [-1, 1];
  }

  const span = rawMaximum - rawMinimum;
  const magnitude = Math.max(Math.abs(rawMinimum), Math.abs(rawMaximum));
  const padding = Math.max(
    span * paddingRatio,
    magnitude * paddingRatio,
    Number.EPSILON,
  );

  return [
    rawMinimum < 0 ? rawMinimum - padding : 0,
    rawMaximum > 0 ? rawMaximum + padding : 0,
  ];
};
