import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fetchTopPicks } from "./fetchTopPicks";

afterEach(() => {
  jest.restoreAllMocks();
});

describe("fetchTopPicks", () => {
  it("posts the paginated feature contract and preserves missing metrics", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            rows: [
              {
                symbol: "AAPL",
                name: "Apple",
                industry: "Technology",
                ret1y: 0.12,
                sharpe: 1.1,
                sortino: null,
                volatility: 0.2,
                maxDD: -0.18,
                beta: 1.05,
                alpha: 0.03,
                infoRatio: 0.4,
                metricStatus: {
                  sortino: "infinite",
                  alpha: "invalid",
                  sharpe: "not_a_status",
                  madeUpMetric: "ok",
                },
              },
            ],
            total: 1,
          },
          metadata: {
            benchmark: "^AXJO",
            generatedAt: "2026-07-31T00:00:00+00:00",
            requestedStart: "2025-07-31",
            requestedEnd: "2026-07-30",
            riskFreeRate: 0.0435,
            riskFreeRateSource: "RBA cash rate target",
            riskFreeRateAsOf: "2026-06-17",
            universeCount: 50,
            availableCount: 47,
            cacheStatus: "stale",
            cacheTtlSeconds: 600,
            snapshotRefreshing: true,
            assumptions: {
              window: "trailing_one_year",
              ignored: "not retained",
            },
            unsafeHtml: "<script>alert('xss')</script>",
          },
          warnings: ["Sortino unavailable for AAPL."],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const abortController = new AbortController();

    const response = await fetchTopPicks({
      page: 2,
      pageSize: 25,
      sortKey: "sharpe",
      sortDirection: "desc",
      signal: abortController.signal,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/top-picks");
    const request = fetchMock.mock.calls[0]?.[1];
    expect(request).toMatchObject({
      method: "POST",
      signal: abortController.signal,
    });
    expect(JSON.parse(String(request?.body))).toEqual({
      page: 2,
      page_size: 25,
      sort_key: "sharpe",
      sort_dir: "desc",
    });
    expect(response.rows[0]?.sortino).toBeNull();
    expect(response.rows[0]?.alpha).toBeNull();
    expect(response.rows[0]?.metricStatus).toEqual({
      sortino: "infinite",
      alpha: "invalid",
    });
    expect(response.total).toBe(1);
    expect(response.metadata).toEqual({
      benchmark: "^AXJO",
      generatedAt: "2026-07-31T00:00:00+00:00",
      requestedStart: "2025-07-31",
      requestedEnd: "2026-07-30",
      riskFreeRate: 0.0435,
      riskFreeRateSource: "RBA cash rate target",
      riskFreeRateAsOf: "2026-06-17",
      universeCount: 50,
      availableCount: 47,
      cacheStatus: "stale",
      cacheTtlSeconds: 600,
      snapshotRefreshing: true,
      window: "trailing_one_year",
    });
    expect(response.warnings).toEqual(["Sortino unavailable for AAPL."]);
  });

  it("normalizes omitted metrics and optional envelope fields", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { rows: [{ symbol: "MSFT" }], total: 1 },
        }),
        { status: 200 },
      ),
    );

    const response = await fetchTopPicks({
      page: 1,
      pageSize: 10,
      sortKey: "ret1y",
      sortDirection: "asc",
    });

    expect(response.rows[0]).toMatchObject({
      symbol: "MSFT",
      name: "MSFT",
      industry: "Unknown",
      ret1y: null,
      sharpe: null,
      metricStatus: {},
    });
    expect(response.metadata).toEqual({});
    expect(response.warnings).toEqual([]);
  });

  it("surfaces a safe server error message", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Top Picks are unavailable." }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      fetchTopPicks({
        page: 1,
        pageSize: 25,
        sortKey: "sharpe",
        sortDirection: "desc",
      }),
    ).rejects.toThrow("Top Picks are unavailable.");
  });

  it("rejects malformed successful envelopes with a safe message", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { rows: {}, total: "one" } }), {
        status: 200,
      }),
    );

    await expect(
      fetchTopPicks({
        page: 1,
        pageSize: 25,
        sortKey: "sharpe",
        sortDirection: "desc",
      }),
    ).rejects.toThrow("server returned an invalid response");
  });
});
