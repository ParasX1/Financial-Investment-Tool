import type { PortfolioWorkspaceState } from "../types";
import {
  createCard,
  createDefaultWorkspace,
  createObserverLayout,
  normaliseSymbols,
} from "./workspaceDefaults";
import {
  formatPortfolioDate,
  hasPendingWorkspaceDraft,
  isBoardVisibleCardIndex,
  mergePortfolioSymbolOptions,
  selectActiveFocusId,
  selectBoardVisibleCards,
  selectFocusedCard,
} from "./workspaceSelectors";

const TODAY = "2026-07-28";

describe("workspace pure helpers", () => {
  it("normalises, validates, deduplicates, and limits portfolio symbols", () => {
    expect(normaliseSymbols("AAPL")).toEqual([]);
    expect(
      normaliseSymbols([
        " aapl ",
        "AAPL",
        "brk-b",
        "invalid symbol",
        "MSFT",
        "NVDA",
        "GOOG",
        "META",
      ]),
    ).toEqual(["AAPL", "BRK-B", "MSFT", "NVDA", "GOOG"]);
  });

  it("uses bounded viewport geometry and reuses the last slot for overflow cards", () => {
    const cards = Array.from({ length: 7 }, (_, index) =>
      createCard("VolatilityAnalysis", index),
    );

    const layout = createObserverLayout(cards, 100, 100);

    expect(layout[cards[0].id]).toMatchObject({
      x: 16,
      y: 16,
      width: 575,
      height: 415,
    });
    expect(layout[cards[2].id].visible).toBe(false);
    expect(layout[cards[6].id]).toMatchObject({
      x: layout[cards[5].id].x,
      y: layout[cards[5].id].y,
      width: layout[cards[5].id].width,
      height: layout[cards[5].id].height,
      z: 16,
    });
  });

  it("selects the first card outside focus mode and recovers stale focus ids", () => {
    const workspace = createDefaultWorkspace(TODAY);
    const staleFocus: PortfolioWorkspaceState = {
      ...workspace,
      view: { mode: "focus", cardId: "missing-card" },
    };

    expect(selectActiveFocusId(workspace)).toBe(workspace.cards[0].id);
    expect(selectActiveFocusId(staleFocus)).toBe("missing-card");
    expect(selectFocusedCard(staleFocus)).toBe(workspace.cards[0]);
  });

  it("selects the same five-card deck used by Board-linked views", () => {
    const workspace = createDefaultWorkspace(TODAY);

    expect(workspace.cards.map((card) => card.id)).toHaveLength(6);
    expect(isBoardVisibleCardIndex(2)).toBe(false);
    expect(
      selectBoardVisibleCards(workspace.cards).map((card) => card.id),
    ).toEqual([
      workspace.cards[0].id,
      workspace.cards[1].id,
      workspace.cards[3].id,
      workspace.cards[4].id,
      workspace.cards[5].id,
    ]);
  });

  it("returns undefined selectors for an empty workspace", () => {
    const workspace: PortfolioWorkspaceState = {
      ...createDefaultWorkspace(TODAY),
      cards: [],
      observerLayout: {},
    };

    expect(selectActiveFocusId(workspace)).toBeUndefined();
    expect(selectFocusedCard(workspace)).toBeUndefined();
  });

  it("detects symbol and input drafts independently", () => {
    const workspace = createDefaultWorkspace(TODAY, ["AAPL", "MSFT"]);

    expect(
      hasPendingWorkspaceDraft(
        workspace,
        workspace.symbols,
        workspace.globalInputs,
      ),
    ).toBe(false);
    expect(
      hasPendingWorkspaceDraft(
        workspace,
        [...workspace.symbols].reverse(),
        workspace.globalInputs,
      ),
    ).toBe(true);
    expect(
      hasPendingWorkspaceDraft(workspace, workspace.symbols, {
        ...workspace.globalInputs,
        benchmark: "QQQ",
      }),
    ).toBe(true);
  });

  it("merges symbol options without changing first-occurrence order", () => {
    expect(
      mergePortfolioSymbolOptions(["MSFT", "AAPL"], ["AAPL", "NVDA"]),
    ).toEqual(["MSFT", "AAPL", "NVDA"]);
  });

  it("formats valid local dates and preserves invalid input", () => {
    expect(formatPortfolioDate("2026-07-28")).toBe("28 July 2026");
    expect(formatPortfolioDate("not-a-date")).toBe("not-a-date");
  });
});
