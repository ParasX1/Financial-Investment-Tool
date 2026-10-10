import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { createMarketDataPollingConfig } from "./useMarketDataPolling";

describe("market-data polling configuration", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("centralizes visibility, connectivity, focus, dedupe, and adaptive refresh behavior", () => {
    const refreshInterval = jest.fn(() => 15_000);
    const onSuccess = jest.fn();
    const config = createMarketDataPollingConfig(refreshInterval, onSuccess);

    expect(config).toEqual(
      expect.objectContaining({
        dedupingInterval: 5_000,
        focusThrottleInterval: 5_000,
        keepPreviousData: true,
        refreshInterval,
        refreshWhenHidden: false,
        refreshWhenOffline: false,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        shouldRetryOnError: true,
      }),
    );

    config.onSuccess?.({ value: 7 }, "market-key", config as never);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("backs failed requests off for 30, 60, then 120 seconds", () => {
    const scheduleRetry = jest.fn();
    const config = createMarketDataPollingConfig(
      () => 15_000,
      jest.fn(),
      scheduleRetry,
    );
    const revalidate = jest.fn();

    for (const [retryCount, expectedDelay] of [
      [1, 30_000],
      [2, 60_000],
      [3, 120_000],
    ] as const) {
      config.onErrorRetry?.(
        new Error("offline"),
        "market-key",
        config as never,
        revalidate as never,
        { retryCount } as never,
      );
      expect(scheduleRetry).toHaveBeenLastCalledWith(
        expect.any(Function),
        expectedDelay,
      );
      const retry = scheduleRetry.mock.calls.at(-1)?.[0] as () => void;
      retry();
      expect(revalidate).toHaveBeenLastCalledWith({ retryCount });
    }

    scheduleRetry.mockClear();
    config.onErrorRetry?.(
      new Error("offline"),
      "market-key",
      config as never,
      revalidate as never,
      { retryCount: 4 } as never,
    );
    expect(scheduleRetry).not.toHaveBeenCalled();
  });
});
