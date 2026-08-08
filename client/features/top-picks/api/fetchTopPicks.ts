import { API_BASE } from "@/lib/apiBase";
import {
  TOP_PICKS_METRIC_KEYS,
  TOP_PICKS_METRIC_STATUSES,
  type TopPicksMetadata,
  type TopPicksMetricStatus,
  type TopPicksMetricStatusMap,
  type TopPicksResponse,
  type TopPicksRow,
  type TopPicksSortKey,
} from "../types";

export type FetchTopPicksOptions = {
  page: number;
  pageSize: number;
  sortKey: TopPicksSortKey;
  sortDirection: "asc" | "desc";
  signal?: AbortSignal;
};

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeMetric = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const normalizeText = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const isMetricStatus = (value: unknown): value is TopPicksMetricStatus =>
  typeof value === "string" &&
  TOP_PICKS_METRIC_STATUSES.includes(value as TopPicksMetricStatus);

const normalizeMetricStatus = (value: unknown): TopPicksMetricStatusMap => {
  if (!isRecord(value)) return {};

  return TOP_PICKS_METRIC_KEYS.reduce<TopPicksMetricStatusMap>(
    (statuses, metricKey) => {
      const status = value[metricKey];
      return isMetricStatus(status)
        ? { ...statuses, [metricKey]: status }
        : statuses;
    },
    {},
  );
};

const normalizeRow = (value: unknown): TopPicksRow => {
  if (!isRecord(value)) throw new Error("Top Picks returned an invalid row.");
  const symbol = normalizeText(value.symbol, "");
  if (!symbol) throw new Error("Top Picks returned a row without a symbol.");

  const metricStatus = normalizeMetricStatus(value.metricStatus);
  const metricValue = (key: TopPicksSortKey): number | null => {
    const status = metricStatus[key];
    return status && status !== "ok" ? null : normalizeMetric(value[key]);
  };

  return {
    symbol,
    name: normalizeText(value.name, symbol),
    industry: normalizeText(value.industry, "Unknown"),
    ret1y: metricValue("ret1y"),
    sharpe: metricValue("sharpe"),
    sortino: metricValue("sortino"),
    volatility: metricValue("volatility"),
    maxDD: metricValue("maxDD"),
    beta: metricValue("beta"),
    alpha: metricValue("alpha"),
    infoRatio: metricValue("infoRatio"),
    metricStatus,
  };
};

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;
const BENCHMARK_PATTERN = /^[A-Za-z0-9.^=_:-]{1,20}$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

const normalizeDateOnly = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  const match = DATE_ONLY_PATTERN.exec(trimmed);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? trimmed
    : undefined;
};

const normalizeTimestamp = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!ISO_TIMESTAMP_PATTERN.test(trimmed)) return undefined;
  return normalizeDateOnly(trimmed.slice(0, 10)) &&
    Number.isFinite(Date.parse(trimmed))
    ? trimmed
    : undefined;
};

const normalizeSafeText = (
  value: unknown,
  maximumLength: number,
): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed &&
    trimmed.length <= maximumLength &&
    !CONTROL_CHARACTER_PATTERN.test(trimmed)
    ? trimmed
    : undefined;
};

const normalizeBenchmark = (value: unknown): string | undefined => {
  const benchmark = normalizeSafeText(value, 20);
  return benchmark && BENCHMARK_PATTERN.test(benchmark) ? benchmark : undefined;
};

const normalizeCount = (value: unknown): number | undefined =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= 1_000_000
    ? value
    : undefined;

const normalizeAnnualisationDays = (value: unknown): number | undefined => {
  const days = normalizeCount(value);
  return days !== undefined && days >= 1 && days <= 366 ? days : undefined;
};

const normalizeRiskFreeRate = (value: unknown): number | undefined =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= -1 &&
  value <= 1
    ? value
    : undefined;

const normalizeCacheStatus = (value: unknown) =>
  value === "hit" || value === "miss" || value === "stale"
    ? value
    : undefined;

