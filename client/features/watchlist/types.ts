export type WatchlistSort =
  | "custom"
  | "symbol-asc"
  | "name-asc"
  | "change-desc"
  | "change-asc"
  | "added-desc";

export interface WatchlistItem {
  createdAt: string;
  note: string | null;
  position: number;
  symbol: string;
  targetPrice: number | null;
  updatedAt: string;
  userId: string;
}

export interface WatchlistQuote {
  change: number | null;
  changePercent: number | null;
  currency: string | null;
  exchange: string | null;
  longName: string | null;
  marketState: string | null;
  previousClose: number | null;
  price: number | null;
  quoteTime: string | null;
  shortName: string | null;
  symbol: string;
}

export interface WatchlistDraft {
  note: string;
  targetPrice: string;
}

export type WatchlistDraftErrors = Partial<
  Record<keyof WatchlistDraft, string>
>;

export interface AddWatchlistItemInput {
  note?: string | null;
  position: number;
  symbol: string;
  targetPrice?: number | null;
  userId: string;
}

export interface UpdateWatchlistItemInput {
  note?: string | null;
  position?: number;
  targetPrice?: number | null;
}

export interface WatchlistRepository {
  add(input: AddWatchlistItemInput): Promise<WatchlistItem>;
  list(userId: string): Promise<WatchlistItem[]>;
  remove(userId: string, symbol: string): Promise<void>;
  saveOrder(userId: string, orderedSymbols: readonly string[]): Promise<void>;
  update(
    userId: string,
    symbol: string,
    input: UpdateWatchlistItemInput,
  ): Promise<WatchlistItem>;
}
