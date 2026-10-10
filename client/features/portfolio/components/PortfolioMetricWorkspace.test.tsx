import * as React from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import TestRenderer, {
  act,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import type { MetricsResponse } from "@/lib/market-metrics";
import type { PortfolioAnalysisSettings } from "../types";

jest.doMock("./PortfolioChart", () => ({
  PortfolioChart: jest.fn(() => null),
}));

const portfolioChartMock = jest.mocked(
  (jest.requireMock("./PortfolioChart") as typeof import("./PortfolioChart"))
    .PortfolioChart,
);
const { PortfolioMetricWorkspace } = jest.requireActual<
  typeof import("./PortfolioMetricWorkspace")
>("./PortfolioMetricWorkspace");
const mountedRenderers = new Set<ReactTestRenderer>();

const textOf = (node: ReactTestInstance | string | number): string => {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  return node.children.map((child) => textOf(child)).join("");
};

const renderWorkspace = (
  data: MetricsResponse,
  settings: PortfolioAnalysisSettings,
  symbols = data.tickers,
) => {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <PortfolioMetricWorkspace
        data={data}
        settings={settings}
        symbols={symbols}
      />,
    );
  });
  mountedRenderers.add(renderer);
  return renderer;
};

beforeEach(() => {
  portfolioChartMock.mockClear();
});

afterEach(() => {
  for (const renderer of mountedRenderers) {
    act(() => renderer.unmount());
  }
  mountedRenderers.clear();
});

describe("PortfolioMetricWorkspace", () => {
  it("connects benchmark and risk assumptions to the focused chart and table", () => {
    const data: MetricsResponse = {
      tickers: ["AAPL", "MSFT"],
      metricType: "AlphaComparison",
      series: { singleValue: { AAPL: 0.08, MSFT: 0.12 } },
    };
    const settings: PortfolioAnalysisSettings = {
      metricType: "AlphaComparison",
      startDate: "2025-07-31",
      endDate: "2026-07-31",
      benchmark: "^AXJO",
      riskFreeRate: 0.0435,
      confidenceLevel: 0.05,
    };

    const renderer = renderWorkspace(data, settings);
    const content = textOf(renderer.root);
    const assumptions = renderer.root.findAllByType("li").map(textOf);
    const chartProps = portfolioChartMock.mock.calls.at(-1)?.[0];

    expect(content).toContain("Alpha vs benchmark");
    expect(content).toContain("2 symbols");
    expect(content).toContain("Highest in comparison");
    expect(content).toContain("MSFT");
    expect(content).toContain("This analysis is educational and is not a recommendation.");
    expect(assumptions).toEqual([
      "2025-07-31 to 2026-07-31",
      "Benchmark ^AXJO",
      "Risk-free 4.3%",
    ]);
    expect(chartProps).toMatchObject({
      data,
      metricType: "AlphaComparison",
      benchmark: "^AXJO",
    });
    expect(renderer.root.findAllByType("table")).toHaveLength(1);
    expect(
      renderer.root.findAllByType("th").some((header) => textOf(header) === "Symbol"),
    ).toBe(true);
  });

  it("shows confidence-only assumptions and a clear fallback without figures", () => {
    const data: MetricsResponse = {
      tickers: ["AAPL"],
      metricType: "ValueAtRiskAnalysis",
      series: { singleValue: {} },
    };
    const settings: PortfolioAnalysisSettings = {
      metricType: "ValueAtRiskAnalysis",
      startDate: "2026-01-01",
      endDate: "2026-07-31",
      benchmark: "SPY",
      riskFreeRate: 0.04,
      confidenceLevel: 0.01,
    };

    const renderer = renderWorkspace(data, settings);
    const content = textOf(renderer.root);
    const assumptions = renderer.root.findAllByType("li").map(textOf);

    expect(content).toContain("No comparison figure is available for this response.");
    expect(assumptions).toEqual([
      "2026-01-01 to 2026-07-31",
      "99% confidence",
    ]);
    expect(content).not.toContain("Benchmark SPY");
    expect(content).not.toContain("Risk-free 4.0%");
    expect(portfolioChartMock.mock.calls.at(-1)?.[0]).toMatchObject({
      metricType: "ValueAtRiskAnalysis",
      benchmark: "SPY",
    });
  });
});
