import * as React from "react";
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import {
  loadPortfolioConfig,
  savePortfolioConfig,
} from "../data/portfolioPrefs";
import { createDefaultWorkspace } from "../state/workspaceDefaults";
import { getWorkspaceStorageKey } from "../state/workspaceStorage";
import { usePortfolioWorkspaceController } from "./usePortfolioWorkspaceController";

jest.mock("../data/portfolioPrefs", () => ({
  loadPortfolioConfig: jest.fn(),
  savePortfolioConfig: jest.fn(),
}));

const TODAY = "2026-07-28";
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const loadPortfolioConfigMock = jest.mocked(loadPortfolioConfig);
const savePortfolioConfigMock = jest.mocked(savePortfolioConfig);

type ControllerProps = {
  userId?: string;
  authLoading: boolean;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

const createDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const installWindow = (initialValues: Record<string, string> = {}) => {
  const values = { ...initialValues };
  const listeners = new Map<string, Set<EventListener>>();
  const storage = {
    getItem: jest.fn((key: string) => values[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      values[key] = value;
    }),
  };
  const addEventListener = jest.fn(
    (type: string, listener: EventListenerOrEventListenerObject) => {
      if (typeof listener !== "function") return;
      const activeListeners = listeners.get(type) ?? new Set<EventListener>();
      activeListeners.add(listener);
      listeners.set(type, activeListeners);
    },
  );
  const removeEventListener = jest.fn(
    (type: string, listener: EventListenerOrEventListenerObject) => {
      if (typeof listener !== "function") return;
      const activeListeners = listeners.get(type);
      activeListeners?.delete(listener);
      if (!activeListeners?.size) listeners.delete(type);
    },
  );
  const windowValue = {
    localStorage: storage,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    addEventListener,
    removeEventListener,
    innerWidth: 1440,
    innerHeight: 900,
  } as unknown as Window & typeof globalThis;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: windowValue,
  });
  return { storage, listeners, addEventListener, removeEventListener };
};

const renderController = async (initialProps: ControllerProps) => {
  let props = initialProps;
  let latest!: ReturnType<typeof usePortfolioWorkspaceController>;
  let renderer!: ReactTestRenderer;

  function Probe() {
    latest = usePortfolioWorkspaceController(props);
    return null;
  }

  await act(async () => {
    renderer = TestRenderer.create(<Probe />);
    await Promise.resolve();
  });

  return {
    get latest() {
      return latest;
    },
    async update(nextProps: ControllerProps) {
      props = nextProps;
      await act(async () => {
        renderer.update(<Probe />);
        await Promise.resolve();
      });
    },
    unmount() {
      act(() => renderer.unmount());
    },
  };
};

const advancePersistenceTimers = async (milliseconds = 500) => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(milliseconds);
  });
};

const applySymbols = (
  harness: Awaited<ReturnType<typeof renderController>>,
  symbols: string[],
) => {
  act(() => harness.latest.setDraftSymbols(symbols));
  act(() => harness.latest.actions.applyDraft());
};

const installDeferredCloudWrites = () => {
  const writes: (Deferred<void> & { userId: string; tags: string[] })[] = [];
  const cloud = new Map<string, string[]>();
  savePortfolioConfigMock.mockImplementation((userId, prefs) => {
    const write = { ...createDeferred<void>(), userId, tags: [...prefs.tags] };
    writes.push(write);
    return write.promise.then(() => {
      cloud.set(write.userId, write.tags);
    });
  });
  return {
    writes,
    cloud,
    async settle() {
      // Drain requests that begin while an earlier request is being settled.
      for (let index = 0; index < writes.length; index += 1) {
        await act(async () => {
          writes[index].resolve(undefined);
          await Promise.resolve();
        });
      }
    },
  };
};

beforeEach(() => {
  jest.useFakeTimers();
  loadPortfolioConfigMock.mockReset();
  savePortfolioConfigMock.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  if (originalWindow) {
    Object.defineProperty(globalThis, "window", originalWindow);
  } else {
    Reflect.deleteProperty(globalThis, "window");
  }
});

