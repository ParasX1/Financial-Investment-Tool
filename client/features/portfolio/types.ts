import type { MetricType } from "@/components/graphSettingsModal";

export interface CardSettings {
  barColor: string;
  dateRange: { start: string; end: string };
  metricType: MetricType;
  marketTicker?: string;
  riskRate?: number;
  confidenceLevel?: number;
  graphMade: boolean;
}

export interface PortfolioPanelLayout {
  id: string;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  zIndex: number;
}

export type PortfolioPanelLayoutPatch = Partial<
  Pick<
    PortfolioPanelLayout,
    "x" | "y" | "width" | "height" | "visible" | "zIndex"
  >
>;

export const PORTFOLIO_PANEL_COUNT = 6;

export const portfolioMetricLabels: Record<MetricType, string> = {
  BetaAnalysis: "Beta Analysis",
  AlphaComparison: "Alpha Comparison",
  MaxDrawdownAnalysis: "Max Drawdown",
  CumulativeReturnComparison: "Cumulative Return",
  SortinoRatioVisualization: "Sortino Ratio",
  MarketCorrelationAnalysis: "Market Correlation",
  SharpeRatioMatrix: "Sharpe Ratio",
  VolatilityAnalysis: "Volatility",
  ValueAtRiskAnalysis: "Value at Risk",
  EfficientFrontierVisualization: "Efficient Frontier",
};

export function getPortfolioMetricLabel(metricType: MetricType) {
  return portfolioMetricLabels[metricType] ?? metricType;
}
