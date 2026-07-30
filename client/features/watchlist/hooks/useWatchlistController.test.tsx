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

describe("useWatchlistController", () => {
  beforeAll(() => {
    jest.doMock("@/components/authContext", () => ({
      useAuth: () => mockAuthState,
    }));
    jest.doMock("@/components/supabase", () => ({
      __esModule: true,
      default: {},
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
