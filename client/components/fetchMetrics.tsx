import { METRICS_BASE } from "@/lib/apiBase";
import { GraphSettings } from "./graphSettingsModal";

export type PortfolioSeries = {
  returns: number[];
  risks: number[];
  sharpe_ratios: number[];
  asset_order: string[];
  weights: number[][];
  max_sharpe_index: number;
  min_volatility_index: number;
  sample_count?: number;
  sampling_method?: string;
  seed?: number;
};

export type MetricValueStatus = {
  status: string;
  observations?: number;
};

export type MetricsMetadata = {
  requestedSymbols?: string[];
  availableSymbols?: string[];
  missingSymbols?: string[];
  observationsBySymbol?: Record<string, number>;
  actualStart?: string;
  actualEnd?: string;
  annualisationDays?: number;
  priceField?: string;
  benchmark?: string;
  method?: string;
  generatedAt?: string;
};

export interface MetricsResponse {
  tickers: string[];
  metricType: string;
  series: {
    timeSeries?: Record<string, Array<{ date: string; value: number }>>;
    singleValue?: Record<string, number>;
    singleValueStatuses?: Record<string, MetricValueStatus>;
    portfolio?: PortfolioSeries;
    correlationMatrix?: Record<string, Record<string, number>>;
  };
  metadata?: MetricsMetadata;
  warnings?: string[];
}

