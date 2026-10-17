import {
  formatMetricValue,
  METRIC_REGISTRY,
} from "@/features/portfolio/data/metricRegistry";
import sample from "./researchDeskSample.json";

export type ResearchMetric = "return" | "volatility" | "drawdown";

export const researchMetrics = ["return", "volatility", "drawdown"] as const;
export const researchSample = sample;
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
export const researchPeriod = dateFormatter
  .formatRange(new Date(sample.period.start), new Date(sample.period.end))
  .replace(/\bSept\b/g, "Sep")
  .replace(/\s*–\s*/g, "–");
export const researchCapturedOn = dateFormatter.format(
  new Date(sample.source.capturedOn),
);
export const researchCompanyContext = sample.companies
  .map(({ name, symbol }) => `${name} (${symbol})`)
  .join(" · ");
export const researchSeriesColors = ["#b8a2ff", "#9bcafb"];

export const researchMetricDefinitions = {
  return: {
    metric: METRIC_REGISTRY.CumulativeReturnComparison,
    valueKey: "totalReturn",
    seriesKey: "cumulativeReturn",
    inspectLabel: "Inspect return",
    summaryLabel: "Ending return",
    interpretation:
      "Microsoft finished slightly ahead; the paths show how each company got there.",
    context:
      "Both series start at zero on the first date. Historical returns exclude fees and taxes.",
  },
  volatility: {
    metric: METRIC_REGISTRY.VolatilityAnalysis,
    valueKey: "annualisedVolatility",
    inspectLabel: "Inspect volatility",
    summaryLabel: "Annualised variability",
    interpretation:
      "Apple’s daily returns varied more in this window. Lower volatility does not guarantee safety.",
    context: `Estimated from ${sample.dates.length - 1} daily returns, scaled by √${sample.annualisationDays}. This short window is not a forecast.`,
  },
  drawdown: {
    metric: METRIC_REGISTRY.MaxDrawdownAnalysis,
    valueKey: "maxDrawdown",
    seriesKey: "drawdown",
    inspectLabel: "Inspect drawdown",
    summaryLabel: "Worst decline from a peak",
    interpretation:
      "Apple had the deeper decline. Zero marks a recovered or new high within this window.",
    context:
      "Peaks are measured within this window. The figures show each company’s lowest drawdown, not its ending value.",
  },
} as const;

export const formatResearchValue = (kind: ResearchMetric, value: number) => {
  const formatted = formatMetricValue(
    researchMetricDefinitions[kind].metric.id,
    value,
  );
  return kind === "volatility" ? formatted.replace(/^\+/, "") : formatted;
};

// These are only chart-shape adapters. Financial outputs are frozen in the sample.
export const researchLineData = {
  return: sample.companies.map((company) => ({
    ticker: company.symbol,
    values: sample.dates.map((date, index) => ({
      date: new Date(`${date}T00:00:00`),
      value: company.cumulativeReturn[index],
    })),
  })),
  drawdown: sample.companies.map((company) => ({
    ticker: company.symbol,
    values: sample.dates.map((date, index) => ({
      date: new Date(`${date}T00:00:00`),
      value: company.drawdown[index],
    })),
  })),
};

export const researchVolatilityData = sample.companies.map((company) => ({
  label: company.symbol,
  value: company.annualisedVolatility,
}));
