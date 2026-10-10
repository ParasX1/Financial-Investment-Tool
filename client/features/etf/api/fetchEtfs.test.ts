import { fetchEtfs } from "./fetchEtfs";

const row = {
  rank: 1,
  symbol: "PREVIEW",
  name: "Preview ETF",
  category: "Equity",
  issuer: "Example",
  expenseRatio: 0.001,
  aumUsd: 2_000_000_000,
  priceReturn: -0.04,
  volatility: 0.2,
  sharpe: 1.1,
  maxDrawdown: -0.1,
};

const payload = () => ({
  data: { rows: [{ ...row }], total: 1 },
  metadata: {
    windowCode: "1Y",
    generatedAt: "2026-10-09T01:02:03Z",
    source: "hardcoded_preview",
    universeCount: 1,
    sortKey: "sharpe",
  },
  warnings: ["ETF data is a hardcoded preview and is not live market data."],
});

function respond(body: unknown, status = 200) {
  return jest.spyOn(global, "fetch").mockResolvedValue({
    ok: status === 200,
    json: async () => body,
  } as Response);
}

afterEach(() => jest.restoreAllMocks());

describe("fetchEtfs", () => {
  it("requests the selected window with cancellation and preserves its preview metadata", async () => {
    const body = payload();
    body.metadata.windowCode = "1D";
    body.metadata.sortKey = "priceReturn";
    const fetchMock = respond(body);
    const controller = new AbortController();

    const response = await fetchEtfs("1D", controller.signal);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/etfs?window=1D"),
      { signal: controller.signal },
    );
    expect(response).toEqual({
      rows: [row],
      total: 1,
      metadata: body.metadata,
      warnings: body.warnings,
    });
  });

  it.each(["expenseRatio", "aumUsd", "priceReturn"] as const)(
    "rejects missing or invalid required %s instead of fabricating zero",
    async (field) => {
      for (const value of [undefined, null, "0.1", NaN, Infinity, -Infinity]) {
        const body = payload();
        Object.assign(body.data.rows[0], { [field]: value });
        respond(body);
        await expect(fetchEtfs()).rejects.toThrow("Invalid ETF row.");
        jest.restoreAllMocks();
      }
    },
  );

  it("preserves real zero financial values and unavailable optional risk metrics", async () => {
    const body = payload();
    Object.assign(body.data.rows[0], {
      expenseRatio: 0,
      aumUsd: 0,
      priceReturn: 0,
      volatility: null,
      sharpe: "unknown",
      maxDrawdown: Infinity,
    });
    respond(body);

    expect((await fetchEtfs()).rows[0]).toMatchObject({
      expenseRatio: 0,
      aumUsd: 0,
      priceReturn: 0,
      volatility: null,
      sharpe: null,
      maxDrawdown: null,
    });
  });

  it.each([undefined, "quarter", "1D"])(
    "rejects unconfirmed or mismatched response window %s",
    async (windowCode) => {
      const body = payload();
      Object.assign(body.metadata, { windowCode });
      respond(body);
      await expect(fetchEtfs("1Y")).rejects.toThrow(
        "ETF preview window does not match the request.",
      );
    },
  );

  it.each([
    {},
    { data: {} },
    { data: { rows: null } },
    { data: { rows: [null] } },
  ])(
    "rejects malformed payloads rather than claiming empty success: %j",
    async (body) => {
      respond({ metadata: payload().metadata, ...body });
      await expect(fetchEtfs()).rejects.toThrow();
    },
  );

  it("accepts a genuine empty preview and discards invalid optional metadata", async () => {
    respond({
      data: { rows: [], total: 0 },
      metadata: {
        windowCode: "1Y",
        generatedAt: "bad-date",
        universeCount: "unknown",
        sortKey: "unknown",
      },
      warnings: ["Preview warning", 42],
    });
    expect(await fetchEtfs()).toEqual({
      rows: [],
      total: 0,
      metadata: {
        windowCode: "1Y",
        generatedAt: undefined,
        source: undefined,
        universeCount: undefined,
        sortKey: undefined,
      },
      warnings: ["Preview warning"],
    });
  });

  it("rejects HTTP failures and invalid JSON without exposing response errors", async () => {
    respond({ error: "private backend detail" }, 503);
    await expect(fetchEtfs()).rejects.toThrow("Unable to load ETF preview.");
    jest.restoreAllMocks();
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error("bad JSON");
      },
    } as unknown as Response);
    await expect(fetchEtfs()).rejects.toThrow("Unable to load ETF preview.");
  });
});
