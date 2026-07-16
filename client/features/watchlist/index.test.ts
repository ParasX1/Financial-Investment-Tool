import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as watchlist from "./index";

describe("watchlist feature public API", () => {
  it("exports the route entry, focused repository, constants, and immutable state helpers", () => {
    expect(watchlist.WatchlistMain).toEqual(expect.any(Function));
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

  it("keeps the Next route behind the feature public API", () => {
    const routeSource = readFileSync(
      join(__dirname, "..", "..", "pages", "Watchlist.tsx"),
      "utf8",
    );

    expect(routeSource).toMatch(/from\s+["']@\/features\/watchlist["']/);
    expect(routeSource).not.toMatch(/from\s+["']@\/features\/watchlist\//);
  });
});
