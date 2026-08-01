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
import type { PortfolioMetricCard as PortfolioMetricCardModel } from "../types";

jest.doMock("../hooks/usePortfolioMetric", () => ({
  usePortfolioMetric: jest.fn(),
}));
jest.doMock("./PortfolioChart", () => ({
  PortfolioChart: jest.fn(() => null),
}));
jest.doMock("./PortfolioMetricWorkspace", () => ({
  PortfolioMetricWorkspace: jest.fn(() => null),
}));

const usePortfolioMetricMock = jest.mocked(
  (
    jest.requireMock("../hooks/usePortfolioMetric") as typeof import("../hooks/usePortfolioMetric")
  ).usePortfolioMetric,
);
const portfolioChartMock = jest.mocked(
  (jest.requireMock("./PortfolioChart") as typeof import("./PortfolioChart"))
    .PortfolioChart,
);
const portfolioMetricWorkspaceMock = jest.mocked(
  (
    jest.requireMock("./PortfolioMetricWorkspace") as typeof import("./PortfolioMetricWorkspace")
  ).PortfolioMetricWorkspace,
);
const { PortfolioMetricCard } = jest.requireActual<
  typeof import("./PortfolioMetricCard")
>("./PortfolioMetricCard");
const mountedRenderers = new Set<ReactTestRenderer>();
const retry = jest.fn();

const GLOBAL_INPUTS = {
  startDate: "2025-07-31",
  endDate: "2026-07-31",
  benchmark: "SPY",
  riskFreeRate: 0.04,
  confidenceLevel: 0.05,
};

const DEFAULT_CARD: PortfolioMetricCardModel = {
  id: "metric-alpha",
  metricType: "AlphaComparison",
  overrides: {},
  hiddenSymbols: [],
};

const alphaResponse: MetricsResponse = {
  tickers: ["AAPL", "MSFT"],
  metricType: "AlphaComparison",
  series: {
    singleValue: { AAPL: 0.08, MSFT: 0.12 },
  },
};

const textOf = (node: ReactTestInstance | string | number): string => {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  return node.children.map((child) => textOf(child)).join("");
};

const findButton = (root: ReactTestInstance, label: string) => {
  const button = root
    .findAllByType("button")
    .find((candidate) => textOf(candidate) === label);
  expect(button).toBeDefined();
  return button!;
};

const setMetricState = (
  overrides: Partial<ReturnType<typeof usePortfolioMetricMock>> = {},
) => {
  usePortfolioMetricMock.mockReturnValue({
    status: "success",
    data: alphaResponse,
    error: null,
    retry,
    lastUpdated: null,
    ...overrides,
  });
};

const renderCard = (
  overrides: Partial<React.ComponentProps<typeof PortfolioMetricCard>> = {},
) => {
  const props: React.ComponentProps<typeof PortfolioMetricCard> = {
    card: DEFAULT_CARD,
    symbols: ["AAPL", "MSFT"],
    globalInputs: GLOBAL_INPUTS,
    today: "2026-07-31",
    variant: "standard",
    cardCount: 2,
    onMetricChange: jest.fn(),
    onOverride: jest.fn(),
    onResetInputs: jest.fn(),
    onFocus: jest.fn(),
    onPromote: jest.fn(),
    onDuplicate: jest.fn(),
    onDelete: jest.fn(),
    ...overrides,
  };
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(<PortfolioMetricCard {...props} />);
  });
  mountedRenderers.add(renderer);
  return { props, renderer };
};

beforeEach(() => {
  jest.clearAllMocks();
  setMetricState();
});

afterEach(() => {
  for (const renderer of mountedRenderers) {
    act(() => renderer.unmount());
  }
  mountedRenderers.clear();
});

