import type { SupabaseClient } from "@supabase/supabase-js";
import { WATCHLIST_LIMIT } from "../constants";
import {
  normalizeWatchlistSymbol,
  validateWatchlistSymbol,
} from "../lib/watchlistState";

const WATCHLIST_TABLE = "user_watchlist";
const ERROR_MESSAGES = {
  invalid_user: "Sign in to load saved tickers.",
  load_failed: "Saved tickers could not be loaded.",
} as const;

export type SavedWatchlistSymbolsReaderErrorCode = keyof typeof ERROR_MESSAGES;

export class SavedWatchlistSymbolsReaderError extends Error {
  readonly code: SavedWatchlistSymbolsReaderErrorCode;

  constructor(code: SavedWatchlistSymbolsReaderErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "SavedWatchlistSymbolsReaderError";
    this.code = code;
  }
}

export interface SavedWatchlistSymbolsReader {
  list(userId: string): Promise<readonly string[]>;
}

type SavedSymbolsSupabaseClient = Pick<SupabaseClient, "from">;

function normalizeRows(rows: unknown): string[] {
  if (!Array.isArray(rows)) return [];

  const symbols = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== "object" || !("symbol" in row)) continue;
    if (typeof row.symbol !== "string") continue;
    const symbol = normalizeWatchlistSymbol(row.symbol);
    if (validateWatchlistSymbol(symbol)) continue;
    symbols.add(symbol);
    if (symbols.size === WATCHLIST_LIMIT) break;
  }
  return Array.from(symbols);
}

export function createSavedWatchlistSymbolsReader(
  client: SavedSymbolsSupabaseClient,
): SavedWatchlistSymbolsReader {
  return {
    async list(userId) {
      if (!userId.trim()) {
        throw new SavedWatchlistSymbolsReaderError("invalid_user");
      }

      const { data, error } = await client
        .from(WATCHLIST_TABLE)
        .select("symbol")
        .eq("user_id", userId)
        .order("position", { ascending: true });

      if (error) throw new SavedWatchlistSymbolsReaderError("load_failed");
      return normalizeRows(data);
    },
  };
}
