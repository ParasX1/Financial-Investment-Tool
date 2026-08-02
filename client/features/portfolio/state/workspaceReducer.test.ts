import { describe, expect, it, jest } from "@jest/globals";
import type { PortfolioWorkspaceAction } from "./workspaceReducer";
import { createDefaultWorkspace, MAX_CARDS } from "./workspaceDefaults";
import { portfolioWorkspaceReducer } from "./workspaceReducer";

const TODAY = "2026-07-31";

describe("portfolioWorkspaceReducer", () => {
  it("normalises symbol input without mutating the current workspace", () => {
    const original = createDefaultWorkspace(TODAY, ["MSFT"]);

    const updated = portfolioWorkspaceReducer(original, {
      type: "setSymbols",
      symbols: [" aapl ", "AAPL", "bad symbol", "cba.ax"],
    });

    expect(updated).not.toBe(original);
    expect(updated.symbols).toEqual(["AAPL", "CBA.AX"]);
    expect(original.symbols).toEqual(["MSFT"]);
  });

  it("immutably updates global, view, metric, override, and reset actions", () => {
    const original = createDefaultWorkspace(TODAY);
    const cardId = original.cards[1].id;

    const withGlobals = portfolioWorkspaceReducer(original, {
      type: "updateGlobalInputs",
      patch: { benchmark: "QQQ", riskFreeRate: 0.02 },
    });
    const withView = portfolioWorkspaceReducer(withGlobals, {
      type: "setView",
      view: { mode: "focus", cardId },
    });
    const withMetric = portfolioWorkspaceReducer(withView, {
      type: "setCardMetric",
      cardId,
      metricType: "BetaAnalysis",
    });
    const withOverride = portfolioWorkspaceReducer(withMetric, {
      type: "overrideCardInputs",
      cardId,
      patch: { benchmark: "DIA" },
    });
    const reset = portfolioWorkspaceReducer(withOverride, {
      type: "resetCardInputs",
      cardId,
    });

    expect(withGlobals.globalInputs).toMatchObject({
      benchmark: "QQQ",
      riskFreeRate: 0.02,
    });
    expect(withView.view).toEqual({ mode: "focus", cardId });
    expect(withMetric.cards[1].metricType).toBe("BetaAnalysis");
    expect(withOverride.cards[1].overrides).toEqual({ benchmark: "DIA" });
    expect(reset.cards[1].overrides).toEqual({});
    expect(reset.cards[0]).toBe(original.cards[0]);
    expect(original.globalInputs.benchmark).toBe("SPY");
    expect(original.cards[1].metricType).toBe("MaxDrawdownAnalysis");
    expect(original.cards[1].overrides).toEqual({});
  });

  it("syncs card date overrides back to linked history without clearing other overrides", () => {
    const original = createDefaultWorkspace(TODAY);
    const cardWithDates = {
      ...original.cards[0],
      overrides: {
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        benchmark: "QQQ",
        riskFreeRate: 0.03,
      },
    };
    const cardWithoutDates = {
      ...original.cards[1],
      overrides: { confidenceLevel: 0.01 },
    };
    const workspace = {
      ...original,
      cards: [cardWithDates, cardWithoutDates, ...original.cards.slice(2)],
    };

    const synced = portfolioWorkspaceReducer(workspace, {
      type: "syncCardDateOverridesToGlobal",
    });

    expect(synced.cards[0].overrides).toEqual({
      benchmark: "QQQ",
      riskFreeRate: 0.03,
    });
    expect(synced.cards[1]).toBe(cardWithoutDates);
    expect(workspace.cards[0].overrides).toEqual(cardWithDates.overrides);
  });

  it("promotes only an existing non-leading card", () => {
    const original = createDefaultWorkspace(TODAY);

    expect(
      portfolioWorkspaceReducer(original, {
        type: "promoteCard",
        cardId: original.cards[0].id,
      }),
    ).toBe(original);
    expect(
      portfolioWorkspaceReducer(original, {
        type: "promoteCard",
        cardId: "missing-card",
      }),
    ).toBe(original);

    const promoted = portfolioWorkspaceReducer(original, {
      type: "promoteCard",
      cardId: original.cards[3].id,
    });
    expect(promoted.cards.map((card) => card.id)).toEqual([
      original.cards[3].id,
      original.cards[0].id,
      original.cards[1].id,
      original.cards[2].id,
      original.cards[4].id,
      original.cards[5].id,
    ]);
    expect(original.cards[0].id).toBe("portfolio-card-1");
  });

  it("duplicates a card with independent nested state and regenerated layout", () => {
    const base = createDefaultWorkspace(TODAY).cards.slice(0, 2);
    const original = {
      ...createDefaultWorkspace(TODAY),
      cards: [
        {
          ...base[0],
          overrides: { benchmark: "QQQ" },
          hiddenSymbols: ["MSFT"],
        },
        base[1],
      ],
    };
    jest.spyOn(Date, "now").mockReturnValue(1_234);

    const duplicated = portfolioWorkspaceReducer(original, {
      type: "duplicateCard",
      cardId: original.cards[0].id,
    });
    const copy = duplicated.cards[2];

    expect(copy).toEqual({
      ...original.cards[0],
      id: "portfolio-card-1234-2",
    });
    expect(copy.overrides).not.toBe(original.cards[0].overrides);
    expect(copy.hiddenSymbols).not.toBe(original.cards[0].hiddenSymbols);
    expect(duplicated.observerLayout[copy.id]).toMatchObject({
      cardId: copy.id,
      visible: true,
    });
    expect(original.cards).toHaveLength(2);
  });

  it("guards duplicate requests for missing cards and a full board", () => {
    const full = createDefaultWorkspace(TODAY);
    expect(full.cards).toHaveLength(MAX_CARDS);

    expect(
      portfolioWorkspaceReducer(full, {
        type: "duplicateCard",
        cardId: full.cards[0].id,
      }),
    ).toBe(full);

    const smaller = { ...full, cards: full.cards.slice(0, 2) };
    expect(
      portfolioWorkspaceReducer(smaller, {
        type: "duplicateCard",
        cardId: "missing-card",
      }),
    ).toBe(smaller);
  });

  it("deletes existing cards, prunes layout, and exits a deleted focus", () => {
    const original = createDefaultWorkspace(TODAY);
    const deletedId = original.cards[2].id;
    const focused = {
      ...original,
      view: { mode: "focus", cardId: deletedId } as const,
    };

    const updated = portfolioWorkspaceReducer(focused, {
      type: "deleteCard",
      cardId: deletedId,
    });

    expect(updated.cards.map((card) => card.id)).not.toContain(deletedId);
    expect(updated.observerLayout).not.toHaveProperty(deletedId);
    expect(updated.view).toEqual({ mode: "board" });
    expect(focused.cards).toHaveLength(MAX_CARDS);
  });

  it("keeps focus when another card is deleted and guards invalid deletion", () => {
    const original = createDefaultWorkspace(TODAY);
    const focusId = original.cards[0].id;
    const focused = {
      ...original,
      view: { mode: "focus", cardId: focusId } as const,
    };

    const updated = portfolioWorkspaceReducer(focused, {
      type: "deleteCard",
      cardId: original.cards[1].id,
    });
    expect(updated.view).toEqual(focused.view);

    expect(
      portfolioWorkspaceReducer(focused, {
        type: "deleteCard",
        cardId: "missing-card",
      }),
    ).toBe(focused);

    const singleCard = {
      ...original,
      cards: original.cards.slice(0, 1),
    };
    expect(
      portfolioWorkspaceReducer(singleCard, {
        type: "deleteCard",
        cardId: singleCard.cards[0].id,
      }),
    ).toBe(singleCard);
  });

  it("immutably changes known observer windows and ignores missing ones", () => {
    const original = createDefaultWorkspace(TODAY);
    const cardId = original.cards[0].id;

    const hidden = portfolioWorkspaceReducer(original, {
      type: "setObserverWindowVisibility",
      cardId,
      visible: false,
    });
    const moved = portfolioWorkspaceReducer(hidden, {
      type: "updateObserverWindow",
      cardId,
      patch: { cardId: "wrong-card", x: 92, y: 37, z: 99 },
    });

    expect(moved.observerLayout[cardId]).toMatchObject({
      cardId,
      visible: false,
      x: 92,
      y: 37,
      z: 99,
    });
    expect(original.observerLayout[cardId].visible).toBe(true);
    expect(
      portfolioWorkspaceReducer(original, {
        type: "setObserverWindowVisibility",
        cardId: "missing-card",
        visible: false,
      }),
    ).toBe(original);
    expect(
      portfolioWorkspaceReducer(original, {
        type: "updateObserverWindow",
        cardId: "missing-card",
        patch: { x: 100 },
      }),
    ).toBe(original);
  });

  it("arranges every card while preserving hidden state and defaulting missing visibility", () => {
    const original = createDefaultWorkspace(TODAY);
    const hiddenId = original.cards[0].id;
    const missingId = original.cards[1].id;
    const observerLayout = { ...original.observerLayout };
    observerLayout[hiddenId] = { ...observerLayout[hiddenId], visible: false };
    delete observerLayout[missingId];

    const arranged = portfolioWorkspaceReducer(
      { ...original, observerLayout },
      { type: "arrangeObserver", width: 1024, height: 700 },
    );

    expect(arranged.observerLayout[hiddenId].visible).toBe(false);
    expect(arranged.observerLayout[missingId].visible).toBe(true);
    expect(Object.keys(arranged.observerLayout)).toHaveLength(MAX_CARDS);
  });

  it("returns the current state for an unknown action", () => {
    const original = createDefaultWorkspace(TODAY);
    const unknownAction = {
      type: "futureAction",
    } as unknown as PortfolioWorkspaceAction;

    expect(portfolioWorkspaceReducer(original, unknownAction)).toBe(original);
  });
});
