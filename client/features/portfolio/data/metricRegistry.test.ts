import { METRIC_GROUPS, METRIC_REGISTRY } from "./metricRegistry";

describe("Portfolio metric registry", () => {
  it("defines every supported metric once with usable display metadata", () => {
    const ids = Object.keys(METRIC_REGISTRY);

    expect(ids).toHaveLength(10);
    expect(new Set(ids)).toHaveProperty("size", 10);

    Object.values(METRIC_REGISTRY).forEach((metric) => {
      expect(metric.label).toBeTruthy();
      expect(metric.description).toBeTruthy();
      expect(metric.interpretation).toBeTruthy();
      expect(metric.unit).toMatch(/percent|decimal|correlation/);
      expect(metric.minimumSymbols).toBeGreaterThanOrEqual(1);
      expect(metric.classification).toMatch(
        /historical|estimated|simulated/,
      );
      expect(metric.method).toBeTruthy();
    });
  });

  it("groups every metric into the focused workspace navigation", () => {
    const groupedIds = METRIC_GROUPS.flatMap((group) => group.metrics);

    expect(groupedIds).toHaveLength(10);
    expect(new Set(groupedIds).size).toBe(10);
    expect(groupedIds).toEqual(
      expect.arrayContaining(Object.keys(METRIC_REGISTRY)),
    );
  });

  it("describes VaR, correlation, and sampled portfolios without overstating them", () => {
    const valueAtRisk = METRIC_REGISTRY.ValueAtRiskAnalysis;
    const correlation = METRIC_REGISTRY.MarketCorrelationAnalysis;
    const portfolios = METRIC_REGISTRY.EfficientFrontierVisualization;

    expect(valueAtRisk.interpretation).not.toContain("95%");
    expect(valueAtRisk.betterDirection).toBe("lower");
    expect(valueAtRisk.description).toContain("loss magnitude");
    expect(correlation.minimumSymbols).toBe(1);
    expect(correlation.description).toContain("21-trading-day");
    expect(correlation.description).toContain("pairwise");
    expect(portfolios.minimumDays).toBeGreaterThanOrEqual(21);
    expect(portfolios.interpretation).toContain("best sampled");
    expect(portfolios.method).toContain("Dirichlet");
  });
});
