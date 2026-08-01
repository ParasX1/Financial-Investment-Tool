import {
  buildFrontierView,
  getPaddedDomain,
  validateAnalysisRange,
} from "./portfolioAnalytics";

describe("portfolio analytics chart helpers", () => {
  it("keeps an all-negative return domain focused on the observed data", () => {
    const domain = getPaddedDomain([-0.96, -0.61, -0.28]);

    expect(domain[0]).toBeLessThan(-0.96);
    expect(domain[1]).toBeGreaterThan(-0.28);
    expect(domain[1]).toBeLessThan(0);
  });

  it("creates a non-degenerate domain for a constant series", () => {
    const domain = getPaddedDomain([0.12, 0.12, 0.12]);

    expect(domain[0]).toBeLessThan(0.12);
    expect(domain[1]).toBeGreaterThan(0.12);
  });

  it("bounds a dense simulated cloud while preserving highlighted portfolios", () => {
    const points = Array.from({ length: 10_000 }, (_, index) => ({
      risk: 0.1 + index / 20_000,
      return: -0.8 + index / 15_000,
      sharpe: -2 + index / 2_500,
      weights: [index / 10_000, 1 - index / 10_000],
    }));

    const view = buildFrontierView(points, 900);

    expect(view.displayPoints.length).toBeLessThanOrEqual(900);
    expect(view.displayPoints).toContainEqual(view.minimumRisk);
    expect(view.displayPoints).toContainEqual(view.maximumSharpe);
    expect(view.frontier.length).toBeGreaterThan(1);
  });

  it("rejects same-day, reversed, and future analysis ranges", () => {
    const today = "2026-07-28";

    expect(validateAnalysisRange(today, today, today)).toMatch(/before/i);
    expect(validateAnalysisRange("2026-07-29", today, today)).toMatch(
      /before/i,
    );
    expect(validateAnalysisRange("2025-07-28", "2026-07-29", today)).toMatch(
      /future/i,
    );
    expect(validateAnalysisRange("2025-07-28", today, today)).toBeNull();
  });
});
