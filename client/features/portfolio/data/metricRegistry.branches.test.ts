import { formatMetricValue, METRIC_REGISTRY } from "./metricRegistry";

describe("Portfolio metric registry behavior", () => {
  it("marks only the assumptions each metric actually consumes", () => {
    expect(METRIC_REGISTRY.AlphaComparison).toMatchObject({
      requiresBenchmark: true,
      usesRiskFreeRate: true,
    });
    expect(METRIC_REGISTRY.ValueAtRiskAnalysis).toMatchObject({
      usesConfidenceLevel: true,
    });
    expect(METRIC_REGISTRY.CumulativeReturnComparison).not.toHaveProperty(
      "requiresBenchmark",
    );
    expect(METRIC_REGISTRY.CumulativeReturnComparison).not.toHaveProperty(
      "usesRiskFreeRate",
    );
    expect(METRIC_REGISTRY.CumulativeReturnComparison).not.toHaveProperty(
      "usesConfidenceLevel",
    );
  });

  it("renders unavailable values consistently", () => {
    expect(formatMetricValue("VolatilityAnalysis", Number.NaN)).toBe("—");
    expect(
      formatMetricValue("VolatilityAnalysis", Number.POSITIVE_INFINITY),
    ).toBe("—");
  });

  it("formats regular and compact percentages with metric-specific signs", () => {
    expect(formatMetricValue("AlphaComparison", 0.1234)).toBe("+12.34%");
    expect(formatMetricValue("AlphaComparison", 0.1234, true)).toBe("+12.3%");
    expect(formatMetricValue("ValueAtRiskAnalysis", -0.1234)).toBe("12.34%");
  });

  it("formats decimal and correlation values with their appropriate signs", () => {
    expect(formatMetricValue("SharpeRatioMatrix", 1.234)).toBe("+1.23");
    expect(formatMetricValue("SharpeRatioMatrix", 1.234, true)).toBe("+1.2");
    expect(formatMetricValue("MarketCorrelationAnalysis", 0.456)).toBe("0.46");
  });
});
