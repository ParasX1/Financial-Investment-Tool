import { describe, expect, it, jest } from "@jest/globals";
import { createSavedWatchlistSymbolsReader } from "./savedWatchlistSymbolsReader";

describe("saved Watchlist symbols reader", () => {
  it("selects only symbols for the authenticated user in saved order", async () => {
    const order = jest.fn<any>().mockResolvedValue({
      data: [
        { symbol: "cba.ax" },
        { symbol: "bad symbol" },
        { symbol: "BHP.AX" },
      ],
      error: null,
    });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ select });
    const reader = createSavedWatchlistSymbolsReader({ from } as never);

    await expect(reader.list("user-a")).resolves.toEqual(["CBA.AX", "BHP.AX"]);
    expect(from).toHaveBeenCalledWith("user_watchlist");
    expect(select).toHaveBeenCalledWith("symbol");
    expect(eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(order).toHaveBeenCalledWith("position", { ascending: true });
  });

  it("rejects invalid users and redacts Supabase failures", async () => {
    const from = jest.fn();
    const invalidReader = createSavedWatchlistSymbolsReader({ from } as never);

    await expect(invalidReader.list("   ")).rejects.toMatchObject({
      code: "invalid_user",
    });
    expect(from).not.toHaveBeenCalled();

    const order = jest.fn<any>().mockResolvedValue({
      data: null,
      error: { message: "database host and policy details" },
    });
    const reader = createSavedWatchlistSymbolsReader({
      from: () => ({
        select: () => ({
          eq: () => ({ order }),
        }),
      }),
    } as never);

    await expect(reader.list("user-a")).rejects.toMatchObject({
      code: "load_failed",
      message: "Saved tickers could not be loaded.",
    });
  });
});
