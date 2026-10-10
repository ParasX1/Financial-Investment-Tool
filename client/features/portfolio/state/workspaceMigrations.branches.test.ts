import { migrateWorkspaceState } from "./workspaceMigrations";

const TODAY = "2026-07-28";

describe("workspace migration recovery", () => {
  it.each([null, "workspace", [], 42])(
    "uses defaults for a non-object payload",
    (payload) => {
      const migrated = migrateWorkspaceState(payload, TODAY);

      expect(migrated.version).toBe(3);
      expect(migrated.symbols).toEqual([]);
      expect(migrated.cards).toHaveLength(6);
    },
  );

  it.each([
    { version: 3 },
    { version: 2, cards: [] },
    { version: 3, cards: [null, "not-a-card"] },
  ])(
    "falls back when a current workspace cannot restore any cards",
    (payload) => {
      const migrated = migrateWorkspaceState(payload, TODAY);

      expect(migrated.cards).toHaveLength(6);
      expect(migrated.cards[0]).toMatchObject({
        id: "portfolio-card-1",
        metricType: "CumulativeReturnComparison",
      });
    },
  );

  it("sanitises partial v3 cards and global inputs", () => {
    const migrated = migrateWorkspaceState(
      {
        version: 3,
        symbols: [" aapl ", "BAD SYMBOL", "AAPL", "msft"],
        cards: [
          {
            id: "",
            metricType: "UnsupportedMetric",
            overrides: "invalid",
            hiddenSymbols: "invalid",
          },
          {
            id: "custom-card",
            metricType: "AlphaComparison",
            overrides: {
              startDate: "2025-02-01",
              endDate: 123,
              benchmark: "qqq",
              riskFreeRate: 0,
              confidenceLevel: 0.01,
            },
            hiddenSymbols: [" aapl ", "invalid symbol", "MSFT"],
          },
        ],
        globalInputs: {
          startDate: 123,
          endDate: "2026-02-01",
          benchmark: null,
          riskFreeRate: Number.NaN,
          confidenceLevel: Number.POSITIVE_INFINITY,
        },
      },
      TODAY,
    );

    expect(migrated.symbols).toEqual(["AAPL", "MSFT"]);
    expect(migrated.cards).toEqual([
      {
        id: "portfolio-card-1",
        metricType: "CumulativeReturnComparison",
        overrides: {},
        hiddenSymbols: [],
      },
      {
        id: "custom-card",
        metricType: "AlphaComparison",
        overrides: {
          startDate: "2025-02-01",
          benchmark: "QQQ",
          riskFreeRate: 0,
          confidenceLevel: 0.01,
        },
        hiddenSymbols: ["AAPL", "MSFT"],
      },
    ]);
    expect(migrated.globalInputs).toEqual({
      startDate: "2025-07-28",
      endDate: "2026-02-01",
      benchmark: "SPY",
      riskFreeRate: 0.01,
      confidenceLevel: 0.05,
    });
  });

  it("restores valid observer geometry while recovering malformed windows", () => {
    const migrated = migrateWorkspaceState(
      {
        version: 3,
        cards: [
          { id: "first", metricType: "BetaAnalysis" },
          { id: "second", metricType: "AlphaComparison" },
          { id: "third", metricType: "VolatilityAnalysis" },
        ],
        observerLayout: {
          malformed: null,
          badCardId: { cardId: 123 },
          orphan: { cardId: "removed-card" },
          first: {
            cardId: "first",
            x: 25,
            y: Number.NaN,
            width: 500,
            height: 100,
            z: 99,
            visible: "yes",
          },
          second: {
            cardId: "second",
            x: Number.POSITIVE_INFINITY,
            y: 35,
            width: 10,
            height: Number.NEGATIVE_INFINITY,
            z: Number.NaN,
            visible: false,
          },
        },
      },
      TODAY,
    );

    expect(migrated.observerLayout.first).toMatchObject({
      cardId: "first",
      x: 25,
      width: 500,
      height: 220,
      z: 99,
      visible: true,
    });
    expect(migrated.observerLayout.first.y).toBeGreaterThanOrEqual(0);
    expect(migrated.observerLayout.second).toMatchObject({
      cardId: "second",
      y: 35,
      width: 300,
      visible: false,
    });
    expect(Number.isFinite(migrated.observerLayout.second.x)).toBe(true);
    expect(Number.isFinite(migrated.observerLayout.second.height)).toBe(true);
    expect(Number.isFinite(migrated.observerLayout.second.z)).toBe(true);
    expect(migrated.observerLayout.third).toMatchObject({
      cardId: "third",
      visible: false,
    });
  });

  it("recovers invalid fields from the focused legacy workspace", () => {
    const migrated = migrateWorkspaceState(
      {
        symbols: "AAPL",
        settings: {
          metricType: "UnsupportedMetric",
          startDate: null,
          endDate: 123,
          benchmark: false,
          riskFreeRate: Number.NaN,
          confidenceLevel: Number.POSITIVE_INFINITY,
        },
      },
      TODAY,
    );

    expect(migrated.symbols).toEqual([]);
    expect(migrated.cards[0].metricType).toBe("CumulativeReturnComparison");
    expect(migrated.globalInputs).toEqual({
      startDate: "2025-07-28",
      endDate: TODAY,
      benchmark: "SPY",
      riskFreeRate: 0.01,
      confidenceLevel: 0.05,
    });
  });

  it("falls back to the default deck when every legacy card is disabled or malformed", () => {
    const migrated = migrateWorkspaceState(
      {
        searchTags: [" aapl ", "AAPL", "brk-b"],
        activeCards: [false, true],
        cardSettings: [{ metricType: "BetaAnalysis" }, "not-a-card"],
      },
      TODAY,
    );

    expect(migrated.symbols).toEqual(["AAPL", "BRK-B"]);
    expect(migrated.cards).toHaveLength(6);
    expect(migrated.cards[0].metricType).toBe("CumulativeReturnComparison");
  });

  it("selectively restores legacy card overrides and final symbol fallback", () => {
    const migrated = migrateWorkspaceState(
      {
        symbols: ["nvda"],
        globalStart: 123,
        globalEnd: "2026-06-30",
        cardSettings: [
          {
            metricType: "UnsupportedMetric",
            marketTicker: "qqq",
            riskRate: Number.NaN,
            confidenceLevel: Number.POSITIVE_INFINITY,
            dateRange: null,
          },
          {
            metricType: "SortinoRatioVisualization",
            riskRate: 0,
            confidenceLevel: 0.025,
            dateRange: { start: "2025-01-01", end: 123 },
          },
          {
            metricType: "VolatilityAnalysis",
            dateRange: { start: false, end: "2026-01-01" },
          },
        ],
      },
      TODAY,
    );

    expect(migrated.symbols).toEqual(["NVDA"]);
    expect(migrated.globalInputs).toMatchObject({
      startDate: "2025-07-28",
      endDate: "2026-06-30",
    });
    expect(migrated.cards[0]).toMatchObject({
      metricType: "CumulativeReturnComparison",
      overrides: { benchmark: "QQQ" },
    });
    expect(migrated.cards[1]).toMatchObject({
      metricType: "SortinoRatioVisualization",
      overrides: {
        riskFreeRate: 0,
        confidenceLevel: 0.025,
        startDate: "2025-01-01",
      },
    });
    expect(migrated.cards[2]).toMatchObject({
      metricType: "VolatilityAnalysis",
      overrides: { endDate: "2026-01-01" },
    });
  });
});
