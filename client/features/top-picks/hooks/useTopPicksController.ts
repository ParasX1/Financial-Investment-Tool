import { useAuth } from "@/features/auth";
import { useEffect, useState } from "react";
import { fetchTopPicks } from "../api/fetchTopPicks";
import {
  loadTopPicksPrefs,
  saveTopPicksPrefs,
} from "../data/topPicksPrefsRepository";
import {
  getDefaultVisibleTopPicksColumns,
  TOP_PICKS_COLUMNS,
} from "../lib/topPicksColumns";
import type {
  TopPicksColumnKey,
  TopPicksMetadata,
  TopPicksPrefs,
  TopPicksRow,
  TopPicksSortKey,
  TopPicksSortState,
} from "../types";

const hasLocalStorage = () =>
  typeof window !== "undefined" && typeof localStorage !== "undefined";

const LS_COLUMNS_PREFIX = "topPicks.visibleCols";
const SIGNED_OUT_SCOPE = "signed-out";

const columnsStorageKey = (scopeKey: string): string =>
  `${LS_COLUMNS_PREFIX}:${scopeKey}`;

const defaultPrefs: TopPicksPrefs = {
  sort_key: "sharpe",
  sort_dir: "desc",
  page_size: 25,
};

const SORT_KEYS: readonly TopPicksSortKey[] = [
  "ret1y",
  "sharpe",
  "sortino",
  "volatility",
  "maxDD",
  "beta",
  "alpha",
  "infoRatio",
];
const PAGE_SIZES = [10, 25, 50, 100] as const;
const COLUMN_KEYS = new Set(TOP_PICKS_COLUMNS.map((column) => column.key));

const isSortKey = (key: TopPicksColumnKey): key is TopPicksSortKey =>
  SORT_KEYS.includes(key as TopPicksSortKey);

const isPageSize = (value: number): boolean =>
  PAGE_SIZES.includes(value as (typeof PAGE_SIZES)[number]);

const isAbortError = (reason: unknown): boolean =>
  reason instanceof Error && reason.name === "AbortError";

const errorMessage = (reason: unknown): string =>
  reason instanceof Error && reason.message.trim()
    ? reason.message
    : "Unable to load Top Picks.";

type ColumnsHydration = {
  scopeKey: string;
  status: "loading" | "ready";
} | null;

type PrefsHydration = {
  scopeKey: string;
  status: "loading" | "ready" | "failed";
} | null;

const defaultSort = (): TopPicksSortState => ({
  key: defaultPrefs.sort_key,
  dir: defaultPrefs.sort_dir,
});

