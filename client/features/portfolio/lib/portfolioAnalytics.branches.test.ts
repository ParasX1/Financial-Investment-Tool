import {
  buildFrontierView,
  getPaddedDomain,
  validateAnalysisRange,
} from "./portfolioAnalytics";

describe("portfolio analytics edge cases", () => {
  describe("getPaddedDomain", () => {
    it.each([0, -0.25, Number.NaN, Number.POSITIVE_INFINITY])(
      "rejects an invalid padding ratio of %s",
      (paddingRatio) => {
        expect(() => getPaddedDomain([1, 2], paddingRatio)).toThrow(RangeError);
      },
    );

    it("falls back to the default domain when no finite observations exist", () => {
      expect(
        getPaddedDomain([
          Number.NaN,
          Number.POSITIVE_INFINITY,
          Number.NEGATIVE_INFINITY,
        ]),
      ).toEqual([0, 1]);
    });

    it("ignores non-finite observations around valid values", () => {
      expect(
        getPaddedDomain([Number.NaN, -2, Number.POSITIVE_INFINITY, -1], 0.1),
      ).toEqual([-2.1, -0.9]);
    });

    it("keeps an ordered finite domain when the observed span overflows", () => {
      const domain = getPaddedDomain([-Number.MAX_VALUE, Number.MAX_VALUE]);

      expect(domain).toEqual([-Number.MAX_VALUE, Number.MAX_VALUE]);
    });

    it("uses fallback padding when tiny padding is lost at floating-point scale", () => {
      const domain = getPaddedDomain([Number.MAX_VALUE], Number.MIN_VALUE);

      expect(domain[0]).toBeLessThan(Number.MAX_VALUE);
      expect(domain[1]).toBe(Number.MAX_VALUE);
    });
  });

  describe("buildFrontierView", () => {
    it.each([1, Number.NaN, Number.POSITIVE_INFINITY])(
      "rejects an invalid display limit of %s",
      (displayLimit) => {
        expect(() => buildFrontierView([], displayLimit)).toThrow(RangeError);
      },
    );

    it("reports the original count when every chart point is unusable", () => {
      const view = buildFrontierView([
        { risk: Number.NaN, return: 0.1 },
        { risk: 0.2, return: Number.POSITIVE_INFINITY },
      ]);

      expect(view).toEqual({
        displayPoints: [],
        frontier: [],
        minimumRisk: null,
        maximumSharpe: null,
        sourcePointCount: 2,
      });
    });

    it("omits a maximum-Sharpe highlight when Sharpe values are unavailable", () => {
      const points = [
        { risk: 0.2, return: 0.1 },
        { risk: 0.1, return: 0.08, sharpe: Number.NaN },
        { risk: 0.3, return: 0.12, sharpe: Number.POSITIVE_INFINITY },
      ];

      const view = buildFrontierView(points, 10);

      expect(view.maximumSharpe).toBeNull();
      expect(view.minimumRisk).toBe(points[1]);
      expect(view.displayPoints).toEqual(points);
    });

    it("prunes dominated points and resolves equal-risk ties deterministically", () => {
      const highestAtEqualRisk = { risk: 0.1, return: 0.2, label: "kept" };
      const dominatedAtEqualRisk = {
        risk: 0.1,
        return: 0.1,
        label: "equal-risk",
      };
      const dominatedAtHigherRisk = {
        risk: 0.2,
        return: 0.15,
        label: "higher-risk",
      };
      const higherReturn = { risk: 0.3, return: 0.25, label: "higher-return" };

      const view = buildFrontierView(
        [
          dominatedAtEqualRisk,
          higherReturn,
          dominatedAtHigherRisk,
          highestAtEqualRisk,
        ],
        10,
      );

      expect(view.frontier).toEqual([highestAtEqualRisk, higherReturn]);
      expect(view.displayPoints).toHaveLength(4);
    });

    it("keeps distinct highlights when the frontier sample budget is zero", () => {
      const minimumRisk = { risk: 0.1, return: 0.3, sharpe: 1 };
      const maximumSharpe = { risk: 0.2, return: 0.2, sharpe: 2 };
      const points = [
        minimumRisk,
        maximumSharpe,
        { risk: 0.3, return: 0.1, sharpe: 0.5 },
        { risk: 0.4, return: 0.05, sharpe: 0.1 },
      ];

      const view = buildFrontierView(points, 2.9);

      expect(view.minimumRisk).toBe(minimumRisk);
      expect(view.maximumSharpe).toBe(maximumSharpe);
      expect(view.displayPoints).toEqual([minimumRisk, maximumSharpe]);
      expect(view.frontier).toEqual([minimumRisk]);
    });
  });

  describe("validateAnalysisRange", () => {
    it.each([
      ["2026/01/01", "2026-02-01", "2026-07-28"],
      ["2026-01-01", "2026-13-01", "2026-07-28"],
      ["2026-01-01", "2026-02-01", "not-a-date"],
      ["2026-02-30", "2026-03-01", "2026-07-28"],
    ])("rejects malformed or impossible dates", (startDate, endDate, today) => {
      expect(validateAnalysisRange(startDate, endDate, today)).toMatch(
        /valid dates/i,
      );
    });
  });
});