describe("usePortfolioWorkspaceController", () => {
  it("persists ordinary completed symbol changes in their applied order", async () => {
    installWindow({
      [getWorkspaceStorageKey("save-control")]: JSON.stringify(
        createDefaultWorkspace(TODAY, ["AAPL"]),
      ),
    });
    const deferred = installDeferredCloudWrites();
    const harness = await renderController({
      userId: "save-control",
      authLoading: false,
    });
    try {
      await advancePersistenceTimers();
      expect(deferred.writes).toHaveLength(1);
      await act(async () => deferred.writes[0].resolve(undefined));
      applySymbols(harness, ["MSFT"]);
      await advancePersistenceTimers();
      expect(deferred.writes.map(({ tags }) => tags)).toEqual([
        ["AAPL"],
        ["MSFT"],
      ]);
      await act(async () => deferred.writes[1].resolve(undefined));
      expect(deferred.cloud.get("save-control")).toEqual(["MSFT"]);
      expect(harness.latest.persistenceStatus).toBeNull();
    } finally {
      harness.unmount();
      await deferred.settle();
    }
  });

  it("serializes overlapping cloud writes so older symbols cannot finish after newer symbols", async () => {
    installWindow({
      [getWorkspaceStorageKey("save-order")]: JSON.stringify(
        createDefaultWorkspace(TODAY, ["AAPL"]),
      ),
    });
    const deferred = installDeferredCloudWrites();
    const harness = await renderController({
      userId: "save-order",
      authLoading: false,
    });
    try {
      await advancePersistenceTimers();
      applySymbols(harness, ["MSFT"]);
      await advancePersistenceTimers();
      expect(harness.latest.workspace.symbols).toEqual(["MSFT"]);
      expect(deferred.writes).toHaveLength(1);
      await act(async () => deferred.writes[0].resolve(undefined));
      expect(deferred.writes.map(({ tags }) => tags)).toEqual([
        ["AAPL"],
        ["MSFT"],
      ]);
      await act(async () => deferred.writes[1].resolve(undefined));
      expect(deferred.cloud.get("save-order")).toEqual(["MSFT"]);
      expect(harness.latest.persistenceStatus).toBeNull();
    } finally {
      harness.unmount();
      await deferred.settle();
    }
  });

  it("coalesces waiting cloud writes to the latest applied symbols", async () => {
    installWindow({
      [getWorkspaceStorageKey("save-coalesce")]: JSON.stringify(
        createDefaultWorkspace(TODAY, ["AAPL"]),
      ),
    });
    const deferred = installDeferredCloudWrites();
    const harness = await renderController({
      userId: "save-coalesce",
      authLoading: false,
    });
    try {
      await advancePersistenceTimers();
      applySymbols(harness, ["MSFT"]);
      await advancePersistenceTimers();
      applySymbols(harness, ["NVDA"]);
      await advancePersistenceTimers();
      expect(deferred.writes).toHaveLength(1);
      await act(async () => deferred.writes[0].resolve(undefined));
      expect(deferred.writes.map(({ tags }) => tags)).toEqual([
        ["AAPL"],
        ["NVDA"],
      ]);
      await act(async () => deferred.writes[1].resolve(undefined));
      expect(deferred.cloud.get("save-coalesce")).toEqual(["NVDA"]);
    } finally {
      harness.unmount();
      await deferred.settle();
    }
  });

  it("continues the latest cloud write after an older failure without stale feedback", async () => {
    installWindow({
      [getWorkspaceStorageKey("save-old-failure")]: JSON.stringify(
        createDefaultWorkspace(TODAY, ["AAPL"]),
      ),
    });
    const deferred = installDeferredCloudWrites();
    const harness = await renderController({
      userId: "save-old-failure",
      authLoading: false,
    });
    try {
      await advancePersistenceTimers();
      applySymbols(harness, ["MSFT"]);
      await advancePersistenceTimers();
      expect(deferred.writes).toHaveLength(1);
      await act(async () =>
        deferred.writes[0].reject(new Error("older write failed")),
      );
      expect(deferred.writes).toHaveLength(2);
      expect(harness.latest.persistenceStatus).toBeNull();
      await act(async () => deferred.writes[1].resolve(undefined));
      expect(deferred.cloud.get("save-old-failure")).toEqual(["MSFT"]);
      expect(harness.latest.persistenceStatus).toBeNull();
    } finally {
      harness.unmount();
      await deferred.settle();
    }
  });

  it("keeps a failed latest write explicit until retry saves the current symbols", async () => {
    installWindow({
      [getWorkspaceStorageKey("save-retry")]: JSON.stringify(
        createDefaultWorkspace(TODAY, ["AAPL"]),
      ),
    });
    const deferred = installDeferredCloudWrites();
    const harness = await renderController({
      userId: "save-retry",
      authLoading: false,
    });
    try {
      await advancePersistenceTimers();
      applySymbols(harness, ["MSFT"]);
      await advancePersistenceTimers();
      await act(async () => deferred.writes[0].resolve(undefined));
      await act(async () =>
        deferred.writes[1].reject(new Error("latest write failed")),
      );
      expect(harness.latest.persistenceStatus).toMatchObject({
        canRetry: true,
        retrying: false,
      });
      expect(harness.latest.persistenceStatus?.message).toContain(
        "could not be synced",
      );
      await advancePersistenceTimers(2_000);
      expect(deferred.writes).toHaveLength(2);
      act(() => harness.latest.actions.retryPersistence());
      await advancePersistenceTimers();
      expect(loadPortfolioConfigMock).not.toHaveBeenCalled();
      expect(deferred.writes[2].tags).toEqual(["MSFT"]);
      await act(async () =>
        deferred.writes[2].reject(new Error("retry failed")),
      );
      expect(harness.latest.persistenceStatus?.canRetry).toBe(true);
      act(() => harness.latest.actions.retryPersistence());
      await advancePersistenceTimers();
      await act(async () => deferred.writes[3].resolve(undefined));
      expect(deferred.cloud.get("save-retry")).toEqual(["MSFT"]);
      expect(harness.latest.persistenceStatus).toBeNull();
    } finally {
      harness.unmount();
      await deferred.settle();
    }
  });

  it("isolates owner feedback and serializes A writes across an A to B to A switch", async () => {
    installWindow({
      [getWorkspaceStorageKey("save-owner-a")]: JSON.stringify(
        createDefaultWorkspace(TODAY, ["AAPL"]),
      ),
      [getWorkspaceStorageKey("save-owner-b")]: JSON.stringify(
        createDefaultWorkspace(TODAY, ["GOOGL"]),
      ),
    });
    const deferred = installDeferredCloudWrites();
    const harness = await renderController({
      userId: "save-owner-a",
      authLoading: false,
    });
    try {
      await advancePersistenceTimers();
      applySymbols(harness, ["MSFT"]);
      await advancePersistenceTimers();
      await harness.update({ userId: "save-owner-a", authLoading: true });
      await advancePersistenceTimers();
      expect(deferred.writes).toHaveLength(1);
      await harness.update({ userId: "save-owner-b", authLoading: false });
      await advancePersistenceTimers();
      expect(
        deferred.writes.map(({ userId, tags }) => ({ userId, tags })),
      ).toEqual([
        { userId: "save-owner-a", tags: ["AAPL"] },
        { userId: "save-owner-b", tags: ["GOOGL"] },
      ]);
      await act(async () =>
        deferred.writes[1].reject(new Error("B write failed")),
      );
      expect(harness.latest.persistenceStatus?.canRetry).toBe(true);
      await harness.update({ userId: "save-owner-a", authLoading: false });
      expect(harness.latest.workspace.symbols).toEqual(["MSFT"]);
      applySymbols(harness, ["NVDA"]);
      await advancePersistenceTimers();
      expect(deferred.writes).toHaveLength(2);
      await act(async () =>
        deferred.writes[0].reject(new Error("stale A write failed")),
      );
      expect(harness.latest.persistenceStatus).toBeNull();
      expect(deferred.writes[2]).toMatchObject({
        userId: "save-owner-a",
        tags: ["NVDA"],
      });
      await act(async () => deferred.writes[2].resolve(undefined));
      expect(deferred.cloud.get("save-owner-a")).toEqual(["NVDA"]);
      expect(deferred.cloud.has("save-owner-b")).toBe(false);
      expect(harness.latest.persistenceStatus).toBeNull();
    } finally {
      harness.unmount();
      await deferred.settle();
    }
  });

  it("continues the queued latest symbols after unmount without updating stale feedback", async () => {
    installWindow({
      [getWorkspaceStorageKey("save-unmount")]: JSON.stringify(
        createDefaultWorkspace(TODAY, ["AAPL"]),
      ),
    });
    const deferred = installDeferredCloudWrites();
    const harness = await renderController({
      userId: "save-unmount",
      authLoading: false,
    });
    try {
      await advancePersistenceTimers();
      applySymbols(harness, ["MSFT"]);
      await advancePersistenceTimers();
      expect(deferred.writes).toHaveLength(1);
      harness.unmount();
      await act(async () => deferred.writes[0].resolve(undefined));
      expect(deferred.writes[1]).toMatchObject({
        userId: "save-unmount",
        tags: ["MSFT"],
      });
      await act(async () =>
        deferred.writes[1].reject(new Error("unmounted write failed")),
      );
      expect(harness.latest.persistenceStatus).toBeNull();
    } finally {
      harness.unmount();
      await deferred.settle();
    }
  });

  it("orders same-owner cloud writes across unmount and local-first remount", async () => {
    installWindow({
      [getWorkspaceStorageKey("save-remount")]: JSON.stringify(
        createDefaultWorkspace(TODAY, ["AAPL"]),
      ),
    });
    const deferred = installDeferredCloudWrites();
    const first = await renderController({
      userId: "save-remount",
      authLoading: false,
    });
    let second: Awaited<ReturnType<typeof renderController>> | undefined;
    try {
      await advancePersistenceTimers();
      applySymbols(first, ["MSFT"]);
      await advancePersistenceTimers();
      first.unmount();
      second = await renderController({
        userId: "save-remount",
        authLoading: false,
      });
      expect(second.latest.workspace.symbols).toEqual(["MSFT"]);
      expect(loadPortfolioConfigMock).not.toHaveBeenCalled();
      applySymbols(second, ["NVDA"]);
      await advancePersistenceTimers();
      expect(deferred.writes).toHaveLength(1);
      await act(async () => deferred.writes[0].resolve(undefined));
      expect(deferred.writes.map(({ tags }) => tags)).toEqual([
        ["AAPL"],
        ["NVDA"],
      ]);
      await act(async () => deferred.writes[1].resolve(undefined));
      expect(deferred.cloud.get("save-remount")).toEqual(["NVDA"]);
      expect(second.latest.persistenceStatus).toBeNull();
    } finally {
      first.unmount();
      second?.unmount();
      await deferred.settle();
    }
  });

  it("keeps trusted local symbols and session edits across local midnight", async () => {
    jest.setSystemTime(new Date(2026, 9, 3, 23, 59, 59));
    const local = createDefaultWorkspace("2026-10-03", ["LOCAL"]);
    installWindow({
      [getWorkspaceStorageKey("user-a")]: JSON.stringify(local),
    });
    loadPortfolioConfigMock.mockResolvedValue({ tags: ["REMOTE"] });
    const harness = await renderController({
      userId: "user-a",
      authLoading: false,
    });
    const cardId = harness.latest.workspace.cards[0].id;
    const draftInputs = { ...harness.latest.draftInputs, benchmark: "QQQ" };
    act(() => {
      harness.latest.setDraftSymbols(["DRAFT"]);
      harness.latest.setDraftInputs(draftInputs);
      harness.latest.actions.updateCardMetric(cardId, "BetaAnalysis");
      harness.latest.actions.updateObserverWindow(cardId, { x: 77 });
    });
    expect(loadPortfolioConfigMock).not.toHaveBeenCalled();

    jest.setSystemTime(new Date(2026, 9, 4, 0, 0, 1));
    await harness.update({ userId: "user-a", authLoading: false });
    await act(async () => {
      jest.advanceTimersByTime(1_000);
      await Promise.resolve();
    });

    expect(harness.latest.today).toBe("2026-10-04");
    expect(harness.latest.workspace.symbols).toEqual(["LOCAL"]);
    expect(harness.latest.draftSymbols).toEqual(["DRAFT"]);
    expect(harness.latest.draftInputs).toEqual(draftInputs);
    expect(harness.latest.workspace.cards[0].metricType).toBe("BetaAnalysis");
    expect(harness.latest.workspace.observerLayout[cardId].x).toBe(77);
    expect(loadPortfolioConfigMock).not.toHaveBeenCalled();
    expect(savePortfolioConfigMock).toHaveBeenLastCalledWith("user-a", {
      tags: ["LOCAL"],
    });
    harness.unmount();
  });

  it("keeps user A data out of user B persistence while B hydration is pending", async () => {
    const userAWorkspace = createDefaultWorkspace(TODAY, ["AAPL"]);
    const userBRemote = createDeferred<{ tags: string[] }>();
    const { storage } = installWindow({
      [getWorkspaceStorageKey("user-a")]: JSON.stringify(userAWorkspace),
    });
    loadPortfolioConfigMock.mockImplementation((userId) =>
      userId === "user-b"
        ? userBRemote.promise
        : Promise.resolve({ tags: ["SHOULD_NOT_LOAD"] }),
    );
    const harness = await renderController({
      userId: "user-a",
      authLoading: false,
    });

    expect(harness.latest.workspace.symbols).toEqual(["AAPL"]);
    expect(loadPortfolioConfigMock).not.toHaveBeenCalledWith("user-a");

    await advancePersistenceTimers(1_000);
    storage.setItem.mockClear();
    savePortfolioConfigMock.mockClear();

    await harness.update({ userId: "user-a", authLoading: true });
    act(() => jest.advanceTimersByTime(1_000));
    const writesWhileAuthLoading = [...storage.setItem.mock.calls];
    const remoteWritesWhileAuthLoading = [
      ...savePortfolioConfigMock.mock.calls,
    ];

    await harness.update({ userId: "user-b", authLoading: false });
    act(() => jest.advanceTimersByTime(1_000));
    const writesBeforeUserBHydration = storage.setItem.mock.calls.filter(
      ([key]) => key === getWorkspaceStorageKey("user-b"),
    );
    const remoteWritesBeforeUserBHydration =
      savePortfolioConfigMock.mock.calls.filter(
        ([userId]) => userId === "user-b",
      );

    await act(async () => {
      userBRemote.resolve({ tags: ["MSFT"] });
      await userBRemote.promise;
    });
    await advancePersistenceTimers(1_000);
    const latestUserBWrite = storage.setItem.mock.calls
      .filter(([key]) => key === getWorkspaceStorageKey("user-b"))
      .at(-1);
    harness.unmount();

    expect(writesWhileAuthLoading).toEqual([]);
    expect(remoteWritesWhileAuthLoading).toEqual([]);
    expect(writesBeforeUserBHydration).toEqual([]);
    expect(remoteWritesBeforeUserBHydration).toEqual([]);
    expect(JSON.parse(latestUserBWrite?.[1] ?? "{}").symbols).toEqual(["MSFT"]);
    expect(savePortfolioConfigMock).toHaveBeenCalledWith("user-b", {
      tags: ["MSFT"],
    });
  });

  it("switches keyboard modes and removes its listener on unmount", async () => {
    const { listeners, removeEventListener } = installWindow();
    const harness = await renderController({ authLoading: false });
    const latestKeydownListener = () =>
      Array.from(listeners.get("keydown") ?? []).at(-1);

    expect(listeners.get("keydown")?.size).toBe(1);
    act(() => {
      latestKeydownListener()?.({
        key: "o",
        target: null,
      } as unknown as Event);
    });
    expect(harness.latest.workspace.view).toEqual({ mode: "observation" });
    expect(listeners.get("keydown")?.size).toBe(1);

    act(() => {
      latestKeydownListener()?.({
        key: "Escape",
        target: null,
      } as unknown as Event);
    });
    expect(harness.latest.workspace.view).toEqual({ mode: "board" });
    expect(harness.latest.announcement).toBe("Returned to Board");
    expect(listeners.get("keydown")?.size).toBe(1);

    const activeListener = latestKeydownListener();
    harness.unmount();

    expect(removeEventListener).toHaveBeenCalledWith("keydown", activeListener);
    expect(listeners.has("keydown")).toBe(false);
  });

  it("hydrates remote preferences and persists subsequent local and remote state", async () => {
    const { storage } = installWindow();
    loadPortfolioConfigMock.mockResolvedValue({
      tags: ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META"],
    });
    savePortfolioConfigMock.mockRejectedValue(new Error("offline"));

    const harness = await renderController({
      userId: "user-a",
      authLoading: false,
    });

    expect(harness.latest.workspace.symbols).toEqual([
      "AAPL",
      "MSFT",
      "NVDA",
      "GOOGL",
      "AMZN",
    ]);
    expect(harness.latest.draftSymbols).toEqual(
      harness.latest.workspace.symbols,
    );
    expect(harness.latest.symbolOptions.slice(0, 5)).toEqual(
      harness.latest.workspace.symbols,
    );

    await act(async () => {
      jest.advanceTimersByTime(500);
      await Promise.resolve();
    });

    expect(storage.setItem).toHaveBeenCalledWith(
      getWorkspaceStorageKey("user-a"),
      expect.any(String),
    );
    expect(savePortfolioConfigMock).toHaveBeenCalledWith("user-a", {
      tags: ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN"],
    });
    harness.unmount();
  });

  it("falls back to a local workspace when storage and remote preferences fail", async () => {
    const listeners = new Map<string, Set<EventListener>>();
    const blockedWindow = {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
      addEventListener: (type: string, listener: EventListener) => {
        const active = listeners.get(type) ?? new Set<EventListener>();
        active.add(listener);
        listeners.set(type, active);
      },
      removeEventListener: (type: string, listener: EventListener) => {
        listeners.get(type)?.delete(listener);
      },
      innerWidth: 1200,
      innerHeight: 800,
    } as unknown as Window & typeof globalThis;
    Object.defineProperty(blockedWindow, "localStorage", {
      configurable: true,
      get() {
        throw new Error("Storage is blocked");
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: blockedWindow,
    });
    loadPortfolioConfigMock.mockRejectedValue(new Error("remote offline"));

    const harness = await renderController({
      userId: "user-a",
      authLoading: false,
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(harness.latest.workspace.symbols).toEqual([]);
    expect(harness.latest.focusedCard?.id).toBe("portfolio-card-1");
    await act(async () => {
      jest.advanceTimersByTime(500);
      await Promise.resolve();
    });
    expect(savePortfolioConfigMock).not.toHaveBeenCalled();
    expect(harness.latest.persistenceStatus?.message).toContain(
      "Changes stay in this session",
    );
    harness.unmount();
  });

  it("does not persist a failed first load, so remount can recover saved symbols", async () => {
    const { storage } = installWindow();
    loadPortfolioConfigMock.mockRejectedValueOnce(new Error("offline"));
    const failed = await renderController({
      userId: "user-a",
      authLoading: false,
    });

    await act(async () => {
      jest.advanceTimersByTime(1_000);
      await Promise.resolve();
    });
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(savePortfolioConfigMock).not.toHaveBeenCalled();
    failed.unmount();

    loadPortfolioConfigMock.mockResolvedValueOnce({ tags: ["AAPL"] });
    const recovered = await renderController({
      userId: "user-a",
      authLoading: false,
    });
    expect(loadPortfolioConfigMock).toHaveBeenCalledTimes(2);
    expect(recovered.latest.workspace.symbols).toEqual(["AAPL"]);
    recovered.unmount();
  });

  it("treats a successful empty response as hydrated preferences", async () => {
    const { storage } = installWindow();
    loadPortfolioConfigMock.mockResolvedValue({ tags: [] });
    const harness = await renderController({
      userId: "user-a",
      authLoading: false,
    });

    await act(async () => {
      jest.advanceTimersByTime(1_000);
      await Promise.resolve();
    });
    expect(storage.setItem).toHaveBeenCalled();
    expect(savePortfolioConfigMock).toHaveBeenCalledWith("user-a", {
      tags: [],
    });
    expect(harness.latest.persistenceStatus).toBeNull();
    harness.unmount();
  });

  it("recovers remote symbols without replacing session inputs, cards, or drafts", async () => {
    const { storage } = installWindow();
    loadPortfolioConfigMock.mockRejectedValueOnce(new Error("offline"));
    const harness = await renderController({
      userId: "user-a",
      authLoading: false,
    });
    const inputs = { ...harness.latest.draftInputs, benchmark: "QQQ" };
    const cardId = harness.latest.workspace.cards[0].id;
    act(() => harness.latest.setDraftInputs(inputs));
    act(() => harness.latest.actions.applyDraft());
    act(() => {
      harness.latest.actions.updateCardMetric(cardId, "BetaAnalysis");
      harness.latest.actions.updateObserverWindow(cardId, { x: 77 });
      harness.latest.setDraftSymbols(["NVDA"]);
    });
    act(() => jest.advanceTimersByTime(1_000));
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(savePortfolioConfigMock).not.toHaveBeenCalled();

    const recovery = createDeferred<{ tags: string[] }>();
    loadPortfolioConfigMock.mockReturnValueOnce(recovery.promise);
    act(() => harness.latest.actions.retryPersistence());
    expect(harness.latest.persistenceStatus?.retrying).toBe(true);
    await act(async () => {
      recovery.resolve({ tags: ["AAPL", "MSFT"] });
      await recovery.promise;
    });

    expect(harness.latest.workspace.symbols).toEqual(["AAPL", "MSFT"]);
    expect(harness.latest.draftSymbols).toEqual(["NVDA"]);
    expect(harness.latest.workspace.globalInputs).toEqual(inputs);
    expect(harness.latest.workspace.cards[0].metricType).toBe("BetaAnalysis");
    expect(harness.latest.workspace.observerLayout[cardId].x).toBe(77);
    await act(async () => {
      jest.advanceTimersByTime(1_000);
      await Promise.resolve();
    });
    expect(
      JSON.parse(storage.setItem.mock.calls.at(-1)?.[1] ?? "{}"),
    ).toMatchObject({
      symbols: ["AAPL", "MSFT"],
      globalInputs: inputs,
    });
    expect(savePortfolioConfigMock).toHaveBeenCalledWith("user-a", {
      tags: ["AAPL", "MSFT"],
    });
    harness.unmount();
  });

  it("keeps explicitly applied offline symbols when a retry returns older cloud tags", async () => {
    installWindow();
    loadPortfolioConfigMock.mockRejectedValueOnce(new Error("offline"));
    const harness = await renderController({
      userId: "user-a",
      authLoading: false,
    });
    act(() => harness.latest.setDraftSymbols(["NVDA"]));
    act(() => harness.latest.actions.applyDraft());
    act(() => jest.advanceTimersByTime(1_000));
    expect(savePortfolioConfigMock).not.toHaveBeenCalled();

    const recovery = createDeferred<{ tags: string[] }>();
    loadPortfolioConfigMock.mockReturnValueOnce(recovery.promise);
    act(() => harness.latest.actions.retryPersistence());
    act(() => harness.latest.setDraftSymbols(["GOOGL"]));
    act(() => harness.latest.actions.applyDraft());
    await act(async () => {
      recovery.resolve({ tags: ["AAPL"] });
      await recovery.promise;
    });
    expect(harness.latest.workspace.symbols).toEqual(["GOOGL"]);
    expect(harness.latest.draftSymbols).toEqual(["GOOGL"]);
    await act(async () => {
      jest.advanceTimersByTime(1_000);
      await Promise.resolve();
    });
    expect(savePortfolioConfigMock).toHaveBeenCalledWith("user-a", {
      tags: ["GOOGL"],
    });
    harness.unmount();
  });

  it("shows failed saving and retries current symbols without rehydrating", async () => {
    installWindow();
    loadPortfolioConfigMock.mockResolvedValue({ tags: ["AAPL"] });
    savePortfolioConfigMock.mockRejectedValueOnce(new Error("offline"));
    const harness = await renderController({
      userId: "user-a",
      authLoading: false,
    });
    await act(async () => {
      jest.advanceTimersByTime(500);
      await Promise.resolve();
    });
    expect(harness.latest.persistenceStatus?.message).toContain(
      "could not be synced",
    );
    expect(harness.latest.persistenceStatus?.canRetry).toBe(true);

    act(() => harness.latest.actions.retryPersistence());
    await act(async () => {
      jest.advanceTimersByTime(500);
      await Promise.resolve();
    });
    expect(loadPortfolioConfigMock).toHaveBeenCalledTimes(1);
    expect(savePortfolioConfigMock).toHaveBeenCalledTimes(2);
    expect(savePortfolioConfigMock).toHaveBeenLastCalledWith("user-a", {
      tags: ["AAPL"],
    });
    expect(harness.latest.persistenceStatus).toBeNull();
    harness.unmount();
  });

  it("reports browser storage failures and retries without losing the workspace", async () => {
    const { storage } = installWindow();
    storage.setItem.mockImplementationOnce(() => {
      throw new Error("quota exceeded");
    });
    const harness = await renderController({ authLoading: false });
    act(() => jest.advanceTimersByTime(220));
    expect(harness.latest.persistenceStatus?.message).toContain(
      "could not be saved in this browser",
    );
    act(() => harness.latest.actions.retryPersistence());
    act(() => jest.advanceTimersByTime(220));
    expect(storage.setItem).toHaveBeenCalledTimes(2);
    expect(harness.latest.persistenceStatus).toBeNull();
    harness.unmount();
  });

  it("ignores recovery after an account change and cancels the previous account's writes", async () => {
    const { storage } = installWindow();
    loadPortfolioConfigMock.mockRejectedValueOnce(new Error("offline"));
    const harness = await renderController({
      userId: "user-a",
      authLoading: false,
    });
    act(() => harness.latest.setDraftSymbols(["NVDA"]));
    act(() => harness.latest.actions.applyDraft());
    const recovery = createDeferred<{ tags: string[] }>();
    loadPortfolioConfigMock.mockReturnValueOnce(recovery.promise);
    act(() => harness.latest.actions.retryPersistence());
    loadPortfolioConfigMock.mockResolvedValueOnce({ tags: ["MSFT"] });
    await harness.update({ userId: "user-b", authLoading: false });
    await act(async () => {
      recovery.resolve({ tags: ["AAPL"] });
      await recovery.promise;
      jest.advanceTimersByTime(1_000);
      await Promise.resolve();
    });
    expect(harness.latest.workspace.symbols).toEqual(["MSFT"]);
    expect(storage.setItem.mock.calls.map(([key]) => key)).toEqual([
      getWorkspaceStorageKey("user-b"),
    ]);
    expect(savePortfolioConfigMock.mock.calls).toEqual([
      ["user-b", { tags: ["MSFT"] }],
    ]);
    harness.unmount();
  });

  it("ignores both successful and failed remote hydration after unmount", async () => {
    installWindow();
    const successfulRemote = createDeferred<{ tags: string[] }>();
    loadPortfolioConfigMock.mockReturnValueOnce(successfulRemote.promise);
    const successfulHarness = await renderController({
      userId: "user-success",
      authLoading: false,
    });
    successfulHarness.unmount();

    await act(async () => {
      successfulRemote.resolve({ tags: ["AAPL"] });
      await successfulRemote.promise;
    });
    expect(savePortfolioConfigMock).not.toHaveBeenCalled();

    let rejectRemote!: (reason: unknown) => void;
    const failedRemote = new Promise<{ tags: string[] }>((_resolve, reject) => {
      rejectRemote = reject;
    });
    loadPortfolioConfigMock.mockReturnValueOnce(failedRemote);
    const failedHarness = await renderController({
      userId: "user-failure",
      authLoading: false,
    });
    failedHarness.unmount();

    await act(async () => {
      rejectRemote(new Error("offline"));
      await failedRemote.catch(() => undefined);
      await Promise.resolve();
    });
    expect(savePortfolioConfigMock).not.toHaveBeenCalled();
  });

  it("is safe to render and arrange during server-side rendering", async () => {
    Reflect.deleteProperty(globalThis, "window");
    const harness = await renderController({ authLoading: false });
    const originalLayout = harness.latest.workspace.observerLayout;

    act(() => harness.latest.actions.arrangeObserver());

    expect(loadPortfolioConfigMock).not.toHaveBeenCalled();
    expect(harness.latest.workspace.observerLayout).toBe(originalLayout);
    expect(harness.latest.pending).toBe(false);
    harness.unmount();
  });

  it("honours keyboard guards and board, focus, and observation shortcuts", async () => {
    const { listeners } = installWindow();
    const harness = await renderController({ authLoading: false });
    const keydown = () => Array.from(listeners.get("keydown") ?? []).at(-1);
    const editableTarget = { closest: jest.fn(() => ({})) };

    act(() => {
      keydown()?.({ key: "o", target: editableTarget } as unknown as Event);
    });
    expect(harness.latest.workspace.view).toEqual({ mode: "board" });

    act(() => {
      keydown()?.({ key: "f", target: null } as unknown as Event);
    });
    expect(harness.latest.workspace.view).toEqual({
      mode: "focus",
      cardId: "portfolio-card-1",
    });

    act(() => {
      keydown()?.({ key: "G", target: null } as unknown as Event);
    });
    expect(harness.latest.workspace.view).toEqual({ mode: "board" });

    act(() => {
      keydown()?.({ key: "Escape", target: null } as unknown as Event);
      keydown()?.({ key: "x", target: null } as unknown as Event);
    });
    expect(harness.latest.workspace.view).toEqual({ mode: "board" });
    harness.unmount();
  });

  it.each([
    { ctrlKey: true },
    { metaKey: true },
    { altKey: true },
    { shiftKey: true },
    { isComposing: true },
    { repeat: true },
    { defaultPrevented: true },
  ])("leaves workspace shortcuts untouched for %o", async (guard) => {
    const { listeners } = installWindow();
    const harness = await renderController({ authLoading: false });
    const keydown = Array.from(listeners.get("keydown") ?? []).at(-1);
    act(() =>
      keydown?.({ key: "o", target: null, ...guard } as unknown as Event),
    );
    expect(harness.latest.workspace.view).toEqual({ mode: "board" });
    harness.unmount();
  });

  it("applies valid drafts, rejects invalid ranges, and exposes card actions", async () => {
    installWindow();
    const harness = await renderController({ authLoading: false });
    const originalInputs = harness.latest.workspace.globalInputs;

    act(() => {
      harness.latest.setDraftInputs({
        ...originalInputs,
        startDate: originalInputs.endDate,
      });
    });
    expect(harness.latest.rangeError).toBe(
      "The start date must be before the end date.",
    );
    act(() => harness.latest.actions.applyDraft());
    expect(harness.latest.workspace.globalInputs).toEqual(originalInputs);

    act(() => {
      harness.latest.setDraftInputs(originalInputs);
      harness.latest.setDraftSymbols(["AAPL"]);
    });
    expect(harness.latest.pending).toBe(true);
    act(() => harness.latest.actions.applyDraft());
    expect(harness.latest.workspace.symbols).toEqual(["AAPL"]);
    expect(harness.latest.announcement).toBe("Analysis applied to 1 symbol");

    act(() => harness.latest.setDraftSymbols(["AAPL", "MSFT"]));
    act(() => harness.latest.actions.applyDraft());
    expect(harness.latest.announcement).toBe("Analysis applied to 2 symbols");

    act(() => harness.latest.actions.showObservation());
    expect(harness.latest.workspace.view).toEqual({ mode: "observation" });
    act(() => harness.latest.actions.showFocus());
    expect(harness.latest.workspace.view.mode).toBe("focus");
    act(() => harness.latest.actions.showBoard());
    expect(harness.latest.workspace.view).toEqual({ mode: "board" });

    act(() => harness.latest.actions.focusCard("missing-card"));
    expect(harness.latest.announcement).toBe(
      "Cumulative return opened in Focus",
    );

    const secondId = harness.latest.workspace.cards[1].id;
    const thirdId = harness.latest.workspace.cards[2].id;
    let cardProps = harness.latest.getCardProps(secondId);
    expect(cardProps).toMatchObject({
      symbols: ["AAPL", "MSFT"],
      cardCount: 6,
    });
    act(() => cardProps.onMetricChange("BetaAnalysis"));
    expect(
      harness.latest.workspace.cards.find((card) => card.id === secondId)
        ?.metricType,
    ).toBe("BetaAnalysis");
    act(() => cardProps.onOverride({ benchmark: "QQQ" }));
    expect(
      harness.latest.workspace.cards.find((card) => card.id === secondId)
        ?.overrides,
    ).toEqual({ benchmark: "QQQ" });
    act(() => cardProps.onResetInputs());
    cardProps = harness.latest.getCardProps(secondId);
    act(() => cardProps.onFocus());
    expect(harness.latest.announcement).toBe("Beta exposure opened in Focus");
    act(() => cardProps.onPromote());
    expect(harness.latest.workspace.cards[0].id).toBe(secondId);

    act(() => harness.latest.actions.deleteCard(thirdId));
    cardProps = harness.latest.getCardProps(secondId);
    act(() => cardProps.onDuplicate());
    expect(harness.latest.workspace.cards).toHaveLength(6);
    act(() => cardProps.onDelete());
    expect(
      harness.latest.workspace.cards.some((card) => card.id === secondId),
    ).toBe(false);
    harness.unmount();
  });

  it("updates, hides, and arranges observer windows through public actions", async () => {
    installWindow();
    const harness = await renderController({ authLoading: false });
    const cardId = harness.latest.workspace.cards[0].id;

    act(() => {
      harness.latest.actions.updateCardMetric(cardId, "AlphaComparison");
      harness.latest.actions.overrideCard(cardId, { riskFreeRate: 0.03 });
      harness.latest.actions.updateObserverWindow(cardId, { x: 77, z: 42 });
      harness.latest.actions.setObserverWindowVisibility(cardId, false);
    });
    expect(harness.latest.workspace.cards[0]).toMatchObject({
      metricType: "AlphaComparison",
      overrides: { riskFreeRate: 0.03 },
    });
    expect(harness.latest.workspace.observerLayout[cardId]).toMatchObject({
      x: 77,
      z: 42,
      visible: false,
    });

    act(() => harness.latest.actions.arrangeObserver());
    expect(harness.latest.workspace.observerLayout[cardId].visible).toBe(false);
    act(() => harness.latest.actions.resetCardInputs(cardId));
    expect(harness.latest.workspace.cards[0].overrides).toEqual({});
    harness.unmount();
  });
});
