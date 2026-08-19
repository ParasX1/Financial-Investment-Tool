import { MAX_MARKET_CHART_COMPARISON_SYMBOLS } from "@/lib/market/chartRanges";

export const WATCHLIST_LIMIT = 20;
export const WATCHLIST_NOTE_LIMIT = 280;
export const WATCHLIST_SYMBOL_MAX_LENGTH = 20;
export const WATCHLIST_COMPARISON_LIMIT =
  MAX_MARKET_CHART_COMPARISON_SYMBOLS;
export const WATCHLIST_SUCCESS_FEEDBACK_DURATION_MS = 4_000;

export const WATCHLIST_ITEM_SELECT =
  "user_id,symbol,position,note,target_price,created_at,updated_at";
