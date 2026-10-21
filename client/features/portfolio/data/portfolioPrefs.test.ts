import { beforeEach, describe, expect, it } from "@jest/globals";
import { getConfiguredSupabaseClient } from "@/lib/supabase";
import { loadPortfolioConfig, savePortfolioConfig } from "./portfolioPrefs";

jest.mock("@/lib/supabase", () => ({
  getConfiguredSupabaseClient: jest.fn(),
}));

const getConfiguredClientMock = jest.mocked(getConfiguredSupabaseClient);

const createLoadClient = (result: unknown) => {
  const single = jest.fn(() => Promise.resolve(result));
  const eq = jest.fn(() => ({ single }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));
  return { client: { from }, eq, from, select, single };
};

const createSaveClient = (result: unknown) => {
  const upsert = jest.fn(() => Promise.resolve(result));
  const from = jest.fn(() => ({ upsert }));
  return { client: { from }, from, upsert };
};

beforeEach(() => {
  getConfiguredClientMock.mockReset();
});

describe("portfolio preferences", () => {
  it("uses an empty local preference set without contacting an unconfigured backend", async () => {
    getConfiguredClientMock.mockReturnValue(null);

    await expect(loadPortfolioConfig("user-a")).resolves.toEqual({ tags: [] });
    await expect(
      savePortfolioConfig("user-a", { tags: ["AAPL"] }),
    ).resolves.toBeUndefined();

    expect(getConfiguredClientMock).toHaveBeenCalledTimes(2);
  });

  it("loads the configured user's persisted symbols", async () => {
    const query = createLoadClient({
      data: { tags: ["AAPL", "MSFT"] },
      error: null,
    });
    getConfiguredClientMock.mockReturnValue(query.client as never);

    await expect(loadPortfolioConfig("user-a")).resolves.toEqual({
      tags: ["AAPL", "MSFT"],
    });
    expect(query.from).toHaveBeenCalledWith("portfolio_prefs");
    expect(query.select).toHaveBeenCalledWith("tags");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(query.single).toHaveBeenCalledTimes(1);
  });

  it("treats a configured user's missing row as empty preferences", async () => {
    const query = createLoadClient({
      data: null,
      error: { code: "PGRST116", message: "No rows" },
    });
    getConfiguredClientMock.mockReturnValue(query.client as never);

    await expect(loadPortfolioConfig("user-a")).resolves.toEqual({ tags: [] });
  });

  it("preserves configured load failures for the controller to handle", async () => {
    const failure = { code: "42501", message: "permission denied" };
    const query = createLoadClient({ data: null, error: failure });
    getConfiguredClientMock.mockReturnValue(query.client as never);

    await expect(loadPortfolioConfig("user-a")).rejects.toBe(failure);
  });

  it("upserts configured preferences with a user-scoped conflict key", async () => {
    const query = createSaveClient({ error: null });
    getConfiguredClientMock.mockReturnValue(query.client as never);
    const toISOString = jest
      .spyOn(Date.prototype, "toISOString")
      .mockReturnValue("2026-07-31T00:00:00.000Z");

    await expect(
      savePortfolioConfig("user-a", { tags: ["AAPL", "MSFT"] }),
    ).resolves.toBeUndefined();

    expect(query.from).toHaveBeenCalledWith("portfolio_prefs");
    expect(query.upsert).toHaveBeenCalledWith(
      {
        user_id: "user-a",
        tags: ["AAPL", "MSFT"],
        updated_at: "2026-07-31T00:00:00.000Z",
      },
      { onConflict: "user_id" },
    );
    toISOString.mockRestore();
  });

  it("preserves configured save failures", async () => {
    const failure = { code: "42501", message: "permission denied" };
    const query = createSaveClient({ error: failure });
    getConfiguredClientMock.mockReturnValue(query.client as never);

    await expect(
      savePortfolioConfig("user-a", { tags: ["AAPL"] }),
    ).rejects.toBe(failure);
  });
});
