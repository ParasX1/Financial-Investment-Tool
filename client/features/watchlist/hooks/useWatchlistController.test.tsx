import * as React from "react";
import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

let mockAuthState: { loading: boolean; user: { id: string } | null };
const mockRepository = {
  add: jest.fn<any>(),
  list: jest.fn<any>(),
  remove: jest.fn<any>(),
  saveOrder: jest.fn<any>(),
  update: jest.fn<any>(),
};

import type { WatchlistItem } from "../types";

let useWatchlistController: typeof import("./useWatchlistController")["useWatchlistController"];

function item(symbol: string, position: number, userId = "user-a"): WatchlistItem {
  return {
    createdAt: "2026-07-15T00:00:00.000Z",
    note: null,
    position,
    symbol,
    targetPrice: null,
    updatedAt: "2026-07-15T00:00:00.000Z",
    userId,
  };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe("useWatchlistController", () => {
  beforeAll(() => {
    jest.doMock("@/features/auth", () => ({
      useAuth: () => mockAuthState,
    }));
    jest.doMock("@/lib/supabase", () => ({
      __esModule: true,
      supabase: {},
    }));
    jest.doMock("../data/watchlistRepository", () => ({
      createWatchlistRepository: () => mockRepository,
    }));
    useWatchlistController = require("./useWatchlistController").useWatchlistController;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState = { loading: false, user: { id: "user-a" } };
    mockRepository.list.mockResolvedValue([item("CBA.AX", 0)]);
    mockRepository.add.mockResolvedValue(item("BHP.AX", 1));
    mockRepository.update.mockResolvedValue({
      ...item("CBA.AX", 0),
      note: "Review margins",
    });
    mockRepository.remove.mockResolvedValue(undefined);
    mockRepository.saveOrder.mockResolvedValue(undefined);
  });

  it("loads and performs explicit immutable CRUD/reorder mutations", async () => {
    let latest: ReturnType<typeof useWatchlistController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useWatchlistController();
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });
    expect(latest!.items.map((saved) => saved.symbol)).toEqual(["CBA.AX"]);

    await act(async () => {
      await latest!.addItem("BHP.AX");
    });
    expect(latest!.items.map((saved) => saved.symbol)).toEqual([
      "CBA.AX",
      "BHP.AX",
    ]);
    expect(mockRepository.add).toHaveBeenCalledWith(
      expect.objectContaining({ position: 1, symbol: "BHP.AX" }),
    );

    await act(async () => {
      await latest!.updateItem("CBA.AX", { note: "Review margins" });
    });
    expect(latest!.items[0]?.note).toBe("Review margins");

    await act(async () => {
      await latest!.moveItem("BHP.AX", "up");
    });
    expect(mockRepository.saveOrder).toHaveBeenCalledWith("user-a", [
      "BHP.AX",
      "CBA.AX",
    ]);

    await act(async () => {
      await latest!.removeItem("CBA.AX");
    });
    expect(latest!.items.map((saved) => saved.symbol)).toEqual(["BHP.AX"]);
    renderer!.unmount();
  });

  it("discards a delayed old-account mutation after the user changes", async () => {
    let resolveOldUpdate!: (value: WatchlistItem) => void;
    mockRepository.update.mockReturnValue(
      new Promise<WatchlistItem>((resolve) => {
        resolveOldUpdate = resolve;
      }),
    );
    mockRepository.list.mockImplementation((userId: string) =>
      Promise.resolve(
        userId === "user-b"
          ? [item("WES.AX", 0, "user-b")]
          : [item("CBA.AX", 0)],
      ),
    );
    let latest: ReturnType<typeof useWatchlistController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useWatchlistController();
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });

    let oldOperation!: Promise<boolean>;
    act(() => {
      oldOperation = latest!.updateItem("CBA.AX", { note: "Old account" });
    });

    mockAuthState = { loading: false, user: { id: "user-b" } };
    await act(async () => {
      renderer!.update(<Probe />);
      await flushPromises();
    });
    expect(latest!.items.map((saved) => saved.symbol)).toEqual(["WES.AX"]);

    await act(async () => {
      resolveOldUpdate({ ...item("CBA.AX", 0), note: "Old account" });
      await oldOperation;
    });
    expect(latest!.items.map((saved) => saved.symbol)).toEqual(["WES.AX"]);
    expect(latest!.feedback).toBeNull();
    expect(latest!.busyAction).toBeNull();
    renderer!.unmount();
  });

  it("hides all old-account state on the first render while the next account loads or fails", async () => {
    const nextLoad = deferred<WatchlistItem[]>();
    mockRepository.list
      .mockResolvedValueOnce([{ ...item("CBA.AX", 0), note: "Private account A research" }])
      .mockReturnValueOnce(nextLoad.promise);
    let latest: ReturnType<typeof useWatchlistController> | null = null;
    const renders: Array<ReturnType<typeof useWatchlistController>> = [];
    let renderer: ReactTestRenderer;
    function Probe() {
      latest = useWatchlistController();
      renders.push(latest);
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
      await latest!.addItem("bad symbol");
    });
    expect(latest!.feedback?.tone).toBe("error");
    renders.length = 0;
    mockAuthState = { loading: false, user: { id: "user-b" } };
    act(() => renderer!.update(<Probe />));
    expect(renders[0]).toMatchObject({
      busyAction: null,
      feedback: null,
      items: [],
      loadError: null,
      loading: true,
    });

    await act(async () => {
      nextLoad.reject(new Error("Account B is offline."));
      await flushPromises();
    });
    expect(latest!.items).toEqual([]);
    expect(latest!.loadError).toBe("Account B is offline.");
    renderer!.unmount();
  });

  it("allows the new account to mutate while an old-account mutation is still pending", async () => {
    const oldAdd = deferred<WatchlistItem>();
    mockRepository.add
      .mockReturnValueOnce(oldAdd.promise)
      .mockResolvedValueOnce(item("WES.AX", 0, "user-b"));
    mockRepository.list.mockImplementation((userId: string) =>
      Promise.resolve(userId === "user-a" ? [item("CBA.AX", 0)] : []),
    );
    let latest: ReturnType<typeof useWatchlistController> | null = null;
    let renderer: ReactTestRenderer;
    function Probe() {
      latest = useWatchlistController();
      return null;
    }
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });
    let oldOperation!: Promise<boolean>;
    act(() => { oldOperation = latest!.addItem("BHP.AX"); });
    expect(latest!.busyAction).toBe("add");

    mockAuthState = { loading: false, user: { id: "user-b" } };
    await act(async () => {
      renderer!.update(<Probe />);
      await flushPromises();
      expect(await latest!.addItem("WES.AX")).toBe(true);
    });
    expect(latest!.items.map((saved) => saved.symbol)).toEqual(["WES.AX"]);
    await act(async () => {
      oldAdd.resolve(item("BHP.AX", 1));
      expect(await oldOperation).toBe(false);
    });
    expect(latest!.items.map((saved) => saved.symbol)).toEqual(["WES.AX"]);
    expect(latest!.feedback?.message).toBe("WES.AX was added to your watchlist.");
    renderer!.unmount();
  });

  it("ignores old loads and mutations after A to B to A, even when the user id matches again", async () => {
    const oldLoad = deferred<WatchlistItem[]>();
    const oldUpdate = deferred<WatchlistItem>();
    mockRepository.list
      .mockResolvedValueOnce([item("CBA.AX", 0)])
      .mockReturnValueOnce(oldLoad.promise)
      .mockResolvedValueOnce([item("WES.AX", 0, "user-b")])
      .mockResolvedValueOnce([{ ...item("CBA.AX", 0), note: "New A session" }]);
    mockRepository.update.mockReturnValueOnce(oldUpdate.promise);
    let latest: ReturnType<typeof useWatchlistController> | null = null;
    let renderer: ReactTestRenderer;
    function Probe() {
      latest = useWatchlistController();
      return null;
    }
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });
    let retry!: Promise<void>;
    let mutation!: Promise<boolean>;
    act(() => {
      retry = latest!.retry();
      mutation = latest!.updateItem("CBA.AX", { note: "Stale A mutation" });
    });
    for (const userId of ["user-b", "user-a"]) {
      mockAuthState = { loading: false, user: { id: userId } };
      await act(async () => {
        renderer!.update(<Probe />);
        await flushPromises();
      });
    }
    await act(async () => {
      oldLoad.resolve([{ ...item("CBA.AX", 0), note: "Stale A load" }]);
      oldUpdate.reject(new Error("Stale A failure"));
      await retry;
      expect(await mutation).toBe(false);
    });
    expect(latest!.items[0]?.note).toBe("New A session");
    expect(latest!.busyAction).toBeNull();
    expect(latest!.feedback).toBeNull();
    renderer!.unmount();
  });

  it("rejects callbacks retained from an old account and settles pending work as stale on unmount", async () => {
    const pending = deferred<WatchlistItem>();
    let latest: ReturnType<typeof useWatchlistController> | null = null;
    let renderer: ReactTestRenderer;
    function Probe() {
      latest = useWatchlistController();
      return null;
    }
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });
    const previous = latest!;
    mockAuthState = { loading: false, user: { id: "user-b" } };
    await act(async () => {
      renderer!.update(<Probe />);
      await flushPromises();
      expect(await previous.addItem("WES.AX")).toBe(false);
      expect(await previous.updateItem("CBA.AX", { note: "Old draft" })).toBe(false);
      expect(await previous.removeItem("CBA.AX")).toBe(false);
      expect(await previous.moveItem("CBA.AX", "down")).toBe(false);
      await previous.retry();
    });
    expect(mockRepository.add).not.toHaveBeenCalled();
    expect(mockRepository.update).not.toHaveBeenCalled();
    expect(mockRepository.remove).not.toHaveBeenCalled();
    expect(mockRepository.saveOrder).not.toHaveBeenCalled();
    expect(mockRepository.list).toHaveBeenCalledTimes(2);

    mockRepository.add.mockReturnValueOnce(pending.promise);
    let operation!: Promise<boolean>;
    act(() => { operation = latest!.addItem("WES.AX"); });
    act(() => renderer!.unmount());
    pending.resolve(item("WES.AX", 1, "user-b"));
    expect(await operation).toBe(false);
  });

  it("keeps saved research visible during a same-account retry and ignores an earlier retry", async () => {
    const earlier = deferred<WatchlistItem[]>();
    const latestLoad = deferred<WatchlistItem[]>();
    mockRepository.list
      .mockResolvedValueOnce([{ ...item("CBA.AX", 0), note: "Current research" }])
      .mockReturnValueOnce(earlier.promise)
      .mockReturnValueOnce(latestLoad.promise);
    let latest: ReturnType<typeof useWatchlistController> | null = null;
    let renderer: ReactTestRenderer;
    function Probe() {
      latest = useWatchlistController();
      return null;
    }
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => { first = latest!.retry(); });
    expect(latest!.items[0]?.note).toBe("Current research");
    act(() => { second = latest!.retry(); });
    await act(async () => {
      latestLoad.resolve([{ ...item("CBA.AX", 0), note: "Latest research" }]);
      await second;
      earlier.reject(new Error("Old retry failed"));
      await first;
    });
    expect(latest!.items[0]?.note).toBe("Latest research");
    expect(latest!.loadError).toBeNull();
    expect(latest!.loading).toBe(false);
    renderer!.unmount();
  });

  it.each(["add", "edit", "remove", "move"] as const)("keeps the new account's pending %s operation locked when an old operation fails", async (action) => {
    const oldMutation = deferred<WatchlistItem | undefined>();
    const newMutation = deferred<WatchlistItem | undefined>();
    const repositoryMethod = action === "edit" ? "update" : action === "move" ? "saveOrder" : action;
    mockRepository[repositoryMethod]
      .mockReturnValueOnce(oldMutation.promise)
      .mockReturnValueOnce(newMutation.promise);
    mockRepository.list.mockImplementation((userId: string) => Promise.resolve([
      item("CBA.AX", 0, userId),
      item("BHP.AX", 1, userId),
    ]));
    let latest: ReturnType<typeof useWatchlistController> | null = null;
    let renderer: ReactTestRenderer;
    function Probe() {
      latest = useWatchlistController();
      return null;
    }
    function mutate() {
      if (action === "add") return latest!.addItem("WES.AX");
      if (action === "edit") return latest!.updateItem("CBA.AX", { note: "Current session draft" });
      if (action === "remove") return latest!.removeItem("CBA.AX");
      return latest!.moveItem("BHP.AX", "up");
    }
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });
    let oldOperation!: Promise<boolean>;
    let newOperation!: Promise<boolean>;
    act(() => { oldOperation = mutate(); });
    mockAuthState = { loading: false, user: { id: "user-b" } };
    await act(async () => {
      renderer!.update(<Probe />);
      await flushPromises();
    });
    act(() => { newOperation = mutate(); });
    const newItems = latest!.items;
    await act(async () => {
      oldMutation.reject(new Error("Account A operation failed."));
      expect(await oldOperation).toBe(false);
    });
    expect(latest!.items).toEqual(newItems);
    expect(latest!.feedback).toBeNull();
    expect(latest!.busyAction).toBe(action);

    await act(async () => {
      newMutation.resolve(action === "add" ? item("WES.AX", 2, "user-b") : { ...item("CBA.AX", 0, "user-b"), note: "Current session draft" });
      expect(await newOperation).toBe(true);
    });
    expect(latest!.items.every((saved) => saved.userId === "user-b")).toBe(true);
    expect(latest!.busyAction).toBeNull();
    expect(latest!.feedback?.tone).toBe("success");
    renderer!.unmount();
  });

  it("waits for auth, reports load failures, retries, and clears private state on sign-out", async () => {
    mockAuthState = { loading: true, user: { id: "user-a" } };
    mockRepository.list
      .mockRejectedValueOnce(new Error("The saved list is offline."))
      .mockRejectedValueOnce("network unavailable");
    let latest: ReturnType<typeof useWatchlistController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useWatchlistController();
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });
    expect(mockRepository.list).not.toHaveBeenCalled();

    mockAuthState = { loading: false, user: { id: "user-a" } };
    await act(async () => {
      renderer!.update(<Probe />);
      await flushPromises();
    });
    expect(latest!.loadError).toBe("The saved list is offline.");

    await act(async () => {
      await latest!.retry();
    });
    expect(latest!.loadError).toBe("We couldn't load your watchlist. Please try again.");

    mockAuthState = { loading: false, user: null };
    await act(async () => {
      renderer!.update(<Probe />);
      await flushPromises();
      await latest!.retry();
    });
    expect(latest!.authenticated).toBe(false);
    expect(latest!.items).toEqual([]);
    expect(latest!.loadError).toBeNull();
    expect(await latest!.addItem("BHP.AX")).toBe(false);
    renderer!.unmount();
  });

  it("validates additions and restores optimistic mutations after repository failures", async () => {
    mockRepository.list.mockResolvedValue([
      item("CBA.AX", 0),
      item("BHP.AX", 1),
    ]);
    let latest: ReturnType<typeof useWatchlistController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useWatchlistController();
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });

    await act(async () => {
      expect(await latest!.addItem("bad symbol")).toBe(false);
    });
    expect(latest!.feedback?.tone).toBe("error");
    await act(async () => {
      expect(await latest!.addItem(" cba.ax ")).toBe(false);
    });
    expect(latest!.feedback?.message).toContain("already in your watchlist");

    mockRepository.add.mockRejectedValueOnce(new Error("Provider rejected the symbol."));
    await act(async () => {
      expect(await latest!.addItem("WES.AX")).toBe(false);
    });
    expect(latest!.feedback?.message).toBe("Provider rejected the symbol.");
    expect(latest!.busyAction).toBeNull();

    mockRepository.update.mockRejectedValueOnce("update unavailable");
    await act(async () => {
      expect(await latest!.updateItem("CBA.AX", { note: "Unsaved" })).toBe(false);
    });
    expect(latest!.items[0]?.note).toBeNull();
    expect(latest!.feedback?.message).toContain("previous values were restored");

    mockRepository.remove.mockRejectedValueOnce(new Error("Remove is offline."));
    await act(async () => {
      expect(await latest!.removeItem("CBA.AX")).toBe(false);
    });
    expect(latest!.items.map((saved) => saved.symbol)).toEqual(["CBA.AX", "BHP.AX"]);
    expect(latest!.feedback?.message).toBe("Remove is offline.");

    await act(async () => {
      expect(await latest!.moveItem("CBA.AX", "up")).toBe(false);
    });
    expect(mockRepository.saveOrder).not.toHaveBeenCalled();

    mockRepository.saveOrder.mockRejectedValueOnce(new Error(""));
    await act(async () => {
      expect(await latest!.moveItem("BHP.AX", "up")).toBe(false);
    });
    expect(latest!.items.map((saved) => saved.symbol)).toEqual(["CBA.AX", "BHP.AX"]);
    expect(latest!.feedback?.message).toContain("previous order was restored");
    renderer!.unmount();
  });

  it("enforces the beginner-sized watchlist limit before persistence", async () => {
    mockRepository.list.mockResolvedValue(
      Array.from({ length: 20 }, (_, position) =>
        item(`STOCK${position}`, position),
      ),
    );
    let latest: ReturnType<typeof useWatchlistController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useWatchlistController();
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushPromises();
    });
    await act(async () => {
      expect(await latest!.addItem("WES.AX")).toBe(false);
    });
    expect(latest!.feedback?.message).toContain("up to 20 ideas");
    expect(mockRepository.add).not.toHaveBeenCalled();
    renderer!.unmount();
  });

  it("auto-dismisses routine success feedback while keeping errors actionable", async () => {
    jest.useFakeTimers();
    let latest: ReturnType<typeof useWatchlistController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useWatchlistController();
      return null;
    }

    try {
      await act(async () => {
        renderer = TestRenderer.create(<Probe />);
        await flushPromises();
      });
      await act(async () => {
        await latest!.addItem("BHP.AX");
      });
      expect(latest!.feedback).toEqual({
        message: "BHP.AX was added to your watchlist.",
        tone: "success",
      });

      act(() => {
        jest.advanceTimersByTime(3_999);
      });
      expect(latest!.feedback?.tone).toBe("success");
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(latest!.feedback).toBeNull();

      await act(async () => {
        await latest!.addItem("BHP.AX");
      });
      expect(latest!.feedback?.tone).toBe("error");
      act(() => {
        jest.advanceTimersByTime(30_000);
      });
      expect(latest!.feedback?.tone).toBe("error");
      renderer!.unmount();
    } finally {
      jest.useRealTimers();
    }
  });
});
