import { FitPageContent } from "@/components/shared/FitPageContent";
import { FitPageHeader } from "@/components/shared/FitPageHeader";
import { FitPageShell } from "@/components/shared/FitPageShell";
import { buildTopPicksCsv } from "../lib/topPicksCsv";
import { TopPicksColumnsDialog } from "../components/TopPicksColumnsDialog";
import { TopPicksTable } from "../components/TopPicksTable";
import { TopPicksStatus, TopPicksToolbar } from "../components/TopPicksToolbar";
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
    <FitPageShell skipLabel="Skip to Top Picks" skipTargetId="main-content">
      <FitPageContent density="data" aria-busy={controller.loading}>
        <FitPageHeader
          title="Top Picks"
          subtitle="Ranked stocks based on risk-adjusted performance metrics"
          eyebrow="Stock research"
        />

        <TopPicksToolbar
          loading={controller.loading}
          error={controller.error}
          warnings={controller.warnings}
          metadata={controller.metadata}
          lastUpdatedAt={controller.lastUpdatedAt}
          syncing={controller.syncing}
          total={controller.total}
          page={controller.page}
          totalPages={controller.totalPages}
          selectedWindow={controller.window}
          onExport={exportCsv}
          onEditColumns={() => controller.setColumnsOpen(true)}
          onWindowChange={controller.setWindow}
          onRetry={controller.retry}
        />

        <TopPicksStatus
          loading={controller.loading}
          error={controller.error}
          hasRetainedResults={
            Boolean(controller.error) && controller.rows.length > 0
          }
          warnings={controller.warnings}
          metadata={controller.metadata}
          total={controller.total}
          page={controller.page}
          totalPages={controller.totalPages}
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
          window={controller.window}
          onClose={() => controller.setColumnsOpen(false)}
          onVisibleKeysChange={controller.setVisibleKeys}
        />
      </FitPageContent>
    </FitPageShell>
  );
}
