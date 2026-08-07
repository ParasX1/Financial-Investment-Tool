import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fetchTopPicks, type FetchTopPicksOptions } from "./fetchTopPicks";

const DEFAULT_OPTIONS: FetchTopPicksOptions = {
  page: 1,
  pageSize: 25,
  sortKey: "sharpe",
  sortDirection: "desc",
};

const successfulResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

afterEach(() => {
  jest.restoreAllMocks();
});

describe("fetchTopPicks response boundaries", () => {
  it("clamps pagination and discards unsafe optional response fields", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
      successfulResponse({
        data: {
          rows: [
            {
              symbol: " SAFE ",
              name: " ",
              industry: " ",
              metricStatus: [],
            },
          ],
          total: 1,
        },
        metadata: {
          assumptions: [],
          benchmark: "<script>",
          generatedAt: "2026-02-30T10:00:00Z",
          requestedStart: "2026-02-30",
          requestedEnd: 20260731,
          annualisationDays: 367,
          riskFreeRate: 2,
          riskFreeRateSource: "unsafe\u0000source",
          riskFreeRateAsOf: "2026-13-01",
          universeLimit: -1,
          universeCount: 1.5,
          availableCount: 1_000_001,
          cacheStatus: "warm",
          cacheTtlSeconds: -1,
          minimumTrailingReturnObservations: -1,
          window: "rolling",
        },
        warnings: ["usable warning", " ", 42, null],
      }),
    );

    const response = await fetchTopPicks({
      ...DEFAULT_OPTIONS,
      page: -2.8,
      pageSize: 0.9,
    });

    const request = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toEqual({
      page: 1,
      page_size: 1,
      sort_key: "sharpe",
      sort_dir: "desc",
    });
    expect(response.rows[0]).toMatchObject({
      symbol: "SAFE",
      name: "SAFE",
      industry: "Unknown",
      metricStatus: {},
    });
    expect(response.metadata).toEqual({});
    expect(response.warnings).toEqual(["usable warning"]);
  });

  it("accepts bounded metadata from the assumptions fallback", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      successfulResponse({
        data: { rows: [], total: 0 },
        metadata: {
          assumptions: {
            benchmark: "SPY",
            riskFreeRateAnnual: -1,
            universeLimit: 0,
            window: "trailing_one_year",
          },
          annualisationDays: 366,
          universeCount: 0,
          availableCount: 0,
          cacheStatus: "miss",
          cacheTtlSeconds: 0,
          minimumTrailingReturnObservations: 0,
        },
      }),
    );

    const response = await fetchTopPicks(DEFAULT_OPTIONS);

    expect(response.metadata).toEqual({
      benchmark: "SPY",
      annualisationDays: 366,
      riskFreeRate: -1,
      universeLimit: 0,
      universeCount: 0,
      availableCount: 0,
      cacheStatus: "miss",
      cacheTtlSeconds: 0,
      minimumTrailingReturnObservations: 0,
      window: "trailing_one_year",
    });
  });

  it.each([-1, 1.5])("rejects an invalid total of %s", async (total) => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(successfulResponse({ data: { rows: [], total } }));

    await expect(fetchTopPicks(DEFAULT_OPTIONS)).rejects.toThrow(
      "server returned an invalid response",
    );
  });

  it.each([null, { symbol: "   " }])(
    "rejects an invalid row %#",
    async (row) => {
      jest
        .spyOn(global, "fetch")
        .mockResolvedValue(
          successfulResponse({ data: { rows: [row], total: 1 } }),
        );

      await expect(fetchTopPicks(DEFAULT_OPTIONS)).rejects.toThrow(
        "server returned an invalid response",
      );
    },
  );

  it("uses generic errors for non-JSON and oversized server messages", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response("not-json", { status: 502 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "x".repeat(241) }), {
          status: 400,
        }),
      );

    await expect(fetchTopPicks(DEFAULT_OPTIONS)).rejects.toThrow(
      "Unable to load Top Picks (502).",
    );
    await expect(fetchTopPicks(DEFAULT_OPTIONS)).rejects.toThrow(
      "Unable to load Top Picks (400).",
    );
  });
});
