import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import type { FetchTopPicksOptions } from "../api/fetchTopPicks";
import type { subscribeToTopPicksUpdates } from "../api/subscribeToTopPicksUpdates";
import type { TopPicksPrefs, TopPicksResponse, TopPicksRow } from "../types";

const DEFAULT_PREFS: TopPicksPrefs = {
  sort_key: "sharpe",
  sort_dir: "desc",
  page_size: 25,
};

const mockFetchTopPicks =
  jest.fn<(options: FetchTopPicksOptions) => Promise<TopPicksResponse>>();
const mockSubscribeToTopPicksUpdates = jest.fn<
  typeof subscribeToTopPicksUpdates
>();
let updateSubscriptions: {
  options: Parameters<typeof subscribeToTopPicksUpdates>[0];
  unsubscribe: () => void;
}[] = [];
const mockLoadTopPicksPrefs =
  jest.fn<(userId: string) => Promise<TopPicksPrefs>>();
const mockSaveTopPicksPrefs =
  jest.fn<(userId: string, prefs: TopPicksPrefs) => Promise<void>>();
let mockAuthState: {
  user: { id: string } | null;
  loading: boolean;
} = { user: null, loading: false };
let useTopPicksController: (typeof import("./useTopPicksController"))["useTopPicksController"];

const flushEffects = async () => {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
};

const emptyResponse: TopPicksResponse = {
  rows: [],
  total: 0,
  metadata: {},
  warnings: [],
};

const rowFor = (symbol: string): TopPicksRow => ({
  symbol,
  name: symbol,
  industry: "Technology",
  ret1y: 0.1,
  sharpe: 1,
  sortino: 1.2,
  volatility: 0.2,
  maxDD: -0.1,
  beta: 1,
  alpha: 0.02,
  infoRatio: 0.3,
});

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, reject, resolve };
};

const notifySnapshot = () => updateSubscriptions.at(-1)!.options.onUpdate();

const installMemoryStorage = () => {
  const values = new Map<string, string>();
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalLocalStorage = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  const storage: Storage = {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };

  if (!originalWindow) {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {},
    });
  }
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });

  return {
    values,
    restore: () => {
      if (originalLocalStorage) {
        Object.defineProperty(globalThis, "localStorage", originalLocalStorage);
      } else {
        Reflect.deleteProperty(globalThis, "localStorage");
      }
      if (originalWindow) {
        Object.defineProperty(globalThis, "window", originalWindow);
      } else {
        Reflect.deleteProperty(globalThis, "window");
      }
    },
  };
};

