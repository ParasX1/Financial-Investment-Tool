import { describe, expect, it } from "@jest/globals";
import {
  appendWatchlistItem,
  moveWatchlistItem,
  normalizeWatchlistSymbol,
  removeWatchlistItem,
  selectWatchlistItems,
  validateWatchlistDraft,
  validateWatchlistSymbol,
} from "./watchlistState";
import type { WatchlistItem, WatchlistQuote } from "../types";

function item(symbol: string, position: number): WatchlistItem {
  return {
    createdAt: "2026-07-15T00:00:00.000Z",
    note: symbol === "CBA.AX" ? "Compare margin trend" : null,
    position,
    symbol,
    targetPrice: null,
    updatedAt: "2026-07-15T00:00:00.000Z",
    userId: "user-1",
  };
}

function quote(symbol: string, changePercent: number): WatchlistQuote {
  return {
    change: null,
    changePercent,
    currency: "AUD",
    exchange: "ASX",
    longName: symbol === "CBA.AX" ? "Commonwealth Bank of Australia" : null,
    marketState: "CLOSED",
    previousClose: null,
    price: null,
    quoteTime: null,
    shortName: null,
    symbol,
  };
}

describe("watchlist state rules", () => {
  it("normalizes supported Yahoo-style symbols and rejects unsafe values", () => {
    expect(normalizeWatchlistSymbol("  cba.ax ")).toBe("CBA.AX");
    expect(normalizeWatchlistSymbol(" btc-aud ")).toBe("BTC-AUD");
    expect(validateWatchlistSymbol("^AXJO")).toBeNull();
    expect(validateWatchlistSymbol("AUDUSD=X")).toBeNull();
    expect(validateWatchlistSymbol("A".repeat(20))).toBeNull();
    expect(validateWatchlistSymbol("A".repeat(21))).toMatch(
      /valid market symbol/i,
    );
    expect(validateWatchlistSymbol("CBA.AX<script>")).toMatch(/valid market symbol/i);
    expect(validateWatchlistSymbol("")).toMatch(/enter a symbol/i);
  });

  it("adds immutably, prevents duplicates, and enforces the configured limit", () => {
    const original = [item("CBA.AX", 0)];
    const added = appendWatchlistItem(original, item("BHP.AX", 99), 2);

    expect(added).toEqual({
      ok: true,
      items: [item("CBA.AX", 0), item("BHP.AX", 1)],
    });
    expect(original).toEqual([item("CBA.AX", 0)]);
    expect(appendWatchlistItem(original, item("cba.ax", 1), 2)).toEqual({
      ok: false,
      reason: "duplicate",
    });
    expect(
      appendWatchlistItem(
        [item("CBA.AX", 0), item("BHP.AX", 1)],
        item("WES.AX", 2),
        2,
      ),
    ).toEqual({ ok: false, reason: "limit" });
    expect(appendWatchlistItem([], item("bad symbol!", 0), 2)).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("removes and moves items without mutating input or leaving position gaps", () => {
    const original = [
      item("CBA.AX", 0),
      item("BHP.AX", 1),
      item("WES.AX", 2),
    ];

    expect(removeWatchlistItem(original, "BHP.AX").map((x) => [x.symbol, x.position])).toEqual([
      ["CBA.AX", 0],
      ["WES.AX", 1],
    ]);
    expect(moveWatchlistItem(original, "WES.AX", "up").map((x) => x.symbol)).toEqual([
      "CBA.AX",
      "WES.AX",
      "BHP.AX",
    ]);
    expect(moveWatchlistItem(original, "CBA.AX", "up")).toEqual(original);
    expect(moveWatchlistItem(original, "CBA.AX", "down").map((x) => x.symbol)).toEqual([
      "BHP.AX",
      "CBA.AX",
      "WES.AX",
    ]);
    expect(moveWatchlistItem(original, "WES.AX", "down")).toEqual(original);
    expect(moveWatchlistItem(original, "MISSING", "down")).toEqual(original);
    expect(original.map((x) => x.symbol)).toEqual(["CBA.AX", "BHP.AX", "WES.AX"]);
  });

  it("filters beginner research context and sorts without changing saved order", () => {
    const original = [item("CBA.AX", 0), item("BHP.AX", 1)];
    const quotes = {
      "BHP.AX": quote("BHP.AX", 4.2),
      "CBA.AX": quote("CBA.AX", -1.1),
    };

    expect(
      selectWatchlistItems({ items: original, quotes, search: "margin", sort: "custom" }).map(
        (x) => x.symbol,
      ),
    ).toEqual(["CBA.AX"]);
    expect(
      selectWatchlistItems({ items: original, quotes, search: "", sort: "change-desc" }).map(
        (x) => x.symbol,
      ),
    ).toEqual(["BHP.AX", "CBA.AX"]);
    expect(original.map((x) => x.symbol)).toEqual(["CBA.AX", "BHP.AX"]);
  });

  it("supports every list sort and keeps missing quote values stable", () => {
    const cba = { ...item("CBA.AX", 0), createdAt: "2026-07-13T00:00:00.000Z" };
    const bhp = { ...item("BHP.AX", 1), createdAt: "2026-07-15T00:00:00.000Z" };
    const wes = { ...item("WES.AX", 2), createdAt: "2026-07-14T00:00:00.000Z" };
    const items = [cba, bhp, wes];
    const quotes = {
      "BHP.AX": { ...quote("BHP.AX", 2), shortName: "BHP Group" },
      "CBA.AX": quote("CBA.AX", -1),
    };
    const symbols = (sort: Parameters<typeof selectWatchlistItems>[0]["sort"]) =>
      selectWatchlistItems({ items, quotes, search: "", sort }).map((x) => x.symbol);

    expect(symbols("symbol-asc")).toEqual(["BHP.AX", "CBA.AX", "WES.AX"]);
    expect(symbols("name-asc")).toEqual(["BHP.AX", "CBA.AX", "WES.AX"]);
    expect(symbols("change-asc")).toEqual(["CBA.AX", "BHP.AX", "WES.AX"]);
    expect(symbols("change-desc")).toEqual(["BHP.AX", "CBA.AX", "WES.AX"]);
    expect(symbols("added-desc")).toEqual(["BHP.AX", "WES.AX", "CBA.AX"]);
    expect(symbols("custom")).toEqual(["CBA.AX", "BHP.AX", "WES.AX"]);
    expect(
      selectWatchlistItems({ items, quotes, search: "bhp group", sort: "custom" })
        .map((x) => x.symbol),
    ).toEqual(["BHP.AX"]);
    expect(
      selectWatchlistItems({
        items: [wes, { ...wes, position: 3, symbol: "TLS.AX" }],
        quotes: {},
        search: "",
        sort: "change-asc",
      }).map((x) => x.symbol),
    ).toEqual(["WES.AX", "TLS.AX"]);
  });

  it("validates the optional note and research target", () => {
    expect(validateWatchlistDraft({ note: "a".repeat(281), targetPrice: "" })).toEqual({
      note: "Keep your reason to 280 characters or fewer.",
    });
    expect(validateWatchlistDraft({ note: "Observe earnings", targetPrice: "0" })).toEqual({
      targetPrice: "Enter a target greater than 0, or leave it blank.",
    });
    expect(validateWatchlistDraft({ note: "Observe earnings", targetPrice: "123.45" })).toEqual({});
    expect(validateWatchlistDraft({ note: "Observe earnings", targetPrice: "not-a-number" })).toEqual({
      targetPrice: "Enter a target greater than 0, or leave it blank.",
    });
  });
});
