import {
  createDefaultWorkspace,
  createObserverLayout,
  getEffectiveCardSettings,
  migrateWorkspaceState,
  portfolioWorkspaceReducer,
} from ".";

const TODAY = "2026-07-28";

describe("Portfolio workspace model", () => {
  it("starts with a purposeful six-card trader board", () => {
    const workspace = createDefaultWorkspace(TODAY);

    expect(workspace.version).toBe(3);
    expect(workspace.view).toEqual({ mode: "board" });
    expect(workspace.cards.map((card) => card.metricType)).toEqual([
      "CumulativeReturnComparison",
      "MaxDrawdownAnalysis",
      "VolatilityAnalysis",
      "SharpeRatioMatrix",
      "MarketCorrelationAnalysis",
      "EfficientFrontierVisualization",
    ]);
    expect(new Set(workspace.cards.map((card) => card.id)).size).toBe(6);
  });

  it("keeps card-local assumptions independent while linked cards follow globals", () => {
    const original = createDefaultWorkspace(TODAY);
    const overridden = portfolioWorkspaceReducer(original, {
      type: "overrideCardInputs",
      cardId: original.cards[0].id,
      patch: { startDate: "2023-07-28" },
    });
    const updated = portfolioWorkspaceReducer(overridden, {
      type: "updateGlobalInputs",
      patch: { startDate: "2026-01-01", benchmark: "QQQ" },
    });

    expect(
      getEffectiveCardSettings(updated.cards[0], updated.globalInputs),
    ).toMatchObject({ startDate: "2023-07-28", benchmark: "QQQ" });
    expect(
      getEffectiveCardSettings(updated.cards[1], updated.globalInputs),
    ).toMatchObject({ startDate: "2026-01-01", benchmark: "QQQ" });
    expect(original.globalInputs.startDate).not.toBe(
      updated.globalInputs.startDate,
    );
    expect(updated.cards[0].overrides).toEqual({
      startDate: "2023-07-28",
    });
  });

  it("keeps the deck intact across Focus and Observation", () => {
    const original = createDefaultWorkspace(TODAY);
    const cardId = original.cards[2].id;
    const focused = portfolioWorkspaceReducer(original, {
      type: "setView",
      view: { mode: "focus", cardId },
    });
    const observing = portfolioWorkspaceReducer(focused, {
      type: "setView",
      view: { mode: "observation" },
    });
    const hidden = portfolioWorkspaceReducer(observing, {
      type: "setObserverWindowVisibility",
      cardId,
      visible: false,
    });
    const returned = portfolioWorkspaceReducer(hidden, {
      type: "setView",
      view: { mode: "board" },
    });

    expect(returned.cards).toEqual(original.cards);
    expect(returned.observerLayout[cardId].visible).toBe(false);
    expect(returned.view).toEqual({ mode: "board" });
  });

  it("promotes geometry without mutating either card configuration", () => {
    const original = createDefaultWorkspace(TODAY);
    const promotedId = original.cards[4].id;
    const promoted = portfolioWorkspaceReducer(original, {
      type: "promoteCard",
      cardId: promotedId,
    });

    expect(promoted.cards[0].id).toBe(promotedId);
    expect(promoted.cards.find((card) => card.id === promotedId)).toEqual(
      original.cards[4],
    );
    expect(original.cards[0].metricType).toBe("CumulativeReturnComparison");
  });

  it("creates Board-aligned Observation geometry for the same stable card IDs", () => {
    const workspace = createDefaultWorkspace(TODAY);
    const layout = createObserverLayout(workspace.cards, 1440, 844);

    expect(Object.keys(layout)).toEqual(
      expect.arrayContaining(workspace.cards.map((card) => card.id)),
    );
    expect(layout[workspace.cards[0].id]).toMatchObject({
      x: 16,
      y: 16,
      visible: true,
    });
    expect(layout[workspace.cards[1].id]).toMatchObject({
      x: layout[workspace.cards[5].id].x,
      y: 16,
      height: layout[workspace.cards[0].id].height,
      visible: true,
    });
    expect(layout[workspace.cards[2].id].visible).toBe(false);
    Object.values(layout).forEach((windowState) => {
      expect(windowState.width).toBeGreaterThanOrEqual(300);
      expect(windowState.height).toBeGreaterThanOrEqual(220);
    });
  });

  it("migrates the current v2 focused state without losing its selected metric", () => {
    const migrated = migrateWorkspaceState(
      {
        symbols: ["aapl", "MSFT"],
        settings: {
          metricType: "ValueAtRiskAnalysis",
          startDate: "2025-01-01",
          endDate: "2026-01-01",
          benchmark: "QQQ",
          riskFreeRate: 0,
          confidenceLevel: 0.01,
        },
      },
      TODAY,
    );

    expect(migrated.symbols).toEqual(["AAPL", "MSFT"]);
    expect(migrated.cards[0].metricType).toBe("ValueAtRiskAnalysis");
    expect(migrated.globalInputs).toMatchObject({
      benchmark: "QQQ",
      riskFreeRate: 0,
      confidenceLevel: 0.01,
    });
  });

  it("migrates the legacy six-card dashboard and keeps active card metrics", () => {
    const migrated = migrateWorkspaceState(
      {
        selectedStocks: ["AAPL", "NVDA"],
        globalStart: "2024-01-01",
        globalEnd: "2026-01-01",
        activeCards: [true, false, true, false, false, false],
        cardSettings: [
          { metricType: "BetaAnalysis", marketTicker: "QQQ" },
          { metricType: "AlphaComparison" },
          { metricType: "SortinoRatioVisualization", riskRate: 0 },
        ],
      },
      TODAY,
    );

    expect(migrated.symbols).toEqual(["AAPL", "NVDA"]);
    expect(migrated.cards.slice(0, 2).map((card) => card.metricType)).toEqual([
      "BetaAnalysis",
      "SortinoRatioVisualization",
    ]);
    expect(migrated.globalInputs).toMatchObject({
      startDate: "2024-01-01",
      endDate: "2026-01-01",
    });
  });
  it("keeps hidden Observation windows hidden when auto-arranging", () => {
    const original = createDefaultWorkspace(TODAY);
    const cardId = original.cards[1].id;
    const hidden = portfolioWorkspaceReducer(original, {
      type: "setObserverWindowVisibility",
      cardId,
      visible: false,
    });
    const arranged = portfolioWorkspaceReducer(hidden, {
      type: "arrangeObserver",
      width: 1440,
      height: 844,
    });

    expect(arranged.observerLayout[cardId].visible).toBe(false);
  });
});
