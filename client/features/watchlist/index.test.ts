import { describe, expect, it } from "@jest/globals";
import * as watchlist from "./index";

describe("watchlist feature public API", () => {
  it("exports the focused repository, constants, and immutable state helpers", () => {
    expect(watchlist.WATCHLIST_LIMIT).toBe(20);
    expect(watchlist.WATCHLIST_NOTE_LIMIT).toBeGreaterThan(0);
    expect(watchlist.WATCHLIST_ITEM_SELECT).toContain("symbol");
    expect(watchlist.createWatchlistRepository).toEqual(expect.any(Function));
    expect(watchlist.WatchlistRepositoryError).toEqual(expect.any(Function));
    expect(watchlist.appendWatchlistItem).toEqual(expect.any(Function));
    expect(watchlist.moveWatchlistItem).toEqual(expect.any(Function));
    expect(watchlist.normalizeWatchlistSymbol).toEqual(expect.any(Function));
    expect(watchlist.removeWatchlistItem).toEqual(expect.any(Function));
    expect(watchlist.selectWatchlistItems).toEqual(expect.any(Function));
    expect(watchlist.validateWatchlistDraft).toEqual(expect.any(Function));
    expect(watchlist.validateWatchlistSymbol).toEqual(expect.any(Function));
  });
});
