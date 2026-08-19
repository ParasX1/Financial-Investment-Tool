import { describe, expect, it } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";
import { MarketLineChart } from "./MarketLineChart";

describe("MarketLineChart", () => {
  it("renders an accessible one-day line with a previous-close baseline", () => {
    const markup = renderToStaticMarkup(
      <MarketLineChart
        currency="AUD"
        points={[
          { timeMs: Date.UTC(2026, 6, 15, 0, 0), value: 119 },
          { timeMs: Date.UTC(2026, 6, 15, 1, 0), value: 121 },
          { timeMs: Date.UTC(2026, 6, 15, 2, 0), value: 120 },
        ]}
        previousClose={118}
        symbol="CBA.AX"
      />,
    );

    expect(markup).toContain('role="img"');
    expect(markup).toContain('preserveAspectRatio="xMidYMid meet"');
    expect(markup).toContain("CBA.AX one-day price trend");
    expect(markup).toContain('data-testid="market-line"');
    expect(markup).toContain('data-testid="previous-close-line"');
  });

  it("labels longer ranges and their sampling cadence accurately", () => {
    const markup = renderToStaticMarkup(
      <MarketLineChart
        currency="AUD"
        pointCadenceLabel="Daily snapshots"
        points={[
          { timeMs: Date.UTC(2026, 4, 1), value: 119 },
          { timeMs: Date.UTC(2026, 5, 1), value: 121 },
          { timeMs: Date.UTC(2026, 6, 15), value: 120 },
        ]}
        previousClose={118}
        rangeLabel="3M"
        symbol="CBA.AX"
      />,
    );

    expect(markup).toContain("CBA.AX 3M price trend");
    expect(markup).toContain("Daily snapshots");
    expect(markup).not.toContain("one-day price trend");
    expect(markup).not.toContain("One-minute snapshots");
  });

  it("ignores finite timestamps outside the JavaScript Date range", () => {
    expect(() =>
      renderToStaticMarkup(
        <MarketLineChart
          currency="AUD"
          points={[
            { timeMs: Date.UTC(2026, 6, 15, 0, 0), value: 119 },
            { timeMs: Date.UTC(2026, 6, 15, 1, 0), value: 120 },
            { timeMs: Number.MAX_VALUE, value: 121 },
          ]}
          previousClose={118}
          symbol="CBA.AX"
        />,
      ),
    ).not.toThrow();
  });

  it("shows an explicit empty state when there are too few usable points", () => {
    const markup = renderToStaticMarkup(
      <MarketLineChart
        currency="AUD"
        points={[{ timeMs: 1, value: 120 }]}
        previousClose={119}
        symbol="CBA.AX"
      />,
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain("Intraday trend is not available yet.");
  });
});
