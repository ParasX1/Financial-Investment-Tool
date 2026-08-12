import type { SupabaseClient } from "@supabase/supabase-js";

import {
  WATCHLIST_ITEM_SELECT,
  WATCHLIST_LIMIT,
  WATCHLIST_NOTE_LIMIT,
} from "../constants";
import type {
  AddWatchlistItemInput,
  UpdateWatchlistItemInput,
  WatchlistItem,
  WatchlistRepository,
} from "../types";
import {
  normalizeWatchlistSymbol,
  validateWatchlistSymbol,
} from "../lib/watchlistState";

const WATCHLIST_TABLE = "user_watchlist";

const ERROR_MESSAGES = {
  add_failed: "We couldn't add this stock. Please try again.",
  invalid_input: "Choose a valid watchlist item and try again.",
  load_failed: "We couldn't load your watchlist. Please try again.",
  order_failed: "We couldn't save your watchlist order. Please try again.",
  remove_failed: "We couldn't remove this stock. Please try again.",
  update_failed: "We couldn't save your changes. Please try again.",
} as const;

export type WatchlistRepositoryErrorCode = keyof typeof ERROR_MESSAGES;

export class WatchlistRepositoryError extends Error {
  readonly code: WatchlistRepositoryErrorCode;

  constructor(code: WatchlistRepositoryErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "WatchlistRepositoryError";
    this.code = code;
  }
}

interface WatchlistRow {
  created_at: string;
  note: string | null;
  position: number;
  symbol: string;
  target_price: number | null;
  updated_at: string;
  user_id: string;
}

type WatchlistSupabaseClient = Pick<SupabaseClient, "from" | "rpc">;

function repositoryError(code: WatchlistRepositoryErrorCode): never {
  throw new WatchlistRepositoryError(code);
}

function requireUserId(userId: string): void {
  if (!userId.trim()) repositoryError("invalid_input");
}

function requireSymbol(symbol: string): string {
  const normalized = normalizeWatchlistSymbol(symbol);
  if (validateWatchlistSymbol(normalized)) repositoryError("invalid_input");
  return normalized;
}

function normalizeNote(note: string | null | undefined): string | null {
  const trimmed = note?.trim();
  if (trimmed && trimmed.length > WATCHLIST_NOTE_LIMIT) {
    repositoryError("invalid_input");
  }
  return trimmed ? trimmed : null;
}

function requirePosition(position: number): number {
  if (!Number.isInteger(position) || position < 0 || position >= WATCHLIST_LIMIT) {
    repositoryError("invalid_input");
  }
  return position;
}

function normalizeTargetPrice(
  targetPrice: number | null | undefined,
): number | null {
  if (targetPrice == null) return null;
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
    repositoryError("invalid_input");
  }
  return targetPrice;
}

function mapRow(row: WatchlistRow): WatchlistItem {
  return {
    createdAt: row.created_at,
    note: row.note,
    position: row.position,
    symbol: normalizeWatchlistSymbol(row.symbol),
    targetPrice: row.target_price,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

function createUpdatePayload(input: UpdateWatchlistItemInput) {
  const payload: {
    note?: string | null;
    position?: number;
    target_price?: number | null;
  } = {};

  if (Object.hasOwn(input, "note")) payload.note = normalizeNote(input.note);
  if (Object.hasOwn(input, "position")) {
    payload.position = requirePosition(input.position as number);
  }
  if (Object.hasOwn(input, "targetPrice")) {
    payload.target_price = normalizeTargetPrice(input.targetPrice);
  }

  if (!Object.keys(payload).length) repositoryError("invalid_input");

  return payload;
}

export function createWatchlistRepository(
  client: WatchlistSupabaseClient,
): WatchlistRepository {
  return {
    async list(userId) {
      requireUserId(userId);
      const { data, error } = await client
        .from(WATCHLIST_TABLE)
        .select(WATCHLIST_ITEM_SELECT)
        .eq("user_id", userId)
        .order("position", { ascending: true });

      if (error) repositoryError("load_failed");
      return ((data ?? []) as WatchlistRow[]).map(mapRow);
    },

    async add(input: AddWatchlistItemInput) {
      requireUserId(input.userId);
      const symbol = requireSymbol(input.symbol);
      const payload = {
        note: normalizeNote(input.note),
        position: requirePosition(input.position),
        symbol,
        target_price: normalizeTargetPrice(input.targetPrice),
        user_id: input.userId,
      };
      const { data, error } = await client
        .from(WATCHLIST_TABLE)
        .insert(payload)
        .select(WATCHLIST_ITEM_SELECT)
        .single();

      if (error || !data) repositoryError("add_failed");
      return mapRow(data as WatchlistRow);
    },

    async update(userId, symbol, input) {
      requireUserId(userId);
      const normalized = requireSymbol(symbol);
      const payload = createUpdatePayload(input);
      const { data, error } = await client
        .from(WATCHLIST_TABLE)
        .update(payload)
        .eq("user_id", userId)
        .eq("symbol", normalized)
        .select(WATCHLIST_ITEM_SELECT)
        .single();

      if (error || !data) repositoryError("update_failed");
      return mapRow(data as WatchlistRow);
    },

    async remove(userId, symbol) {
      requireUserId(userId);
      const normalized = requireSymbol(symbol);
      const { error } = await client.rpc("remove_watchlist_item", {
        item_symbol: normalized,
      });

      if (error) repositoryError("remove_failed");
    },

    async saveOrder(userId, orderedSymbols) {
      requireUserId(userId);
      const symbols = orderedSymbols.map(requireSymbol);
      const { error } = await client.rpc("reorder_watchlist", {
        ordered_symbols: symbols,
      });

      if (error) repositoryError("order_failed");
    },
  };
}
