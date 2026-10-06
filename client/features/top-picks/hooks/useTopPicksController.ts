import { useAuth } from "@/features/auth";
import { useEffect, useRef, useState } from "react";
import { fetchTopPicks } from "../api/fetchTopPicks";
import { subscribeToTopPicksUpdates } from "../api/subscribeToTopPicksUpdates";
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
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [refreshRequest, setRefreshRequest] = useState({
    token: 0,
    forceRefresh: false,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [loadedSubscriptionScope, setLoadedSubscriptionScope] = useState<
    string | null
  >(null);
  const requestInFlightRef = useRef(false);
  const snapshotReadPendingRef = useRef(false);
  const lastConsumedForceTokenRef = useRef<number | null>(null);
  const lastSnapshotGeneratedAtRef = useRef<string | null>(null);
  const subscriptionScope = JSON.stringify([
    preferenceScopeKey,
    selectedWindow,
  ]);

  const windowMetricKeys = getTopPicksWindowMetricKeys(selectedWindow);
  const effectiveSort = windowMetricKeys.includes(sort.key)
    ? sort
    : { key: "ret1y" as const, dir: "desc" as const };

  useEffect(() => {
    if (!preferenceScopeReady || preferenceScopeKey === null) return;

    const abortController = new AbortController();
    const refreshingExistingRows = rows.length > 0;
    let active = true;
    requestInFlightRef.current = true;
    setLoading(!refreshingExistingRows);
    setSyncing(refreshingExistingRows);
    setError(null);
    if (!refreshingExistingRows) {
      setRows([]);
      setWarnings([]);
      setMetadata({});
    }

    const applyResponse = (
      response: Awaited<ReturnType<typeof fetchTopPicks>>,
    ) => {
      setRows(response.rows);
      setTotal(response.total);
      setWarnings(response.warnings);
      setMetadata(response.metadata);
      const generatedAt = response.metadata.generatedAt ?? null;
      if (
        generatedAt !== null &&
        generatedAt !== lastSnapshotGeneratedAtRef.current
      ) {
        lastSnapshotGeneratedAtRef.current = generatedAt;
        const generatedAtDate = new Date(generatedAt);
        if (Number.isFinite(generatedAtDate.getTime())) {
          setLastUpdatedAt(generatedAtDate);
        }
      }
      const lastPage = Math.max(1, Math.ceil(response.total / pageSize));
      if (page > lastPage) setPage(lastPage);
    };

    const load = async () => {
      const forceRefresh =
        refreshRequest.forceRefresh &&
        lastConsumedForceTokenRef.current !== refreshRequest.token;
      if (forceRefresh) lastConsumedForceTokenRef.current = refreshRequest.token;
      const response = await fetchTopPicks({
        page,
        pageSize,
        sortKey: effectiveSort.key,
        sortDirection: effectiveSort.dir,
        window: selectedWindow,
        forceRefresh,
        signal: abortController.signal,
      });
      if (active) {
        applyResponse(response);
        setLoadedSubscriptionScope(subscriptionScope);
      }
    };

    load()
      .then(() => {
        if (!active) return;
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!active || isAbortError(reason)) return;
        if (!refreshingExistingRows) {
          setRows([]);
          setTotal(0);
          setWarnings([]);
          setMetadata({});
        }
        setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) {
          requestInFlightRef.current = false;
          setLoading(false);
          setSyncing(false);
          if (snapshotReadPendingRef.current) {
            snapshotReadPendingRef.current = false;
            setRefreshRequest(({ token }) => ({
              token: token + 1,
              forceRefresh: false,
            }));
          }
        }
      });

    return () => {
      active = false;
      requestInFlightRef.current = false;
      abortController.abort();
    };
  }, [
    page,
    pageSize,
    preferenceScopeKey,
    preferenceScopeReady,
    refreshRequest,
    setPage,
    effectiveSort.dir,
    effectiveSort.key,
    selectedWindow,
    subscriptionScope,
  ]);

  const controllerScopeReady = preferenceScopeReady && columnsScopeReady;

  useEffect(() => {
    if (
      !controllerScopeReady ||
      loadedSubscriptionScope !== subscriptionScope
    ) {
      return;
    }

    let active = true;
    const unsubscribe = subscribeToTopPicksUpdates({
      window: selectedWindow,
      onUpdate: () => {
        if (!active) return;
        if (requestInFlightRef.current) {
          snapshotReadPendingRef.current = true;
          return;
        }
        requestInFlightRef.current = true;
        setRefreshRequest(({ token }) => ({
          token: token + 1,
          forceRefresh: false,
        }));
      },
      onRefreshError: () => {
        if (active) {
          setError("Unable to refresh Top Picks. Retrying automatically.");
        }
      },
    });

    return () => {
      active = false;
      snapshotReadPendingRef.current = false;
      unsubscribe();
    };
  }, [
    controllerScopeReady,
    loadedSubscriptionScope,
    selectedWindow,
    subscriptionScope,
  ]);

  const exposedRows = controllerScopeReady ? rows : [];
  const exposedTotal = controllerScopeReady ? total : 0;
  const exposedPageSize = controllerScopeReady ? pageSize : 25;
  const exposedSort = controllerScopeReady
    ? effectiveSort
    : { key: "sharpe" as const, dir: "desc" as const };
  const exposedVisibleKeys = (
    columnsScopeReady ? visibleKeys : getDefaultVisibleTopPicksColumns()
  ).filter((key) => isTopPicksMetricAvailableForWindow(key, selectedWindow));
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
    lastUpdatedAt: controllerScopeReady ? lastUpdatedAt : null,
    syncing: controllerScopeReady && syncing,
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
        setRefreshRequest(({ token }) => ({
          token: token + 1,
          forceRefresh: true,
        }));
      }
    },
    setPageSize,
    toggleSort,
  };
}
