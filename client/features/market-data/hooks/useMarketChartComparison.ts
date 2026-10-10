import * as React from "react";
import {
  MAX_MARKET_CHART_COMPARISON_SYMBOLS,
  getMarketChartRange,
  type MarketChartRangeId,
} from "@/lib/market/chartRanges";
import { getRangeAwareChartRefreshInterval } from "../refreshPolicy";
import {
  getMarketApiError,
  isMarketChartsResponse,
  type MarketChartsResponse,
} from "../types";
import { useMarketDataPolling } from "./useMarketDataPolling";

const SYMBOL_PATTERN = /^[A-Z0-9^][A-Z0-9.^=_-]{0,19}$/;
const MARKET_CHARTS_UNAVAILABLE =
  "Market comparison is temporarily unavailable.";

interface FetchedMarketCharts {
  payload: MarketChartsResponse;
  requestKey: string;
}

function normalizeComparisonSymbols(
  values: readonly string[],
): string[] | null {
  const symbols = Array.from(
    new Set(values.map((value) => value.trim().toUpperCase())),
  );
  if (
    symbols.length === 0 ||
    symbols.length > MAX_MARKET_CHART_COMPARISON_SYMBOLS ||
    symbols.some((symbol) => !SYMBOL_PATTERN.test(symbol))
  ) {
    return null;
  }
  return symbols;
}

function isExpectedComparisonPayload(
  payload: MarketChartsResponse | undefined,
  expectedSymbols: readonly string[] | null,
  rangeId: MarketChartRangeId,
): payload is MarketChartsResponse {
  if (!payload || !expectedSymbols || payload.rangeId !== rangeId) {
    return false;
  }
  const responseSymbols = [
    ...payload.snapshots.map((snapshot) => snapshot.symbol),
    ...payload.unavailableSymbols,
  ];
  return (
    responseSymbols.length === expectedSymbols.length &&
    responseSymbols.every((symbol) => expectedSymbols.includes(symbol)) &&
    expectedSymbols.every((symbol) => responseSymbols.includes(symbol))
  );
}

export function createMarketChartsRequestKey(
  values: readonly string[],
  rangeId: MarketChartRangeId = "1d",
): string | null {
  const symbols = normalizeComparisonSymbols(values);
  if (!symbols) return null;
  const range = getMarketChartRange(rangeId);
  return (
    "/api/market/charts?symbols=" +
    encodeURIComponent(symbols.join(",")) +
    "&range=" +
    range.id
  );
}

export function getMarketChartsRefreshInterval(
  payload:
    | {
        snapshots: readonly Pick<
          MarketChartsResponse["snapshots"][number],
          "marketState"
        >[];
      }
    | undefined,
  rangeId: MarketChartRangeId = "1d",
): number {
  if (!payload?.snapshots.length) {
    return getRangeAwareChartRefreshInterval(undefined, rangeId);
  }
  return Math.min(
    ...payload.snapshots.map((snapshot) =>
      getRangeAwareChartRefreshInterval(snapshot.marketState, rangeId),
    ),
  );
}

async function fetchMarketCharts(
  key: string,
  signal?: AbortSignal,
): Promise<FetchedMarketCharts> {
  let response: Response;
  let payload: unknown;
  try {
    response = await fetch(key, { signal });
    payload = await response.json();
  } catch {
    throw new Error(MARKET_CHARTS_UNAVAILABLE);
  }
  if (!response.ok) {
    throw new Error(getMarketApiError(payload) || MARKET_CHARTS_UNAVAILABLE);
  }
  if (!isMarketChartsResponse(payload)) {
    throw new Error(MARKET_CHARTS_UNAVAILABLE);
  }
  return { payload, requestKey: key };
}

export function useMarketChartComparison(
  symbols: readonly string[],
  rangeId: MarketChartRangeId = "1d",
) {
  const expectedSymbols = React.useMemo(
    () => normalizeComparisonSymbols(symbols),
    [symbols],
  );
  const key = createMarketChartsRequestKey(symbols, rangeId);
  const requestController = React.useRef<AbortController | null>(null);
  const fetcher = React.useCallback((requestKey: string) => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    return fetchMarketCharts(requestKey, controller.signal).finally(() => {
      if (requestController.current === controller) {
        requestController.current = null;
      }
    });
  }, []);

  React.useEffect(
    () => () => {
      requestController.current?.abort();
      requestController.current = null;
    },
    [],
  );

  const polling = useMarketDataPolling({
    fetcher,
    key,
    refreshInterval: (latest) =>
      getMarketChartsRefreshInterval(latest?.payload, rangeId),
  });
  const response =
    polling.data?.requestKey === key ? polling.data.payload : undefined;
  const data = isExpectedComparisonPayload(response, expectedSymbols, rangeId)
    ? response
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
