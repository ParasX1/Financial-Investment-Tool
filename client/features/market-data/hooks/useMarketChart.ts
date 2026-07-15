import * as React from "react";
import { getChartRefreshInterval } from "../refreshPolicy";
import {
  getMarketApiError,
  isMarketChartSnapshot,
  type MarketChartSnapshot,
} from "../types";
import { useMarketDataPolling } from "./useMarketDataPolling";

const SYMBOL_PATTERN = /^[A-Z0-9^][A-Z0-9.^=_-]{0,19}$/;
const MARKET_CHART_UNAVAILABLE = "Market chart is temporarily unavailable.";

export function createMarketChartRequestKey(
  value: string | null | undefined,
): string | null {
  const symbol = value?.trim().toUpperCase() ?? "";
  return SYMBOL_PATTERN.test(symbol)
    ? "/api/market/chart?symbol=" + encodeURIComponent(symbol)
    : null;
}

export function getMarketChartRefreshInterval(
  payload: Pick<MarketChartSnapshot, "marketState"> | undefined,
): number {
  return getChartRefreshInterval(payload?.marketState);
}

async function fetchMarketChart(key: string): Promise<MarketChartSnapshot> {
  let response: Response;
  let payload: unknown;
  try {
    response = await fetch(key);
    payload = await response.json();
  } catch {
    throw new Error(MARKET_CHART_UNAVAILABLE);
  }
  if (!response.ok) {
    throw new Error(getMarketApiError(payload) || MARKET_CHART_UNAVAILABLE);
  }
  if (!isMarketChartSnapshot(payload)) {
    throw new Error(MARKET_CHART_UNAVAILABLE);
  }
  return payload;
}

export function useMarketChart(symbol: string | null | undefined) {
  const key = React.useMemo(
    () => createMarketChartRequestKey(symbol),
    [symbol],
  );
  const polling = useMarketDataPolling({
    fetcher: fetchMarketChart,
    key,
    refreshInterval: getMarketChartRefreshInterval,
  });
  const expectedSymbol = symbol?.trim().toUpperCase() ?? null;
  const data = polling.data?.symbol === expectedSymbol ? polling.data : null;

  return {
    data,
    error: polling.error?.message ?? null,
    lastUpdated: data ? polling.lastUpdated : null,
    loading: polling.initialLoading || (polling.refreshing && !data),
    refresh: polling.refresh,
    refreshing: polling.refreshing,
  };
}
