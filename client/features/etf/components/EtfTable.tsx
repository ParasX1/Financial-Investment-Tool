import { Box, Chip } from "@mui/material";
import type { EtfRow } from "../types";
import {
  formatAum,
  formatNullablePercent,
  formatNullableRatio,
  formatPercent,
} from "./etfPresentation";

const metricCellSx = {
  color: "var(--fit-color-text-body)",
  fontWeight: 600,
  textAlign: "right",
};

export function EtfTable({ rows }: { rows: readonly EtfRow[] }) {
  return (
    <Box
      role="region"
      aria-label="ETF table scroll area"
      tabIndex={0}
      sx={{
        overflowX: "auto",
        border: "1px solid var(--fit-color-border-subtle)",
        borderRadius: "var(--fit-radius-panel)",
        bgcolor: "var(--fit-color-surface)",
        "&:focus-visible": {
          outline: "2px solid var(--fit-color-focus-ring)",
          outlineOffset: 2,
        },
      }}
    >
      <Box
        component="table"
        aria-label="ETF preview rankings"
        sx={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: 1080,
          fontSize: "0.875rem",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <Box component="thead">
          <Box
            component="tr"
            sx={{ borderBottom: "1px solid var(--fit-color-border-subtle)" }}
          >
            {[
              "Rank",
              "Symbol",
              "ETF",
              "Category",
              "Issuer",
              "AUM",
              "Expense",
              "Price return",
              "Sharpe",
              "Volatility",
              "Max drawdown",
            ].map((label) => (
              <Box
                component="th"
                key={label}
                sx={{
                  px: 2,
                  py: 1.75,
                  color: "var(--fit-color-text-strong)",
                  bgcolor: "var(--fit-color-surface-soft)",
                  fontSize: "0.8125rem",
                  textAlign: [
                    "AUM",
                    "Expense",
                    "Price return",
                    "Sharpe",
                    "Volatility",
                    "Max drawdown",
                  ].includes(label)
                    ? "right"
                    : "left",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </Box>
            ))}
          </Box>
        </Box>
        <Box component="tbody">
          {rows.map((row) => (
            <Box
              component="tr"
              key={row.symbol}
              sx={{
                borderBottom: "1px solid var(--fit-color-border-subtle)",
                "&:hover": { bgcolor: "var(--fit-color-accent-soft)" },
              }}
            >
              <Box
                component="td"
                sx={{
                  px: 2,
                  py: 1.75,
                  color: "var(--fit-color-text-muted)",
                  fontWeight: 800,
                }}
              >
                {row.rank}
              </Box>
              <Box
                component="td"
                sx={{
                  px: 2,
                  py: 1.75,
                  color: "var(--fit-color-accent)",
                  fontWeight: 800,
                }}
              >
                {row.symbol}
              </Box>
              <Box
                component="td"
                sx={{
                  px: 2,
                  py: 1.75,
                  color: "var(--fit-color-text-body)",
                  minWidth: 260,
                }}
              >
                {row.name}
              </Box>
              <Box component="td" sx={{ px: 2, py: 1.75 }}>
                <Chip
                  label={row.category}
                  size="small"
                  sx={{
                    bgcolor: "var(--fit-color-accent-soft)",
                    color: "var(--fit-color-text-body)",
                    borderRadius: "var(--fit-radius-control)",
                    fontWeight: 700,
                  }}
                />
              </Box>
              <Box
                component="td"
                sx={{ px: 2, py: 1.75, color: "var(--fit-color-text-muted)" }}
              >
                {row.issuer}
              </Box>
              <Box component="td" sx={{ px: 2, py: 1.75, ...metricCellSx }}>
                {formatAum(row.aumUsd)}
              </Box>
              <Box component="td" sx={{ px: 2, py: 1.75, ...metricCellSx }}>
                {(row.expenseRatio * 100).toFixed(2)}%
              </Box>
              <Box
                component="td"
                sx={{
                  px: 2,
                  py: 1.75,
                  color:
                    row.priceReturn >= 0
                      ? "var(--fit-color-success)"
                      : "var(--fit-color-danger)",
                  fontWeight: 800,
                  textAlign: "right",
                }}
              >
                {formatPercent(row.priceReturn)}
              </Box>
              <Box component="td" sx={{ px: 2, py: 1.75, ...metricCellSx }}>
                {formatNullableRatio(row.sharpe)}
              </Box>
              <Box component="td" sx={{ px: 2, py: 1.75, ...metricCellSx }}>
                {formatNullablePercent(row.volatility).replace("+", "")}
              </Box>
              <Box
                component="td"
                sx={{
                  px: 2,
                  py: 1.75,
                  color: "var(--fit-color-danger)",
                  fontWeight: 800,
                  textAlign: "right",
                }}
              >
                {formatNullablePercent(row.maxDrawdown)}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
