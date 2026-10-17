export const formatPercent = (value: number) =>
  `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;

export const formatNullableRatio = (value: number | null) =>
  value === null ? "-" : value.toFixed(2);

export const formatNullablePercent = (value: number | null) =>
  value === null ? "-" : formatPercent(value);

export const formatAum = (value: number) =>
  `$${(value / 1_000_000_000).toFixed(0)}B`;

export const etfWindowToggleSx = {
  bgcolor: "var(--fit-color-field)",
  border: "1px solid var(--fit-color-border-control)",
  borderRadius: "var(--fit-radius-control)",
  "& .MuiToggleButton-root": {
    minHeight: 40,
    color: "var(--fit-color-text-body)",
    border: 0,
    px: 1.75,
    fontSize: "0.875rem",
    textTransform: "none",
    "&:focus-visible": {
      outline: "2px solid var(--fit-color-focus-ring)",
      outlineOffset: -3,
    },
  },
  "& .MuiToggleButton-root.Mui-selected": {
    bgcolor: "var(--fit-color-accent-soft)",
    color: "var(--fit-color-accent)",
  },
};
