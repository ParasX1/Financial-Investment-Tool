import DownloadIcon from "@mui/icons-material/Download";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import { Box, Button, Stack, Typography } from "@mui/material";
import { formatTopPicksAssumptions } from "../lib/topPicksAssumptions";
import type { TopPicksMetadata } from "../types";
import { secondaryActionSx } from "./topPicksSx";

type TopPicksToolbarProps = {
  loading: boolean;
  error: string | null;
  warnings: string[];
  metadata?: TopPicksMetadata;
  total: number;
  page: number;
  totalPages: number;
  onExport: () => void;
  onEditColumns: () => void;
  onRetry: () => void;
};

export function TopPicksToolbar({
  loading,
  error,
  warnings,
  metadata = {},
  total,
  page,
  totalPages,
  onExport,
  onEditColumns,
  onRetry,
}: TopPicksToolbarProps) {
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
    <>
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          pb: 2,
          display: "flex",
          gap: 1.25,
          alignItems: "center",
          justifyContent: "flex-end",
          flexWrap: "wrap",
        }}
      >
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
      </Box>

      <Stack sx={{ px: { xs: 2, sm: 3 } }} spacing={0.5}>
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
    </>
  );
}
