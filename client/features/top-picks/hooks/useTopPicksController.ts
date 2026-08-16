import { useAuth } from "@/features/auth";
import { useEffect, useState } from "react";
import { fetchTopPicks } from "../api/fetchTopPicks";
import {
  getDefaultVisibleTopPicksColumns,
  getDefaultVisibleTopPicksColumnsForWindow,
  getTopPicksWindowMetricKeys,
  isTopPicksMetricAvailableForWindow,
  TOP_PICKS_COLUMNS,
} from "../lib/topPicksColumns";
import type { TopPicksMetadata, TopPicksRow, TopPicksWindow } from "../types";
import { useTopPicksPreferences } from "./useTopPicksPreferences";
import { useTopPicksVisibleColumns } from "./useTopPicksVisibleColumns";

const isAbortError = (reason: unknown): boolean =>
  reason instanceof Error && reason.name === "AbortError";

const errorMessage = (reason: unknown): string =>
  reason instanceof Error && reason.message.trim()
    ? reason.message
    : "Unable to load Top Picks.";
const STALE_REFRESH_POLL_MS = 20_000;

export function useTopPicksController() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const {
    page,
    pageSize,
    preferenceScopeKey,
    preferenceScopeReady,
    setPage,
    setPageSize,
    sort,
    toggleSort,
  } = useTopPicksPreferences({ authLoading, userId });
  const [selectedWindow, setWindowState] = useState<TopPicksWindow>("1Y");
  const { columnsScopeReady, setVisibleKeys, visibleKeys } =
    useTopPicksVisibleColumns(preferenceScopeKey, selectedWindow);
  const [rows, setRows] = useState<TopPicksRow[]>([]);
  const [total, setTotal] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [metadata, setMetadata] = useState<TopPicksMetadata>({});
  const [retryToken, setRetryToken] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columnsOpen, setColumnsOpen] = useState(false);

  const windowMetricKeys = getTopPicksWindowMetricKeys(selectedWindow);
  const effectiveSort = windowMetricKeys.includes(sort.key)
    ? sort
    : { key: "ret1y" as const, dir: "desc" as const };

  useEffect(() => {
    if (!preferenceScopeReady || preferenceScopeKey === null) return;

    const abortController = new AbortController();
    let active = true;
    setLoading(true);
    setError(null);
    setRows([]);
    setWarnings([]);
    setMetadata({});

    const applyResponse = (
      response: Awaited<ReturnType<typeof fetchTopPicks>>,
    ) => {
      setRows(response.rows);
      setTotal(response.total);
      setWarnings(response.warnings);
      setMetadata(response.metadata);
      const lastPage = Math.max(1, Math.ceil(response.total / pageSize));
      if (page > lastPage) setPage(lastPage);
    };

    const load = async () => {
      const response = await fetchTopPicks({
        page,
        pageSize,
        sortKey: effectiveSort.key,
        sortDirection: effectiveSort.dir,
        window: selectedWindow,
        signal: abortController.signal,
      });
      if (active) {
        applyResponse(response);
      }
    };

    load()
      .then(() => {
        if (!active) return;
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!active || isAbortError(reason)) return;
        setRows([]);
        setTotal(0);
        setWarnings([]);
        setMetadata({});
        setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      abortController.abort();
    };
  }, [
    page,
    pageSize,
    preferenceScopeKey,
    preferenceScopeReady,
    retryToken,
    setPage,
    effectiveSort.dir,
    effectiveSort.key,
    selectedWindow,
  ]);

  useEffect(() => {
    if (!metadata.snapshotRefreshing) return;

    const timeout = window.setTimeout(() => {
      setRetryToken((current) => current + 1);
    }, STALE_REFRESH_POLL_MS);

    return () => window.clearTimeout(timeout);
  }, [metadata.snapshotRefreshing, retryToken]);

  const controllerScopeReady = preferenceScopeReady && columnsScopeReady;
  const exposedRows = controllerScopeReady ? rows : [];
  const exposedTotal = controllerScopeReady ? total : 0;
  const exposedPageSize = controllerScopeReady ? pageSize : 25;
  const exposedSort = controllerScopeReady
    ? effectiveSort
    : { key: "sharpe" as const, dir: "desc" as const };
  const exposedVisibleKeys = (
    columnsScopeReady
      ? visibleKeys
      : getDefaultVisibleTopPicksColumns()
  ).filter((key) =>
    isTopPicksMetricAvailableForWindow(key, selectedWindow)
  );
  const safeVisibleKeys = exposedVisibleKeys.length
    ? exposedVisibleKeys
    : getDefaultVisibleTopPicksColumnsForWindow(selectedWindow);
  const totalPages = Math.max(1, Math.ceil(exposedTotal / exposedPageSize));
  const safePage = controllerScopeReady ? Math.min(page, totalPages) : 1;
  const visibleColumns = TOP_PICKS_COLUMNS.filter((column) =>
    safeVisibleKeys.includes(column.key),
  );

  return {
    loading: !controllerScopeReady || loading,
    error: controllerScopeReady ? error : null,
    warnings: controllerScopeReady ? warnings : [],
    metadata: controllerScopeReady ? metadata : {},
    rows: exposedRows,
    total: exposedTotal,
    totalPages,
    page: safePage,
    pageSize: exposedPageSize,
    sort: exposedSort,
    window: selectedWindow,
    visibleKeys: safeVisibleKeys,
    visibleColumns,
    columnsOpen,
    setColumnsOpen,
    setVisibleKeys,
    setWindow: (nextWindow: TopPicksWindow) => {
      setWindowState(nextWindow);
      setPage(1);
    },
    setPage,
    retry: () => {
      if (controllerScopeReady) {
        setRetryToken((current) => current + 1);
      }
    },
    setPageSize,
    toggleSort,
  };
}
