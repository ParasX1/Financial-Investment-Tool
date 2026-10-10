export type CorrelationHeatMapModel = {
  labels: string[];
  values: Array<Array<number | null>>;
};

export const toCorrelationHeatMapModel = (
  matrix: Record<string, Record<string, number>>,
): CorrelationHeatMapModel => {
  const labels = Array.from(
    new Set([
      ...Object.keys(matrix),
      ...Object.values(matrix).flatMap((row) => Object.keys(row)),
    ]),
  );

  return {
    labels,
    values: labels.map((rowLabel) =>
      labels.map((columnLabel) => {
        const value = matrix[rowLabel]?.[columnLabel];
        return Number.isFinite(value) ? value : null;
      }),
    ),
  };
};
