import { useCallback, useEffect, useState } from "react";
import type {
  TopPicksColumnKey,
  TopPicksPrefs,
  TopPicksSortKey,
  TopPicksSortState,
} from "../types";
import { loadTopPicksPrefs } from "../data/topPicksPrefsRepository";
import { topPicksPrefsSaveQueue } from "./topPicksPrefsSaveQueue";

const SIGNED_OUT_SCOPE = "signed-out";
const PREFS_LOAD_ERROR_MESSAGE = "Unable to load Top Picks preferences.";
const PREFS_SAVE_ERROR_MESSAGE = "Unable to save Top Picks preferences.";

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

const isSortKey = (key: TopPicksColumnKey): key is TopPicksSortKey =>
  SORT_KEYS.includes(key as TopPicksSortKey);

const isPageSize = (value: number): boolean =>
  PAGE_SIZES.includes(value as (typeof PAGE_SIZES)[number]);

type PrefsHydration = {
  scopeKey: string;
  status: "loading" | "ready" | "failed";
} | null;

const defaultSort = (): TopPicksSortState => ({
  key: defaultPrefs.sort_key,
  dir: defaultPrefs.sort_dir,
});

export function useTopPicksPreferences({
  authLoading,
  userId,
}: {
  authLoading: boolean;
  userId: string | null;
}) {
  const preferenceScopeKey = authLoading
    ? null
    : userId
      ? `user:${userId}`
      : SIGNED_OUT_SCOPE;
  const [sort, setSort] = useState<TopPicksSortState>(defaultSort);
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPrefs.page_size);
  const [prefsHydration, setPrefsHydration] = useState<PrefsHydration>(null);
  const [prefsDirty, setPrefsDirty] = useState(false);

  useEffect(() => {
    let active = true;

    setPrefsDirty(false);
    setSort(defaultSort());
    setPageSizeState(defaultPrefs.page_size);
    setPageState(1);

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
      .catch(() => {
        if (!active) return;
        console.error(PREFS_LOAD_ERROR_MESSAGE);
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

  const setPage = useCallback(
    (value: number) => {
      if (!preferenceScopeReady) return;
      setPageState(Math.max(1, Math.trunc(value)));
    },
    [preferenceScopeReady],
  );

  const setPageSize = useCallback(
    (value: number) => {
      if (!preferenceScopeReady || !isPageSize(value)) return;
      setPageSizeState(value);
      setPageState(1);
      if (userId) setPrefsDirty(true);
    },
    [preferenceScopeReady, userId],
  );

  const toggleSort = useCallback(
    (key: TopPicksColumnKey) => {
      if (!preferenceScopeReady || !isSortKey(key)) return;
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
    [preferenceScopeReady, userId],
  );

  useEffect(() => {
    if (
      !userId ||
      !prefsDirty ||
      !preferenceScopeReady ||
      preferenceScopeKey === null ||
      prefsHydration?.scopeKey !== preferenceScopeKey
    ) {
      return;
    }

    let active = true;
    topPicksPrefsSaveQueue.enqueue({
      scopeKey: preferenceScopeKey,
      userId,
      prefs: {
        sort_key: sort.key,
        sort_dir: sort.dir,
        page_size: pageSize,
      },
      onSuccess: (isLatest) => {
        if (active && isLatest) setPrefsDirty(false);
      },
      onError: () => {
        if (!active) return;
        console.error(PREFS_SAVE_ERROR_MESSAGE);
        setPrefsDirty(true);
      },
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

  return {
    page,
    pageSize,
    preferenceScopeKey,
    preferenceScopeReady,
    setPage,
    setPageSize,
    sort,
    toggleSort,
  };
}
