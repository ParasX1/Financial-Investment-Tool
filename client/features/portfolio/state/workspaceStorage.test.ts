import { describe, expect, it, jest } from "@jest/globals";
import { createDefaultWorkspace } from "./workspaceDefaults";
import {
  getWorkspaceStorageCandidates,
  getWorkspaceStorageKey,
  readPortfolioWorkspace,
  writePortfolioWorkspace,
  type PortfolioWorkspaceStorage,
} from "./workspaceStorage";

const TODAY = "2026-07-28";

const createStorage = (
  values: Record<string, string> = {},
): PortfolioWorkspaceStorage => ({
  getItem: jest.fn((key: string) => values[key] ?? null),
  setItem: jest.fn(),
});

describe("Portfolio workspace storage", () => {
  it("uses the current per-user key before known legacy keys", () => {
    expect(getWorkspaceStorageKey("user-1")).toBe(
      "fit.portfolioWorkspace.v3.user-1",
    );
    expect(getWorkspaceStorageCandidates()).toEqual([
      "fit.portfolioWorkspace.v3.guest",
      "fit.portfolioWorkspace.v2.guest",
      "fit.dashboardState.v1.guest",
      "fit.portfolioBoard.v3.guest",
    ]);
  });

  it("hydrates the current workspace without changing its deck", () => {
    const workspace = createDefaultWorkspace(TODAY, ["aapl", "MSFT"]);
    const key = getWorkspaceStorageKey("user-1");
    const storage = createStorage({ [key]: JSON.stringify(workspace) });

    expect(readPortfolioWorkspace(storage, "user-1", TODAY)).toEqual(workspace);
  });

  it("continues to a legacy key when newer stored JSON is malformed", () => {
    const [currentKey, legacyKey] = getWorkspaceStorageCandidates("user-1");
    const storage = createStorage({
      [currentKey]: "{not-json",
      [legacyKey]: JSON.stringify({
        symbols: ["nvda"],
        settings: {
          metricType: "VolatilityAnalysis",
          startDate: "2025-01-01",
          endDate: TODAY,
          benchmark: "qqq",
          riskFreeRate: 0,
          confidenceLevel: 0.05,
        },
      }),
    });

    const workspace = readPortfolioWorkspace(storage, "user-1", TODAY);

    expect(workspace?.symbols).toEqual(["NVDA"]);
    expect(workspace?.cards[0].metricType).toBe("VolatilityAnalysis");
    expect(workspace?.globalInputs.benchmark).toBe("QQQ");
  });

  it("serializes the current immutable workspace under its current key", () => {
    const workspace = createDefaultWorkspace(TODAY, ["AAPL"]);
    const storage = createStorage();

    writePortfolioWorkspace(storage, "user-1", workspace);

    expect(storage.setItem).toHaveBeenCalledWith(
      getWorkspaceStorageKey("user-1"),
      JSON.stringify(workspace),
    );
  });
});
