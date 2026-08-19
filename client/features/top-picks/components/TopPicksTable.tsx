import {
  Box,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  TOP_PICKS_COLUMNS,
  rankBadgeSx,
  valueColor,
} from "../lib/topPicksColumns";
import type {
  TopPicksColumnDef,
  TopPicksColumnKey,
  TopPicksMetric,
  TopPicksRow,
  TopPicksSortKey,
  TopPicksSortState,
} from "../types";
import { darkControlSx, darkMenuProps } from "./topPicksSx";

type TopPicksTableProps = {
  rows: TopPicksRow[];
  loading: boolean;
  error: string | null;
  visibleKeys: TopPicksColumnKey[];
  sort: TopPicksSortState;
  page: number;
  pageSize: number;
  totalPages: number;
  onSortChange: (key: TopPicksColumnKey) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export function TopPicksTable({
  rows,
  loading,
  error,
  visibleKeys,
  sort,
  page,
  pageSize,
  totalPages,
  onSortChange,
  onPageChange,
  onPageSizeChange,
}: TopPicksTableProps) {
  const startIndex = (page - 1) * pageSize;
  const visibleColumns = TOP_PICKS_COLUMNS.filter((column) =>
    visibleKeys.includes(column.key),
  );
  const stateMessage =
    loading && rows.length === 0
      ? "Loading Top Picks..."
      : error
        ? "Top Picks could not be loaded."
        : rows.length === 0
          ? "No Top Picks are available."
          : null;

  return (
    <Box sx={{ px: { xs: 2, sm: 3 }, pb: 3, pt: 1 }}>
      <Box
        sx={{
          bgcolor: "var(--fit-color-surface, #09090b)",
          border:
            "1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))",
          borderRadius: "0.75rem",
          overflow: "auto",
        }}
      >
        <Table
          stickyHeader
          size="small"
          aria-busy={loading}
          sx={{ minWidth: 1120, borderCollapse: "separate", borderSpacing: 0 }}
        >
          <TableHead>
            <TableRow>
              {visibleColumns.map((column) => (
                <TableCell
                  key={column.key}
                  align={column.align ?? "left"}
                  sx={{
                    top: 0,
                    bgcolor: "var(--fit-color-surface-soft, #111114)",
                    color: "#fff",
                    fontWeight: "var(--fit-type-weight-semibold)",
                    fontSize: "var(--fit-type-size-body-sm)",
                    whiteSpace: "nowrap",
                    borderBottom:
                      "1px solid var(--fit-color-border-panel, #27272a)",
                    py: 1.8,
                    px: 2,
                    width: column.width,
                  }}
                >
                  {column.format ? (
                    <Tooltip
                      title={column.description ?? column.label}
                      describeChild
                      arrow
                      placement="top"
                    >
                      <TableSortLabel
                        aria-label={`${column.label}: ${column.description ?? "Sort this metric."}`}
                        active={sort.key === column.key}
                        direction={sort.key === column.key ? sort.dir : "asc"}
                        onClick={() => onSortChange(column.key)}
                        sx={{
                          color: "inherit",
                          "&:hover": { color: "#fff" },
                          "&.Mui-active": { color: "#fff" },
                          "& .MuiTableSortLabel-icon": {
                            color:
                              "var(--fit-color-text-label, #687184) !important",
                          },
                          "&.Mui-active .MuiTableSortLabel-icon": {
                            color:
                              "var(--fit-color-accent-strong, #65a0fd) !important",
                          },
                          "&:focus-visible": {
                            outline:
                              "2px solid var(--fit-color-focus-ring, rgba(123, 140, 255, 0.82))",
                            outlineOffset: 2,
                          },
                        }}
                      >
                        {column.label}
                      </TableSortLabel>
                    </Tooltip>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {stateMessage ? (
              <TableRow>
                <TableCell
                  colSpan={Math.max(visibleColumns.length, 1)}
                  align="center"
                  role="status"
                  sx={{
                    color: "var(--fit-color-text-muted, #8f98aa)",
                    borderBottom: 0,
                    py: 6,
                  }}
                >
                  {stateMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow
                  key={`${row.symbol}-${startIndex + index}`}
                  hover
                  sx={{
                    "&:hover td": {
                      bgcolor:
                        "var(--fit-color-brand-fill-hover, rgba(123, 140, 255, 0.12))",
                    },
                  }}
                >
                  {visibleColumns.map((column) =>
                    column.key === "rank" ? (
                      <TableCell
                        key="rank"
                        align="left"
                        sx={{
                          borderBottom:
                            "1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))",
                          py: 2,
                          px: 2,
                        }}
                      >
                        <Box
                          component="span"
                          sx={rankBadgeSx(startIndex + index + 1)}
                        >
                          {startIndex + index + 1}
                        </Box>
                      </TableCell>
                    ) : (
                      <TopPicksValueCell
                        key={column.key}
                        column={column}
                        row={row}
                      />
                    ),
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>

      <TopPicksPaginationControls
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        loading={loading}
        error={error}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </Box>
  );
}

function TopPicksPaginationControls({
  page,
  pageSize,
  totalPages,
  loading,
  error,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "stretch", sm: "center" }}
      justifyContent="space-between"
      gap={1.5}
      sx={{ mt: 1 }}
    >
      <Stack direction="row" gap={1} alignItems="center">
        <Typography
          variant="body2"
          sx={{ color: "var(--fit-color-text-muted, #8f98aa)" }}
        >
          Rows per page:
        </Typography>
        <Select
          size="small"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          MenuProps={darkMenuProps}
          sx={{ ...darkControlSx, width: 88 }}
        >
          {[10, 25, 50, 100].map((value) => (
            <MenuItem key={value} value={value}>
              {value}
            </MenuItem>
          ))}
        </Select>
      </Stack>
      <Pagination
        count={totalPages}
        page={page}
        disabled={loading || Boolean(error)}
        onChange={(_, nextPage) => onPageChange(nextPage)}
        sx={{
          alignSelf: { xs: "center", sm: "auto" },
          "& .MuiPaginationItem-root": {
            color: "var(--fit-color-text-body, #b9c1d0)",
            borderRadius: "0.5rem",
          },
          "& .MuiPaginationItem-root.Mui-selected": {
            bgcolor: "var(--fit-color-brand-chip, rgba(123, 140, 255, 0.1))",
            color: "#fff",
          },
          "& .MuiPaginationItem-root:focus-visible": {
            outline:
              "2px solid var(--fit-color-focus-ring, rgba(123, 140, 255, 0.82))",
            outlineOffset: 2,
          },
        }}
      />
    </Stack>
  );
}

function TopPicksValueCell({
  column,
  row,
}: {
  column: TopPicksColumnDef;
  row: TopPicksRow;
}) {
  const rawValue = row[column.key as Exclude<TopPicksColumnKey, "rank">];
  const status = column.format
    ? row.metricStatus?.[column.key as TopPicksSortKey]
    : undefined;
  const metricValue: TopPicksMetric =
    (!status || status === "ok") &&
    typeof rawValue === "number" &&
    Number.isFinite(rawValue)
      ? rawValue
      : null;
  const text = column.format?.(metricValue, status) ?? rawValue ?? "—";

  return (
    <TableCell
      align={column.align ?? "left"}
      sx={{
        color:
          column.key === "symbol"
            ? "var(--fit-color-accent-strong, #65a0fd)"
            : valueColor(column.key, rawValue, status),
        whiteSpace: "nowrap",
        borderBottom:
          "1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))",
        py: 2,
        px: 2,
        fontWeight:
          column.key === "symbol"
            ? "var(--fit-type-weight-medium)"
            : "var(--fit-type-weight-semibold)",
        fontSize:
          column.key === "symbol"
            ? "var(--fit-type-size-body)"
            : "var(--fit-type-size-body-sm)",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {text}
    </TableCell>
  );
}
