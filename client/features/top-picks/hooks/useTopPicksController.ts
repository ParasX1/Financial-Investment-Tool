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
import type { TopPicksResponse, TopPicksWindow } from "../types";
import { useTopPicksPreferences } from "./useTopPicksPreferences";
import { useTopPicksVisibleColumns } from "./useTopPicksVisibleColumns";

const isAbortError = (reason: unknown): boolean =>
  reason instanceof Error && reason.name === "AbortError";

const errorMessage = (reason: unknown): string =>
  reason instanceof Error && reason.message.trim()
    ? reason.message
    : "Unable to load Top Picks.";

type RankingSnapshot = {
  queryKey: string;
  response: TopPicksResponse;
  lastUpdatedAt: Date | null;
};

type RankingRequestState = {
  queryKey: string | null;
  pending: boolean;
  error: string | null;
};

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
  const [snapshot, setSnapshot] = useState<RankingSnapshot | null>(null);
  const snapshotRef = useRef<RankingSnapshot | null>(null);
  const [refreshRequest, setRefreshRequest] = useState({
    token: 0,
    forceRefresh: false,
  });
  const [requestState, setRequestState] = useState<RankingRequestState>({
    queryKey: null,
    pending: false,
    error: null,
  });
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [loadedSubscriptionScope, setLoadedSubscriptionScope] = useState<
    string | null
  >(null);
  const requestInFlightRef = useRef(false);
  const snapshotReadPendingRef = useRef(false);
  const lastConsumedForceTokenRef = useRef<number | null>(null);
  const subscriptionScope = JSON.stringify([
    preferenceScopeKey,
    selectedWindow,
  ]);

  const windowMetricKeys = getTopPicksWindowMetricKeys(selectedWindow);
  const effectiveSort = windowMetricKeys.includes(sort.key)
    ? sort
    : { key: "ret1y" as const, dir: "desc" as const };
  const queryKey = JSON.stringify([
    preferenceScopeKey,
    page,
    pageSize,
    effectiveSort.key,
    effectiveSort.dir,
    selectedWindow,
  ]);

  useEffect(() => {
    if (!preferenceScopeReady || preferenceScopeKey === null) return;

    const abortController = new AbortController();
    let active = true;
    requestInFlightRef.current = true;
    setRequestState({ queryKey, pending: true, error: null });

    const applyResponse = (
      response: Awaited<ReturnType<typeof fetchTopPicks>>,
    ) => {
      const generatedAt = response.metadata.generatedAt;
      const previous = snapshotRef.current;
      const generatedAtDate = generatedAt ? new Date(generatedAt) : null;
      const lastUpdatedAt =
        previous?.queryKey === queryKey &&
        previous.response.metadata.generatedAt === generatedAt
          ? previous.lastUpdatedAt
          : generatedAtDate && Number.isFinite(generatedAtDate.getTime())
            ? generatedAtDate
            : null;
      const nextSnapshot = { queryKey, response, lastUpdatedAt };
      snapshotRef.current = nextSnapshot;
      setSnapshot(nextSnapshot);
      const lastPage = Math.max(1, Math.ceil(response.total / pageSize));
      if (page > lastPage) setPage(lastPage);
    };

    const load = async () => {
      const forceRefresh =
        refreshRequest.forceRefresh &&
        lastConsumedForceTokenRef.current !== refreshRequest.token;
      if (forceRefresh)
        lastConsumedForceTokenRef.current = refreshRequest.token;
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
        setRequestState((current) => ({ ...current, error: null }));
      })
      .catch((reason: unknown) => {
        if (!active || isAbortError(reason)) return;
        setRequestState({
          queryKey,
          pending: false,
          error: errorMessage(reason),
        });
      })
      .finally(() => {
        if (active) {
          requestInFlightRef.current = false;
          setRequestState((current) => ({ ...current, pending: false }));
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
    queryKey,
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
          setRequestState((current) => ({
            ...current,
            error: "Unable to refresh Top Picks. Retrying automatically.",
          }));
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

  const currentSnapshot =
    controllerScopeReady && snapshot?.queryKey === queryKey ? snapshot : null;
  const currentRequest =
    controllerScopeReady && requestState.queryKey === queryKey
      ? requestState
      : null;
  const exposedRows = currentSnapshot?.response.rows ?? [];
  const exposedTotal = currentSnapshot?.response.total ?? 0;
  const loading =
    !controllerScopeReady ||
    (!currentSnapshot && !currentRequest?.error) ||
    (Boolean(currentRequest?.pending) && exposedRows.length === 0);
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
    loading,
    error: currentRequest?.error ?? null,
    warnings: currentSnapshot?.response.warnings ?? [],
    metadata: currentSnapshot?.response.metadata ?? {},
    lastUpdatedAt: currentSnapshot?.lastUpdatedAt ?? null,
    syncing: Boolean(currentRequest?.pending) && exposedRows.length > 0,
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
