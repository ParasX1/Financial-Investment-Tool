import { METRICS_BASE } from "@/lib/apiBase";
import { fetchMetrics, formatMetricsResponse } from ".";

const originalFetch = global.fetch;
const volatilityRequest = {
  tickers: ["AAPL"],
  settings: {
    metricType: "VolatilityAnalysis" as const,
    metricParams: { startDate: "2025-07-28", endDate: "2026-07-28" },
  },
};

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe("fetchMetrics", () => {
  it("rejects malformed success JSON with a safe retryable error", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        new Response('{"private-provider-response":', { status: 200 }),
      ) as jest.Mock;

    await expect(fetchMetrics(volatilityRequest)).rejects.toThrow(
      new Error("The metrics response could not be read. Please try again."),
    );
  });

  it("keeps a legitimate empty object as an empty metric result", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response("{}", { status: 200 })) as jest.Mock;

    const result = await fetchMetrics(volatilityRequest);
    expect(result.metricType).toBe("VolatilityAnalysis");
    expect(result.series.singleValue).toEqual({});
  });

  it("keeps a generic safe error for a non-JSON unsuccessful response", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        new Response("private-upstream-error", { status: 503 }),
      ) as jest.Mock;

    await expect(fetchMetrics(volatilityRequest)).rejects.toThrow(
      new Error("Metrics are temporarily unavailable."),
    );
  });

  it.each(["null", "[]", "42", '"not-a-record"'])(
    "rejects successful non-object JSON %s without treating it as empty data",
    async (body) => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(new Response(body, { status: 200 })) as jest.Mock;

      await expect(fetchMetrics(volatilityRequest)).rejects.toThrow(
        new Error("The metrics response could not be read. Please try again."),
      );
    },
  );

  it("preserves a normal unsuccessful JSON error", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        new Response('{"error":"The date range is invalid."}', { status: 400 }),
      ) as jest.Mock;

    await expect(fetchMetrics(volatilityRequest)).rejects.toThrow(
      new Error("The date range is invalid."),
    );
  });

  it.each([
    { AAPL: 0.22 },
    {
      data: { AAPL: 0.22 },
      metadata: { availableSymbols: ["AAPL"] },
      warnings: [],
    },
  ])("preserves a normal legacy or envelope result %j", async (body) => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(body), { status: 200 }),
      ) as jest.Mock;

    expect((await fetchMetrics(volatilityRequest)).series.singleValue).toEqual({
      AAPL: 0.22,
    });
  });

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
    const result = formatMetricsResponse(["AAPL"], "VolatilityAnalysis", {
      data: { AAPL: 0.22 },
      metadata: {
        requestedSymbols: ["AAPL"],
        availableSymbols: ["AAPL"],
        missingSymbols: [],
        method: "sample standard deviation",
      },
      warnings: [],
    });

    expect(result.series.singleValue).toEqual({ AAPL: 0.22 });
    expect(result.metadata?.method).toBe("sample standard deviation");
    expect(result.warnings).toEqual([]);
  });
});
