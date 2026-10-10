import { useEffect, useState } from "react";
import {
  getDefaultVisibleTopPicksColumnsForWindow,
  isTopPicksMetricAvailableForWindow,
  TOP_PICKS_COLUMNS,
} from "../lib/topPicksColumns";
import type { TopPicksColumnKey, TopPicksWindow } from "../types";

const hasLocalStorage = () =>
  typeof window !== "undefined" && typeof localStorage !== "undefined";

const LS_COLUMNS_PREFIX = "topPicks.visibleCols";
const COLUMN_KEYS = new Set(TOP_PICKS_COLUMNS.map((column) => column.key));

const columnsStorageKey = (scopeKey: string, window: TopPicksWindow): string =>
  `${LS_COLUMNS_PREFIX}:${scopeKey}:${window}`;

type ColumnsHydration = {
  scopeKey: string;
  window: TopPicksWindow;
  status: "loading" | "ready";
} | null;

export function useTopPicksVisibleColumns(
  preferenceScopeKey: string | null,
  window: TopPicksWindow,
) {
  const [visibleKeys, setVisibleKeysState] = useState<TopPicksColumnKey[]>(
    getDefaultVisibleTopPicksColumnsForWindow(window),
  );
  const [columnsHydration, setColumnsHydration] =
    useState<ColumnsHydration>(null);

  useEffect(() => {
    const defaultColumns = getDefaultVisibleTopPicksColumnsForWindow(window);
    setVisibleKeysState(defaultColumns);

    if (preferenceScopeKey === null) {
      setColumnsHydration(null);
      return;
    }

    setColumnsHydration({
      scopeKey: preferenceScopeKey,
      window,
      status: "loading",
    });

    if (!hasLocalStorage()) {
      setColumnsHydration({
        scopeKey: preferenceScopeKey,
        window,
        status: "ready",
      });
      return;
    }

    try {
      const storedColumns = localStorage.getItem(
        columnsStorageKey(preferenceScopeKey, window),
      );
      if (storedColumns) {
        const parsed: unknown = JSON.parse(storedColumns);
        if (Array.isArray(parsed)) {
          const validColumns = parsed.filter(
            (key): key is TopPicksColumnKey =>
              typeof key === "string" &&
              COLUMN_KEYS.has(key as TopPicksColumnKey) &&
              isTopPicksMetricAvailableForWindow(
                key as TopPicksColumnKey,
                window,
              ),
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
        window,
        status: "ready",
      });
    }
  }, [preferenceScopeKey, window]);

  const columnsScopeReady =
    preferenceScopeKey !== null &&
    columnsHydration?.scopeKey === preferenceScopeKey &&
    columnsHydration.window === window &&
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
        columnsStorageKey(preferenceScopeKey, window),
        JSON.stringify(visibleKeys),
      );
    } catch {
      // Browser storage may be unavailable in private or restricted contexts.
    }
  }, [columnsScopeReady, preferenceScopeKey, visibleKeys, window]);

  const setVisibleKeys = (value: TopPicksColumnKey[]) => {
    if (!columnsScopeReady) return;
    const normalized = [
      ...new Set(
        value.filter(
          (key) =>
            COLUMN_KEYS.has(key) &&
            isTopPicksMetricAvailableForWindow(key, window),
        ),
      ),
    ];
    if (normalized.length === 0) return;
    setVisibleKeysState(normalized);
  };

  return {
    columnsScopeReady,
    setVisibleKeys,
    visibleKeys,
  };
}
