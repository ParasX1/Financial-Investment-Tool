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
import { secondaryActionSx, windowToggleSx } from "./topPicksSx";

type TopPicksToolbarProps = {
  loading: boolean;
  error: string | null;
  warnings: string[];
  metadata?: TopPicksMetadata;
  lastUpdatedAt?: Date | null;
  syncing?: boolean;
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
> & { hasRetainedResults?: boolean };

export function TopPicksToolbar({
  loading,
  metadata = {},
  lastUpdatedAt = null,
  syncing = false,
  total,
  selectedWindow,
  onExport,
  onEditColumns,
  onWindowChange,
}: TopPicksToolbarProps) {
  const refreshingSnapshot = syncing || metadata.snapshotRefreshing === true;
  const showingPreviousResults = metadata.cacheStatus === "stale";
  const updatedAtLabel = lastUpdatedAt
    ? lastUpdatedAt.toLocaleString("sv-SE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      })
    : null;

  return (
    <Box
      sx={{
        pb: 2,
        display: "flex",
        gap: 1.25,
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
      }}
    >
      <Stack direction="row" gap={1.25} alignItems="center" flexWrap="wrap">
        <ToggleButtonGroup
          exclusive
          size="small"
          value={selectedWindow}
          onChange={(_, nextWindow) => {
            if (nextWindow) onWindowChange(nextWindow as TopPicksWindow);
          }}
          aria-label="Top Picks time window"
          sx={windowToggleSx}
        >
          <ToggleButton value="1D">Day</ToggleButton>
          <ToggleButton value="1W">Week</ToggleButton>
          <ToggleButton value="1M">Month</ToggleButton>
          <ToggleButton value="1Y">Year</ToggleButton>
        </ToggleButtonGroup>
        <Typography
          variant="caption"
          role="status"
          sx={{
            color: refreshingSnapshot
              ? "var(--fit-color-info)"
              : "var(--fit-color-text-muted)",
            fontWeight: 700,
            lineHeight: 1.4,
            fontSize: "0.75rem",
            overflowWrap: "anywhere",
          }}
        >
          {showingPreviousResults ? "Showing previous results - " : ""}
          {refreshingSnapshot
            ? updatedAtLabel
              ? `Syncing - Updated ${updatedAtLabel}`
              : "Syncing latest"
            : updatedAtLabel
              ? `Updated ${updatedAtLabel}`
              : "Waiting for sync"}
        </Typography>
      </Stack>
      <Stack direction="row" gap={1.25} alignItems="center" flexWrap="wrap">
        <Button
          variant="contained"
          startIcon={<DownloadIcon fontSize="small" />}
          onClick={onExport}
          disabled={loading || total === 0}
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
  hasRetainedResults = false,
  warnings,
  metadata = {},
  total,
  page,
  totalPages,
  onRetry,
}: TopPicksStatusProps) {
  const assumptionSummary = formatTopPicksAssumptions(metadata);
  const statusText = loading
    ? total > 0
      ? `${total} results - Showing page ${page} of ${totalPages}`
      : "Loading..."
    : error
      ? `${hasRetainedResults ? "Showing previous results. " : ""}Error: ${error}`
      : total === 0
        ? "No results"
        : `${total} results - Showing page ${page} of ${totalPages}`;

  return (
    <Stack sx={{ pb: 3 }} spacing={0.75}>
      <Typography
        variant="body2"
        role={error ? "alert" : "status"}
        sx={{
          color: error
            ? "var(--fit-color-danger)"
            : "var(--fit-color-text-muted)",
        }}
      >
        {statusText}
      </Typography>
      {assumptionSummary ? (
        <Typography
          variant="caption"
          role="note"
          aria-label="Top Picks ranking assumptions"
          sx={{
            color: "var(--fit-color-text-label)",
            fontSize: "0.75rem",
            lineHeight: 1.6,
          }}
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
          sx={{
            color: "var(--fit-color-warning)",
            fontSize: "0.75rem",
            lineHeight: 1.6,
          }}
        >
          {warning}
        </Typography>
      ))}
    </Stack>
  );
}
