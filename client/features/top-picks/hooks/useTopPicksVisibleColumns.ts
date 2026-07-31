import { useEffect, useState } from "react";
import {
  getDefaultVisibleTopPicksColumns,
  TOP_PICKS_COLUMNS,
} from "../lib/topPicksColumns";
import type { TopPicksColumnKey } from "../types";

const hasLocalStorage = () =>
  typeof window !== "undefined" && typeof localStorage !== "undefined";

const LS_COLUMNS_PREFIX = "topPicks.visibleCols";
const COLUMN_KEYS = new Set(TOP_PICKS_COLUMNS.map((column) => column.key));

const columnsStorageKey = (scopeKey: string): string =>
  `${LS_COLUMNS_PREFIX}:${scopeKey}`;

type ColumnsHydration = {
  scopeKey: string;
  status: "loading" | "ready";
} | null;

export function useTopPicksVisibleColumns(preferenceScopeKey: string | null) {
  const [visibleKeys, setVisibleKeysState] = useState<TopPicksColumnKey[]>(
    getDefaultVisibleTopPicksColumns(),
  );
  const [columnsHydration, setColumnsHydration] =
    useState<ColumnsHydration>(null);

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

  const setVisibleKeys = (value: TopPicksColumnKey[]) => {
    if (!columnsScopeReady) return;
    const normalized = [
      ...new Set(value.filter((key) => COLUMN_KEYS.has(key))),
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
