import type {
  TopPicksColumnDef,
  TopPicksColumnKey,
  TopPicksMetric,
  TopPicksMetricStatus,
  TopPicksSortKey,
  TopPicksWindow,
} from "../types";

const formatMetric = (
  value: TopPicksMetric,
  status?: TopPicksMetricStatus,
  { percent = false, showPositiveSign = false } = {},
): string => {
  if (status && status !== "ok") {
    return status === "infinite" ? "Unbounded" : "—";
  }
  if (value === null || !Number.isFinite(value)) return "—";
  const displayedValue = percent ? value * 100 : value;
  const sign = showPositiveSign && displayedValue >= 0 ? "+" : "";
  return `${sign}${displayedValue.toFixed(percent ? 1 : 2)}${percent ? "%" : ""}`;
};

export const TOP_PICKS_COLUMNS: TopPicksColumnDef[] = [
  {
    key: "rank",
    label: "Rank",
    align: "left",
    width: 88,
    defaultVisible: true,
  },
  {
    key: "symbol",
    label: "Symbol",
    align: "left",
    width: 110,
    defaultVisible: true,
  },
  {
    key: "name",
    label: "Company",
    align: "left",
    width: 220,
    defaultVisible: true,
  },
  {
    key: "ret1y",
    label: "Price return",
    align: "right",
    description: "Price return for the selected Top Picks window.",
    unit: "percent",
    defaultVisible: true,
    format: (value, status) =>
      formatMetric(value, status, {
        percent: true,
        showPositiveSign: true,
      }),
  },
  {
    key: "sharpe",
    label: "Sharpe ratio",
    align: "right",
    description: "Annualized Sharpe ratio versus the configured risk-free rate.",
    unit: "ratio",
    defaultVisible: true,
    format: (value, status) => formatMetric(value, status),
  },
  {
    key: "sortino",
    label: "Sortino ratio",
    align: "right",
    description:
      "Sortino ratio using downside deviation; Unbounded means no downside deviation.",
    unit: "ratio",
    defaultVisible: true,
    format: (value, status) => formatMetric(value, status),
  },
  {
    key: "volatility",
    label: "Annualised volatility",
    align: "right",
    description: "Annualized volatility.",
    unit: "percent",
    defaultVisible: true,
    format: (value, status) => formatMetric(value, status, { percent: true }),
  },
  {
    key: "maxDD",
    label: "Max drawdown",
    align: "right",
    description: "Peak-to-trough maximum drawdown.",
    unit: "percent",
    defaultVisible: true,
    format: (value, status) => formatMetric(value, status, { percent: true }),
  },
  {
    key: "beta",
    label: "Beta exposure",
    align: "right",
    description: "Beta versus the configured benchmark.",
    unit: "ratio",
    defaultVisible: true,
    format: (value, status) => formatMetric(value, status),
  },
  {
    key: "alpha",
    label: "Alpha vs benchmark",
    align: "right",
    description: "Annualized alpha versus the configured benchmark.",
    unit: "percent",
    defaultVisible: true,
    format: (value, status) =>
      formatMetric(value, status, {
        percent: true,
        showPositiveSign: true,
      }),
  },
  {
    key: "infoRatio",
    label: "Information ratio",
    align: "right",
    description: "Information Ratio = annualized active return / tracking error.",
    unit: "ratio",
    defaultVisible: true,
    format: (value, status) => formatMetric(value, status),
  },
];

const WINDOW_METRIC_KEYS: Record<TopPicksWindow, readonly TopPicksSortKey[]> = {
  "1D": ["ret1y"],
  "1W": ["ret1y", "volatility", "maxDD"],
  "1M": ["ret1y", "volatility", "maxDD"],
  "1Y": [
    "ret1y",
    "sharpe",
    "sortino",
    "volatility",
    "maxDD",
    "beta",
    "alpha",
    "infoRatio",
  ],
};

export const getTopPicksWindowMetricKeys = (
  window: TopPicksWindow,
): readonly TopPicksSortKey[] => WINDOW_METRIC_KEYS[window];

export const isTopPicksMetricAvailableForWindow = (
  key: TopPicksColumnKey,
  window: TopPicksWindow,
): boolean =>
  key === "rank" ||
  key === "symbol" ||
  key === "name" ||
  WINDOW_METRIC_KEYS[window].includes(key as TopPicksSortKey);

export const getDefaultVisibleTopPicksColumnsForWindow = (
  window: TopPicksWindow,
): TopPicksColumnKey[] =>
  TOP_PICKS_COLUMNS.filter(
    (column) =>
      column.defaultVisible &&
      isTopPicksMetricAvailableForWindow(column.key, window),
  ).map((column) => column.key);

export const getDefaultVisibleTopPicksColumns = (): TopPicksColumnKey[] =>
  getDefaultVisibleTopPicksColumnsForWindow("1Y");

export const valueColor = (
  key: TopPicksColumnDef["key"],
  value: unknown,
  status?: TopPicksMetricStatus,
): string => {
  if (
    (status && status !== "ok") ||
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return "var(--fit-color-text-muted, #8f98aa)";
  }
  if (key === "ret1y" || key === "alpha") {
    return value >= 0 ? "#38d996" : "#ff5b7c";
  }
  if (key === "maxDD") return "#ff5b7c";
  if (key === "volatility") return "var(--fit-color-text-body, #b9c1d0)";
  return "#e2e7f2";
};

export const rankBadgeSx = (rank: number) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: rank <= 3 ? 32 : "auto",
  height: rank <= 3 ? 32 : "auto",
  borderRadius: rank <= 3 ? 2 : 0,
  bgcolor:
    rank === 1
      ? "rgba(202, 138, 4, 0.35)"
      : rank === 2
        ? "rgba(75, 85, 99, 0.55)"
        : rank === 3
          ? "rgba(154, 52, 18, 0.45)"
          : "transparent",
  color:
    rank === 1
      ? "#fbbf24"
      : rank === 2
        ? "#cbd5e1"
        : rank === 3
          ? "#fb923c"
          : "#94a3b8",
  fontWeight: "var(--fit-type-weight-bold)",
  fontSize: "var(--fit-type-size-body)",
});
