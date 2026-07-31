import { METRICS_BASE } from "@/lib/apiBase";
import {
  fetchMetrics,
  formatMetricsResponse,
} from "./fetchMetrics";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe("fetchMetrics", () => {
  it("uses the shared API base, preserves a zero risk-free rate, and aligns frontier arrays", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        returns: [0.1, null, true],
        risks: [0.3, 0.4, 0.5],
        sharpe_ratios: [1.1, 1.2, 1.3],
      }),
    }) as jest.Mock;

    const result = await fetchMetrics({
      tickers: ["AAPL", "MSFT"],
      settings: {
        metricType: "EfficientFrontierVisualization",
        metricParams: {
          startDate: "2025-07-28",
          endDate: "2026-07-28",
          riskFreeRate: 0,
        },
        stockColour: "#65a0fd",
      },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `${METRICS_BASE}/efficientfrontiervisualization`,
      expect.objectContaining({
        body: expect.stringContaining('"risk_free_rate":0'),
      }),
    );
    expect(result.series.portfolio).toEqual({
      returns: [0.1],
      risks: [0.3],
      sharpe_ratios: [1.1],
      asset_order: [],
      weights: [[]],
      max_sharpe_index: 0,
      min_volatility_index: 0,
      sample_count: 1,
    });
  });

  it("preserves explicit Sortino statuses instead of dropping the symbol", () => {
    const result = formatMetricsResponse(
      ["AAPL", "MSFT", "NVDA"],
      "SortinoRatioVisualization",
      {
        AAPL: { value: null, status: "infinite", observations: 42 },
        MSFT: { value: null, status: "limited_data", observations: 1 },
        NVDA: { value: 1.25, status: "ok", observations: 42 },
      },
    );

    expect(result.series.singleValue).toEqual({ NVDA: 1.25 });
    expect(result.series.singleValueStatuses).toEqual({
      AAPL: { status: "infinite", observations: 42 },
      MSFT: { status: "limited_data", observations: 1 },
      NVDA: { status: "ok", observations: 42 },
    });
  });

  it("unwraps response metadata while remaining compatible with raw responses", () => {
    const result = formatMetricsResponse(
      ["AAPL"],
      "VolatilityAnalysis",
      {
        data: { AAPL: 0.22 },
        metadata: {
          requestedSymbols: ["AAPL"],
          availableSymbols: ["AAPL"],
          missingSymbols: [],
          method: "sample standard deviation",
        },
        warnings: [],
      },
    );

    expect(result.series.singleValue).toEqual({ AAPL: 0.22 });
    expect(result.metadata?.method).toBe("sample standard deviation");
    expect(result.warnings).toEqual([]);
  });
});
