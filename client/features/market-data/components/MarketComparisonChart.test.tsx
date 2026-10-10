import { describe, expect, it } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";
import { MarketComparisonChart } from "./MarketComparisonChart";

describe("MarketComparisonChart", () => {
  it("renders multiple labelled percentage-performance lines", () => {
    const markup = renderToStaticMarkup(
      <MarketComparisonChart
        rangeLabel="3M"
        series={[
          {
            symbol: "CBA.AX",
            points: [
              { timeMs: Date.UTC(2026, 0, 1), value: 0 },
              { timeMs: Date.UTC(2026, 0, 2), value: 5 },
            ],
          },
          {
            symbol: "AAPL",
            points: [
              { timeMs: Date.UTC(2026, 0, 1), value: 0 },
              { timeMs: Date.UTC(2026, 0, 2), value: -3 },
            ],
          },
        ]}
      />,
    );

    expect(markup).toContain("3M relative performance comparison");
    expect(markup).toContain("CBA.AX");
    expect(markup).toContain("AAPL");
    expect(markup).toContain('data-testid="comparison-line-CBA.AX"');
    expect(markup).toContain('data-testid="comparison-line-AAPL"');
    expect(markup).toContain("0%");
  });

  it("renders one zero baseline when every series is flat", () => {
    const markup = renderToStaticMarkup(
      <MarketComparisonChart
        rangeLabel="1D"
        series={[
          {
            points: [
              { timeMs: Date.UTC(2026, 6, 15, 0), value: 0 },
              { timeMs: Date.UTC(2026, 6, 15, 1), value: 0 },
            ],
            symbol: "CBA.AX",
          },
        ]}
      />,
    );

    expect(markup.match(/class="baseline"/g)).toHaveLength(1);
  });

  it("ignores finite timestamps outside the JavaScript Date range", () => {
    expect(() =>
      renderToStaticMarkup(
        <MarketComparisonChart
          rangeLabel="3M"
          series={[
            {
              points: [
                { timeMs: Date.UTC(2026, 4, 1), value: 0 },
                { timeMs: Date.UTC(2026, 6, 15), value: 5 },
                { timeMs: Number.MAX_VALUE, value: 10 },
              ],
              symbol: "CBA.AX",
            },
          ]}
        />,
      ),
    ).not.toThrow();
  });
});