interface FetchMetricsRequest {
  tickers: string[];
  settings: GraphSettings | null;
  signal?: AbortSignal;
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const finiteNumber = (value: unknown): number | null => {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    typeof value === "boolean"
  ) {
    return null;
  }
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const finiteNumberArray = (value: unknown): number[] =>
  Array.isArray(value)
    ? value.map(finiteNumber).filter((item): item is number => item !== null)
    : [];

export const normalisePortfolioSeries = (data: unknown): PortfolioSeries => {
  const payload = isRecord(data) ? data : {};
  const returns = Array.isArray(payload.returns) ? payload.returns : [];
  const risks = Array.isArray(payload.risks) ? payload.risks : [];
  const sharpeRatios = Array.isArray(payload.sharpe_ratios)
    ? payload.sharpe_ratios
    : [];
  const rawWeights = Array.isArray(payload.weights) ? payload.weights : [];

  const aligned = Array.from(
    { length: Math.min(returns.length, risks.length, sharpeRatios.length) },
    (_, index) => {
      const pointReturn = finiteNumber(returns[index]);
      const pointRisk = finiteNumber(risks[index]);
      const pointSharpe = finiteNumber(sharpeRatios[index]);
      if (pointReturn === null || pointRisk === null || pointSharpe === null) {
        return null;
      }
      return {
        return: pointReturn,
        risk: pointRisk,
        sharpe: pointSharpe,
        weights: finiteNumberArray(rawWeights[index]),
        sourceIndex: index,
      };
    },
  ).filter(
    (
      point,
    ): point is {
      return: number;
      risk: number;
      sharpe: number;
      weights: number[];
      sourceIndex: number;
    } => point !== null,
  );

  const sourceToNormalisedIndex = new Map(
    aligned.map((point, index) => [point.sourceIndex, index]),
  );
  const requestedMaxSharpe = finiteNumber(payload.max_sharpe_index);
  const requestedMinVolatility = finiteNumber(payload.min_volatility_index);
  const fallbackMaxSharpe = aligned.reduce(
    (best, point, index) =>
      best === -1 || point.sharpe > aligned[best].sharpe ? index : best,
    -1,
  );
  const fallbackMinRisk = aligned.reduce(
    (best, point, index) =>
      best === -1 || point.risk < aligned[best].risk ? index : best,
    -1,
  );
  const resolveHighlightIndex = (requested: number | null, fallback: number) =>
    requested !== null
      ? (sourceToNormalisedIndex.get(Math.trunc(requested)) ?? fallback)
      : fallback;

  const result: PortfolioSeries = {
    returns: aligned.map((point) => point.return),
    risks: aligned.map((point) => point.risk),
    sharpe_ratios: aligned.map((point) => point.sharpe),
    asset_order: Array.isArray(payload.asset_order)
      ? payload.asset_order.map(String)
      : [],
    weights: aligned.map((point) => point.weights),
    max_sharpe_index: Math.max(
      0,
      resolveHighlightIndex(requestedMaxSharpe, fallbackMaxSharpe),
    ),
    min_volatility_index: Math.max(
      0,
      resolveHighlightIndex(requestedMinVolatility, fallbackMinRisk),
    ),
    sample_count: finiteNumber(payload.sample_count) ?? aligned.length,
  };
  if (typeof payload.sampling_method === "string") {
    result.sampling_method = payload.sampling_method;
  }
  const seed = finiteNumber(payload.seed);
  if (seed !== null) result.seed = seed;
  return result;
};

const normaliseSingleValues = (
  tickers: string[],
  data: unknown,
): Record<string, number> => {
  if (!isRecord(data)) return {};
  return tickers.reduce<Record<string, number>>((result, ticker) => {
    const value = finiteNumber(data[ticker]);
    return value === null ? result : { ...result, [ticker]: value };
  }, {});
};

const normaliseStatusValues = (
  tickers: string[],
  data: unknown,
): {
  values: Record<string, number>;
  statuses: Record<string, MetricValueStatus>;
} => {
  if (!isRecord(data)) return { values: {}, statuses: {} };
  return tickers.reduce(
    (result, ticker) => {
      const rawValue = data[ticker];
      if (!isRecord(rawValue)) return result;
      const value = finiteNumber(rawValue.value);
      const observations = finiteNumber(rawValue.observations);
      const status =
        typeof rawValue.status === "string" ? rawValue.status : "unknown";
      return {
        values:
          value === null
            ? result.values
            : { ...result.values, [ticker]: value },
        statuses: {
          ...result.statuses,
          [ticker]: {
            status,
            ...(observations === null
              ? {}
              : { observations: Math.trunc(observations) }),
          },
        },
      };
    },
    {
      values: {} as Record<string, number>,
      statuses: {} as Record<string, MetricValueStatus>,
    },
  );
};

const normaliseTimeSeries = (
  tickers: string[],
  data: unknown,
): Record<string, Array<{ date: string; value: number }>> => {
  if (!isRecord(data)) return {};
  return tickers.reduce<Record<string, Array<{ date: string; value: number }>>>(
    (result, ticker) => {
      const tickerSeries = data[ticker];
      if (!isRecord(tickerSeries)) return result;
      const points = Object.entries(tickerSeries)
        .map(([date, rawValue]) => {
          const value = finiteNumber(rawValue);
          return value === null ? null : { date, value };
        })
        .filter(
          (point): point is { date: string; value: number } => point !== null,
        )
        .sort((left, right) => left.date.localeCompare(right.date));
      return points.length ? { ...result, [ticker]: points } : result;
    },
    {},
  );
};

const normaliseCorrelationMatrix = (
  data: unknown,
): Record<string, Record<string, number>> => {
  if (!isRecord(data)) return {};
  return Object.entries(data).reduce<Record<string, Record<string, number>>>(
    (matrix, [rowTicker, rawRow]) => {
      if (!isRecord(rawRow)) return matrix;
      const row = Object.entries(rawRow).reduce<Record<string, number>>(
        (values, [columnTicker, rawValue]) => {
          const value = finiteNumber(rawValue);
          return value === null ? values : { ...values, [columnTicker]: value };
        },
        {},
      );
      return Object.keys(row).length
        ? { ...matrix, [rowTicker]: row }
        : matrix;
    },
    {},
  );
};

const normaliseMetadata = (value: unknown): MetricsMetadata | undefined => {
  if (!isRecord(value)) return undefined;
  const result: MetricsMetadata = {};
  if (Array.isArray(value.requestedSymbols))
    result.requestedSymbols = value.requestedSymbols.map(String);
  if (Array.isArray(value.availableSymbols))
    result.availableSymbols = value.availableSymbols.map(String);
  if (Array.isArray(value.missingSymbols))
    result.missingSymbols = value.missingSymbols.map(String);
  if (isRecord(value.observationsBySymbol)) {
    result.observationsBySymbol = Object.entries(
      value.observationsBySymbol,
    ).reduce<Record<string, number>>((observations, [symbol, count]) => {
      const number = finiteNumber(count);
      return number === null
        ? observations
        : { ...observations, [symbol]: Math.trunc(number) };
    }, {});
  }
  (
    [
      "actualStart",
      "actualEnd",
      "priceField",
      "benchmark",
      "method",
      "generatedAt",
    ] as const
  ).forEach((field) => {
    if (typeof value[field] === "string") result[field] = value[field];
  });
  const annualisationDays = finiteNumber(value.annualisationDays);
  if (annualisationDays !== null)
    result.annualisationDays = Math.trunc(annualisationDays);
  return result;
};

export const formatMetricsResponse = (
  tickers: string[],
  metricType: string,
  payload: unknown,
): MetricsResponse => {
  const envelope = isRecord(payload) && "data" in payload ? payload : null;
  const data = envelope ? envelope.data : payload;
  const response: MetricsResponse = {
    tickers,
    metricType,
    series: {},
    ...(envelope
      ? {
          metadata: normaliseMetadata(envelope.metadata),
          warnings: Array.isArray(envelope.warnings)
            ? envelope.warnings.map(String)
            : [],
        }
      : {}),
  };

  switch (metricType) {
    case "BetaAnalysis":
    case "AlphaComparison":
    case "SharpeRatioMatrix":
    case "ValueAtRiskAnalysis":
    case "VolatilityAnalysis":
      response.series.singleValue = normaliseSingleValues(tickers, data);
      break;
    case "SortinoRatioVisualization": {
      const normalised = normaliseStatusValues(tickers, data);
      response.series.singleValue = normalised.values;
      response.series.singleValueStatuses = normalised.statuses;
      break;
    }
    case "MaxDrawdownAnalysis":
    case "CumulativeReturnComparison":
      response.series.timeSeries = normaliseTimeSeries(tickers, data);
      break;
    case "MarketCorrelationAnalysis":
      response.series.correlationMatrix = normaliseCorrelationMatrix(data);
      break;
    case "EfficientFrontierVisualization":
      response.series.portfolio = normalisePortfolioSeries(data);
      break;
    default:
      throw new Error(`Unknown metric type: ${metricType}`);
  }
  return response;
};

export async function fetchMetrics(
  req: FetchMetricsRequest,
): Promise<MetricsResponse> {
  if (!req.settings) throw new Error("Settings are required");
  const { metricType, metricParams } = req.settings;
  const { startDate, endDate, marketTicker, riskFreeRate, confidenceLevel } =
    metricParams;
  const response = await fetch(`${METRICS_BASE}/${metricType.toLowerCase()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: req.signal,
    body: JSON.stringify({
      stock_tickers: req.tickers,
      start_date: startDate,
      end_date: endDate,
      market_ticker: marketTicker || "SPY",
      risk_free_rate: riskFreeRate ?? 0.01,
      confidence_level: confidenceLevel ?? 0.05,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      isRecord(data) && typeof data.error === "string"
        ? data.error
        : "Metrics are temporarily unavailable.";
    throw new Error(message);
  }
  return formatMetricsResponse(req.tickers, metricType, data);
}
