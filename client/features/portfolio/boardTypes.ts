import type { MetricType } from "@/components/graphSettingsModal";

/**
 * Compatibility shape for the unused legacy StockCardComponent.
 * The active Portfolio route uses PortfolioMetricCard and workspaceModel v3.
 */
export interface CardSettings {
  barColor: string;
  dateRange: { start: string; end: string };
  metricType: MetricType;
  marketTicker?: string;
  riskRate?: number;
  confidenceLevel?: number;
  graphMade: boolean;
}
