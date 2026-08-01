import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import { BarGraph, HeatMap, LineGraph } from "@/components/charts";
import type { MetricsResponse } from "@/lib/market-metrics";
import { PortfolioChart } from "./PortfolioChart";
import { PortfolioFrontierChart } from "./PortfolioFrontierChart";

jest.mock("@/components/charts", () => ({
  BarGraph: function MockBarGraph() {
    return null;
  },
  HeatMap: function MockHeatMap() {
    return null;
  },
  LineGraph: function MockLineGraph() {
    return null;
  },
}));

jest.mock("./PortfolioFrontierChart", () => ({
  PortfolioFrontierChart: function MockPortfolioFrontierChart() {
    return null;
  },
}));

const baseData: MetricsResponse = {
  tickers: ["AAPL", "MSFT"],
  metricType: "AlphaComparison",
  series: {
    singleValue: { AAPL: 0.12, MSFT: -0.04 },
  },
};

const renderChart = (
  props: Partial<Parameters<typeof PortfolioChart>[0]> = {},
) => {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      <PortfolioChart
        data={baseData}
        metricType="AlphaComparison"
        benchmark="^AXJO"
        {...props}
      />,
      { createNodeMock: () => ({}) },
    );
  });
  return renderer;
};

const collectRenderedText = (node: ReactTestInstance | string): string =>
  typeof node === "string"
    ? node
    : node.children
        .map((child) =>
          typeof child === "string" ? child : collectRenderedText(child),
        )
        .join("");

