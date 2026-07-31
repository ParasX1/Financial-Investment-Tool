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
});
