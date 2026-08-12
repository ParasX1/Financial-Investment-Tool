import { METRICS_BASE } from "@/lib/apiBase";
import { formatMetricsResponse } from "./normalise";
import type { FetchMetricsRequest, MetricsResponse } from "./types";

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export async function fetchMetrics(
  request: FetchMetricsRequest,
): Promise<MetricsResponse> {
  if (!request.settings) throw new Error("Settings are required");
  const { metricType, metricParams } = request.settings;
  const { startDate, endDate, marketTicker, riskFreeRate, confidenceLevel } =
    metricParams;
  const response = await fetch(`${METRICS_BASE}/${metricType.toLowerCase()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: request.signal,
    body: JSON.stringify({
      stock_tickers: request.tickers,
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
  return formatMetricsResponse(request.tickers, metricType, data);
}
