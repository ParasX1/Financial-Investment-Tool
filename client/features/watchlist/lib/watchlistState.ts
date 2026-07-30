import {
  WATCHLIST_NOTE_LIMIT,
  WATCHLIST_SYMBOL_MAX_LENGTH,
} from "../constants";
import type {
  WatchlistDraft,
  WatchlistDraftErrors,
  WatchlistItem,
  WatchlistQuote,
  WatchlistSort,
} from "../types";

const WATCHLIST_SYMBOL_PATTERN = /^\^?[A-Z0-9]+(?:[.=_-][A-Z0-9]+)*$/;

type AppendWatchlistResult =
  | { ok: true; items: WatchlistItem[] }
  | { ok: false; reason: "duplicate" | "invalid" | "limit" };

type MoveDirection = "up" | "down";

interface SelectWatchlistItemsInput {
  items: readonly WatchlistItem[];
  quotes: Readonly<Record<string, WatchlistQuote>>;
  search: string;
  sort: WatchlistSort;
}

function reindex(items: readonly WatchlistItem[]): WatchlistItem[] {
  return items.map((item, position) => ({ ...item, position }));
}

function compareNullableNumbers(
  left: number | null | undefined,
  right: number | null | undefined,
  direction: "asc" | "desc",
): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return direction === "asc" ? left - right : right - left;
}

function getSearchText(
  item: WatchlistItem,
  quote: WatchlistQuote | undefined,
): string {
  return [
    item.symbol,
    item.note,
    quote?.longName,
    quote?.shortName,
    quote?.exchange,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLocaleLowerCase();
}

export function normalizeWatchlistSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

export function validateWatchlistSymbol(symbol: string): string | null {
  const normalized = normalizeWatchlistSymbol(symbol);

  if (!normalized) return "Enter a symbol.";
  if (
    normalized.length > WATCHLIST_SYMBOL_MAX_LENGTH ||
    !WATCHLIST_SYMBOL_PATTERN.test(normalized)
  ) {
    return "Enter a valid market symbol.";
  }

  return null;
}

export function appendWatchlistItem(
  items: readonly WatchlistItem[],
  candidate: WatchlistItem,
  limit: number,
): AppendWatchlistResult {
  const symbol = normalizeWatchlistSymbol(candidate.symbol);

  if (validateWatchlistSymbol(symbol)) return { ok: false, reason: "invalid" };
  if (items.some((item) => normalizeWatchlistSymbol(item.symbol) === symbol)) {
    return { ok: false, reason: "duplicate" };
  }
  if (items.length >= limit) return { ok: false, reason: "limit" };

  return {
    ok: true,
    items: reindex([...items, { ...candidate, symbol }]),
  };
}

export function removeWatchlistItem(
  items: readonly WatchlistItem[],
  symbol: string,
): WatchlistItem[] {
  const normalized = normalizeWatchlistSymbol(symbol);
  return reindex(
    items.filter(
      (item) => normalizeWatchlistSymbol(item.symbol) !== normalized,
    ),
  );
}

export function moveWatchlistItem(
  items: readonly WatchlistItem[],
  symbol: string,
  direction: MoveDirection,
): WatchlistItem[] {
  const normalized = normalizeWatchlistSymbol(symbol);
  const currentIndex = items.findIndex(
    (item) => normalizeWatchlistSymbol(item.symbol) === normalized,
  );
  const nextIndex = currentIndex + (direction === "up" ? -1 : 1);

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= items.length) {
    return reindex(items);
  }

  const moved = items.map((item) => ({ ...item }));
  [moved[currentIndex], moved[nextIndex]] = [
    moved[nextIndex]!,
    moved[currentIndex]!,
  ];
  return reindex(moved);
}

export function selectWatchlistItems({
  items,
  quotes,
  search,
  sort,
}: SelectWatchlistItemsInput): WatchlistItem[] {
  const query = search.trim().toLocaleLowerCase();
  const selected = items
    .filter((item) => {
      if (!query) return true;
      const quote = quotes[normalizeWatchlistSymbol(item.symbol)];
      return getSearchText(item, quote).includes(query);
    })
    .map((item) => ({ ...item }));

  return selected.sort((left, right) => {
    const leftQuote = quotes[normalizeWatchlistSymbol(left.symbol)];
    const rightQuote = quotes[normalizeWatchlistSymbol(right.symbol)];
    let comparison = 0;

    switch (sort) {
      case "symbol-asc":
        comparison = left.symbol.localeCompare(right.symbol);
        break;
      case "name-asc":
        comparison = (leftQuote?.longName ?? leftQuote?.shortName ?? left.symbol)
          .localeCompare(
            rightQuote?.longName ?? rightQuote?.shortName ?? right.symbol,
          );
        break;
      case "change-desc":
        comparison = compareNullableNumbers(
          leftQuote?.changePercent,
          rightQuote?.changePercent,
          "desc",
        );
        break;
      case "change-asc":
        comparison = compareNullableNumbers(
          leftQuote?.changePercent,
          rightQuote?.changePercent,
          "asc",
        );
        break;
      case "added-desc":
        comparison = right.createdAt.localeCompare(left.createdAt);
        break;
      case "custom":
        comparison = left.position - right.position;
        break;
    }

    return comparison || left.position - right.position;
  });
}

export function validateWatchlistDraft(
  draft: WatchlistDraft,
): WatchlistDraftErrors {
  const errors: WatchlistDraftErrors = {};
  const note = draft.note.trim();
  const target = draft.targetPrice.trim();

  if (note.length > WATCHLIST_NOTE_LIMIT) {
    errors.note = `Keep your reason to ${WATCHLIST_NOTE_LIMIT} characters or fewer.`;
  }

  if (target) {
    const value = Number(target);
    if (!Number.isFinite(value) || value <= 0) {
      errors.targetPrice = "Enter a target greater than 0, or leave it blank.";
    }
  }

  return errors;
}
