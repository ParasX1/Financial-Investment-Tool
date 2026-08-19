import DownloadIcon from "@mui/icons-material/Download";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import {
  Box,
  Button,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { formatTopPicksAssumptions } from "../lib/topPicksAssumptions";
import type { TopPicksMetadata, TopPicksWindow } from "../types";
import { secondaryActionSx } from "./topPicksSx";

type TopPicksToolbarProps = {
  loading: boolean;
  error: string | null;
  warnings: string[];
  metadata?: TopPicksMetadata;
  total: number;
  page: number;
  totalPages: number;
  selectedWindow: TopPicksWindow;
  onExport: () => void;
  onEditColumns: () => void;
  onWindowChange: (window: TopPicksWindow) => void;
  onRetry: () => void;
};

type TopPicksStatusProps = Pick<
  TopPicksToolbarProps,
  | "loading"
  | "error"
  | "warnings"
  | "metadata"
  | "total"
  | "page"
  | "totalPages"
  | "onRetry"
>;

export function TopPicksToolbar({
  loading,
  error,
  total,
  selectedWindow,
  onExport,
  onEditColumns,
  onWindowChange,
}: TopPicksToolbarProps) {
  return (
    <Box
      sx={{
        px: { xs: 2, sm: 3 },
        pb: 2,
        display: "flex",
        gap: 1.25,
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
      }}
    >
      <ToggleButtonGroup
        exclusive
        size="small"
        value={selectedWindow}
        onChange={(_, nextWindow) => {
          if (nextWindow) onWindowChange(nextWindow as TopPicksWindow);
        }}
        aria-label="Top Picks time window"
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
        <ToggleButton value="1D">Day</ToggleButton>
        <ToggleButton value="1W">Week</ToggleButton>
        <ToggleButton value="1M">Month</ToggleButton>
        <ToggleButton value="1Y">Year</ToggleButton>
      </ToggleButtonGroup>
      <Stack direction="row" gap={1.25} alignItems="center">
        <Button
          variant="contained"
          startIcon={<DownloadIcon fontSize="small" />}
          onClick={onExport}
          disabled={loading || Boolean(error) || total === 0}
          sx={secondaryActionSx}
        >
          Export page CSV
        </Button>
        <Button
          variant="contained"
          startIcon={<SettingsOutlinedIcon fontSize="small" />}
          onClick={onEditColumns}
          sx={secondaryActionSx}
        >
          Edit Columns
        </Button>
      </Stack>
    </Box>
  );
}

export function TopPicksStatus({
  loading,
  error,
  warnings,
  metadata = {},
  total,
  page,
  totalPages,
  onRetry,
}: TopPicksStatusProps) {
  const assumptionSummary = formatTopPicksAssumptions(metadata);
  const showingStaleSnapshot =
    metadata.cacheStatus === "stale" || metadata.snapshotRefreshing === true;
  const statusText = loading
    ? showingStaleSnapshot && total > 0
      ? `${total} results - using previous results`
      : "Loading..."
    : error
      ? `Error: ${error}`
      : total === 0
        ? "No results"
        : showingStaleSnapshot
          ? `${total} results - using previous results`
          : `${total} results - Showing page ${page} of ${totalPages}`;

  return (
    <Stack sx={{ px: { xs: 2, sm: 3 }, pb: 3 }} spacing={0.5}>
      <Typography
        variant="body2"
        role={error ? "alert" : "status"}
        sx={{ color: "var(--fit-color-text-muted, #8f98aa)" }}
      >
        {statusText}
      </Typography>
      {assumptionSummary ? (
        <Typography
          variant="caption"
          role="note"
          aria-label="Top Picks ranking assumptions"
          sx={{ color: "var(--fit-color-text-label, #687184)" }}
        >
          {assumptionSummary}
        </Typography>
      ) : null}
      {error ? (
        <Button
          type="button"
          size="small"
          aria-label="Retry loading Top Picks"
          onClick={onRetry}
          sx={{ ...secondaryActionSx, alignSelf: "flex-start" }}
        >
          Retry
        </Button>
      ) : null}
      {warnings.map((warning, index) => (
        <Typography
          key={`${warning}-${index}`}
          variant="caption"
          sx={{ color: "var(--fit-color-warning, #fbbf24)" }}
        >
          {warning}
        </Typography>
      ))}
    </Stack>
  );
}
