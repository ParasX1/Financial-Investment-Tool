import { FitPageContent } from "@/components/shared/FitPageContent";
import { FitPageHeader } from "@/components/shared/FitPageHeader";
import { FitPageShell } from "@/components/shared/FitPageShell";
import {
  Button,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { fetchEtfs } from "../api/fetchEtfs";
import { EtfHighlights } from "../components/EtfHighlights";
import { EtfTable } from "../components/EtfTable";
import {
  etfWindowToggleSx,
  formatNullableRatio,
  formatPercent,
} from "../components/etfPresentation";
import {
  ETF_WINDOWS,
  type EtfResponse,
  type EtfRow,
  type EtfWindow,
} from "../types";

const PREVIEW_DISCLOSURE =
  "ETF data is a hardcoded preview and is not live market data.";
const WINDOW_LABELS: Record<EtfWindow, string> = {
  "1D": "Day",
  "1W": "Week",
  "1M": "Month",
  "1Y": "Year",
};
const EMPTY_ROWS: EtfRow[] = [];

type PreviewState =
  | { window: EtfWindow; status: "loading" | "error" }
  | { window: EtfWindow; status: "success"; response: EtfResponse };

export function EtfScreen() {
  const [selectedWindow, setSelectedWindow] = useState<EtfWindow>("1Y");
  const [attempt, setAttempt] = useState(0);
  const [preview, setPreview] = useState<PreviewState>({
    window: "1Y",
    status: "loading",
  });

  // Hide any preceding window before its replacement effect starts.
  const current = preview.window === selectedWindow;
  const result =
    current && preview.status === "success" ? preview.response : null;
  const rows = result?.rows ?? EMPTY_ROWS;
  const warnings = result?.warnings ?? [];
  const generatedAt = result?.metadata.generatedAt;
  const loading = !current || preview.status === "loading";
  const error = current && preview.status === "error";
  const windowLabel = `${WINDOW_LABELS[selectedWindow]} (${selectedWindow})`;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setPreview({ window: selectedWindow, status: "loading" });
    fetchEtfs(selectedWindow, controller.signal)
      .then((response) => {
        if (!active) return;
        setPreview({ window: selectedWindow, status: "success", response });
      })
      .catch(() => {
        if (!active) return;
        setPreview({ window: selectedWindow, status: "error" });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedWindow, attempt]);

  const retry = () => {
    setPreview({ window: selectedWindow, status: "loading" });
    setAttempt((previous) => previous + 1);
  };

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
    <FitPageShell skipLabel="Skip to ETF research" skipTargetId="main-content">
      <FitPageContent density="data" aria-busy={loading}>
        <FitPageHeader
          title="ETF"
          eyebrow="Fund research"
          subtitle="Preview ranking for exchange-traded funds"
        />

        <EtfHighlights
          items={[
            {
              label: selectedWindow === "1Y" ? "Best Sharpe" : "Top return",
              symbol: summary.topRanked?.symbol,
              value: summary.topRanked
                ? selectedWindow === "1Y"
                  ? formatNullableRatio(summary.topRanked.sharpe)
                  : formatPercent(summary.topRanked.priceReturn)
                : "-",
            },
            {
              label: "Best return",
              symbol: summary.bestReturn?.symbol,
              value: summary.bestReturn
                ? formatPercent(summary.bestReturn.priceReturn)
                : "-",
            },
            {
              label: "Lowest cost",
              symbol: summary.lowestCost?.symbol,
              value: summary.lowestCost
                ? `${(summary.lowestCost.expenseRatio * 100).toFixed(2)}%`
                : "-",
            },
          ]}
        />

        <Stack
          direction="row"
          alignItems="center"
          gap={1.25}
          sx={{ pb: 2, flexWrap: "wrap" }}
        >
          <ToggleButtonGroup
            exclusive
            size="small"
            value={selectedWindow}
            onChange={(_, nextWindow) => {
              if (ETF_WINDOWS.includes(nextWindow))
                setSelectedWindow(nextWindow as EtfWindow);
            }}
            aria-label="ETF time window"
            sx={etfWindowToggleSx}
          >
            {ETF_WINDOWS.map((window) => (
              <ToggleButton key={window} value={window}>
                {WINDOW_LABELS[window]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "start", sm: "center" }}
          justifyContent="space-between"
          gap={1}
          sx={{ pb: 2 }}
        >
          <Typography
            role={error ? "alert" : "status"}
            aria-live={error ? "assertive" : "polite"}
            aria-atomic="true"
            variant="body2"
            sx={{
              color: error
                ? "var(--fit-color-danger)"
                : "var(--fit-color-text-body)",
              fontWeight: 600,
            }}
          >
            {loading
              ? `Loading ETF preview for ${windowLabel}...`
              : error
                ? `Unable to load ETF preview for ${windowLabel}.`
                : rows.length === 0
                  ? `No ETF preview results for ${windowLabel}.`
                  : `${rows.length} ETF results for ${windowLabel}`}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "var(--fit-color-text-muted)", fontSize: "0.75rem" }}
          >
            {updatedLabel
              ? `Updated ${updatedLabel}`
              : result
                ? "Generation time unavailable"
                : "Waiting for preview"}
          </Typography>
        </Stack>

        {!loading && (error || rows.length === 0) && (
          <Button
            variant="outlined"
            aria-label="Retry loading ETF preview"
            onClick={retry}
            sx={{ mb: 2 }}
          >
            Retry
          </Button>
        )}

        <EtfTable rows={rows} />

        {Array.from(new Set([PREVIEW_DISCLOSURE, ...warnings])).map(
          (warning) => (
            <Typography
              key={warning}
              variant="caption"
              sx={{
                display: "block",
                pt: 2,
                color: "var(--fit-color-warning)",
                fontSize: "0.8125rem",
                lineHeight: 1.6,
              }}
            >
              {warning}
            </Typography>
          ),
        )}
      </FitPageContent>
    </FitPageShell>
  );
}
