import * as React from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from "@jest/globals";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { fetchMetrics, type MetricsResponse } from "@/lib/market-metrics";
import type { PortfolioAnalysisSettings } from "../types";
import {
  clearPortfolioMetricCache,
  usePortfolioMetric,
} from "./usePortfolioMetric";

jest.mock("@/lib/market-metrics", () => ({
  fetchMetrics: jest.fn(),
}));

const fetchMetricsMock = jest.mocked(fetchMetrics);
const renderers = new Set<ReactTestRenderer>();

const DEFAULT_SETTINGS: PortfolioAnalysisSettings = {
  metricType: "CumulativeReturnComparison",
  startDate: "2025-07-31",
  endDate: "2026-07-31",
  benchmark: "SPY",
  riskFreeRate: 0.01,
  confidenceLevel: 0.05,
};

type HookProps = {
  symbols: string[];
  settings: PortfolioAnalysisSettings;
  validationError: string | null;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

const createDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

const createResponse = (
  metricType: PortfolioAnalysisSettings["metricType"],
  series: MetricsResponse["series"],
  metadata?: MetricsResponse["metadata"],
): MetricsResponse => ({
  tickers: ["AAPL"],
  metricType,
  series,
  metadata,
});

const lineResponse = (symbol = "AAPL", value = 0.12) =>
  createResponse("CumulativeReturnComparison", {
    timeSeries: {
      [symbol]: [{ date: "2026-07-31", value }],
    },
  });

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const renderMetric = async (initialProps: HookProps) => {
  let props = initialProps;
  let latest!: ReturnType<typeof usePortfolioMetric>;
  let renderer!: ReactTestRenderer;

  function Probe() {
    latest = usePortfolioMetric(props);
    return null;
  }

  await act(async () => {
    renderer = TestRenderer.create(<Probe />);
    await flushPromises();
  });
  renderers.add(renderer);

  return {
    get latest() {
      return latest;
    },
    update(nextProps: HookProps) {
      props = nextProps;
      act(() => renderer.update(<Probe />));
    },
    unmount() {
      if (!renderers.delete(renderer)) return;
      act(() => renderer.unmount());
    },
  };
};

beforeEach(() => {
  clearPortfolioMetricCache();
  fetchMetricsMock.mockReset();
});

afterEach(() => {
  for (const renderer of renderers) {
    act(() => renderer.unmount());
  }
  renderers.clear();
  jest.restoreAllMocks();
});

describe("usePortfolioMetric", () => {
  it("stays idle without symbols and blocks invalid requests", async () => {
    const response = lineResponse();
    fetchMetricsMock.mockResolvedValue(response);
    const harness = await renderMetric({
      symbols: [],
      settings: DEFAULT_SETTINGS,
      validationError: "Choose a valid date range.",
    });

    expect(harness.latest).toMatchObject({
      status: "idle",
      data: null,
      error: null,
    });
    expect(fetchMetricsMock).not.toHaveBeenCalled();

    harness.update({
      symbols: ["AAPL"],
      settings: DEFAULT_SETTINGS,
      validationError: "Choose a valid date range.",
    });
    expect(harness.latest.status).toBe("invalid");
    expect(harness.latest.error).toBe("Choose a valid date range.");
    expect(fetchMetricsMock).not.toHaveBeenCalled();

    harness.update({
      symbols: ["AAPL"],
      settings: DEFAULT_SETTINGS,
      validationError: null,
    });
    await act(flushPromises);
    expect(harness.latest.status).toBe("success");
    expect(harness.latest.data).toBe(response);
  });

  it.each([
    {
      label: "line data",
      metricType: "CumulativeReturnComparison" as const,
      series: { timeSeries: { AAPL: [{ date: "2026-07-31", value: 0.1 }] } },
      expected: "success",
    },
    {
      label: "an empty line",
      metricType: "MaxDrawdownAnalysis" as const,
      series: { timeSeries: { AAPL: [] } },
      expected: "empty",
    },
    {
      label: "a scalar value",
      metricType: "VolatilityAnalysis" as const,
      series: { singleValue: { AAPL: 0.2 } },
      expected: "success",
    },
    {
      label: "a scalar status without a finite value",
      metricType: "SharpeRatioMatrix" as const,
      series: { singleValueStatuses: { AAPL: { status: "undefined" } } },
      expected: "success",
    },
    {
      label: "an empty scalar response",
      metricType: "BetaAnalysis" as const,
      series: {},
      expected: "empty",
    },
    {
      label: "a correlation matrix",
      metricType: "MarketCorrelationAnalysis" as const,
      series: { correlationMatrix: { AAPL: { AAPL: 1 } } },
      expected: "success",
    },
    {
      label: "an empty correlation matrix",
      metricType: "MarketCorrelationAnalysis" as const,
      series: { correlationMatrix: {} },
      expected: "empty",
    },
    {
      label: "portfolio simulations",
      metricType: "EfficientFrontierVisualization" as const,
      series: {
        portfolio: {
          returns: [0.1],
          risks: [0.2],
          sharpe_ratios: [0.5],
          asset_order: ["AAPL"],
          weights: [[1]],
          max_sharpe_index: 0,
          min_volatility_index: 0,
        },
      },
      expected: "success",
    },
    {
      label: "an empty simulation",
      metricType: "EfficientFrontierVisualization" as const,
      series: {},
      expected: "empty",
    },
  ])("maps $label to $expected", async ({ metricType, series, expected }) => {
    const settings = { ...DEFAULT_SETTINGS, metricType };
    fetchMetricsMock.mockResolvedValue(
      createResponse(metricType, series as MetricsResponse["series"]),
    );

    const harness = await renderMetric({
      symbols: ["AAPL"],
      settings,
      validationError: null,
    });

    expect(harness.latest.status).toBe(expected);
    expect(harness.latest.error).toBeNull();
  });

  it("reports partial results ahead of chart-specific emptiness", async () => {
    const response = createResponse(
      "VolatilityAnalysis",
      {},
      { missingSymbols: ["MSFT"] },
    );
    fetchMetricsMock.mockResolvedValue(response);

    const harness = await renderMetric({
      symbols: ["AAPL", "MSFT"],
      settings: { ...DEFAULT_SETTINGS, metricType: "VolatilityAnalysis" },
      validationError: null,
    });

    expect(harness.latest.status).toBe("partial");
    expect(harness.latest.data).toBe(response);
  });

  it("serves a fresh cache entry and refetches it after expiry", async () => {
    let now = 1_000;
    jest.spyOn(Date, "now").mockImplementation(() => now);
    const firstResponse = lineResponse("AAPL", 0.1);
    const expiredResponse = createDeferred<MetricsResponse>();
    fetchMetricsMock
      .mockResolvedValueOnce(firstResponse)
      .mockReturnValueOnce(expiredResponse.promise);

    const first = await renderMetric({
      symbols: ["AAPL"],
      settings: DEFAULT_SETTINGS,
      validationError: null,
    });
    expect(first.latest.lastUpdated).toBe(1_000);
    first.unmount();

    now = 120_999;
    const cached = await renderMetric({
      symbols: ["AAPL"],
      settings: { ...DEFAULT_SETTINGS },
      validationError: null,
    });
    expect(cached.latest.status).toBe("success");
    expect(cached.latest.data).toBe(firstResponse);
    expect(cached.latest.lastUpdated).toBe(1_000);
    expect(fetchMetricsMock).toHaveBeenCalledTimes(1);
    cached.unmount();

    now = 121_001;
    const expired = await renderMetric({
      symbols: ["AAPL"],
      settings: DEFAULT_SETTINGS,
      validationError: null,
    });
    expect(expired.latest.status).toBe("loading");
    expect(fetchMetricsMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      expiredResponse.resolve(lineResponse("AAPL", 0.2));
      await flushPromises();
    });
    expect(expired.latest.status).toBe("success");
    expect(expired.latest.lastUpdated).toBe(121_001);
  });

  it("deduplicates concurrent requests for the same metric query", async () => {
    const request = createDeferred<MetricsResponse>();
    fetchMetricsMock.mockReturnValue(request.promise);
    const props = {
      symbols: ["AAPL"],
      settings: DEFAULT_SETTINGS,
      validationError: null,
    };

    const first = await renderMetric(props);
    const second = await renderMetric({ ...props, settings: { ...DEFAULT_SETTINGS } });
    expect(first.latest.status).toBe("loading");
    expect(second.latest.status).toBe("loading");
    expect(fetchMetricsMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      request.resolve(lineResponse());
      await flushPromises();
    });
    expect(first.latest.status).toBe("success");
    expect(second.latest.status).toBe("success");
  });

  it("keeps prior data stale while a changed query refreshes", async () => {
    const nextRequest = createDeferred<MetricsResponse>();
    const firstResponse = lineResponse("AAPL", 0.1);
    const nextResponse = lineResponse("MSFT", 0.2);
    fetchMetricsMock
      .mockResolvedValueOnce(firstResponse)
      .mockReturnValueOnce(nextRequest.promise);
    const harness = await renderMetric({
      symbols: ["AAPL"],
      settings: DEFAULT_SETTINGS,
      validationError: null,
    });

    harness.update({
      symbols: ["MSFT"],
      settings: DEFAULT_SETTINGS,
      validationError: null,
    });
    expect(harness.latest.status).toBe("stale");
    expect(harness.latest.data).toBe(firstResponse);

    await act(async () => {
      nextRequest.resolve(nextResponse);
      await flushPromises();
    });
    expect(harness.latest.status).toBe("success");
    expect(harness.latest.data).toBe(nextResponse);
  });

  it("ignores superseded and unmounted request completions", async () => {
    const firstRequest = createDeferred<MetricsResponse>();
    const secondRequest = createDeferred<MetricsResponse>();
    fetchMetricsMock
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);
    const harness = await renderMetric({
      symbols: ["AAPL"],
      settings: DEFAULT_SETTINGS,
      validationError: null,
    });

    harness.update({
      symbols: ["MSFT"],
      settings: DEFAULT_SETTINGS,
      validationError: null,
    });
    await act(async () => {
      firstRequest.resolve(lineResponse("AAPL"));
      await flushPromises();
    });
    expect(harness.latest.status).toBe("loading");
    expect(harness.latest.data).toBeNull();

    harness.unmount();
    await act(async () => {
      secondRequest.resolve(lineResponse("MSFT"));
      await flushPromises();
    });
    expect(harness.latest.status).toBe("loading");
    expect(fetchMetricsMock).toHaveBeenCalledTimes(2);
  });

  it("keeps validation errors authoritative over a late response", async () => {
    const request = createDeferred<MetricsResponse>();
    fetchMetricsMock.mockReturnValue(request.promise);
    const harness = await renderMetric({
      symbols: ["AAPL"],
      settings: DEFAULT_SETTINGS,
      validationError: null,
    });

    harness.update({
      symbols: ["AAPL"],
      settings: DEFAULT_SETTINGS,
      validationError: "End date must not be in the future.",
    });
    await act(async () => {
      request.resolve(lineResponse());
      await flushPromises();
    });

    expect(harness.latest.status).toBe("invalid");
    expect(harness.latest.error).toBe("End date must not be in the future.");
    expect(harness.latest.data).toBeNull();
  });

  it("surfaces request errors and retries with the same public query", async () => {
    const recovered = lineResponse();
    fetchMetricsMock
      .mockRejectedValueOnce(new Error("Historical prices are offline."))
      .mockResolvedValueOnce(recovered);
    const harness = await renderMetric({
      symbols: ["AAPL"],
      settings: DEFAULT_SETTINGS,
      validationError: null,
    });

    expect(harness.latest.status).toBe("error");
    expect(harness.latest.error).toBe("Historical prices are offline.");

    await act(async () => {
      harness.latest.retry();
      await flushPromises();
    });
    expect(fetchMetricsMock).toHaveBeenCalledTimes(2);
    expect(harness.latest.status).toBe("success");
    expect(harness.latest.error).toBeNull();
    expect(harness.latest.data).toBe(recovered);
  });

  it("uses a safe message for non-Error request failures", async () => {
    fetchMetricsMock.mockRejectedValue("offline");

    const harness = await renderMetric({
      symbols: ["AAPL"],
      settings: DEFAULT_SETTINGS,
      validationError: null,
    });

    expect(harness.latest.status).toBe("error");
    expect(harness.latest.error).toBe(
      "Market data is temporarily unavailable.",
    );
  });

  it("sends the complete API request while keying cache by metric dependencies", async () => {
    const alphaSettings: PortfolioAnalysisSettings = {
      ...DEFAULT_SETTINGS,
      metricType: "AlphaComparison",
      benchmark: "QQQ",
      riskFreeRate: 0.03,
      confidenceLevel: 0.01,
    };
    fetchMetricsMock.mockResolvedValue(
      createResponse("AlphaComparison", { singleValue: { AAPL: 0.04 } }),
    );
    const harness = await renderMetric({
      symbols: ["AAPL"],
      settings: alphaSettings,
      validationError: null,
    });

    expect(fetchMetricsMock).toHaveBeenLastCalledWith({
      tickers: ["AAPL"],
      settings: {
        metricType: "AlphaComparison",
        metricParams: {
          startDate: "2025-07-31",
          endDate: "2026-07-31",
          marketTicker: "QQQ",
          riskFreeRate: 0.03,
          confidenceLevel: 0.01,
        },
      },
    });

    harness.update({
      symbols: ["AAPL"],
      settings: { ...alphaSettings, confidenceLevel: 0.05 },
      validationError: null,
    });
    await act(flushPromises);
    expect(fetchMetricsMock).toHaveBeenCalledTimes(1);

    harness.update({
      symbols: ["AAPL"],
      settings: { ...alphaSettings, benchmark: "DIA" },
      validationError: null,
    });
    await act(flushPromises);
    expect(fetchMetricsMock).toHaveBeenCalledTimes(2);

    harness.update({
      symbols: ["AAPL"],
      settings: { ...alphaSettings, benchmark: "DIA", riskFreeRate: 0.04 },
      validationError: null,
    });
    await act(flushPromises);
    expect(fetchMetricsMock).toHaveBeenCalledTimes(3);
  });

  it("refetches VaR for confidence changes but reuses irrelevant inputs", async () => {
    const settings: PortfolioAnalysisSettings = {
      ...DEFAULT_SETTINGS,
      metricType: "ValueAtRiskAnalysis",
    };
    fetchMetricsMock.mockResolvedValue(
      createResponse("ValueAtRiskAnalysis", { singleValue: { AAPL: 0.03 } }),
    );
    const harness = await renderMetric({
      symbols: ["AAPL"],
      settings,
      validationError: null,
    });

    harness.update({
      symbols: ["AAPL"],
      settings: { ...settings, benchmark: "QQQ", riskFreeRate: 0.04 },
      validationError: null,
    });
    await act(flushPromises);
    expect(fetchMetricsMock).toHaveBeenCalledTimes(1);

    harness.update({
      symbols: ["AAPL"],
      settings: { ...settings, confidenceLevel: 0.01 },
      validationError: null,
    });
    await act(flushPromises);
    expect(fetchMetricsMock).toHaveBeenCalledTimes(2);
  });
});