export function useTopPicksController() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const preferenceScopeKey = authLoading
    ? null
    : userId
      ? `user:${userId}`
      : SIGNED_OUT_SCOPE;
  const [rows, setRows] = useState<TopPicksRow[]>([]);
  const [total, setTotal] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [metadata, setMetadata] = useState<TopPicksMetadata>({});
  const [retryToken, setRetryToken] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeysState] = useState<TopPicksColumnKey[]>(
    getDefaultVisibleTopPicksColumns(),
  );
  const [sort, setSort] = useState<TopPicksSortState>(defaultSort);
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPrefs.page_size);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [columnsHydration, setColumnsHydration] =
    useState<ColumnsHydration>(null);
  const [prefsHydration, setPrefsHydration] = useState<PrefsHydration>(null);
  const [prefsDirty, setPrefsDirty] = useState(false);

  useEffect(() => {
    const defaultColumns = getDefaultVisibleTopPicksColumns();
    setVisibleKeysState(defaultColumns);

    if (preferenceScopeKey === null) {
      setColumnsHydration(null);
      return;
    }

    setColumnsHydration({
      scopeKey: preferenceScopeKey,
      status: "loading",
    });

    if (!hasLocalStorage()) {
      setColumnsHydration({
        scopeKey: preferenceScopeKey,
        status: "ready",
      });
      return;
    }

    try {
      const storedColumns = localStorage.getItem(
        columnsStorageKey(preferenceScopeKey),
      );
      if (storedColumns) {
        const parsed: unknown = JSON.parse(storedColumns);
        if (Array.isArray(parsed)) {
          const validColumns = parsed.filter(
            (key): key is TopPicksColumnKey =>
              typeof key === "string" &&
              COLUMN_KEYS.has(key as TopPicksColumnKey),
          );
          if (validColumns.length) {
            setVisibleKeysState([...new Set(validColumns)]);
          }
        }
      }
    } catch {
      // Malformed or unavailable browser storage falls back to safe defaults.
    } finally {
      setColumnsHydration({
        scopeKey: preferenceScopeKey,
        status: "ready",
      });
    }
  }, [preferenceScopeKey]);

  const columnsScopeReady =
    preferenceScopeKey !== null &&
    columnsHydration?.scopeKey === preferenceScopeKey &&
    columnsHydration.status === "ready";

  useEffect(() => {
    if (
      !hasLocalStorage() ||
      !columnsScopeReady ||
      preferenceScopeKey === null
    ) {
      return;
    }
    try {
      localStorage.setItem(
        columnsStorageKey(preferenceScopeKey),
        JSON.stringify(visibleKeys),
      );
    } catch {
      // Browser storage may be unavailable in private or restricted contexts.
    }
  }, [columnsScopeReady, preferenceScopeKey, visibleKeys]);

  useEffect(() => {
    let active = true;

    setPrefsDirty(false);
    setSort(defaultSort());
    setPageSizeState(defaultPrefs.page_size);
    setPageState(1);
    setRows([]);
    setTotal(0);
    setWarnings([]);
    setMetadata({});
    setError(null);
    setLoading(true);

    if (preferenceScopeKey === null) {
      setPrefsHydration(null);
      return () => {
        active = false;
      };
    }

    if (!userId) {
      setPrefsHydration({ scopeKey: preferenceScopeKey, status: "ready" });
      return () => {
        active = false;
      };
    }

    setPrefsHydration({ scopeKey: preferenceScopeKey, status: "loading" });
    loadTopPicksPrefs(userId)
      .then((prefs) => {
        if (!active) return;
        setSort({ key: prefs.sort_key, dir: prefs.sort_dir });
        setPageSizeState(prefs.page_size);
        setPageState(1);
        setPrefsHydration({ scopeKey: preferenceScopeKey, status: "ready" });
      })
      .catch((reason: unknown) => {
        if (!active) return;
        console.error("Unable to load Top Picks preferences", reason);
        setPrefsHydration({ scopeKey: preferenceScopeKey, status: "failed" });
      });

    return () => {
      active = false;
    };
  }, [preferenceScopeKey, userId]);

  const preferenceScopeReady =
    preferenceScopeKey !== null &&
    prefsHydration?.scopeKey === preferenceScopeKey &&
    prefsHydration.status !== "loading";

  useEffect(() => {
    if (
      !userId ||
      !prefsDirty ||
      !preferenceScopeReady ||
      prefsHydration?.scopeKey !== preferenceScopeKey
    ) {
      return;
    }

    let active = true;
    saveTopPicksPrefs(userId, {
      sort_key: sort.key,
      sort_dir: sort.dir,
      page_size: pageSize,
    })
      .then(() => {
        if (active) setPrefsDirty(false);
      })
      .catch((reason: unknown) => {
        console.error("Unable to save Top Picks preferences", reason);
      });

    return () => {
      active = false;
    };
  }, [
    pageSize,
    preferenceScopeKey,
    preferenceScopeReady,
    prefsDirty,
    prefsHydration,
    sort.dir,
    sort.key,
    userId,
  ]);

  useEffect(() => {
    if (!preferenceScopeReady || preferenceScopeKey === null) return;

    const abortController = new AbortController();
    let active = true;
    setLoading(true);
    setError(null);
    setRows([]);
    setWarnings([]);
    setMetadata({});

    fetchTopPicks({
      page,
      pageSize,
      sortKey: sort.key,
      sortDirection: sort.dir,
      signal: abortController.signal,
    })
      .then((response) => {
        if (!active) return;
        setRows(response.rows);
        setTotal(response.total);
        setWarnings(response.warnings);
        setMetadata(response.metadata);
        const lastPage = Math.max(1, Math.ceil(response.total / pageSize));
        if (page > lastPage) setPageState(lastPage);
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
    sort.dir,
    sort.key,
  ]);

  const controllerScopeReady = preferenceScopeReady && columnsScopeReady;
  const exposedRows = controllerScopeReady ? rows : [];
  const exposedTotal = controllerScopeReady ? total : 0;
  const exposedPageSize = controllerScopeReady
    ? pageSize
    : defaultPrefs.page_size;
  const exposedSort = controllerScopeReady ? sort : defaultSort();
  const exposedVisibleKeys = columnsScopeReady
    ? visibleKeys
    : getDefaultVisibleTopPicksColumns();
  const totalPages = Math.max(1, Math.ceil(exposedTotal / exposedPageSize));
  const safePage = controllerScopeReady ? Math.min(page, totalPages) : 1;
  const visibleColumns = TOP_PICKS_COLUMNS.filter((column) =>
    exposedVisibleKeys.includes(column.key),
  );

  const updateVisibleKeys = (value: TopPicksColumnKey[]) => {
    if (!columnsScopeReady) return;
    const normalized = [
      ...new Set(value.filter((key) => COLUMN_KEYS.has(key))),
    ];
    if (normalized.length === 0) return;
    setVisibleKeysState(normalized);
  };

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
    visibleKeys: exposedVisibleKeys,
    visibleColumns,
    columnsOpen,
    setColumnsOpen,
    setVisibleKeys: updateVisibleKeys,
    setPage: (value: number) => {
      if (!controllerScopeReady) return;
      setPageState(Math.max(1, Math.trunc(value)));
    },
    retry: () => {
      if (controllerScopeReady) {
        setRetryToken((current) => current + 1);
      }
    },
    setPageSize: (value: number) => {
      if (!controllerScopeReady || !isPageSize(value)) return;
      setPageSizeState(value);
      setPageState(1);
      if (userId) setPrefsDirty(true);
    },
    toggleSort: (key: TopPicksColumnKey) => {
      if (!controllerScopeReady || !isSortKey(key)) return;
      setSort((previous) =>
        previous.key !== key
          ? { key, dir: "desc" }
          : {
              key: previous.key,
              dir: previous.dir === "desc" ? "asc" : "desc",
            },
      );
      setPageState(1);
      if (userId) setPrefsDirty(true);
    },
  };
}
