import type {
  QuantEvidence,
  QuantObjective,
  QuantPeriod,
  QuantRiskProfile,
  QuantStageStatus,
} from "../types";

export const PERIOD_LABELS: Readonly<Record<QuantPeriod, string>> = {
  "1mo": "1 month",
  "3mo": "3 months",
  "6mo": "6 months",
  "1y": "1 year",
  "2y": "2 years",
};

export const OBJECTIVE_LABELS: Readonly<Record<QuantObjective, string>> = {
  signal_scan: "Signal scan",
  risk_review: "Risk review",
  scenario_plan: "Scenario plan",
};

export const RISK_PROFILE_LABELS: Readonly<Record<QuantRiskProfile, string>> = {
  conservative: "Conservative",
  balanced: "Balanced",
  aggressive: "Aggressive",
};

export const humanize = (value: string): string =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const statusLabel = (
  status: QuantStageStatus | "succeeded" | "partial",
) => humanize(status);

export const formatConfidence = (value: number): string =>
  `${Math.round(value * 100)}%`;

export const formatDuration = (durationMs: number | undefined): string =>
  durationMs === undefined
    ? "Not recorded"
    : `${durationMs.toLocaleString()} ms`;

export function formatEvidenceValue(evidence: QuantEvidence): string {
  if (!evidence.finite || evidence.value === null) return "Unavailable";
  const normalizedUnit = evidence.unit.toLowerCase();
  if (
    [
      "decimal_return",
      "decimal_annualized",
      "decimal_drawdown",
      "fraction",
      "decimal_distance",
      "ratio",
      "percent",
      "percentage",
    ].includes(normalizedUnit)
  ) {
    return `${(evidence.value * 100).toFixed(1)}%`;
  }
  if (["observations", "count"].includes(normalizedUnit)) {
    return Math.round(evidence.value).toLocaleString();
  }
  return `${evidence.value.toLocaleString(undefined, {
    maximumFractionDigits: 3,
  })}${evidence.unit ? ` ${evidence.unit}` : ""}`;
}
