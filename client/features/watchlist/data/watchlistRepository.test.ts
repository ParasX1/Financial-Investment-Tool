import { describe, expect, it, jest } from "@jest/globals";
import { createWatchlistRepository } from "./watchlistRepository";

const row = {
  created_at: "2026-07-15T00:00:00.000Z",
  note: null,
  position: 0,
  symbol: "CBA.AX",
  target_price: null,
  updated_at: "2026-07-15T00:00:00.000Z",
  user_id: "user-1",
};

describe("watchlist repository", () => {
  it("loads only the authenticated user's rows in saved order", async () => {
    const order = jest
      .fn<(...args: unknown[]) => Promise<{ data: Array<typeof row>; error: null }>>()
      .mockResolvedValue({ data: [row], error: null });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ select });
    const repository = createWatchlistRepository({ from } as never);

    await expect(repository.list("user-1")).resolves.toEqual([
      expect.objectContaining({ position: 0, symbol: "CBA.AX", userId: "user-1" }),
    ]);
    expect(from).toHaveBeenCalledWith("user_watchlist");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(order).toHaveBeenCalledWith("position", { ascending: true });
  });

  it("adds one normalized item instead of rewriting the whole list", async () => {
    const single = jest
      .fn<() => Promise<{ data: typeof row; error: null }>>()
      .mockResolvedValue({ data: row, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    const deleteRows = jest.fn();
    const from = jest.fn().mockReturnValue({ delete: deleteRows, insert });
    const repository = createWatchlistRepository({ from } as never);

    await repository.add({
      note: "  Compare margins  ",
      position: 0,
      symbol: " cba.ax ",
      targetPrice: 125.5,
      userId: "user-1",
    });

    expect(insert).toHaveBeenCalledWith({
      note: "Compare margins",
      position: 0,
      symbol: "CBA.AX",
      target_price: 125.5,
      user_id: "user-1",
    });
    expect(deleteRows).not.toHaveBeenCalled();
  });

  it("removes and compacts the saved order through one atomic RPC", async () => {
    const rpc = jest
      .fn<(...args: unknown[]) => Promise<{ data: null; error: null }>>()
      .mockResolvedValue({ data: null, error: null });
    const deleteRows = jest.fn();
    const repository = createWatchlistRepository({
      from: () => ({ delete: deleteRows }),
      rpc,
    } as never);

    await repository.remove("user-1", "cba.ax");

    expect(rpc).toHaveBeenCalledWith("remove_watchlist_item", {
      item_symbol: "CBA.AX",
    });
    expect(deleteRows).not.toHaveBeenCalled();
  });

  it("reorders through one atomic RPC instead of a delete-all window", async () => {
    const rpc = jest
      .fn<(...args: unknown[]) => Promise<{ data: null; error: null }>>()
      .mockResolvedValue({ data: null, error: null });
    const deleteRows = jest.fn();
    const repository = createWatchlistRepository({
      from: () => ({ delete: deleteRows }),
      rpc,
    } as never);

    await repository.saveOrder("user-1", ["BHP.AX", "CBA.AX"]);

    expect(rpc).toHaveBeenCalledWith("reorder_watchlist", {
      ordered_symbols: ["BHP.AX", "CBA.AX"],
    });
    expect(deleteRows).not.toHaveBeenCalled();
  });

  it("maps provider failures to a stable user-facing repository error", async () => {
    const order = jest
      .fn<
        (...args: unknown[]) => Promise<{
          data: null;
          error: { message: string };
        }>
      >()
      .mockResolvedValue({
        data: null,
        error: { message: "policy details should stay internal" },
      });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    const repository = createWatchlistRepository({ from: () => ({ select }) } as never);

    await expect(repository.list("user-1")).rejects.toMatchObject({
      code: "load_failed",
      message: "We couldn't load your watchlist. Please try again.",
    });
  });

  it("rejects invalid persistence payloads before calling Supabase", async () => {
    const from = jest.fn();
    const repository = createWatchlistRepository({ from } as never);

    await expect(
      repository.add({ position: 20, symbol: "CBA.AX", userId: "user-1" }),
    ).rejects.toMatchObject({ code: "invalid_input" });
    await expect(
      repository.add({
        note: "x".repeat(281),
        position: 0,
        symbol: "CBA.AX",
        userId: "user-1",
      }),
    ).rejects.toMatchObject({ code: "invalid_input" });
    await expect(
      repository.add({
        position: 0,
        symbol: "CBA.AX",
        targetPrice: 0,
        userId: "user-1",
      }),
    ).rejects.toMatchObject({ code: "invalid_input" });
    await expect(
      repository.update("user-1", "CBA.AX", {}),
    ).rejects.toMatchObject({ code: "invalid_input" });
    await expect(repository.list("   ")).rejects.toMatchObject({
      code: "invalid_input",
    });
    await expect(
      repository.add({ position: 0.5, symbol: "CBA.AX", userId: "user-1" }),
    ).rejects.toMatchObject({ code: "invalid_input" });
    await expect(
      repository.add({ position: -1, symbol: "CBA.AX", userId: "user-1" }),
    ).rejects.toMatchObject({ code: "invalid_input" });
    await expect(
      repository.add({ position: 0, symbol: "bad symbol", userId: "user-1" }),
    ).rejects.toMatchObject({ code: "invalid_input" });
    await expect(
      repository.add({
        position: 0,
        symbol: "CBA.AX",
        targetPrice: Number.POSITIVE_INFINITY,
        userId: "user-1",
      }),
    ).rejects.toMatchObject({ code: "invalid_input" });
    expect(from).not.toHaveBeenCalled();
  });

  it("maps an empty list and persists every supported update field", async () => {
    const listOrder = jest.fn<any>().mockResolvedValue({ data: null, error: null });
    const listEq = jest.fn<any>().mockReturnValue({ order: listOrder });
    const listSelect = jest.fn<any>().mockReturnValue({ eq: listEq });
    const updatedRow = {
      ...row,
      note: null,
      position: 1,
      target_price: 130,
    };
    const single = jest.fn<any>().mockResolvedValue({ data: updatedRow, error: null });
    const updateSelect = jest.fn<any>().mockReturnValue({ single });
    const symbolEq = jest.fn<any>().mockReturnValue({ select: updateSelect });
    const userEq = jest.fn<any>().mockReturnValue({ eq: symbolEq });
    const update = jest.fn<any>().mockReturnValue({ eq: userEq });
    const from = jest.fn<any>()
      .mockReturnValueOnce({ select: listSelect })
      .mockReturnValueOnce({ update });
    const repository = createWatchlistRepository({ from } as never);

    await expect(repository.list("user-1")).resolves.toEqual([]);
    await expect(repository.update("user-1", "cba.ax", {
      note: "   ",
      position: 1,
      targetPrice: 130,
    })).resolves.toMatchObject({ note: null, position: 1, targetPrice: 130 });
    expect(update).toHaveBeenCalledWith({
      note: null,
      position: 1,
      target_price: 130,
    });
  });

  it("maps add, update, remove, and order failures to operation-specific errors", async () => {
    const addSingle = jest.fn<any>()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: row, error: { message: "insert failed" } });
    const updateSingle = jest.fn<any>()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: row, error: { message: "update failed" } });
    const addSelect = jest.fn<any>().mockReturnValue({ single: addSingle });
    const updateSelect = jest.fn<any>().mockReturnValue({ single: updateSingle });
    const insert = jest.fn<any>().mockReturnValue({ select: addSelect });
    const symbolEq = jest.fn<any>().mockReturnValue({ select: updateSelect });
    const userEq = jest.fn<any>().mockReturnValue({ eq: symbolEq });
    const update = jest.fn<any>().mockReturnValue({ eq: userEq });
    const from = jest.fn<any>().mockReturnValue({ insert, update });
    const rpc = jest.fn<any>()
      .mockResolvedValueOnce({ data: null, error: { message: "remove failed" } })
      .mockResolvedValueOnce({ data: null, error: { message: "order failed" } });
    const repository = createWatchlistRepository({ from, rpc } as never);

    await expect(repository.add({ position: 0, symbol: "CBA.AX", userId: "user-1" }))
      .rejects.toMatchObject({ code: "add_failed" });
    await expect(repository.add({ position: 0, symbol: "CBA.AX", userId: "user-1" }))
      .rejects.toMatchObject({ code: "add_failed" });
    await expect(repository.update("user-1", "CBA.AX", { note: "x" }))
      .rejects.toMatchObject({ code: "update_failed" });
    await expect(repository.update("user-1", "CBA.AX", { note: "x" }))
      .rejects.toMatchObject({ code: "update_failed" });
    await expect(repository.remove("user-1", "CBA.AX"))
      .rejects.toMatchObject({ code: "remove_failed" });
    await expect(repository.saveOrder("user-1", ["CBA.AX"]))
      .rejects.toMatchObject({ code: "order_failed" });
  });
});
