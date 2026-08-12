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
import type { TopPicksPrefs, TopPicksResponse, TopPicksRow } from "../types";

const DEFAULT_PREFS: TopPicksPrefs = {
  sort_key: "sharpe",
  sort_dir: "desc",
  page_size: 25,
};

const mockFetchTopPicks =
  jest.fn<(options: FetchTopPicksOptions) => Promise<TopPicksResponse>>();
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
      expect(browserStorage.values.get("topPicks.visibleCols:signed-out")).toBe(
        '["symbol"]',
      );

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
        browserStorage.values.get("topPicks.visibleCols:user:account-a"),
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
        browserStorage.values.get("topPicks.visibleCols:user:account-b"),
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
