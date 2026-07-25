import * as React from "react";
import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import TestRenderer, {
  act,
  type ReactTestRenderer,
} from "react-test-renderer";

const mockReplace = jest.fn<() => Promise<boolean>>();
let mockRouter = {
  asPath: "/MarketNews",
  isReady: true,
  pathname: "/MarketNews",
  query: {} as Record<string, string>,
  replace: mockReplace,
};
let useMarketNewsController: typeof import("./useMarketNewsController")["useMarketNewsController"];

async function flushEffects() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("useMarketNewsController", () => {
  beforeAll(() => {
    jest.doMock("next/router", () => ({
      useRouter: () => mockRouter,
    }));
    useMarketNewsController =
      require("./useMarketNewsController").useMarketNewsController;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockReplace.mockResolvedValue(true);
    mockRouter = {
      asPath: "/MarketNews",
      isReady: true,
      pathname: "/MarketNews",
      query: {},
      replace: mockReplace,
    };
  });

  it("does not render or replace the route when the current page is already valid", async () => {
    let latest: ReturnType<typeof useMarketNewsController> | null = null;
    let renderCount = 0;
    let renderer: ReactTestRenderer;

    function Probe() {
      renderCount += 1;
      latest = useMarketNewsController({});
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushEffects();
    });

    const settledRenderCount = renderCount;
    const settledClamp = latest!.clampStoryPageToCount;
    mockReplace.mockClear();

    act(() => {
      latest!.clampStoryPageToCount(13);
    });

    expect(renderCount).toBe(settledRenderCount);
    expect(latest!.clampStoryPageToCount).toBe(settledClamp);
    expect(mockReplace).not.toHaveBeenCalled();
    renderer!.unmount();
  });

  it("clamps an out-of-range page once and keeps the shareable URL in sync", async () => {
    mockRouter = {
      asPath: "/MarketNews?page=3",
      isReady: true,
      pathname: "/MarketNews",
      query: { page: "3" },
      replace: mockReplace,
    };
    let latest: ReturnType<typeof useMarketNewsController> | null = null;
    let renderCount = 0;
    let renderer: ReactTestRenderer;

    function Probe() {
      renderCount += 1;
      latest = useMarketNewsController({});
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushEffects();
    });
    expect(latest!.storyPageIndex).toBe(2);
    mockReplace.mockClear();

    act(() => {
      latest!.clampStoryPageToCount(13);
    });

    expect(latest!.storyPageIndex).toBe(1);
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith(
      "/MarketNews?page=2",
      undefined,
      {
        scroll: false,
        shallow: true,
      },
    );

    const clampedRenderCount = renderCount;
    act(() => {
      latest!.clampStoryPageToCount(13);
    });
    expect(renderCount).toBe(clampedRenderCount);
    expect(mockReplace).toHaveBeenCalledTimes(1);
    renderer!.unmount();
  });

  it("keeps previous-page navigation at page zero as a true no-op", async () => {
    let latest: ReturnType<typeof useMarketNewsController> | null = null;
    let renderCount = 0;
    let renderer: ReactTestRenderer;

    function Probe() {
      renderCount += 1;
      latest = useMarketNewsController({});
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushEffects();
    });

    const settledRenderCount = renderCount;
    mockReplace.mockClear();
    act(() => {
      latest!.handlePreviousPage();
    });

    expect(renderCount).toBe(settledRenderCount);
    expect(mockReplace).not.toHaveBeenCalled();
    renderer!.unmount();
  });

  it("synchronizes routed interactions from one complete state snapshot", async () => {
    const onQuoteLookup = jest.fn();
    let latest: ReturnType<typeof useMarketNewsController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useMarketNewsController({ onQuoteLookup });
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushEffects();
    });
    mockReplace.mockClear();

    act(() => {
      latest!.setSearchDraft(" inflation ");
    });
    act(() => {
      latest!.handleSearchSubmit();
    });
    expect(latest!.searchQuery).toBe("inflation");
    expect(mockReplace).toHaveBeenLastCalledWith(
      "/MarketNews?q=inflation",
      undefined,
      expect.any(Object),
    );

    act(() => {
      latest!.handleMarketScopeChange("us-markets");
    });
    expect(mockReplace).toHaveBeenLastCalledWith(
      "/MarketNews?market=us-markets&q=inflation",
      undefined,
      expect.any(Object),
    );

    const replaceCountBeforeReferenceChange = mockReplace.mock.calls.length;
    act(() => {
      latest!.setLookupDraft("nvda");
      latest!.handleQuoteReferenceChange("nvda");
    });
    expect(latest!.selectedSymbol).toBe("NVDA");
    expect(mockReplace).toHaveBeenCalledTimes(replaceCountBeforeReferenceChange);

    act(() => {
      latest!.handleTickerNewsRequest("nvda");
    });
    expect(onQuoteLookup).toHaveBeenCalledWith("NVDA");
    expect(mockReplace).toHaveBeenLastCalledWith(
      "/MarketNews?market=us-markets&quote=NVDA",
      undefined,
      expect.any(Object),
    );

    act(() => {
      latest!.handleLensChange("watchlist");
    });
    act(() => {
      latest!.handleSortChange("relevance");
    });
    expect(latest!.activeLensId).toBe("watchlist");
    expect(latest!.activeSortId).toBe("relevance");

    const replaceCountBeforeUnavailablePage = mockReplace.mock.calls.length;
    act(() => {
      latest!.handleNextPage(false);
    });
    expect(mockReplace).toHaveBeenCalledTimes(replaceCountBeforeUnavailablePage);

    act(() => {
      latest!.handleNextPage(true);
    });
    expect(latest!.storyPageIndex).toBe(1);
    act(() => {
      latest!.handlePreviousPage();
    });
    expect(latest!.storyPageIndex).toBe(0);
    act(() => {
      latest!.handleNextPage(true);
    });

    const refreshKey = latest!.refreshKey;
    act(() => {
      latest!.handleRefresh();
    });
    expect(latest!.storyPageIndex).toBe(0);
    expect(latest!.refreshKey).toBe(refreshKey + 1);

    act(() => {
      latest!.resetEmptyLens();
    });
    expect(latest!.activeLensId).toBe("all");

    act(() => {
      latest!.handleTopicChange("work");
    });
    expect(latest!.activeTopicId).toBe("work");

    act(() => {
      latest!.setSearchDraft("rates");
    });
    act(() => {
      latest!.handleSearchSubmit();
    });
    act(() => {
      latest!.handleSearchClear();
    });
    expect(latest!.searchQuery).toBe("");

    renderer!.unmount();
  });

  it("keeps local no-op interactions referentially stable", async () => {
    let latest: ReturnType<typeof useMarketNewsController> | null = null;
    let renderCount = 0;
    let renderer: ReactTestRenderer;

    function Probe() {
      renderCount += 1;
      latest = useMarketNewsController({});
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushEffects();
    });

    const settledRenderCount = renderCount;
    mockReplace.mockClear();
    act(() => {
      latest!.setSearchDraft("");
      latest!.setLookupDraft("");
      latest!.handleQuoteReferenceChange(" ");
      latest!.handleTickerNewsRequest(" ");
      latest!.resetEmptyLens();
    });
    expect(renderCount).toBe(settledRenderCount);
    expect(mockReplace).not.toHaveBeenCalled();

    act(() => {
      latest!.handleTopicChange("top-stories");
    });
    expect(mockReplace).not.toHaveBeenCalled();

    const refreshKey = latest!.refreshKey;
    act(() => {
      latest!.handleRefresh();
    });
    expect(latest!.refreshKey).toBe(refreshKey + 1);
    expect(mockReplace).not.toHaveBeenCalled();
    renderer!.unmount();
  });

  it("does not synchronize URLs before router readiness or after leaving the route", async () => {
    let latest: ReturnType<typeof useMarketNewsController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useMarketNewsController({});
      return null;
    }

    mockRouter = {
      asPath: "/MarketNews",
      isReady: false,
      pathname: "/MarketNews",
      query: {},
      replace: mockReplace,
    };
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushEffects();
    });
    act(() => {
      latest!.handleTopicChange("work");
    });
    expect(mockReplace).not.toHaveBeenCalled();
    renderer!.unmount();

    mockRouter = {
      asPath: "/Help",
      isReady: true,
      pathname: "/Help",
      query: {},
      replace: mockReplace,
    };
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushEffects();
    });
    act(() => {
      latest!.handleTopicChange("work");
    });
    expect(mockReplace).not.toHaveBeenCalled();
    renderer!.unmount();
  });

  it("ignores expected route cancellation and reports unexpected sync failures", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    let latest: ReturnType<typeof useMarketNewsController> | null = null;
    let renderer: ReactTestRenderer;

    function Probe() {
      latest = useMarketNewsController({});
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushEffects();
    });

    mockReplace.mockRejectedValueOnce({ cancelled: true });
    await act(async () => {
      latest!.handleTopicChange("work");
      await flushEffects();
    });
    expect(consoleError).not.toHaveBeenCalled();

    const failure = new Error("history unavailable");
    mockReplace.mockRejectedValueOnce(failure);
    await act(async () => {
      latest!.handleTopicChange("technology");
      await flushEffects();
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to synchronize the Market News URL.",
      failure,
    );

    consoleError.mockRestore();
    renderer!.unmount();
  });
});
