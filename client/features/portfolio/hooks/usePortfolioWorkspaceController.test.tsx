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
};

const createDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
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

    act(() => jest.runOnlyPendingTimers());
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
    act(() => jest.advanceTimersByTime(1_000));
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
    expect(savePortfolioConfigMock).toHaveBeenCalledWith("user-a", {
      tags: [],
    });
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
    const editableTarget = { matches: jest.fn(() => true) };

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
