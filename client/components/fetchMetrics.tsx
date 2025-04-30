import { MetricType, GraphSettings } from './graphSettingsModal';
import { stockDataMap } from './StockCardComponent';

export interface TimeSeriesPoint {
  date: string;   
  value: number;
}

export interface MetricsResponse {
  metricType: MetricType | 'OHLC';
  series:
    | { ohlc: typeof stockDataMap[string] }     
    | { points: TimeSeriesPoint[] };    
}

interface FetchMetricsRequest {
  ticker: string;
  settings: GraphSettings | null;
}

export async function fetchMetrics(
  req: FetchMetricsRequest
): Promise<MetricsResponse> {
  await new Promise((r) => setTimeout(r, 250));

  if (!req.settings) {
    const all = stockDataMap[req.ticker] ?? [];
    return { metricType: 'OHLC', series: { ohlc: all } };
  }

  const { startDate, endDate } = req.settings.metricParams;
  const start = new Date(startDate);
  const end   = new Date(endDate);
  const msDay = 86_400_000;

  const points: TimeSeriesPoint[] = [];
  for (let t = start.getTime(), i = 0; t <= end.getTime(); t += msDay, ++i) {
    const date  = new Date(t).toISOString().slice(0, 10);
    const value = 1 + Math.sin(i / 3) + Math.random() * 0.25;
    points.push({ date, value: +value.toFixed(3) });
  }

  return { metricType: req.settings.metricType, series: { points } };
}
