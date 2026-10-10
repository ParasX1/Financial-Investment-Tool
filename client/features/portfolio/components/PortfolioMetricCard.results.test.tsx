import * as React from "react";
import TestRenderer, {
  act,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import { fetchMetrics, type MetricsResponse } from "@/lib/market-metrics";
import type { PortfolioAnalysisInputs, PortfolioMetricType } from "../types";
import { clearPortfolioMetricCache } from "../hooks/usePortfolioMetric";
import { PortfolioMetricCard } from "./PortfolioMetricCard";
import { PortfolioChart } from "./PortfolioChart";

jest.mock("@/lib/market-metrics", () => ({ fetchMetrics: jest.fn() }));
jest.mock("./PortfolioChart", () => ({ PortfolioChart: jest.fn(() => null) }));

const fetchMetricsMock = jest.mocked(fetchMetrics);
const chartMock = jest.mocked(PortfolioChart);
const renderers = new Set<ReactTestRenderer>();
const INPUTS: PortfolioAnalysisInputs = {
  startDate: "2025-07-31",
  endDate: "2026-07-31",
  benchmark: "SPY",
  riskFreeRate: 0.04,
  confidenceLevel: 0.05,
};

const responseFor = (metricType: PortfolioMetricType): MetricsResponse => ({
  tickers: ["AAPL"],
  metricType,
  series: { singleValue: { AAPL: 0.23 } },
});

const textOf = (node: ReactTestInstance | string | number): string =>
  typeof node === "string" || typeof node === "number"
    ? String(node)
    : node.children.map(textOf).join("");

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const renderCard = async (
  metricType: PortfolioMetricType,
  variant: "standard" | "focus",
) => {
  let props: React.ComponentProps<typeof PortfolioMetricCard> = {
    card: { id: "result-card", metricType, overrides: {}, hiddenSymbols: [] },
    symbols: ["AAPL"],
    draftSymbolCount: 1,
    globalInputs: INPUTS,
    hasPendingDraft: false,
    today: "2026-07-31",
    variant,
    cardCount: 1,
    onMetricChange: jest.fn(),
    onOverride: jest.fn(),
    onResetInputs: jest.fn(),
    onFocus: jest.fn(),
    onPromote: jest.fn(),
    onDuplicate: jest.fn(),
    onDelete: jest.fn(),
  };
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<PortfolioMetricCard {...props} />);
    await flushPromises();
  });
  renderers.add(renderer);
  return {
    renderer,
    update(patch: Partial<typeof props>) {
      props = { ...props, ...patch };
      act(() => renderer.update(<PortfolioMetricCard {...props} />));
    },
  };
};

beforeEach(() => {
  clearPortfolioMetricCache();
  jest.clearAllMocks();
  fetchMetricsMock.mockReset();
});

afterEach(() => {
  for (const renderer of renderers) act(() => renderer.unmount());
  renderers.clear();
});

describe("Portfolio metric result compatibility", () => {
  it.each(["BetaAnalysis", "SharpeRatioMatrix"] as const)(
    "does not render old volatility as %s while pending or after failure",
    async (metricType) => {
      let rejectRequest!: (error: Error) => void;
      const pending = new Promise<MetricsResponse>((_, reject) => {
        rejectRequest = reject;
      });
      fetchMetricsMock
        .mockResolvedValueOnce(responseFor("VolatilityAnalysis"))
        .mockReturnValueOnce(pending);
      const harness = await renderCard("VolatilityAnalysis", "standard");
      expect(textOf(harness.renderer.root)).toContain("AAPL · +23%");
      chartMock.mockClear();

      harness.update({
        card: {
          id: "result-card",
          metricType,
          overrides: {},
          hiddenSymbols: [],
        },
      });

      expect(chartMock).not.toHaveBeenCalled();
      expect(textOf(harness.renderer.root)).toContain("Running analysis");
      expect(textOf(harness.renderer.root)).not.toContain("AAPL ·");
      await act(async () => {
        rejectRequest(new Error("New analysis unavailable."));
        await flushPromises();
      });
      expect(chartMock).not.toHaveBeenCalled();
      expect(textOf(harness.renderer.root)).toContain("Metric unavailable");
      expect(textOf(harness.renderer.root)).not.toContain(
        "showing the previous result",
      );
    },
  );

  it.each([
    {
      metricType: "SharpeRatioMatrix" as const,
      patch: { startDate: "2026-01-01" },
      assumption: "2026-01-01 to 2026-07-31",
    },
    {
      metricType: "SharpeRatioMatrix" as const,
      patch: { riskFreeRate: 0.05 },
      assumption: "Risk-free 5.0%",
    },
    {
      metricType: "BetaAnalysis" as const,
      patch: { benchmark: "QQQ" },
      assumption: "Benchmark QQQ",
    },
    {
      metricType: "ValueAtRiskAnalysis" as const,
      patch: { confidenceLevel: 0.01 },
      assumption: "99% confidence",
    },
  ])(
    "shows Focus assumptions only with their matching $metricType result ($patch)",
    async ({ metricType, patch, assumption }) => {
      let resolveRequest!: (response: MetricsResponse) => void;
      const pending = new Promise<MetricsResponse>((resolve) => {
        resolveRequest = resolve;
      });
      const previous = responseFor(metricType);
      const replacement = {
        ...responseFor(metricType),
        series: { singleValue: { AAPL: 0.5 } },
      };
      fetchMetricsMock
        .mockResolvedValueOnce(previous)
        .mockReturnValueOnce(pending);
      const harness = await renderCard(metricType, "focus");
      expect(textOf(harness.renderer.root)).toContain("Assumptions");
      chartMock.mockClear();

      harness.update({ globalInputs: { ...INPUTS, ...patch } });

      expect(chartMock).not.toHaveBeenCalled();
      expect(textOf(harness.renderer.root)).toContain("Running analysis");
      expect(textOf(harness.renderer.root)).not.toContain("Assumptions");
      await act(async () => {
        resolveRequest(replacement);
        await flushPromises();
      });
      expect(chartMock.mock.calls.at(-1)?.[0].data).toBe(replacement);
      expect(textOf(harness.renderer.root)).toContain("Assumptions");
      expect(textOf(harness.renderer.root)).toContain(assumption);
    },
  );
});
