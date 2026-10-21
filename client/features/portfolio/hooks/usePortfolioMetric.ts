import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchMetrics, type MetricsResponse } from "@/lib/market-metrics";
import { METRIC_REGISTRY } from "../data/metricRegistry";
import type {
  PortfolioAnalysisSettings,
  PortfolioRequestStatus,
} from "../types";

type UsePortfolioMetricArgs = {
  symbols: string[];
  settings: PortfolioAnalysisSettings;
  validationError: string | null;
};

type CachedMetric = {
  data: MetricsResponse;
  fetchedAt: number;
};

type MetricResult = CachedMetric & { queryKey: string };

type MetricRequestState = {
  queryKey: string | null;
  status: PortfolioRequestStatus;
  error: string | null;
};

const CACHE_TTL_MS = 120_000;
const metricCache = new Map<string, CachedMetric>();
const inFlightRequests = new Map<string, Promise<MetricsResponse>>();

export const clearPortfolioMetricCache = () => {
  metricCache.clear();
  inFlightRequests.clear();
};

const responseHasData = (
  response: MetricsResponse,
  settings: PortfolioAnalysisSettings,
) => {
  const chartKind = METRIC_REGISTRY[settings.metricType].chartKind;
  if (chartKind === "bar") {
    return (
      Object.keys(response.series.singleValue ?? {}).length > 0 ||
      Object.keys(response.series.singleValueStatuses ?? {}).length > 0
    );
  }
  if (chartKind === "line") {
    return Object.values(response.series.timeSeries ?? {}).some(
      (series) => series.length > 0,
    );
  }
  if (chartKind === "heatmap") {
    return Object.keys(response.series.correlationMatrix ?? {}).length > 0;
  }
  return (response.series.portfolio?.returns.length ?? 0) > 0;
};

const createQueryKey = (
  symbols: string[],
  settings: PortfolioAnalysisSettings,
) => {
  const metric = METRIC_REGISTRY[settings.metricType];
  return JSON.stringify({
    symbols,
    metricType: settings.metricType,
    startDate: settings.startDate,
    endDate: settings.endDate,
    ...(metric.requiresBenchmark ? { benchmark: settings.benchmark } : {}),
    ...(metric.usesRiskFreeRate ? { riskFreeRate: settings.riskFreeRate } : {}),
    ...(metric.usesConfidenceLevel
      ? { confidenceLevel: settings.confidenceLevel }
      : {}),
  });
};

const requestMetric = (
  queryKey: string,
  symbols: string[],
  settings: PortfolioAnalysisSettings,
) => {
  const pending = inFlightRequests.get(queryKey);
  if (pending) return pending;

  const request = fetchMetrics({
    tickers: symbols,
    settings: {
      metricType: settings.metricType,
      metricParams: {
        startDate: settings.startDate,
        endDate: settings.endDate,
        marketTicker: settings.benchmark,
        riskFreeRate: settings.riskFreeRate,
        confidenceLevel: settings.confidenceLevel,
      },
    },
  })
    .then((data) => {
      metricCache.set(queryKey, { data, fetchedAt: Date.now() });
      return data;
    })
    .finally(() => {
      inFlightRequests.delete(queryKey);
    });
  inFlightRequests.set(queryKey, request);
  return request;
};

export const usePortfolioMetric = ({
  symbols,
  settings,
  validationError,
}: UsePortfolioMetricArgs) => {
  const [requestState, setRequestState] = useState<MetricRequestState>({
    queryKey: null,
    status: "idle",
    error: null,
  });
  const [result, setResult] = useState<MetricResult | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const resultRef = useRef<MetricResult | null>(null);
  const {
    benchmark,
    confidenceLevel,
    endDate,
    metricType,
    riskFreeRate,
    startDate,
  } = settings;
  const requestSettings = useMemo<PortfolioAnalysisSettings>(
    () => ({
      benchmark,
      confidenceLevel,
      endDate,
      metricType,
      riskFreeRate,
      startDate,
    }),
    [benchmark, confidenceLevel, endDate, metricType, riskFreeRate, startDate],
  );
  const baseQueryKey = useMemo(
    () => createQueryKey(symbols, requestSettings),
    [requestSettings, symbols],
  );
  const requestKey = `${baseQueryKey}:${retryVersion}`;

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  useEffect(() => {
    if (!symbols.length) {
      setRequestState({ queryKey: baseQueryKey, status: "idle", error: null });
      setResult(null);
      return;
    }
    if (validationError) {
      setRequestState({
        queryKey: baseQueryKey,
        status: "invalid",
        error: validationError,
      });
      return;
    }

    let active = true;
    const cached = metricCache.get(baseQueryKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      setResult({ ...cached, queryKey: baseQueryKey });
      setRequestState({
        queryKey: baseQueryKey,
        error: null,
        status: cached.data.metadata?.missingSymbols?.length
          ? "partial"
          : responseHasData(cached.data, requestSettings)
            ? "success"
            : "empty",
      });
      return;
    }

    setRequestState({
      queryKey: baseQueryKey,
      status:
        resultRef.current?.queryKey === baseQueryKey ? "stale" : "loading",
      error: null,
    });
    requestMetric(baseQueryKey, symbols, requestSettings)
      .then((response) => {
        if (!active) return;
        setResult({
          queryKey: baseQueryKey,
          data: response,
          fetchedAt: metricCache.get(baseQueryKey)?.fetchedAt ?? Date.now(),
        });
        setRequestState({
          queryKey: baseQueryKey,
          error: null,
          status: response.metadata?.missingSymbols?.length
            ? "partial"
            : responseHasData(response, requestSettings)
              ? "success"
              : "empty",
        });
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setRequestState({
          queryKey: baseQueryKey,
          status: "error",
          error:
            requestError instanceof Error
              ? requestError.message
              : "Market data is temporarily unavailable.",
        });
      });

    return () => {
      active = false;
    };
  }, [baseQueryKey, requestKey, requestSettings, symbols, validationError]);

  const retry = useCallback(() => {
    metricCache.delete(baseQueryKey);
    setRetryVersion((current) => current + 1);
  }, [baseQueryKey]);

  // Effects run after render, so exclude incompatible results before they commit.
  const currentResult =
    symbols.length && !validationError && result?.queryKey === baseQueryKey
      ? result
      : null;
  const status: PortfolioRequestStatus = !symbols.length
    ? "idle"
    : validationError
      ? "invalid"
      : requestState.queryKey === baseQueryKey
        ? requestState.status
        : "loading";
  const error = !symbols.length
    ? null
    : (validationError ??
      (requestState.queryKey === baseQueryKey ? requestState.error : null));

  return {
    status,
    data: currentResult?.data ?? null,
    error,
    retry,
    lastUpdated: currentResult?.fetchedAt ?? null,
  };
};
