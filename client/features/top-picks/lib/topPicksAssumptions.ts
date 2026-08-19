import type { TopPicksMetadata } from "../types";

const formatPercent = (value: number): string =>
  (value * 100).toFixed(2).replace(/\.?0+$/, "");

export const formatTopPicksAssumptions = (
  metadata: TopPicksMetadata,
): string | null => {
  const universe =
    metadata.universeCount === undefined
      ? null
      : `Ranked universe: ${metadata.universeCount} stocks`;
  const requestedWindow =
    metadata.window === "trailing_day"
      ? "requested window: day"
      : metadata.window === "trailing_week"
        ? "requested window: week"
        : metadata.window === "trailing_month"
          ? "requested window: month"
          : metadata.window === "trailing_one_year"
            ? "requested window: trailing one year"
            : null;
  const benchmark = metadata.benchmark
    ? `benchmark ${metadata.benchmark}`
    : null;
  const rateDetails = [
    metadata.riskFreeRateSource ?? null,
    metadata.riskFreeRateAsOf
      ? `effective ${metadata.riskFreeRateAsOf}`
      : null,
  ].filter((detail): detail is string => detail !== null);
  const riskFreeRate =
    metadata.riskFreeRate === undefined
      ? null
      : `risk-free rate ${formatPercent(metadata.riskFreeRate)}%${
          rateDetails.length ? ` (${rateDetails.join(", ")})` : ""
        }`;
  const parts = [universe, requestedWindow, benchmark, riskFreeRate].filter(
    (part): part is string => part !== null,
  );

  return parts.length ? parts.join(" • ") : null;
};