describe("PortfolioChart", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    Reflect.deleteProperty(global, "ResizeObserver");
  });

  it("maps comparison values into an accessible bar chart", () => {
    const renderer = renderChart();
    const bar = renderer.root.findByType(BarGraph);

    expect(bar.props.data).toEqual([
      { label: "AAPL", value: 0.12 },
      { label: "MSFT", value: -0.04 },
    ]);
    expect(bar.props.ariaLabel).toBe("Alpha vs benchmark comparison");
    expect(bar.props.valueFormat(0.125)).toBe("+12.5%");
    expect(renderer.root.findByProps({ "data-benchmark": "^AXJO" })).toBeDefined();
  });

  it("converts dated observations for the line chart", () => {
    const renderer = renderChart({
      metricType: "CumulativeReturnComparison",
      data: {
        tickers: ["AAPL"],
        metricType: "CumulativeReturnComparison",
        series: {
          timeSeries: {
            AAPL: [
              { date: "2026-07-30", value: 0.1 },
              { date: "2026-07-31", value: 0.12 },
            ],
          },
        },
      },
    });
    const line = renderer.root.findByType(LineGraph);

    expect(line.props.data[0].ticker).toBe("AAPL");
    expect(line.props.data[0].values[0]).toEqual({
      date: new Date("2026-07-30T00:00:00"),
      value: 0.1,
    });
    expect(line.props.valueFormat(-0.08)).toBe("-8%");
  });

  it("renders empty chart models when optional chart-kind series are absent", () => {
    const barRenderer = renderChart({
      data: {
        tickers: [],
        metricType: "AlphaComparison",
        series: {},
      },
    });
    expect(barRenderer.root.findByType(BarGraph).props.data).toEqual([]);

    const lineRenderer = renderChart({
      metricType: "CumulativeReturnComparison",
      data: {
        tickers: [],
        metricType: "CumulativeReturnComparison",
        series: {},
      },
    });
    expect(lineRenderer.root.findByType(LineGraph).props.data).toEqual([]);

    const heatMapRenderer = renderChart({
      metricType: "MarketCorrelationAnalysis",
      data: {
        tickers: [],
        metricType: "MarketCorrelationAnalysis",
        series: {},
      },
    });
    expect(heatMapRenderer.root.findByType(HeatMap).props).toMatchObject({
      data: [],
      labels: [],
    });
  });

  it("pins and clears a selected correlation cell", () => {
    const renderer = renderChart({
      metricType: "MarketCorrelationAnalysis",
      data: {
        tickers: ["AAPL", "MSFT"],
        metricType: "MarketCorrelationAnalysis",
        series: {
          correlationMatrix: {
            AAPL: { AAPL: 1, MSFT: 0.456 },
            MSFT: { AAPL: 0.456, MSFT: 1 },
          },
        },
      },
    });
    const heatMap = renderer.root.findByType(HeatMap);

    expect(heatMap.props.labels).toEqual(["AAPL", "MSFT"]);
    act(() =>
      heatMap.props.onCellSelect({
        row: 0,
        column: 1,
        rowLabel: "AAPL",
        columnLabel: "MSFT",
        value: 0.456,
      }),
    );
    expect(
      collectRenderedText(renderer.root.findByProps({ role: "status" })),
    ).toContain("AAPL / MSFT");
    expect(
      collectRenderedText(renderer.root.findByProps({ role: "status" })),
    ).toContain("Rolling correlation 0.46");

    act(() => renderer.root.findByProps({ children: "Clear" }).props.onClick());
    expect(renderer.root.findAllByProps({ role: "status" })).toHaveLength(0);
  });

  it("describes a selected sampled portfolio and its finite allocations", () => {
    const renderer = renderChart({
      metricType: "EfficientFrontierVisualization",
      data: {
        tickers: ["AAPL", "MSFT"],
        metricType: "EfficientFrontierVisualization",
        series: {
          portfolio: {
            returns: [0.14],
            risks: [0.2],
            sharpe_ratios: [0.7],
            weights: [[0.6, Number.NaN]],
            asset_order: ["AAPL", "MSFT"],
            max_sharpe_index: 0,
            min_volatility_index: 0,
          },
        },
      },
    });
    const frontier = renderer.root.findByType(PortfolioFrontierChart);

    expect(frontier.props.data).toEqual([
      {
        risk: 0.2,
        return: 0.14,
        sharpe: 0.7,
        weights: [0.6, Number.NaN],
      },
    ]);
    act(() =>
      frontier.props.onPointSelect({
        risk: 0.2,
        return: 0.14,
        sharpe: 0.7,
        weights: [0.6, Number.NaN],
      }),
    );
    const selectionText = collectRenderedText(
      renderer.root.findByProps({ role: "status" }),
    );
    expect(selectionText).toContain("Pinned sampled portfolio");
    expect(selectionText).toContain("Sharpe 0.70");
    expect(selectionText).toContain("AAPL 60.0%");
    expect(selectionText).not.toContain("MSFT");
  });

  it("uses safe frontier fallbacks when optional sample details are absent", () => {
    const portfolio = {
      returns: [0.05],
      risks: [],
      sharpe_ratios: [],
      weights: [],
      asset_order: undefined,
      max_sharpe_index: 0,
      min_volatility_index: 0,
    } as unknown as NonNullable<MetricsResponse["series"]["portfolio"]>;
    const renderer = renderChart({
      metricType: "EfficientFrontierVisualization",
      data: {
        tickers: [],
        metricType: "EfficientFrontierVisualization",
        series: { portfolio },
      },
    });
    const frontier = renderer.root.findByType(PortfolioFrontierChart);

    expect(frontier.props.data).toEqual([
      {
        risk: 0,
        return: 0.05,
        sharpe: undefined,
        weights: [],
      },
    ]);
    act(() => frontier.props.onPointSelect(frontier.props.data[0]));

    const selectionText = collectRenderedText(
      renderer.root.findByProps({ role: "status" }),
    );
    expect(selectionText).toContain("+5% return");
    expect(selectionText).toContain("0% risk");
    expect(selectionText).not.toContain("Sharpe");
  });

  it("reacts to container measurements and disconnects its observer", () => {
    let resize: ((entries: { contentRect: { width: number; height: number } }[]) => void) | undefined;
    const observe = jest.fn();
    const disconnect = jest.fn();
    class FakeResizeObserver {
      constructor(callback: typeof resize) {
        resize = callback;
      }
      observe = observe;
      disconnect = disconnect;
    }
    Object.defineProperty(global, "ResizeObserver", {
      configurable: true,
      value: FakeResizeObserver,
    });
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <PortfolioChart
          data={baseData}
          metricType="AlphaComparison"
          benchmark="^AXJO"
          compact
        />,
        { createNodeMock: () => ({ nodeName: "DIV" }) },
      );
    });

    expect(observe).toHaveBeenCalledTimes(1);
    act(() => resize?.([{ contentRect: { width: 100, height: 120 } }]));
    expect(renderer.root.findByType(BarGraph).props).toMatchObject({
      width: 260,
      height: 180,
    });
    act(() => renderer.unmount());
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