describe("PortfolioMetricCard", () => {
  it("merges local assumptions and sends UI changes through card callbacks", () => {
    const onMetricChange = jest.fn();
    const onOverride = jest.fn();
    const onResetInputs = jest.fn();
    const onPromote = jest.fn();
    const onFocus = jest.fn();
    const onDuplicate = jest.fn();
    const onDelete = jest.fn();
    const card = {
      ...DEFAULT_CARD,
      overrides: { benchmark: "^NDX", riskFreeRate: 0.025 },
    };
    setMetricState({ lastUpdated: Date.UTC(2026, 6, 31, 2, 15) });

    const { renderer } = renderCard({
      card,
      onMetricChange,
      onOverride,
      onResetInputs,
      onPromote,
      onFocus,
      onDuplicate,
      onDelete,
    });
    const root = renderer.root;

    expect(usePortfolioMetricMock).toHaveBeenCalledWith({
      symbols: ["AAPL", "MSFT"],
      settings: {
        ...GLOBAL_INPUTS,
        benchmark: "^NDX",
        riskFreeRate: 0.025,
        metricType: "AlphaComparison",
      },
      validationError: null,
    });
    expect(textOf(root)).toContain("Custom");
    expect(textOf(root)).toContain("vs ^NDX");
    expect(textOf(root)).toContain("updated");

    const metricSelect = root.findByProps({ "aria-label": "Metric" });
    const dateInputs = root
      .findAllByType("input")
      .filter((input) => input.props.type === "date");
    const benchmarkInput = root
      .findAllByType("input")
      .find((input) => input.props.value === "^NDX");
    const riskFreeInput = root
      .findAllByType("input")
      .find((input) => input.props.type === "number");

    act(() => {
      metricSelect.props.onChange({ target: { value: "BetaAnalysis" } });
      dateInputs[0].props.onChange({ target: { value: "2025-08-01" } });
      dateInputs[1].props.onChange({ target: { value: "2026-06-30" } });
      benchmarkInput?.props.onChange({ target: { value: "asx200" } });
      riskFreeInput?.props.onChange({ target: { value: "5.25" } });
      findButton(root, "Use all global inputs").props.onClick();
      root.findByProps({ "aria-label": "Promote Alpha vs benchmark" }).props.onClick();
      root.findByProps({ "aria-label": "Focus Alpha vs benchmark" }).props.onClick();
      findButton(root, "Duplicate chart").props.onClick();
      findButton(root, "Delete chart").props.onClick();
    });

    expect(onMetricChange).toHaveBeenCalledWith("BetaAnalysis");
    expect(onOverride).toHaveBeenNthCalledWith(1, {
      startDate: "2025-08-01",
    });
    expect(onOverride).toHaveBeenNthCalledWith(2, { endDate: "2026-06-30" });
    expect(onOverride).toHaveBeenNthCalledWith(3, { benchmark: "ASX200" });
    expect(onOverride).toHaveBeenNthCalledWith(4, { riskFreeRate: 0.0525 });
    expect(onResetInputs).toHaveBeenCalledTimes(1);
    expect(onPromote).toHaveBeenCalledTimes(1);
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("reports shared-universe and input validation problems before charting", () => {
    setMetricState({ status: "idle", data: null });
    const noUniverse = renderCard({ symbols: [] });

    expect(textOf(noUniverse.renderer.root)).toContain("Add a shared universe");
    expect(textOf(noUniverse.renderer.root)).toContain("Waiting");
    expect(usePortfolioMetricMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ validationError: null }),
    );

    setMetricState({ status: "invalid", data: null });
    const invalidRange = renderCard({
      globalInputs: {
        ...GLOBAL_INPUTS,
        startDate: "2026-07-31",
        endDate: "2026-07-31",
      },
    });
    expect(textOf(invalidRange.renderer.root)).toContain(
      "The start date must be before the end date.",
    );
    expect(invalidRange.renderer.root.findAllByProps({ role: "status" })).toHaveLength(1);
    expect(usePortfolioMetricMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        validationError: "The start date must be before the end date.",
      }),
    );

    const frontierCard: PortfolioMetricCardModel = {
      ...DEFAULT_CARD,
      id: "metric-frontier",
      metricType: "EfficientFrontierVisualization",
    };
    const tooSmall = renderCard({ card: frontierCard, symbols: ["AAPL"] });
    expect(textOf(tooSmall.renderer.root)).toContain(
      "Simulated portfolios needs 2 selected symbols.",
    );
    expect(usePortfolioMetricMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        validationError: "Simulated portfolios needs 2 selected symbols.",
      }),
    );
    expect(portfolioChartMock).not.toHaveBeenCalled();
  });

  it("renders loading, empty, and recoverable failure states", () => {
    setMetricState({ status: "loading", data: null });
    const loading = renderCard();
    expect(
      loading.renderer.root.findByProps({ "aria-busy": "true" }),
    ).toBeDefined();
    expect(textOf(loading.renderer.root)).toContain("Loading");

    setMetricState({ status: "empty", data: null });
    const empty = renderCard();
    expect(textOf(empty.renderer.root)).toContain("No usable result");
    expect(textOf(empty.renderer.root)).toContain(
      "Try a longer period or remove a symbol with sparse history.",
    );

    setMetricState({
      status: "error",
      data: null,
      error: "The metrics service timed out.",
    });
    const failed = renderCard();
    expect(textOf(failed.renderer.root.findByProps({ role: "alert" }))).toContain(
      "The metrics service timed out.",
    );
    act(() => findButton(failed.renderer.root, "Retry this card").props.onClick());
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("shows partial and stale results without hiding the previous analysis", () => {
    setMetricState({
      status: "partial",
      data: {
        ...alphaResponse,
        metadata: { missingSymbols: ["BHP"] },
      },
    });
    const partial = renderCard({ variant: "hero" });
    const partialText = textOf(partial.renderer.root);

    expect(partialText).toContain("Partial");
    expect(partialText).toContain("BHP excluded for missing history.");
    expect(partialText).toContain("Highest in comparison");
    expect(partialText).toContain(
      "Positive alpha means historical outperformance",
    );
    expect(portfolioChartMock.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        benchmark: "SPY",
        compact: true,
        metricType: "AlphaComparison",
      }),
    );
    expect(
      partial.renderer.root.findAllByProps({
        "aria-label": "Promote Alpha vs benchmark",
      }),
    ).toHaveLength(0);

    setMetricState({ status: "stale" });
    const stale = renderCard();
    expect(textOf(stale.renderer.root)).toContain("Updating · previous result");
    expect(textOf(stale.renderer.root)).toContain("Updating");
  });

  it("explains non-finite Sortino results and retries a failed refresh", () => {
    const sortinoResponse: MetricsResponse = {
      tickers: ["AAPL", "MSFT", "NVDA"],
      metricType: "SortinoRatioVisualization",
      series: {
        singleValue: {},
        singleValueStatuses: {
          AAPL: { status: "infinite" },
          MSFT: { status: "limited_data", observations: 2 },
          NVDA: { status: "ok", observations: 42 },
        },
      },
    };
    setMetricState({
      status: "error",
      data: sortinoResponse,
      error: "Refresh failed upstream.",
    });
    const card: PortfolioMetricCardModel = {
      ...DEFAULT_CARD,
      id: "metric-sortino",
      metricType: "SortinoRatioVisualization",
    };
    const { renderer } = renderCard({ card, symbols: ["AAPL", "MSFT", "NVDA"] });
    const content = textOf(renderer.root);

    expect(content).toContain("AAPL: no downside shortfall; ratio is unbounded");
    expect(content).toContain("MSFT: limited data (2 observations)");
    expect(content).not.toContain("NVDA: ok");
    expect(content).toContain("Refresh failed; showing the previous result.");
    expect(content).toContain("Unbounded Sortino");

    act(() => findButton(renderer.root, "Retry").props.onClick());
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("supports VaR confidence overrides and enforces board action limits", () => {
    const valueAtRiskData: MetricsResponse = {
      tickers: ["AAPL"],
      metricType: "ValueAtRiskAnalysis",
      series: { singleValue: { AAPL: 0.025 } },
    };
    setMetricState({ data: valueAtRiskData });
    const onOverride = jest.fn();
    const valueAtRiskCard: PortfolioMetricCardModel = {
      ...DEFAULT_CARD,
      id: "metric-var",
      metricType: "ValueAtRiskAnalysis",
    };
    const atMaximum = renderCard({
      card: valueAtRiskCard,
      symbols: ["AAPL"],
      variant: "hero",
      cardCount: 6,
      onOverride,
    });
    const confidence = atMaximum.renderer.root
      .findAllByType("select")
      .find((select) => select.props.value === 0.05);

    expect(textOf(atMaximum.renderer.root)).toContain("95% confidence");
    act(() => confidence?.props.onChange({ target: { value: "0.01" } }));
    expect(onOverride).toHaveBeenCalledWith({ confidenceLevel: 0.01 });
    expect(findButton(atMaximum.renderer.root, "Duplicate chart").props.disabled).toBe(
      true,
    );
    expect(findButton(atMaximum.renderer.root, "Delete chart").props.disabled).toBe(
      false,
    );

    setMetricState({ data: alphaResponse });
    const onlyCard = renderCard({ variant: "focus", cardCount: 1 });
    expect(findButton(onlyCard.renderer.root, "Delete chart").props.disabled).toBe(true);
    expect(
      onlyCard.renderer.root.findAll(
        (node) =>
          typeof node.props["aria-label"] === "string" &&
          (node.props["aria-label"].startsWith("Focus ") ||
            node.props["aria-label"].startsWith("Promote ")),
      ),
    ).toHaveLength(0);
    expect(portfolioMetricWorkspaceMock.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        data: alphaResponse,
        settings: { ...GLOBAL_INPUTS, metricType: "AlphaComparison" },
        symbols: ["AAPL", "MSFT"],
      }),
    );
  });

  it("falls back to the metric method when a valid response has no key figure", () => {
    const emptyLineResponse: MetricsResponse = {
      tickers: ["AAPL"],
      metricType: "CumulativeReturnComparison",
      series: { timeSeries: {} },
    };
    setMetricState({ data: emptyLineResponse });
    const lineCard: PortfolioMetricCardModel = {
      ...DEFAULT_CARD,
      id: "metric-return",
      metricType: "CumulativeReturnComparison",
    };
    const { renderer } = renderCard({ card: lineCard, symbols: ["AAPL"] });

    const content = textOf(renderer.root);
    expect(content).toContain(
      "Method Adjusted-close return rebased to each symbol's first valid observation.",
    );
  });
});
