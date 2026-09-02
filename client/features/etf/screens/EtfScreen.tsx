import Sidebar from "@/components/sidebar";
import { FitPageHeader } from "@/components/shared/FitPageHeader";
import {
  Box,
  Chip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { fetchEtfs } from "../api/fetchEtfs";
import { ETF_WINDOWS, type EtfRow, type EtfWindow } from "../types";

const formatPercent = (value: number) =>
  `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;

const formatRatio = (value: number) => value.toFixed(2);

const formatNullableRatio = (value: number | null) =>
  value === null ? "-" : formatRatio(value);

const formatNullablePercent = (value: number | null) =>
  value === null ? "-" : formatPercent(value);

const formatAum = (value: number) =>
  `$${(value / 1_000_000_000).toFixed(0)}B`;

const metricCellSx = {
  color: "#dce9ff",
  fontWeight: 700,
  textAlign: "right",
};

function EtfTable({ rows }: { rows: EtfRow[] }) {
  return (
    <Box
      sx={{
        mx: { xs: 2, sm: 3 },
        overflowX: "auto",
        border: "1px solid var(--fit-color-border-subtle, rgba(132,146,176,0.16))",
        borderRadius: "8px",
        bgcolor: "rgba(13, 13, 17, 0.92)",
      }}
    >
      <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", minWidth: 1080 }}>
        <Box component="thead">
          <Box component="tr" sx={{ borderBottom: "1px solid rgba(132,146,176,0.18)" }}>
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
                  color: "#fff",
                  fontSize: 13,
                  textAlign:
                    ["AUM", "Expense", "Price return", "Sharpe", "Volatility", "Max drawdown"].includes(label)
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
                borderBottom: "1px solid rgba(132,146,176,0.10)",
                "&:hover": { bgcolor: "rgba(99,102,241,0.10)" },
              }}
            >
              <Box component="td" sx={{ px: 2, py: 1.75, color: "#fbbf24", fontWeight: 800 }}>
                {row.rank}
              </Box>
              <Box component="td" sx={{ px: 2, py: 1.75, color: "#4f8cff", fontWeight: 800 }}>
                {row.symbol}
              </Box>
              <Box component="td" sx={{ px: 2, py: 1.75, color: "#bfdbfe", minWidth: 260 }}>
                {row.name}
              </Box>
              <Box component="td" sx={{ px: 2, py: 1.75 }}>
                <Chip
                  label={row.category}
                  size="small"
                  sx={{
                    bgcolor: "rgba(79,140,255,0.14)",
                    color: "#bfdbfe",
                    borderRadius: "6px",
                    fontWeight: 700,
                  }}
                />
              </Box>
              <Box component="td" sx={{ px: 2, py: 1.75, color: "#aab6ca" }}>
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
                  color: row.priceReturn >= 0 ? "#38d996" : "#ff5b7c",
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
              <Box component="td" sx={{ px: 2, py: 1.75, color: "#ff5b7c", fontWeight: 800, textAlign: "right" }}>
                {formatNullablePercent(row.maxDrawdown)}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

export function EtfScreen() {
  const [selectedWindow, setSelectedWindow] = useState<EtfWindow>("1Y");
  const [rows, setRows] = useState<EtfRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchEtfs(selectedWindow, controller.signal)
      .then((response) => {
        setRows(response.rows);
        setWarnings(response.warnings);
        setGeneratedAt(response.metadata.generatedAt ?? null);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name === "AbortError") return;
        setError("Unable to load ETF preview.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [selectedWindow]);

  const summary = useMemo(() => {
    const topRanked = rows[0];
    const bestReturn = [...rows].sort(
      (left, right) => right.priceReturn - left.priceReturn,
    )[0];
    const lowestCost = [...rows].sort(
      (left, right) => left.expenseRatio - right.expenseRatio,
    )[0];
    return { bestReturn, lowestCost, topRanked };
  }, [rows]);

  const updatedLabel = generatedAt
    ? new Date(generatedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "var(--fit-color-page-bg, #000000)",
        color: "#fff",
        colorScheme: "dark",
        fontFamily: "var(--fit-font-family)",
      }}
    >
      <Sidebar />
      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={{
          flex: 1,
          minWidth: 0,
          pl: "var(--app-sidebar-width, 64px)",
          background: "var(--fit-page-background)",
          transition: "padding-left 200ms ease",
        }}
      >
        <Box sx={{ px: { xs: 2, sm: 3 }, pt: { xs: 2.5, sm: 3 } }}>
          <FitPageHeader
            title="ETF"
            subtitle="Preview ranking for exchange-traded funds"
          />
        </Box>

        <Stack
          direction={{ xs: "column", md: "row" }}
          gap={1.5}
          sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}
        >
          {[
            [
              selectedWindow === "1Y" ? "Best Sharpe" : "Top return",
              summary.topRanked?.symbol,
              summary.topRanked
                ? selectedWindow === "1Y"
                  ? formatNullableRatio(summary.topRanked.sharpe)
                  : formatPercent(summary.topRanked.priceReturn)
                : "-",
            ],
            ["Best return", summary.bestReturn?.symbol, summary.bestReturn ? formatPercent(summary.bestReturn.priceReturn) : "-"],
            ["Lowest cost", summary.lowestCost?.symbol, summary.lowestCost ? `${(summary.lowestCost.expenseRatio * 100).toFixed(2)}%` : "-"],
          ].map(([label, symbol, value]) => (
            <Box
              key={label}
              sx={{
                flex: 1,
                border: "1px solid rgba(132,146,176,0.14)",
                borderRadius: "8px",
                bgcolor: "rgba(13,13,17,0.72)",
                px: 2,
                py: 1.75,
              }}
            >
              <Typography variant="caption" sx={{ color: "#8f98aa", fontWeight: 700 }}>
                {label}
              </Typography>
              <Typography sx={{ color: "#fff", fontSize: 22, fontWeight: 800 }}>
                {symbol} <Box component="span" sx={{ color: "#93c5fd" }}>{value}</Box>
              </Typography>
            </Box>
          ))}
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          gap={1.25}
          sx={{ px: { xs: 2, sm: 3 }, pb: 2, flexWrap: "wrap" }}
        >
          <ToggleButtonGroup
            exclusive
            size="small"
            value={selectedWindow}
            onChange={(_, nextWindow) => {
              if (nextWindow) setSelectedWindow(nextWindow as EtfWindow);
            }}
            aria-label="ETF time window"
            sx={{
              bgcolor: "var(--fit-color-surface, #09090b)",
              border:
                "1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))",
              borderRadius: "0.75rem",
              overflow: "hidden",
              "& .MuiToggleButton-root": {
                color: "var(--fit-color-text-body, #b9c1d0)",
                border: 0,
                px: 1.75,
                textTransform: "none",
              },
              "& .MuiToggleButton-root.Mui-selected": {
                bgcolor: "var(--fit-color-brand-chip, rgba(123, 140, 255, 0.16))",
                color: "#fff",
              },
            }}
          >
            {ETF_WINDOWS.map((window) => (
              <ToggleButton key={window} value={window}>
                {window === "1D"
                  ? "Day"
                  : window === "1W"
                    ? "Week"
                    : window === "1M"
                      ? "Month"
                      : "Year"}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: { xs: 2, sm: 3 }, pb: 2 }}
        >
          <Typography variant="body2" sx={{ color: "#aab6ca", fontWeight: 700 }}>
            {loading
              ? "Loading ETF preview..."
              : error
                ? error
                : `${rows.length} ETF results`}
          </Typography>
          <Typography variant="caption" sx={{ color: "#8f98aa", fontWeight: 700 }}>
            {updatedLabel ? `Updated ${updatedLabel}` : "Preview data"}
          </Typography>
        </Stack>

        <EtfTable rows={rows} />

        {warnings.map((warning) => (
          <Typography
            key={warning}
            variant="caption"
            sx={{ display: "block", px: { xs: 2, sm: 3 }, py: 2, color: "#fbbf24" }}
          >
            {warning}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}
