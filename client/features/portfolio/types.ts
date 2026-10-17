import type { MarketMetricType } from "@/lib/market-metrics";

export type PortfolioMetricType = MarketMetricType;

export type PortfolioMetricCategory =
  | "Performance"
  | "Risk"
  | "Risk-adjusted"
  | "Diversification";

export type PortfolioMetricUnit = "percent" | "decimal" | "correlation";
export type PortfolioMetricClassification =
  | "historical"
  | "estimated"
  | "simulated";

export type PortfolioMetricDefinition = {
  id: PortfolioMetricType;
  label: string;
  shortLabel: string;
  category: PortfolioMetricCategory;
  chartKind: "line" | "bar" | "heatmap" | "scatter";
  unit: PortfolioMetricUnit;
  classification: PortfolioMetricClassification;
  method: string;
  description: string;
  interpretation: string;
  caveat: string;
  minimumSymbols: number;
  minimumDays: number;
  betterDirection: "higher" | "lower" | "context";
  requiresBenchmark?: boolean;
  usesRiskFreeRate?: boolean;
  usesConfidenceLevel?: boolean;
};

export type PortfolioAnalysisInputs = {
  startDate: string;
  endDate: string;
  benchmark: string;
  riskFreeRate: number;
  confidenceLevel: number;
};

export type PortfolioAnalysisSettings = PortfolioAnalysisInputs & {
  metricType: PortfolioMetricType;
};

export type PortfolioMetricCard = {
  id: string;
  metricType: PortfolioMetricType;
  overrides: Partial<PortfolioAnalysisInputs>;
  hiddenSymbols: string[];
};

export type PortfolioView =
  | { mode: "board" }
  | { mode: "focus"; cardId: string }
  | { mode: "observation" };

export type PortfolioObserverWindow = {
  cardId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  visible: boolean;
};

export type PortfolioObserverLayout = Record<string, PortfolioObserverWindow>;

export type PortfolioWorkspaceState = {
  version: 3;
  symbols: string[];
  globalInputs: PortfolioAnalysisInputs;
  cards: PortfolioMetricCard[];
  view: PortfolioView;
  observerLayout: PortfolioObserverLayout;
};

export type PortfolioRequestStatus =
  | "idle"
  | "loading"
  | "stale"
  | "success"
  | "partial"
  | "empty"
  | "invalid"
  | "error";
