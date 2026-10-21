import * as React from "react";
import {
  getMarketChartRange,
  type MarketChartRangeId,
} from "@/lib/market/chartRanges";
import { getRangeAwareChartRefreshInterval } from "../refreshPolicy";
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
  rangeId: MarketChartRangeId = "1d",
): string | null {
  const symbol = value?.trim().toUpperCase() ?? "";
  if (!SYMBOL_PATTERN.test(symbol)) return null;
  const range = getMarketChartRange(rangeId);
  return (
    "/api/market/chart?symbol=" +
    encodeURIComponent(symbol) +
    "&range=" +
    range.id
  );
}

export function getMarketChartRefreshInterval(
  payload: Pick<MarketChartSnapshot, "marketState"> | undefined,
  rangeId: MarketChartRangeId = "1d",
): number {
  return getRangeAwareChartRefreshInterval(payload?.marketState, rangeId);
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

export function useMarketChart(
  symbol: string | null | undefined,
  rangeId: MarketChartRangeId = "1d",
) {
  const key = React.useMemo(
    () => createMarketChartRequestKey(symbol, rangeId),
    [rangeId, symbol],
  );
  const polling = useMarketDataPolling({
    fetcher: fetchMarketChart,
    key,
    refreshInterval: (latest) =>
      getMarketChartRefreshInterval(latest, rangeId),
  });
  const expectedSymbol = symbol?.trim().toUpperCase() ?? null;
  const data =
    polling.data?.symbol === expectedSymbol && polling.data.rangeId === rangeId
      ? polling.data
      : null;

  return {
    data,
    error: polling.error?.message ?? null,
    lastUpdated: data ? polling.lastUpdated : null,
    loading: polling.initialLoading || (polling.refreshing && !data),
    refresh: polling.refresh,
    refreshing: polling.refreshing,
  };
}