const normalizeMetadata = (value: unknown): TopPicksMetadata => {
  if (!isRecord(value)) return {};
  const assumptions = isRecord(value.assumptions) ? value.assumptions : {};
  const benchmark =
    normalizeBenchmark(value.benchmark) ??
    normalizeBenchmark(assumptions.benchmark);
  const generatedAt = normalizeTimestamp(value.generatedAt);
  const requestedStart = normalizeDateOnly(value.requestedStart);
  const requestedEnd = normalizeDateOnly(value.requestedEnd);
  const annualisationDays = normalizeAnnualisationDays(value.annualisationDays);
  const riskFreeRate =
    normalizeRiskFreeRate(value.riskFreeRate) ??
    normalizeRiskFreeRate(assumptions.riskFreeRateAnnual);
  const riskFreeRateSource = normalizeSafeText(value.riskFreeRateSource, 120);
  const riskFreeRateAsOf = normalizeDateOnly(value.riskFreeRateAsOf);
  const universeLimit =
    normalizeCount(value.universeLimit) ??
    normalizeCount(assumptions.universeLimit);
  const universeCount = normalizeCount(value.universeCount);
  const availableCount = normalizeCount(value.availableCount);
  const cacheStatus = normalizeCacheStatus(value.cacheStatus);
  const cacheTtlSeconds = normalizeCount(value.cacheTtlSeconds);
  const snapshotRefreshing =
    typeof value.snapshotRefreshing === "boolean"
      ? value.snapshotRefreshing
      : undefined;
  const minimumTrailingReturnObservations = normalizeCount(
    value.minimumTrailingReturnObservations,
  );
  const windowValue = value.window ?? assumptions.window;
  const window = windowValue === "trailing_one_year" ? windowValue : undefined;

  return {
    ...(benchmark === undefined ? {} : { benchmark }),
    ...(generatedAt === undefined ? {} : { generatedAt }),
    ...(requestedStart === undefined ? {} : { requestedStart }),
    ...(requestedEnd === undefined ? {} : { requestedEnd }),
    ...(annualisationDays === undefined ? {} : { annualisationDays }),
    ...(riskFreeRate === undefined ? {} : { riskFreeRate }),
    ...(riskFreeRateSource === undefined ? {} : { riskFreeRateSource }),
    ...(riskFreeRateAsOf === undefined ? {} : { riskFreeRateAsOf }),
    ...(universeLimit === undefined ? {} : { universeLimit }),
    ...(universeCount === undefined ? {} : { universeCount }),
    ...(availableCount === undefined ? {} : { availableCount }),
    ...(cacheStatus === undefined ? {} : { cacheStatus }),
    ...(cacheTtlSeconds === undefined ? {} : { cacheTtlSeconds }),
    ...(snapshotRefreshing === undefined ? {} : { snapshotRefreshing }),
    ...(minimumTrailingReturnObservations === undefined
      ? {}
      : { minimumTrailingReturnObservations }),
    ...(window === undefined ? {} : { window }),
  };
};

const invalidResponseError = () =>
  new Error(
    "Unable to load Top Picks because the server returned an invalid response.",
  );

const normalizeResponse = (value: unknown): TopPicksResponse => {
  if (
    !isRecord(value) ||
    !isRecord(value.data) ||
    !Array.isArray(value.data.rows)
  ) {
    throw invalidResponseError();
  }

  const total = value.data.total;
  if (
    typeof total !== "number" ||
    !Number.isFinite(total) ||
    total < 0 ||
    !Number.isInteger(total)
  ) {
    throw invalidResponseError();
  }

  try {
    return {
      rows: value.data.rows.map(normalizeRow),
      total,
      metadata: normalizeMetadata(value.metadata),
      warnings: Array.isArray(value.warnings)
        ? value.warnings.filter(
            (warning): warning is string =>
              typeof warning === "string" && Boolean(warning.trim()),
          )
        : [],
    };
  } catch {
    throw invalidResponseError();
  }
};

const getServerErrorMessage = (value: unknown, status: number): string => {
  if (isRecord(value) && typeof value.error === "string") {
    const error = value.error.trim();
    if (error && error.length <= 240) return error;
  }
  return `Unable to load Top Picks (${status}).`;
};

export async function fetchTopPicks({
  page,
  pageSize,
  sortKey,
  sortDirection,
  signal,
}: FetchTopPicksOptions): Promise<TopPicksResponse> {
  const response = await fetch(`${API_BASE}/api/top-picks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      page: Math.max(1, Math.trunc(page)),
      page_size: Math.max(1, Math.trunc(pageSize)),
      sort_key: sortKey,
      sort_dir: sortDirection,
    }),
    signal,
  });

  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getServerErrorMessage(json, response.status));
  }
  return normalizeResponse(json);
}