describe("useTopPicksController", () => {
  beforeAll(() => {
    jest.doMock("@/features/auth", () => ({
      useAuth: () => mockAuthState,
    }));
    jest.doMock("../api/fetchTopPicks", () => ({
      fetchTopPicks: mockFetchTopPicks,
    }));
    jest.doMock("../api/subscribeToTopPicksUpdates", () => ({
      subscribeToTopPicksUpdates: mockSubscribeToTopPicksUpdates,
    }));
    jest.doMock("../data/topPicksPrefsRepository", () => ({
      loadTopPicksPrefs: mockLoadTopPicksPrefs,
      saveTopPicksPrefs: mockSaveTopPicksPrefs,
    }));
    useTopPicksController =
      require("./useTopPicksController").useTopPicksController;
  });

  beforeEach(() => {
    mockAuthState = { user: null, loading: false };
    mockFetchTopPicks.mockReset();
    mockSubscribeToTopPicksUpdates.mockReset();
    updateSubscriptions = [];
    mockSubscribeToTopPicksUpdates.mockImplementation((options) => {
      const unsubscribe = jest.fn<() => void>();
      updateSubscriptions.push({ options, unsubscribe });
      return unsubscribe;
    });
    mockLoadTopPicksPrefs.mockReset();
    mockSaveTopPicksPrefs.mockReset();
    mockLoadTopPicksPrefs.mockResolvedValue(DEFAULT_PREFS);
    mockSaveTopPicksPrefs.mockResolvedValue(undefined);
  });

  it("waits for authentication hydration before fetching", async () => {
    mockAuthState = { user: null, loading: true };
    mockFetchTopPicks.mockResolvedValue(emptyResponse);
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useTopPicksController();
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushEffects();
    });

    expect(mockFetchTopPicks).not.toHaveBeenCalled();
    expect(mockSubscribeToTopPicksUpdates).not.toHaveBeenCalled();
    expect(latest!.loading).toBe(true);

    mockAuthState = { user: null, loading: false };
    await act(async () => {
      renderer!.update(<Probe />);
      await flushEffects();
    });

    expect(mockFetchTopPicks).toHaveBeenCalledTimes(1);
    renderer!.unmount();
  });

  it("never renders or fetches account B with account A preferences", async () => {
    const accountAPrefs = deferred<TopPicksPrefs>();
    const accountBPrefs = deferred<TopPicksPrefs>();
    mockAuthState = { user: { id: "account-a" }, loading: false };
    mockLoadTopPicksPrefs.mockImplementation((userId) =>
      userId === "account-a" ? accountAPrefs.promise : accountBPrefs.promise,
    );
    mockFetchTopPicks.mockImplementation(async ({ sortKey, pageSize }) => ({
      ...emptyResponse,
      rows: [rowFor(`${sortKey}-${pageSize}`)],
      total: 1,
    }));
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useTopPicksController();
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushEffects();
    });

    expect(mockFetchTopPicks).not.toHaveBeenCalled();

    await act(async () => {
      accountAPrefs.resolve({
        sort_key: "ret1y",
        sort_dir: "asc",
        page_size: 10,
      });
      await flushEffects();
    });

    expect(mockFetchTopPicks).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sortKey: "ret1y",
        sortDirection: "asc",
        pageSize: 10,
      }),
    );
    expect(latest!.rows[0]?.symbol).toBe("ret1y-10");

    mockAuthState = { user: { id: "account-b" }, loading: false };
    await act(async () => {
      renderer!.update(<Probe />);
      await flushEffects();
    });

    expect(mockLoadTopPicksPrefs).toHaveBeenLastCalledWith("account-b");
    expect(mockFetchTopPicks).toHaveBeenCalledTimes(1);
    expect(latest!.rows).toEqual([]);
    expect(latest!.loading).toBe(true);
    expect(latest!.sort).toEqual({ key: "sharpe", dir: "desc" });
    expect(latest!.pageSize).toBe(25);

    await act(async () => {
      accountBPrefs.resolve({
        sort_key: "alpha",
        sort_dir: "desc",
        page_size: 50,
      });
      await flushEffects();
    });

    expect(mockFetchTopPicks).toHaveBeenCalledTimes(2);
    expect(mockFetchTopPicks).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sortKey: "alpha",
        sortDirection: "desc",
        pageSize: 50,
      }),
    );
    expect(latest!.rows[0]?.symbol).toBe("alpha-50");
    renderer!.unmount();
  });

  it("scopes visible columns across signed-out and account switches", async () => {
    const browserStorage = installMemoryStorage();
    const accountBPrefs = deferred<TopPicksPrefs>();
    mockFetchTopPicks.mockResolvedValue(emptyResponse);
    mockLoadTopPicksPrefs.mockImplementation((userId) =>
      userId === "account-b"
        ? accountBPrefs.promise
        : Promise.resolve(DEFAULT_PREFS),
    );
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let renderer: ReactTestRenderer | undefined;

    function Probe() {
      latest = useTopPicksController();
      return null;
    }

    try {
      await act(async () => {
        renderer = TestRenderer.create(<Probe />);
        await flushEffects();
      });

      await act(async () => {
        latest!.setVisibleKeys(["symbol"]);
        await flushEffects();
      });
      expect(
        browserStorage.values.get("topPicks.visibleCols:signed-out:1Y"),
      ).toBe('["symbol"]');

      mockAuthState = { user: { id: "account-a" }, loading: false };
      await act(async () => {
        renderer!.update(<Probe />);
        await flushEffects();
      });

      expect(latest!.visibleKeys).not.toEqual(["symbol"]);
      expect(latest!.visibleKeys).toContain("rank");

      await act(async () => {
        latest!.setVisibleKeys(["name"]);
        await flushEffects();
      });
      expect(
        browserStorage.values.get("topPicks.visibleCols:user:account-a:1Y"),
      ).toBe('["name"]');

      mockAuthState = { user: { id: "account-b" }, loading: false };
      await act(async () => {
        renderer!.update(<Probe />);
        await flushEffects();
      });

      expect(latest!.visibleKeys).not.toEqual(["name"]);
      expect(latest!.visibleKeys).toContain("rank");

      await act(async () => {
        accountBPrefs.resolve(DEFAULT_PREFS);
        await flushEffects();
        latest!.setVisibleKeys(["rank"]);
        await flushEffects();
      });
      expect(
        browserStorage.values.get("topPicks.visibleCols:user:account-b:1Y"),
      ).toBe('["rank"]');

      mockAuthState = { user: null, loading: false };
      await act(async () => {
        renderer!.update(<Probe />);
        await flushEffects();
      });

      expect(latest!.visibleKeys).toEqual(["symbol"]);
    } finally {
      renderer?.unmount();
      browserStorage.restore();
    }
  });

  it("keeps visible column choices separate for each Top Picks window", async () => {
    const browserStorage = installMemoryStorage();
    mockFetchTopPicks.mockResolvedValue(emptyResponse);
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let renderer: ReactTestRenderer | undefined;

    function Probe() {
      latest = useTopPicksController();
      return null;
    }

    try {
      await act(async () => {
        renderer = TestRenderer.create(<Probe />);
        await flushEffects();
      });

      await act(async () => {
        latest!.setWindow("1D");
        await flushEffects();
      });
      expect(latest!.visibleKeys).toEqual(["rank", "symbol", "name", "ret1y"]);

      await act(async () => {
        latest!.setVisibleKeys(["symbol"]);
        await flushEffects();
      });
      expect(
        browserStorage.values.get("topPicks.visibleCols:signed-out:1D"),
      ).toBe('["symbol"]');

      await act(async () => {
        latest!.setWindow("1Y");
        await flushEffects();
      });

      expect(latest!.visibleKeys).toContain("sharpe");
      expect(latest!.visibleKeys).toContain("infoRatio");
      expect(
        browserStorage.values.get("topPicks.visibleCols:signed-out:1Y"),
      ).toContain("sharpe");
    } finally {
      renderer?.unmount();
      browserStorage.restore();
    }
  });

  it("saves only explicit preference changes after a failed read", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockAuthState = { user: { id: "account-a" }, loading: false };
    mockLoadTopPicksPrefs.mockRejectedValueOnce(new Error("read failed"));
    mockFetchTopPicks.mockResolvedValue(emptyResponse);
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useTopPicksController();
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushEffects();
    });

    expect(mockFetchTopPicks).toHaveBeenCalledWith(
      expect.objectContaining({
        sortKey: "sharpe",
        sortDirection: "desc",
        pageSize: 25,
      }),
    );
    expect(consoleError.mock.calls).toEqual([
      ["Unable to load Top Picks preferences."],
    ]);
    expect(mockSaveTopPicksPrefs).not.toHaveBeenCalled();

    await act(async () => {
      latest!.toggleSort("alpha");
      await flushEffects();
    });

    expect(mockSaveTopPicksPrefs).toHaveBeenLastCalledWith("account-a", {
      sort_key: "alpha",
      sort_dir: "desc",
      page_size: 25,
    });

    await act(async () => {
      latest!.setPageSize(50);
      await flushEffects();
    });

    expect(mockSaveTopPicksPrefs).toHaveBeenLastCalledWith("account-a", {
      sort_key: "alpha",
      sort_dir: "desc",
      page_size: 50,
    });
    expect(mockSaveTopPicksPrefs).toHaveBeenCalledTimes(2);

    renderer!.unmount();
    consoleError.mockRestore();
  });

  it("serializes saves and coalesces queued preferences to the latest state", async () => {
    const firstSave = deferred<void>();
    const latestSave = deferred<void>();
    mockAuthState = { user: { id: "account-a" }, loading: false };
    mockFetchTopPicks.mockResolvedValue(emptyResponse);
    mockSaveTopPicksPrefs
      .mockImplementationOnce(() => firstSave.promise)
      .mockImplementationOnce(() => latestSave.promise);
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let renderer: ReactTestRenderer;
    function Probe() {
      latest = useTopPicksController();
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushEffects();
      latest!.toggleSort("alpha");
      await flushEffects();
    });
    await act(async () => {
      latest!.setPageSize(50);
      await flushEffects();
      latest!.toggleSort("alpha");
      await flushEffects();
    });
    expect(mockSaveTopPicksPrefs).toHaveBeenCalledTimes(1);

    await act(async () => {
      firstSave.resolve(undefined);
      await flushEffects();
    });
    expect(mockSaveTopPicksPrefs).toHaveBeenCalledTimes(2);
    expect(mockSaveTopPicksPrefs).toHaveBeenLastCalledWith("account-a", {
      sort_key: "alpha",
      sort_dir: "asc",
      page_size: 50,
    });

    await act(async () => {
      latestSave.resolve(undefined);
      await flushEffects();
    });
    renderer!.unmount();
  });

  it("keeps the latest preferences dirty when an older save succeeds before the latest save fails", async () => {
    const firstSave = deferred<void>();
    const latestSave = deferred<void>();
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockAuthState = { user: { id: "account-a" }, loading: false };
    mockFetchTopPicks.mockResolvedValue(emptyResponse);
    mockSaveTopPicksPrefs
      .mockImplementationOnce(() => firstSave.promise)
      .mockImplementationOnce(() => latestSave.promise)
      .mockResolvedValueOnce(undefined);
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let renderer: ReactTestRenderer;
    function Probe() {
      latest = useTopPicksController();
      return null;
    }

    try {
      await act(async () => {
        renderer = TestRenderer.create(<Probe />);
        await flushEffects();
        latest!.toggleSort("alpha");
        await flushEffects();
      });
      expect(mockSaveTopPicksPrefs).toHaveBeenCalledTimes(1);

      await act(async () => {
        latest!.setPageSize(50);
        await flushEffects();
      });
      expect(mockSaveTopPicksPrefs).toHaveBeenCalledTimes(1);

      await act(async () => {
        firstSave.resolve(undefined);
        await flushEffects();
      });
      expect(mockSaveTopPicksPrefs).toHaveBeenCalledTimes(2);
      expect(mockSaveTopPicksPrefs).toHaveBeenLastCalledWith("account-a", {
        sort_key: "alpha",
        sort_dir: "desc",
        page_size: 50,
      });

      const sensitiveFailure = new Error("database details must stay private");
      await act(async () => {
        latestSave.reject(sensitiveFailure);
        await flushEffects();
      });
      expect(consoleError.mock.calls).toEqual([
        ["Unable to save Top Picks preferences."],
      ]);

      await act(async () => {
        latest!.toggleSort("alpha");
        await flushEffects();
      });
      expect(mockSaveTopPicksPrefs).toHaveBeenCalledTimes(3);
      expect(mockSaveTopPicksPrefs).toHaveBeenLastCalledWith("account-a", {
        sort_key: "alpha",
        sort_dir: "asc",
        page_size: 50,
      });
    } finally {
      renderer!.unmount();
      consoleError.mockRestore();
    }
  });

  it("continues the latest queued save after unmounting without surfacing its stale failure", async () => {
    const firstSave = deferred<void>();
    const latestSave = deferred<void>();
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockAuthState = { user: { id: "account-a" }, loading: false };
    mockFetchTopPicks.mockResolvedValue(emptyResponse);
    mockSaveTopPicksPrefs
      .mockImplementationOnce(() => firstSave.promise)
      .mockImplementationOnce(() => latestSave.promise);
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let renderer: ReactTestRenderer;
    function Probe() {
      latest = useTopPicksController();
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushEffects();
      latest!.toggleSort("alpha");
      await flushEffects();
      latest!.setPageSize(50);
      await flushEffects();
    });
    expect(mockSaveTopPicksPrefs).toHaveBeenCalledTimes(1);

    await act(async () => {
      renderer!.unmount();
      await flushEffects();
      firstSave.resolve(undefined);
      await flushEffects();
    });
    expect(mockSaveTopPicksPrefs).toHaveBeenCalledTimes(2);
    expect(mockSaveTopPicksPrefs).toHaveBeenLastCalledWith("account-a", {
      sort_key: "alpha",
      sort_dir: "desc",
      page_size: 50,
    });
    await act(async () => {
      latestSave.reject(new Error("unmounted write failed"));
      await flushEffects();
    });
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("serializes same-account saves across an unmount and remount", async () => {
    const staleSave = deferred<void>();
    const remountedSave = deferred<void>();
    mockAuthState = { user: { id: "account-a" }, loading: false };
    mockFetchTopPicks.mockResolvedValue(emptyResponse);
    mockSaveTopPicksPrefs
      .mockImplementationOnce(() => staleSave.promise)
      .mockImplementationOnce(() => remountedSave.promise);
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let firstRenderer: ReactTestRenderer | undefined;
    let secondRenderer: ReactTestRenderer | undefined;
    function Probe() {
      latest = useTopPicksController();
      return null;
    }

    try {
      await act(async () => {
        firstRenderer = TestRenderer.create(<Probe />);
        await flushEffects();
        latest!.toggleSort("alpha");
        await flushEffects();
      });
      expect(mockSaveTopPicksPrefs).toHaveBeenCalledTimes(1);

      await act(async () => {
        firstRenderer!.unmount();
        secondRenderer = TestRenderer.create(<Probe />);
        await flushEffects();
        latest!.setPageSize(50);
        await flushEffects();
      });
      expect(mockSaveTopPicksPrefs).toHaveBeenCalledTimes(1);

      await act(async () => {
        staleSave.resolve(undefined);
        await flushEffects();
      });
      expect(mockSaveTopPicksPrefs).toHaveBeenCalledTimes(2);
      expect(mockSaveTopPicksPrefs).toHaveBeenLastCalledWith("account-a", {
        sort_key: "sharpe",
        sort_dir: "desc",
        page_size: 50,
      });
    } finally {
      await act(async () => {
        staleSave.resolve(undefined);
        remountedSave.resolve(undefined);
        await flushEffects();
      });
      firstRenderer?.unmount();
      secondRenderer?.unmount();
    }
  });

  it("does not let a stalled save block another account scope", async () => {
    const accountASave = deferred<void>();
    const accountBSave = deferred<void>();
    mockAuthState = { user: { id: "account-a" }, loading: false };
    mockFetchTopPicks.mockResolvedValue(emptyResponse);
    mockSaveTopPicksPrefs.mockImplementation((userId) =>
      userId === "account-a" ? accountASave.promise : accountBSave.promise,
    );
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let renderer: ReactTestRenderer;
    function Probe() {
      latest = useTopPicksController();
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushEffects();
      latest!.toggleSort("alpha");
      await flushEffects();
    });
    expect(mockSaveTopPicksPrefs).toHaveBeenCalledTimes(1);
    expect(mockSaveTopPicksPrefs).toHaveBeenLastCalledWith("account-a", {
      sort_key: "alpha",
      sort_dir: "desc",
      page_size: 25,
    });

    mockAuthState = { user: { id: "account-b" }, loading: false };
    await act(async () => {
      renderer!.update(<Probe />);
      await flushEffects();
      latest!.setPageSize(50);
      await flushEffects();
    });
    expect(mockSaveTopPicksPrefs).toHaveBeenCalledTimes(2);
    expect(mockSaveTopPicksPrefs).toHaveBeenLastCalledWith("account-b", {
      sort_key: "sharpe",
      sort_dir: "desc",
      page_size: 50,
    });

    await act(async () => {
      accountBSave.resolve(undefined);
      await flushEffects();
    });
    await act(async () => {
      latest!.toggleSort("alpha");
      await flushEffects();
    });
    expect(mockSaveTopPicksPrefs).toHaveBeenCalledTimes(3);
    expect(mockSaveTopPicksPrefs).toHaveBeenLastCalledWith("account-b", {
      sort_key: "alpha",
      sort_dir: "desc",
      page_size: 50,
    });

    await act(async () => {
      accountASave.resolve(undefined);
      await flushEffects();
    });
    renderer!.unmount();
  });

  it("isolates stale save failures from the next account scope", async () => {
    const accountASave = deferred<void>();
    const accountBSave = deferred<void>();
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockAuthState = { user: { id: "account-a" }, loading: false };
    mockFetchTopPicks.mockResolvedValue(emptyResponse);
    mockSaveTopPicksPrefs.mockImplementation((userId) =>
      userId === "account-a" ? accountASave.promise : accountBSave.promise,
    );
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let renderer: ReactTestRenderer;
    function Probe() {
      latest = useTopPicksController();
      return null;
    }

    try {
      await act(async () => {
        renderer = TestRenderer.create(<Probe />);
        await flushEffects();
        latest!.toggleSort("alpha");
        await flushEffects();
      });

      mockAuthState = { user: { id: "account-b" }, loading: false };
      await act(async () => {
        renderer!.update(<Probe />);
        await flushEffects();
        latest!.setPageSize(50);
        await flushEffects();
      });
      expect(mockSaveTopPicksPrefs).toHaveBeenCalledTimes(2);
      expect(mockSaveTopPicksPrefs).toHaveBeenLastCalledWith("account-b", {
        sort_key: "sharpe",
        sort_dir: "desc",
        page_size: 50,
      });

      await act(async () => {
        accountASave.reject(new Error("account A write failed"));
        await flushEffects();
      });
      expect(consoleError).not.toHaveBeenCalled();
      expect(mockSaveTopPicksPrefs).toHaveBeenCalledTimes(2);

      await act(async () => {
        accountBSave.resolve(undefined);
        await flushEffects();
      });
    } finally {
      renderer!.unmount();
      consoleError.mockRestore();
    }
  });

  it("prevents clearing every visible column", async () => {
    mockFetchTopPicks.mockResolvedValue(emptyResponse);
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useTopPicksController();
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushEffects();
    });
    const initialVisibleKeys = latest!.visibleKeys;

    await act(async () => {
      latest!.setVisibleKeys([]);
      await flushEffects();
    });

    expect(latest!.visibleKeys).toEqual(initialVisibleKeys);
    renderer!.unmount();
  });

  it("retries the failed request without changing page or sort", async () => {
    mockFetchTopPicks
      .mockRejectedValueOnce(
        new Error("Top Picks are temporarily unavailable."),
      )
      .mockResolvedValueOnce(emptyResponse);
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useTopPicksController();
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushEffects();
    });

    expect(latest!.error).toBe("Top Picks are temporarily unavailable.");
    const firstRequest = mockFetchTopPicks.mock.calls[0]?.[0];

    await act(async () => {
      latest!.retry();
      await flushEffects();
    });

    const secondRequest = mockFetchTopPicks.mock.calls[1]?.[0];
    expect(mockFetchTopPicks).toHaveBeenCalledTimes(2);
    expect(secondRequest).toMatchObject({
      page: firstRequest?.page,
      pageSize: firstRequest?.pageSize,
      sortKey: firstRequest?.sortKey,
      sortDirection: firstRequest?.sortDirection,
    });
    expect(firstRequest?.signal?.aborted).toBe(true);
    expect(latest!.error).toBeNull();

    renderer!.unmount();
  });

  it("forces one request per retry while subsequent view changes only read snapshots", async () => {
    mockFetchTopPicks.mockResolvedValue({
      ...emptyResponse,
      rows: [rowFor("AAA")],
      total: 100,
    });
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useTopPicksController();
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushEffects();
      latest!.retry();
      await flushEffects();
    });
    expect(mockFetchTopPicks).toHaveBeenCalledTimes(2);
    expect(mockFetchTopPicks.mock.calls[1]?.[0].forceRefresh).toBe(true);

    await act(async () => {
      latest!.setPage(2);
      await flushEffects();
    });
    expect(mockFetchTopPicks).toHaveBeenCalledTimes(3);
    expect(mockFetchTopPicks.mock.calls[2]?.[0]).toMatchObject({
      page: 2,
      forceRefresh: false,
    });

    await act(async () => {
      latest!.toggleSort("ret1y");
      await flushEffects();
    });
    expect(mockFetchTopPicks).toHaveBeenCalledTimes(4);
    expect(mockFetchTopPicks.mock.calls[3]?.[0]).toMatchObject({
      page: 1,
      sortKey: "ret1y",
      forceRefresh: false,
    });

    await act(async () => {
      latest!.setWindow("1M");
      await flushEffects();
    });
    expect(mockFetchTopPicks).toHaveBeenCalledTimes(5);
    expect(mockFetchTopPicks.mock.calls[4]?.[0]).toMatchObject({
      window: "1M",
      forceRefresh: false,
    });

    mockAuthState = { user: { id: "account-a" }, loading: false };
    await act(async () => {
      renderer!.update(<Probe />);
      await flushEffects();
    });
    expect(mockFetchTopPicks).toHaveBeenCalledTimes(6);
    expect(mockFetchTopPicks.mock.calls[5]?.[0].forceRefresh).toBe(false);

    await act(async () => {
      notifySnapshot();
      await flushEffects();
    });
    expect(mockFetchTopPicks).toHaveBeenCalledTimes(7);
    expect(mockFetchTopPicks.mock.calls[6]?.[0].forceRefresh).toBe(false);
    renderer!.unmount();
  });

  it("forces a new explicit retry after an earlier forced request fails", async () => {
    const response = { ...emptyResponse, rows: [rowFor("AAA")], total: 1 };
    mockFetchTopPicks
      .mockResolvedValueOnce(response)
      .mockRejectedValueOnce(new Error("Refresh failed."))
      .mockResolvedValueOnce(response);
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useTopPicksController();
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushEffects();
      latest!.retry();
      await flushEffects();
    });
    expect(latest!.error).toBe("Refresh failed.");
    expect(latest!.rows.map((row) => row.symbol)).toEqual(["AAA"]);

    await act(async () => {
      latest!.retry();
      await flushEffects();
    });
    expect(mockFetchTopPicks.mock.calls.map(([request]) => request.forceRefresh))
      .toEqual([false, true, true]);
    expect(latest!.error).toBeNull();
    renderer!.unmount();
  });

  it("reads completed snapshots immediately without clearing visible rows", async () => {
    const refreshResponse = deferred<TopPicksResponse>();
    mockFetchTopPicks
      .mockResolvedValueOnce({
        rows: [rowFor("AAA")],
        total: 1,
        metadata: {},
        warnings: [
          "No usable market data for 6 symbols: BBB, CCC, DDD, EEE, FFF, GGG.",
        ],
      })
      .mockReturnValueOnce(refreshResponse.promise);
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useTopPicksController();
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushEffects();
    });

    expect(latest!.rows.map((row) => row.symbol)).toEqual(["AAA"]);

    await act(async () => {
      await flushEffects();
    });

    await act(async () => {
      notifySnapshot();
      await flushEffects();
    });

    expect(mockFetchTopPicks).toHaveBeenCalledTimes(2);
    expect(mockFetchTopPicks.mock.calls[1]?.[0]).toMatchObject({
      forceRefresh: false,
    });
    expect(latest!.rows.map((row) => row.symbol)).toEqual(["AAA"]);

    await act(async () => {
      refreshResponse.resolve({
        rows: [rowFor("AAA"), rowFor("BBB")],
        total: 2,
        metadata: {},
        warnings: [],
      });
      await flushEffects();
    });

    expect(latest!.rows.map((row) => row.symbol)).toEqual(["AAA", "BBB"]);
    renderer!.unmount();
  });

  it("waits for completion notifications instead of polling or forcing downloads", async () => {
    jest.useFakeTimers();
    const refreshResponse = deferred<TopPicksResponse>();
    mockFetchTopPicks
      .mockResolvedValueOnce({
        rows: [rowFor("AAA")],
        total: 1,
        metadata: {},
        warnings: [],
      })
      .mockReturnValueOnce(refreshResponse.promise);
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useTopPicksController();
      return null;
    }

    try {
      await act(async () => {
        renderer = TestRenderer.create(<Probe />);
        await flushEffects();
      });

      expect(latest!.rows.map((row) => row.symbol)).toEqual(["AAA"]);

      await act(async () => {
        jest.advanceTimersByTime(60_000);
        await flushEffects();
      });

      expect(mockFetchTopPicks).toHaveBeenCalledTimes(1);

      await act(async () => {
        notifySnapshot();
        await flushEffects();
      });

      expect(mockFetchTopPicks).toHaveBeenCalledTimes(2);
      expect(mockFetchTopPicks.mock.calls[1]?.[0]).toMatchObject({
        forceRefresh: false,
      });
      expect(latest!.syncing).toBe(true);
      expect(latest!.rows.map((row) => row.symbol)).toEqual(["AAA"]);

      await act(async () => {
        refreshResponse.resolve({
          rows: [rowFor("AAA"), rowFor("BBB")],
          total: 2,
          metadata: {},
          warnings: [],
        });
        await flushEffects();
      });

      expect(latest!.rows.map((row) => row.symbol)).toEqual(["AAA", "BBB"]);
      expect(latest!.syncing).toBe(false);
      renderer!.unmount();
    } finally {
      jest.useRealTimers();
    }
  });

  it("updates the local sync time when a different window snapshot is shown", async () => {
    jest.useFakeTimers();
    mockFetchTopPicks
      .mockResolvedValueOnce({
        rows: [rowFor("AAA")],
        total: 1,
        metadata: { generatedAt: "2026-08-25T03:00:00Z" },
        warnings: [],
      })
      .mockResolvedValueOnce({
        rows: [rowFor("BBB")],
        total: 1,
        metadata: { generatedAt: "2026-08-25T03:01:00Z" },
        warnings: [],
      })
      .mockResolvedValueOnce({
        rows: [rowFor("AAA")],
        total: 1,
        metadata: { generatedAt: "2026-08-25T03:00:00Z" },
        warnings: [],
      });
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useTopPicksController();
      return null;
    }

    try {
      jest.setSystemTime(new Date("2026-08-25T04:00:00Z"));
      await act(async () => {
        renderer = TestRenderer.create(<Probe />);
        await flushEffects();
      });
      const firstAppliedAt = latest!.lastUpdatedAt;

      jest.setSystemTime(new Date("2026-08-25T04:05:00Z"));
      await act(async () => {
        latest!.setWindow("1M");
        await flushEffects();
      });

      expect(latest!.lastUpdatedAt).not.toBe(firstAppliedAt);

      jest.setSystemTime(new Date("2026-08-25T04:10:00Z"));
      await act(async () => {
        latest!.setWindow("1Y");
        await flushEffects();
      });

      expect(latest!.lastUpdatedAt).not.toBe(firstAppliedAt);
      expect(latest!.lastUpdatedAt?.toISOString()).toBe(
        "2026-08-25T03:00:00.000Z",
      );
      renderer!.unmount();
    } finally {
      jest.useRealTimers();
    }
  });

  it("coalesces notifications received during a request into one follow-up read", async () => {
    const firstRead = deferred<TopPicksResponse>();
    mockFetchTopPicks
      .mockResolvedValueOnce({ ...emptyResponse, rows: [rowFor("AAA")], total: 1 })
      .mockReturnValueOnce(firstRead.promise)
      .mockResolvedValueOnce({ ...emptyResponse, rows: [rowFor("BBB")], total: 1 });
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let renderer: ReactTestRenderer;
    function Probe() {
      latest = useTopPicksController();
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushEffects();
      notifySnapshot();
      await flushEffects();
    });
    const inFlightSignal = mockFetchTopPicks.mock.calls[1]?.[0].signal;

    await act(async () => {
      notifySnapshot();
      notifySnapshot();
      notifySnapshot();
      await flushEffects();
    });
    expect(mockFetchTopPicks).toHaveBeenCalledTimes(2);
    expect(inFlightSignal?.aborted).toBe(false);
    expect(latest!.rows.map((row) => row.symbol)).toEqual(["AAA"]);

    await act(async () => {
      firstRead.resolve({ ...emptyResponse, rows: [rowFor("AAA")], total: 1 });
      await flushEffects();
    });
    expect(mockFetchTopPicks).toHaveBeenCalledTimes(3);
    expect(mockFetchTopPicks.mock.calls.slice(1).every(([request]) =>
      request.forceRefresh === false,
    )).toBe(true);
    expect(latest!.rows.map((row) => row.symbol)).toEqual(["BBB"]);
    renderer!.unmount();
  });

  it("subscribes after initial loading and closes stale window and account streams", async () => {
    const initialResponse = deferred<TopPicksResponse>();
    mockFetchTopPicks
      .mockReturnValueOnce(initialResponse.promise)
      .mockResolvedValue(emptyResponse);
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let renderer: ReactTestRenderer;
    function Probe() {
      latest = useTopPicksController();
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushEffects();
    });
    expect(mockSubscribeToTopPicksUpdates).not.toHaveBeenCalled();

    await act(async () => {
      initialResponse.resolve(emptyResponse);
      await flushEffects();
    });
    const initialSubscription = updateSubscriptions[0];
    expect(initialSubscription.options.window).toBe("1Y");

    await act(async () => {
      latest!.setWindow("1M");
      await flushEffects();
    });
    expect(initialSubscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(updateSubscriptions.at(-1)!.options.window).toBe("1M");
    const oldWindowSubscription = updateSubscriptions.at(-1)!;

    mockAuthState = { user: { id: "account-a" }, loading: false };
    await act(async () => {
      renderer!.update(<Probe />);
      await flushEffects();
    });
    expect(oldWindowSubscription.unsubscribe).toHaveBeenCalledTimes(1);
    const activeSubscription = updateSubscriptions.at(-1)!;
    const requestCount = mockFetchTopPicks.mock.calls.length;

    await act(async () => {
      initialSubscription.options.onUpdate();
      initialSubscription.options.onRefreshError();
      oldWindowSubscription.options.onUpdate();
      oldWindowSubscription.options.onRefreshError();
      await flushEffects();
    });
    expect(mockFetchTopPicks).toHaveBeenCalledTimes(requestCount);
    expect(latest!.error).toBeNull();

    await act(async () => {
      renderer!.unmount();
      activeSubscription.options.onUpdate();
      await flushEffects();
    });
    expect(activeSubscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(mockFetchTopPicks).toHaveBeenCalledTimes(requestCount);
  });

  it("retains rows on a background refresh failure and recovers on completion", async () => {
    mockFetchTopPicks.mockResolvedValue({
      ...emptyResponse,
      rows: [rowFor("AAA")],
      total: 1,
    });
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let renderer: ReactTestRenderer;
    function Probe() {
      latest = useTopPicksController();
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushEffects();
      updateSubscriptions.at(-1)!.options.onRefreshError();
      await flushEffects();
    });
    expect(latest!.rows.map((row) => row.symbol)).toEqual(["AAA"]);
    expect(latest!.error).toBe("Unable to refresh Top Picks. Retrying automatically.");

    await act(async () => {
      notifySnapshot();
      await flushEffects();
    });
    expect(latest!.error).toBeNull();
    renderer!.unmount();
  });

  it.each(["page", "sort"] as const)(
    "shows live refresh errors for the current query after a %s change",
    async (change) => {
      const refreshResponse = deferred<TopPicksResponse>();
      mockAuthState = { user: { id: "account-a" }, loading: false };
      mockFetchTopPicks
        .mockResolvedValueOnce({
          ...emptyResponse,
          rows: [rowFor("ORIGINAL")],
          total: 100,
        })
        .mockResolvedValueOnce({
          ...emptyResponse,
          rows: [rowFor("CURRENT")],
          total: 100,
        })
        .mockReturnValueOnce(refreshResponse.promise);
      let latest: ReturnType<typeof useTopPicksController> | null = null;
      let renderer: ReactTestRenderer | undefined;

      function Probe() {
        latest = useTopPicksController();
        return null;
      }

      try {
        await act(async () => {
          renderer = TestRenderer.create(<Probe />);
          await flushEffects();
        });
        const subscription = updateSubscriptions[0];

        await act(async () => {
          if (change === "page") latest!.setPage(2);
          else latest!.toggleSort("alpha");
          await flushEffects();
        });
        expect(latest!.rows.map((row) => row.symbol)).toEqual(["CURRENT"]);
        expect(mockSubscribeToTopPicksUpdates).toHaveBeenCalledTimes(1);
        expect(subscription.unsubscribe).not.toHaveBeenCalled();

        await act(async () => {
          subscription.options.onRefreshError();
          await flushEffects();
        });
        expect(latest!.error).toBe(
          "Unable to refresh Top Picks. Retrying automatically.",
        );
        expect(latest!.rows.map((row) => row.symbol)).toEqual(["CURRENT"]);
        expect(mockFetchTopPicks).toHaveBeenCalledTimes(2);

        await act(async () => {
          notifySnapshot();
          await flushEffects();
        });
        expect(mockFetchTopPicks).toHaveBeenLastCalledWith(
          expect.objectContaining({
            page: change === "page" ? 2 : 1,
            sortKey: change === "sort" ? "alpha" : "sharpe",
            window: "1Y",
            forceRefresh: false,
          }),
        );
        expect(latest!.rows.map((row) => row.symbol)).toEqual(["CURRENT"]);
        expect(latest!.syncing).toBe(true);

        await act(async () => {
          refreshResponse.resolve({
            ...emptyResponse,
            rows: [rowFor("UPDATED")],
            total: 100,
          });
          await flushEffects();
        });
        expect(latest!.rows.map((row) => row.symbol)).toEqual(["UPDATED"]);
        expect(latest!.error).toBeNull();
        expect(latest!.syncing).toBe(false);
      } finally {
        renderer?.unmount();
      }
    },
  );

  it("clears a background refresh error when an in-flight snapshot read succeeds", async () => {
    const refreshResponse = deferred<TopPicksResponse>();
    mockFetchTopPicks
      .mockResolvedValueOnce({
        ...emptyResponse,
        rows: [rowFor("CURRENT")],
        total: 1,
      })
      .mockReturnValueOnce(refreshResponse.promise);
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let renderer: ReactTestRenderer | undefined;

    function Probe() {
      latest = useTopPicksController();
      return null;
    }

    try {
      await act(async () => {
        renderer = TestRenderer.create(<Probe />);
        await flushEffects();
        notifySnapshot();
        await flushEffects();
      });
      expect(latest!.syncing).toBe(true);

      await act(async () => {
        updateSubscriptions.at(-1)!.options.onRefreshError();
        await flushEffects();
      });
      expect(latest!.error).toBe(
        "Unable to refresh Top Picks. Retrying automatically.",
      );
      expect(latest!.rows.map((row) => row.symbol)).toEqual(["CURRENT"]);
      expect(latest!.syncing).toBe(true);

      await act(async () => {
        refreshResponse.resolve({
          ...emptyResponse,
          rows: [rowFor("UPDATED")],
          total: 1,
        });
        await flushEffects();
      });
      expect(latest!.rows.map((row) => row.symbol)).toEqual(["UPDATED"]);
      expect(latest!.error).toBeNull();
      expect(latest!.syncing).toBe(false);
      expect(mockFetchTopPicks).toHaveBeenCalledTimes(2);
    } finally {
      renderer?.unmount();
    }
  });

  it("updates the local sync time only when live refresh returns a new snapshot", async () => {
    jest.useFakeTimers();
    const responses: TopPicksResponse[] = [
      {
        rows: [rowFor("AAA")],
        total: 1,
        metadata: { generatedAt: "2026-08-25T03:00:00Z" },
        warnings: [],
      },
      {
        rows: [rowFor("AAA")],
        total: 1,
        metadata: { generatedAt: "2026-08-25T03:00:00Z" },
        warnings: [],
      },
      {
        rows: [rowFor("BBB")],
        total: 1,
        metadata: { generatedAt: "2026-08-25T03:01:00Z" },
        warnings: [],
      },
    ];
    mockFetchTopPicks.mockImplementation(async () =>
      responses.shift() ?? emptyResponse,
    );
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useTopPicksController();
      return null;
    }

    try {
      jest.setSystemTime(new Date("2026-08-25T04:00:00Z"));
      await act(async () => {
        renderer = TestRenderer.create(<Probe />);
        await flushEffects();
      });
      const firstAppliedAt = latest!.lastUpdatedAt;

      jest.setSystemTime(new Date("2026-08-25T04:05:00Z"));
      await act(async () => {
        notifySnapshot();
        await flushEffects();
      });

      expect(mockFetchTopPicks).toHaveBeenCalledTimes(2);
      expect(latest!.lastUpdatedAt).toBe(firstAppliedAt);

      jest.setSystemTime(new Date("2026-08-25T04:10:00Z"));
      await act(async () => {
        notifySnapshot();
        await flushEffects();
      });

      expect(mockFetchTopPicks).toHaveBeenCalledTimes(3);
      expect(latest!.lastUpdatedAt).not.toBe(firstAppliedAt);
      expect(latest!.lastUpdatedAt?.toISOString()).toBe(
        "2026-08-25T03:01:00.000Z",
      );
      expect(latest!.rows.map((row) => row.symbol)).toEqual(["BBB"]);
      renderer!.unmount();
    } finally {
      jest.useRealTimers();
    }
  });

  it.each(["page", "page size", "sort", "window"] as const)(
    "hides the previous query's rows and timestamp while a new %s is loading or fails",
    async (change) => {
      const nextResponse = deferred<TopPicksResponse>();
      mockFetchTopPicks
        .mockResolvedValueOnce({
          rows: [rowFor("OLD")],
          total: 60,
          metadata: { generatedAt: "2026-08-25T03:00:00Z", benchmark: "^AXJO" },
          warnings: ["Previous query warning"],
        })
        .mockReturnValueOnce(nextResponse.promise);
      let latest: ReturnType<typeof useTopPicksController> | null = null;
      let renderer: ReactTestRenderer | undefined;

      function Probe() {
        latest = useTopPicksController();
        return null;
      }

      try {
        await act(async () => {
          renderer = TestRenderer.create(<Probe />);
          await flushEffects();
        });
        expect(latest!.rows[0]?.symbol).toBe("OLD");

        await act(async () => {
          if (change === "page") latest!.setPage(2);
          if (change === "page size") latest!.setPageSize(10);
          if (change === "sort") latest!.toggleSort("ret1y");
          if (change === "window") latest!.setWindow("1D");
          await flushEffects();
        });

        expect(latest!.rows).toEqual([]);
        expect(latest!.total).toBe(0);
        expect(latest!.metadata).toEqual({});
        expect(latest!.warnings).toEqual([]);
        expect(latest!.lastUpdatedAt).toBeNull();
        expect(latest!.loading).toBe(true);
        expect(latest!.syncing).toBe(false);

        await act(async () => {
          nextResponse.reject(new Error("New query unavailable"));
          await flushEffects();
        });

        expect(latest!.rows).toEqual([]);
        expect(latest!.total).toBe(0);
        expect(latest!.lastUpdatedAt).toBeNull();
        expect(latest!.loading).toBe(false);
        expect(latest!.error).toBe("New query unavailable");
      } finally {
        renderer?.unmount();
      }
    },
  );

  it("keeps a coherent snapshot during a same-query refresh failure", async () => {
    const refreshResponse = deferred<TopPicksResponse>();
    const response = {
      rows: [rowFor("CURRENT")],
      total: 1,
      metadata: { generatedAt: "2026-08-25T03:00:00Z", benchmark: "^AXJO" },
      warnings: ["Limited history"],
    };
    mockFetchTopPicks
      .mockResolvedValueOnce(response)
      .mockReturnValueOnce(refreshResponse.promise);
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let renderer: ReactTestRenderer | undefined;

    function Probe() {
      latest = useTopPicksController();
      return null;
    }

    try {
      await act(async () => {
        renderer = TestRenderer.create(<Probe />);
        await flushEffects();
      });
      const generatedAt = latest!.lastUpdatedAt;
      await act(async () => {
        latest!.retry();
        await flushEffects();
      });

      expect(latest!.rows).toEqual(response.rows);
      expect(latest!.metadata).toEqual(response.metadata);
      expect(latest!.lastUpdatedAt).toBe(generatedAt);
      expect(latest!.loading).toBe(false);
      expect(latest!.syncing).toBe(true);

      await act(async () => {
        refreshResponse.reject(new Error("Refresh unavailable"));
        await flushEffects();
      });

      expect(latest!.rows).toEqual(response.rows);
      expect(latest!.metadata).toEqual(response.metadata);
      expect(latest!.lastUpdatedAt).toBe(generatedAt);
      expect(latest!.error).toBe("Refresh unavailable");
      expect(latest!.syncing).toBe(false);
    } finally {
      renderer?.unmount();
    }
  });

  it.each([undefined, "invalid timestamp"])(
    "clears the previous timestamp when the next snapshot supplies %s",
    async (generatedAt) => {
      mockFetchTopPicks
        .mockResolvedValueOnce({
          ...emptyResponse,
          rows: [rowFor("DATED")],
          total: 1,
          metadata: { generatedAt: "2026-08-25T03:00:00Z" },
        })
        .mockResolvedValueOnce({
          ...emptyResponse,
          rows: [rowFor("UNDATED")],
          total: 1,
          metadata: generatedAt === undefined ? {} : { generatedAt },
        });
      let latest: ReturnType<typeof useTopPicksController> | null = null;
      let renderer: ReactTestRenderer | undefined;

      function Probe() {
        latest = useTopPicksController();
        return null;
      }

      try {
        await act(async () => {
          renderer = TestRenderer.create(<Probe />);
          await flushEffects();
        });
        expect(latest!.lastUpdatedAt).not.toBeNull();

        await act(async () => {
          latest!.retry();
          await flushEffects();
        });

        expect(latest!.rows[0]?.symbol).toBe("UNDATED");
        expect(latest!.lastUpdatedAt).toBeNull();
      } finally {
        renderer?.unmount();
      }
    },
  );

  it.each(["response", "failure"])("ignores an obsolete page %s after the current window resolves", async (outcome) => {
    const obsoletePage = deferred<TopPicksResponse>();
    const currentWindow = deferred<TopPicksResponse>();
    mockFetchTopPicks
      .mockResolvedValueOnce({ ...emptyResponse, rows: [rowFor("YEAR")], total: 60 })
      .mockReturnValueOnce(obsoletePage.promise)
      .mockReturnValueOnce(currentWindow.promise);
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let renderer: ReactTestRenderer | undefined;

    function Probe() {
      latest = useTopPicksController();
      return null;
    }

    try {
      await act(async () => {
        renderer = TestRenderer.create(<Probe />);
        await flushEffects();
        latest!.setPage(2);
        await flushEffects();
      });
      await act(async () => {
        latest!.setWindow("1D");
        await flushEffects();
      });
      expect(mockFetchTopPicks.mock.calls[1]?.[0].signal?.aborted).toBe(true);

      await act(async () => {
        currentWindow.resolve({
          ...emptyResponse,
          rows: [rowFor("DAY")],
          total: 1,
          metadata: { generatedAt: "2026-08-25T03:05:00Z", windowCode: "1D" },
        });
        await flushEffects();
        if (outcome === "response") {
          obsoletePage.resolve({ ...emptyResponse, rows: [rowFor("OLD-PAGE")], total: 60 });
        } else {
          obsoletePage.reject(new Error("Obsolete page unavailable"));
        }
        await flushEffects();
      });

      expect(latest!.rows[0]?.symbol).toBe("DAY");
      expect(latest!.metadata.windowCode).toBe("1D");
      expect(latest!.window).toBe("1D");
      expect(latest!.page).toBe(1);
      expect(latest!.error).toBeNull();
      expect(latest!.loading).toBe(false);
    } finally {
      renderer?.unmount();
    }
  });

  it("keeps matching rows while inactive and consumes queued manual force once on recovery", async () => {
    const keys = ["document", "window", "navigator"] as const;
    const previous = keys.map((key) => Object.getOwnPropertyDescriptor(globalThis, key));
    const document = Object.assign(new EventTarget(), { visibilityState: "visible" });
    const window = new EventTarget();
    const navigator = { onLine: true };
    [document, window, navigator].forEach((value, index) =>
      Object.defineProperty(globalThis, keys[index], { configurable: true, value }),
    );
    const pending = deferred<TopPicksResponse>();
    const response = { ...emptyResponse, rows: [rowFor("MATCHING")], total: 1,
      metadata: { generatedAt: "2026-10-04T00:00:00Z" } };
    mockFetchTopPicks.mockResolvedValueOnce(response).mockReturnValueOnce(pending.promise).mockResolvedValue(response);
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let renderer: ReactTestRenderer | undefined;
    function Probe() { latest = useTopPicksController(); return null; }
    try {
      await act(async () => { renderer = TestRenderer.create(<Probe />); await flushEffects(); });
      await act(async () => { notifySnapshot(); await flushEffects(); });
      const activeRequest = mockFetchTopPicks.mock.calls[1][0];
      await act(async () => {
        document.visibilityState = "hidden";
        document.dispatchEvent(new Event("visibilitychange"));
        await flushEffects();
        latest!.retry();
        await flushEffects();
      });
      expect(activeRequest.signal?.aborted).toBe(true);
      expect(latest!.rows[0].symbol).toBe("MATCHING");
      expect(latest!.syncing).toBe(false);
      expect(mockFetchTopPicks).toHaveBeenCalledTimes(2);
      await act(async () => {
        navigator.onLine = false; window.dispatchEvent(new Event("offline"));
        document.visibilityState = "visible"; document.dispatchEvent(new Event("visibilitychange"));
        await flushEffects();
      });
      expect(mockFetchTopPicks).toHaveBeenCalledTimes(2);
      await act(async () => {
        navigator.onLine = true; window.dispatchEvent(new Event("online")); await flushEffects();
        pending.resolve({ ...response, rows: [rowFor("OBSOLETE")] }); await flushEffects();
      });
      expect(mockFetchTopPicks.mock.calls[2][0].forceRefresh).toBe(true);
      expect(latest!.rows[0].symbol).toBe("MATCHING");
      await act(async () => { latest!.setPage(2); await flushEffects(); });
      expect(mockFetchTopPicks.mock.calls.slice(3).every(([options]) => !options.forceRefresh)).toBe(true);
    } finally {
      act(() => renderer?.unmount());
      keys.forEach((key, index) => {
        if (previous[index]) Object.defineProperty(globalThis, key, previous[index]!);
        else Reflect.deleteProperty(globalThis, key);
      });
    }
  });

  it("retains safe response metadata for the assumptions UI", async () => {
    const metadata = {
      benchmark: "^AXJO",
      universeCount: 50,
      window: "trailing_one_year" as const,
      riskFreeRate: 0.0435,
    };
    mockFetchTopPicks.mockResolvedValueOnce({
      ...emptyResponse,
      metadata,
    });
    let latest: ReturnType<typeof useTopPicksController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useTopPicksController();
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushEffects();
    });

    expect(latest!.metadata).toEqual(metadata);

    renderer!.unmount();
  });
});
