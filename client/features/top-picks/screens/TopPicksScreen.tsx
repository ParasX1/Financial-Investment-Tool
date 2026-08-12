import Sidebar from "@/components/sidebar";
import { FitPageHeader } from "@/components/shared/FitPageHeader";
import { Box } from "@mui/material";
import { buildTopPicksCsv } from "../lib/topPicksCsv";
import { TopPicksColumnsDialog } from "../components/TopPicksColumnsDialog";
import { TopPicksTable } from "../components/TopPicksTable";
import { TopPicksToolbar } from "../components/TopPicksToolbar";
import { useTopPicksController } from "../hooks/useTopPicksController";

export function TopPicksScreen() {
  const controller = useTopPicksController();

  const exportCsv = () => {
    const csv = buildTopPicksCsv(
      controller.rows,
      controller.visibleColumns,
      (controller.page - 1) * controller.pageSize,
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "top-picks.csv";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

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
            title="Top Picks"
            subtitle="Ranked stocks based on risk-adjusted performance metrics"
          />
        </Box>

        <TopPicksToolbar
          loading={controller.loading}
          error={controller.error}
          warnings={controller.warnings}
          metadata={controller.metadata}
          total={controller.total}
          page={controller.page}
          totalPages={controller.totalPages}
          onExport={exportCsv}
          onEditColumns={() => controller.setColumnsOpen(true)}
          onRetry={controller.retry}
        />

        <TopPicksTable
          rows={controller.rows}
          loading={controller.loading}
          error={controller.error}
          visibleKeys={controller.visibleKeys}
          sort={controller.sort}
          page={controller.page}
          pageSize={controller.pageSize}
          totalPages={controller.totalPages}
          onSortChange={controller.toggleSort}
          onPageChange={controller.setPage}
          onPageSizeChange={controller.setPageSize}
        />

        <TopPicksColumnsDialog
          open={controller.columnsOpen}
          visibleKeys={controller.visibleKeys}
          onClose={() => controller.setColumnsOpen(false)}
          onVisibleKeysChange={controller.setVisibleKeys}
        />
      </Box>
    </Box>
  );
}
