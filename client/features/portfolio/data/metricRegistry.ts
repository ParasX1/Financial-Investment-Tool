import type {
  PortfolioMetricCategory,
  PortfolioMetricDefinition,
  PortfolioMetricType,
} from "../types";

export const METRIC_REGISTRY: Record<
  PortfolioMetricType,
  PortfolioMetricDefinition
> = {
  CumulativeReturnComparison: {
    id: "CumulativeReturnComparison",
    label: "Cumulative return",
    shortLabel: "Return",
    category: "Performance",
    chartKind: "line",
    unit: "percent",
    classification: "historical",
    method: "Adjusted-close return rebased to each symbol's first valid observation.",
    description:
      "Adjusted-close return over the selected period, rebased to zero at each symbol's first valid observation.",
    interpretation:
      "Compare the path as well as the ending value; a smoother path can matter as much as the final return.",
    caveat:
      "Adjusted close reflects corporate actions, but historical return still excludes fees, taxes, and future expectations.",
    minimumSymbols: 1,
    minimumDays: 2,
    betterDirection: "higher",
  },
  AlphaComparison: {
    id: "AlphaComparison",
    label: "Alpha vs benchmark",
    shortLabel: "Alpha",
    category: "Performance",
    chartKind: "bar",
    unit: "percent",
    classification: "estimated",
    method: "Annualised arithmetic CAPM alpha using 252 trading days.",
    description:
      "Annualised return above or below the return implied by benchmark exposure.",
    interpretation:
      "Positive alpha means historical outperformance after accounting for beta against the selected benchmark.",
    caveat: "Alpha is highly sensitive to benchmark choice and sample period.",
    minimumSymbols: 1,
    minimumDays: 21,
    betterDirection: "higher",
    requiresBenchmark: true,
    usesRiskFreeRate: true,
  },
  VolatilityAnalysis: {
    id: "VolatilityAnalysis",
    label: "Annualised volatility",
    shortLabel: "Volatility",
    category: "Risk",
    chartKind: "bar",
    unit: "percent",
    classification: "estimated",
    method: "Sample standard deviation of daily returns multiplied by √252.",
    description:
      "Annualised variability of each symbol's valid daily returns over the selected period.",
    interpretation:
      "Lower volatility means a steadier historical return path, not necessarily a safer investment.",
    caveat: "Volatility treats upside and downside movement equally.",
    minimumSymbols: 1,
    minimumDays: 3,
    betterDirection: "lower",
  },
  MaxDrawdownAnalysis: {
    id: "MaxDrawdownAnalysis",
    label: "Drawdown history",
    shortLabel: "Drawdown",
    category: "Risk",
    chartKind: "line",
    unit: "percent",
    classification: "historical",
    method: "Adjusted close divided by the running peak, minus one.",
    description:
      "Peak-to-trough decline from each symbol's previous adjusted-close high.",
    interpretation:
      "The lowest point is the worst observed loss from a prior peak; zero means the symbol is at a new high.",
    caveat:
      "A recovered drawdown can still have required a long holding period.",
    minimumSymbols: 1,
    minimumDays: 2,
    betterDirection: "higher",
  },
  ValueAtRiskAnalysis: {
    id: "ValueAtRiskAnalysis",
    label: "Historical value at risk",
    shortLabel: "Value at risk",
    category: "Risk",
    chartKind: "bar",
    unit: "percent",
    classification: "estimated",
    method: "Positive magnitude of the selected lower-tail daily-return percentile.",
    description:
      "One-day historical loss magnitude at the selected confidence level.",
    interpretation:
      "Lower is better: at the selected confidence, only the tail probability of observed trading days had a larger loss.",
    caveat:
      "VaR is a threshold, not a worst case; it does not describe how severe losses beyond it may be.",
    minimumSymbols: 1,
    minimumDays: 20,
    betterDirection: "lower",
    usesConfidenceLevel: true,
  },
  BetaAnalysis: {
    id: "BetaAnalysis",
    label: "Beta exposure",
    shortLabel: "Beta",
    category: "Risk",
    chartKind: "bar",
    unit: "decimal",
    classification: "estimated",
    method: "Pairwise covariance with benchmark returns divided by benchmark variance.",
    description:
      "Sensitivity of each symbol's returns to the selected benchmark.",
    interpretation:
      "A beta above 1 means larger historical benchmark-linked moves; below 1 means smaller moves.",
    caveat:
      "Beta describes co-movement, not total risk or downside protection.",
    minimumSymbols: 1,
    minimumDays: 21,
    betterDirection: "context",
    requiresBenchmark: true,
  },
  SharpeRatioMatrix: {
    id: "SharpeRatioMatrix",
    label: "Sharpe ratio",
    shortLabel: "Sharpe",
    category: "Risk-adjusted",
    chartKind: "bar",
    unit: "decimal",
    classification: "estimated",
    method: "Annualised arithmetic excess return divided by annualised sample volatility.",
    description:
      "Annualised excess return earned per unit of total volatility.",
    interpretation:
      "Higher is better within a comparable period; negative means return did not beat the annual risk-free rate.",
    caveat: "Sharpe assumes volatility is an appropriate measure of risk.",
    minimumSymbols: 1,
    minimumDays: 3,
    betterDirection: "higher",
    usesRiskFreeRate: true,
  },
  SortinoRatioVisualization: {
    id: "SortinoRatioVisualization",
    label: "Sortino ratio",
    shortLabel: "Sortino",
    category: "Risk-adjusted",
    chartKind: "bar",
    unit: "decimal",
    classification: "estimated",
    method:
      "Annualised excess return divided by full-sample downside deviation versus the daily risk-free target.",
    description:
      "Annualised excess return earned per unit of downside shortfall.",
    interpretation:
      "Higher values indicate stronger compensation for harmful rather than total volatility.",
    caveat:
      "A period with no downside shortfall has an unbounded ratio and is shown explicitly, not as a finite score.",
    minimumSymbols: 1,
    minimumDays: 3,
    betterDirection: "higher",
    usesRiskFreeRate: true,
  },
  MarketCorrelationAnalysis: {
    id: "MarketCorrelationAnalysis",
    label: "Rolling correlation matrix",
    shortLabel: "Correlation",
    category: "Diversification",
    chartKind: "heatmap",
    unit: "correlation",
    classification: "estimated",
    method: "Mean of 21-trading-day rolling Pearson correlations.",
    description:
      "Mean 21-trading-day rolling pairwise correlation across selected symbols and the benchmark.",
    interpretation:
      "Lower or negative pairs may diversify each other; values near 1 historically moved together.",
    caveat:
      "Correlation changes over time and can converge during stressed markets. N/A means insufficient overlap.",
    minimumSymbols: 1,
    minimumDays: 21,
    betterDirection: "context",
    requiresBenchmark: true,
  },
  EfficientFrontierVisualization: {
    id: "EfficientFrontierVisualization",
    label: "Simulated portfolios",
    shortLabel: "Portfolios",
    category: "Diversification",
    chartKind: "scatter",
    unit: "percent",
    classification: "simulated",
    method:
      "Deterministic long-only Dirichlet allocation samples using annualised historical mean and covariance.",
    description:
      "Long-only sampled allocations plotted by annualised volatility and estimated return.",
    interpretation:
      "Compare the best sampled Sharpe and lowest sampled volatility points; neither is a guaranteed optimum or forecast.",
    caveat:
      "The opportunity set is a historical simulation and changes materially with the sample and selected assets.",
    minimumSymbols: 2,
    minimumDays: 21,
    betterDirection: "context",
    usesRiskFreeRate: true,
  },
};

const categoryOrder: PortfolioMetricCategory[] = [
  "Performance",
  "Risk",
  "Risk-adjusted",
  "Diversification",
];

export const METRIC_GROUPS = categoryOrder.map((label) => ({
  label,
  metrics: Object.values(METRIC_REGISTRY)
    .filter((metric) => metric.category === label)
    .map((metric) => metric.id),
}));

export const formatMetricValue = (
  metricType: PortfolioMetricType,
  value: number,
  compact = false,
) => {
  const metric = METRIC_REGISTRY[metricType];
  if (!Number.isFinite(value)) return "—";

  if (metric.unit === "percent") {
    return new Intl.NumberFormat("en-AU", {
      style: "percent",
      maximumFractionDigits: compact ? 1 : 2,
      signDisplay:
        metricType === "ValueAtRiskAnalysis" ? "never" : "exceptZero",
    }).format(value);
  }

  return new Intl.NumberFormat("en-AU", {
    maximumFractionDigits: compact ? 1 : 2,
    signDisplay: metric.unit === "decimal" ? "exceptZero" : "auto",
  }).format(value);
};
