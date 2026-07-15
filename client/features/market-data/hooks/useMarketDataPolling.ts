import * as React from "react";
import useSWR, { type SWRConfiguration } from "swr";
import { getRetryInterval } from "../refreshPolicy";

export interface MarketDataPollingOptions<Data> {
  fetcher: (key: string) => Promise<Data>;
  key: string | null;
  refreshInterval: (latestData: Data | undefined) => number;
}

type RetryCallback = () => void;
type RetryTimer = ReturnType<typeof globalThis.setTimeout>;
type RetryScheduler = (callback: RetryCallback, delayMs: number) => void;

function unrefTimer(timer: RetryTimer) {
  const unref = (timer as unknown as { unref?: () => void }).unref;
  unref?.call(timer);
}

function defaultRetryScheduler(callback: RetryCallback, delayMs: number) {
  const timer = globalThis.setTimeout(callback, delayMs);
  unrefTimer(timer);
}

export function createMarketDataPollingConfig<Data>(
  refreshInterval: MarketDataPollingOptions<Data>["refreshInterval"],
  onSuccess: () => void,
  scheduleRetry: RetryScheduler = defaultRetryScheduler,
): SWRConfiguration<Data> {
  return {
    dedupingInterval: 5_000,
    focusThrottleInterval: 5_000,
    keepPreviousData: true,
    loadingTimeout: 0,
    onErrorRetry: (_error, _key, _config, revalidate, options) => {
      if (options.retryCount > 3) return;
      scheduleRetry(
        () => {
          void revalidate({ retryCount: options.retryCount });
        },
        getRetryInterval(options.retryCount - 1),
      );
    },
    onSuccess,
    refreshInterval,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    shouldRetryOnError: true,
  };
}

export function useMarketDataPolling<Data>({
  fetcher,
  key,
  refreshInterval,
}: MarketDataPollingOptions<Data>) {
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const retryTimers = React.useRef(new Set<RetryTimer>());
  const clearRetryTimers = React.useCallback(() => {
    retryTimers.current.forEach((timer) => {
      globalThis.clearTimeout(timer);
    });
    retryTimers.current.clear();
  }, []);
  const scheduleRetry = React.useCallback<RetryScheduler>(
    (callback, delayMs) => {
      const timer = globalThis.setTimeout(() => {
        retryTimers.current.delete(timer);
        callback();
      }, delayMs);
      retryTimers.current.add(timer);
      unrefTimer(timer);
    },
    [],
  );
  const handleSuccess = React.useCallback(() => {
    clearRetryTimers();
    setLastUpdated(new Date());
  }, [clearRetryTimers]);
  const result = useSWR<Data>(
    key,
    fetcher,
    createMarketDataPollingConfig(
      refreshInterval,
      handleSuccess,
      scheduleRetry,
    ),
  );

  React.useEffect(() => {
    clearRetryTimers();
    setLastUpdated(null);
    return clearRetryTimers;
  }, [clearRetryTimers, key]);

  return {
    data: result.data,
    error: result.error instanceof Error ? result.error : null,
    initialLoading: result.isLoading,
    lastUpdated,
    refresh: () => {
      void result.mutate();
    },
    refreshing: result.isValidating,
  };
}
