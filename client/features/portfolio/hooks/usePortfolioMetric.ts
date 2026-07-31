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
  const [status, setStatus] = useState<PortfolioRequestStatus>("idle");
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const dataRef = useRef<MetricsResponse | null>(null);
  const baseQueryKey = useMemo(
    () => createQueryKey(symbols, settings),
    [settings, symbols],
  );
  const requestKey = `${baseQueryKey}:${retryVersion}`;

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (!symbols.length) {
      setStatus("idle");
      setData(null);
      setError(null);
      return;
    }
    if (validationError) {
      setStatus("invalid");
      setError(validationError);
      return;
    }

    let active = true;
    const cached = metricCache.get(baseQueryKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      setData(cached.data);
      setError(null);
      setStatus(
        cached.data.metadata?.missingSymbols?.length
          ? "partial"
          : responseHasData(cached.data, settings)
            ? "success"
            : "empty",
      );
      return;
    }

    setStatus(dataRef.current ? "stale" : "loading");
    setError(null);
    requestMetric(baseQueryKey, symbols, settings)
      .then((response) => {
        if (!active) return;
        setData(response);
        setStatus(
          response.metadata?.missingSymbols?.length
            ? "partial"
            : responseHasData(response, settings)
              ? "success"
              : "empty",
        );
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Market data is temporarily unavailable.",
        );
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [baseQueryKey, requestKey, settings.metricType, symbols, validationError]);

  const retry = useCallback(() => {
    metricCache.delete(baseQueryKey);
    setRetryVersion((current) => current + 1);
  }, [baseQueryKey]);

  return {
    status,
    data,
    error,
    retry,
    lastUpdated: metricCache.get(baseQueryKey)?.fetchedAt ?? null,
  };
};
