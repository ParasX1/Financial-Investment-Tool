import { GraphSettings } from './graphSettingsModal';
import { stockDataMap } from './StockCardComponent';

export interface MetricsResponse {
    metricType: 'OHLC';
    series: { ohlc: typeof stockDataMap[string] };
  }

interface FetchMetricsRequest {
  ticker: string;
  settings: GraphSettings | null;
}

export async function fetchMetrics(
  req: FetchMetricsRequest
): Promise<MetricsResponse> {
  await new Promise((r) => setTimeout(r, 250));

  const all = stockDataMap[req.ticker] ?? [];
  if (req.settings) {
    const { startDate, endDate } = req.settings.metricParams;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const filtered = all.filter((d) => {
      const dt = new Date(d.date);
      return dt >= start && dt <= end;
    });
    return { metricType: 'OHLC', series: { ohlc: filtered } };
  }

  return { metricType: 'OHLC', series: { ohlc: all } };
}