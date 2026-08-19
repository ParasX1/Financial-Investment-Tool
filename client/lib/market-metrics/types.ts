export type MarketMetricType =
  | "BetaAnalysis"
  | "AlphaComparison"
  | "MaxDrawdownAnalysis"
  | "CumulativeReturnComparison"
  | "SortinoRatioVisualization"
  | "MarketCorrelationAnalysis"
  | "SharpeRatioMatrix"
  | "VolatilityAnalysis"
  | "ValueAtRiskAnalysis"
  | "EfficientFrontierVisualization";

export type MarketMetricParameters = {
  startDate: string;
  endDate: string;
  marketTicker?: string;
  riskFreeRate?: number;
  confidenceLevel?: number;
};

export type MarketMetricSettings = {
  metricType: MarketMetricType;
  metricParams: MarketMetricParameters;
};

export type FetchMetricsRequest = {
  tickers: string[];
  settings: MarketMetricSettings | null;
  signal?: AbortSignal;
};

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

export type MetricsResponse = {
  tickers: string[];
  metricType: MarketMetricType;
  series: {
    timeSeries?: Record<string, Array<{ date: string; value: number }>>;
    singleValue?: Record<string, number>;
    singleValueStatuses?: Record<string, MetricValueStatus>;
    portfolio?: PortfolioSeries;
    correlationMatrix?: Record<string, Record<string, number>>;
  };
  metadata?: MetricsMetadata;
  warnings?: string[];
};
