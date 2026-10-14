import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { gzipSync } from "node:zlib";
import type { NextApiRequest, NextApiResponse } from "next";
import searchHandler from "@/pages/api/market/symbol-search";
import { DEFAULT_PROVIDER_BODY_LIMIT_BYTES } from "./boundedProviderFetch";
import {
  clearMarketChartCache,
  fetchCachedYahooChartSnapshot,
} from "./marketChartCache";
import {
  NEWS_PROVIDER_MAX_ACTIVE,
  ProviderAdmission,
} from "./providerAdmission";
import {
  MARKET_PROVIDER_TIMEOUT_MS,
  marketApiRateLimiter,
} from "./marketApiGuard";
import { fetchYahooChartSnapshot } from "./yahooChartProvider";
import { fetchYahooQuoteSnapshots } from "./yahooQuoteProvider";

const meta = { regularMarketPrice: 170, symbol: "CBA.AX" };
const sparkPayload = {
  spark: { error: null, result: [{ symbol: "CBA.AX", response: [{ meta }] }] },
};
const chartPayload = {
  chart: {
    error: null,
    result: [
      {
        meta,
        timestamp: [1784094000],
        indicators: { quote: [{ close: [170] }] },
      },
    ],
  },
};
const searchPayload = {
  quotes: [
    { symbol: "CBA.AX", quoteType: "EQUITY", longname: "Commonwealth Bank" },
  ],
};

function payloadFor(request: IncomingMessage) {
  if (request.url?.includes("/spark")) return sparkPayload;
  if (request.url?.includes("/search")) return searchPayload;
  return chartPayload;
}

function respond(response: ServerResponse, payload: unknown, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

let requestIdentity = 0;
async function search(overrides: Partial<NextApiRequest> = {}) {
  const json = jest.fn();
  const response = {
    json,
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
  } as unknown as NextApiResponse;
  await searchHandler(
    {
      headers: {},
      method: "GET",
      query: { q: "CBA" },
      socket: { remoteAddress: `127.0.0.${++requestIdentity}` },
      ...overrides,
    } as unknown as NextApiRequest,
    response,
  );
  return { json, response };
}

describe("Yahoo provider bounds with native fetch and local HTTP", () => {
  let server: Server;
  let baseUrl: string;
  let onRequest: (request: IncomingMessage, response: ServerResponse) => void;
  const nativeFetch = globalThis.fetch;
  const fetchImpl: typeof fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    return nativeFetch(`${baseUrl}${url.pathname}${url.search}`, init);
  };

  beforeAll(async () => {
    server = createServer((request, response) => onRequest(request, response));
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("No fixture address");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(() => {
    clearMarketChartCache();
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it.each(["spark", "chart", "search", "fallback"])(
    "rejects an oversized decoded %s body and releases its admission permit",
    async (path) => {
      let requests = 0;
      let oversized = true;
      onRequest = (request, response) => {
        requests += 1;
        if (path === "fallback" && request.url?.includes("/spark")) {
          respond(response, { error: "unauthorized" }, 401);
          return;
        }
        if (!oversized) {
          respond(response, payloadFor(request));
          return;
        }
        const compressed = gzipSync(
          JSON.stringify({
            ...payloadFor(request),
            padding: "x".repeat(DEFAULT_PROVIDER_BODY_LIMIT_BYTES),
          }),
        );
        expect(compressed.byteLength).toBeLessThan(
          DEFAULT_PROVIDER_BODY_LIMIT_BYTES,
        );
        response.writeHead(200, {
          "Content-Encoding": "gzip",
          "Content-Length": compressed.byteLength,
          "Content-Type": "application/json",
        });
        response.end(compressed);
      };
      if (path === "search") {
        jest.spyOn(globalThis, "fetch").mockImplementation(fetchImpl);
        jest.spyOn(console, "error").mockImplementation(() => undefined);
        const failed = await search();
        expect(failed.response.status).toHaveBeenCalledWith(502);
        expect(failed.json).toHaveBeenCalledWith({
          error: "Symbol search is temporarily unavailable.",
        });
      } else {
        const pending =
          path === "chart"
            ? fetchYahooChartSnapshot("CBA.AX", { fetchImpl })
            : fetchYahooQuoteSnapshots(["CBA.AX"], { fetchImpl });
        await expect(pending).rejects.toThrow("provider unavailable");
      }
      expect(requests).toBe(path === "fallback" ? 2 : 1);
      oversized = false;
      const healthy = await fetchYahooChartSnapshot("CBA.AX", { fetchImpl });
      expect(healthy.regularMarketPrice).toBe(170);
    },
  );

  it("admits at most eight simultaneous quote, chart and search response reads", async () => {
    let active = 0;
    let peak = 0;
    let requests = 0;
    onRequest = (request, response) => {
      requests += 1;
      active += 1;
      peak = Math.max(peak, active);
      response.once("finish", () => (active -= 1));
      response.writeHead(200, { "Content-Type": "application/json" });
      response.flushHeaders();
      setTimeout(() => response.end(JSON.stringify(payloadFor(request))), 30);
    };
    jest.spyOn(globalThis, "fetch").mockImplementation(fetchImpl);
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, index) => {
        if (index % 3 === 0)
          return fetchYahooQuoteSnapshots(["CBA.AX"], { fetchImpl });
        if (index % 3 === 1)
          return fetchYahooChartSnapshot("CBA.AX", { fetchImpl });
        return search();
      }),
    );
    expect(results).toHaveLength(20);
    expect(requests).toBe(20);
    expect(peak).toBeLessThanOrEqual(NEWS_PROVIDER_MAX_ACTIVE);
    expect(active).toBe(0);
  });

  it("expires a queued quote without starting fetch and admits a healthy replacement", async () => {
    let requests = 0;
    const held: Array<() => void> = [];
    let ready: () => void;
    const activeReady = new Promise<void>((resolve) => (ready = resolve));
    onRequest = (request, response) => {
      requests += 1;
      response.writeHead(200, { "Content-Type": "application/json" });
      response.flushHeaders();
      held.push(() => response.end(JSON.stringify(payloadFor(request))));
      if (requests === NEWS_PROVIDER_MAX_ACTIVE) ready();
    };
    const blockers = Array.from({ length: NEWS_PROVIDER_MAX_ACTIVE }, () =>
      fetchYahooQuoteSnapshots(["CBA.AX"], { fetchImpl, timeoutMs: 2_000 }),
    );
    try {
      await activeReady;
      await expect(
        fetchYahooQuoteSnapshots(["CBA.AX"], { fetchImpl, timeoutMs: 80 }),
      ).rejects.toThrow("Market data provider unavailable");
      expect(requests).toBe(NEWS_PROVIDER_MAX_ACTIVE);
    } finally {
      held.forEach((release) => release());
      await Promise.allSettled(blockers);
    }
    onRequest = (request, response) => respond(response, payloadFor(request));
    await expect(
      fetchYahooQuoteSnapshots(["CBA.AX"], { fetchImpl }),
    ).resolves.toEqual([expect.objectContaining({ price: 170 })]);
  });

  it("keeps normal responses and HTTP failures behind existing provider contracts", async () => {
    onRequest = (request, response) => respond(response, payloadFor(request));
    jest.spyOn(globalThis, "fetch").mockImplementation(fetchImpl);
    expect(
      (await fetchYahooQuoteSnapshots(["CBA.AX"], { fetchImpl }))[0]?.price,
    ).toBe(170);
    expect(
      (await fetchYahooChartSnapshot("CBA.AX", { fetchImpl })).points,
    ).toEqual([{ timeMs: 1784094000000, value: 170 }]);
    const found = await search();
    expect(found.response.status).toHaveBeenCalledWith(200);
    expect(found.json).toHaveBeenCalledWith({
      results: [expect.objectContaining({ symbol: "CBA.AX" })],
    });
    onRequest = (_, response) =>
      respond(response, { detail: "upstream diagnostic" }, 503);
    await expect(
      fetchYahooQuoteSnapshots(["CBA.AX"], { fetchImpl }),
    ).rejects.toMatchObject({ code: "upstream", status: 503 });
    await expect(
      fetchYahooChartSnapshot("CBA.AX", { fetchImpl }),
    ).rejects.toMatchObject({ code: "upstream", status: 503 });
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    expect((await search()).response.status).toHaveBeenCalledWith(502);
  });

  it("preserves malformed-JSON fallback and redacted chart/search errors", async () => {
    onRequest = (request, response) => {
      if (request.url?.includes("/spark")) {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end('{"broken":');
      } else {
        respond(response, chartPayload);
      }
    };
    await expect(
      fetchYahooQuoteSnapshots(["CBA.AX"], { fetchImpl }),
    ).resolves.toEqual([expect.objectContaining({ price: 170 })]);
    onRequest = (_, response) => {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end('{"broken":');
    };
    await expect(
      fetchYahooChartSnapshot("CBA.AX", { fetchImpl }),
    ).rejects.toMatchObject({ code: "invalid-payload", status: 200 });
    jest.spyOn(globalThis, "fetch").mockImplementation(fetchImpl);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    expect((await search()).response.status).toHaveBeenCalledWith(502);
  });

  it.each([
    { method: "POST", query: { q: "CBA" }, expectedStatus: 405 },
    { method: "GET", query: { q: "" }, expectedStatus: 400 },
    { method: "GET", query: { q: "x".repeat(51) }, expectedStatus: 400 },
    { method: "GET", query: { q: "<CBA>" }, expectedStatus: 400 },
    { method: "GET", query: { q: ["CBA", "AAPL"] }, expectedStatus: 400 },
  ])(
    "returns $expectedStatus before admitting invalid search requests",
    async ({ method, query, expectedStatus }) => {
      const acquire = jest.spyOn(ProviderAdmission.prototype, "acquire");
      const fetcher = jest.spyOn(globalThis, "fetch");
      expect(
        (await search({ method, query })).response.status,
      ).toHaveBeenCalledWith(expectedStatus);
      expect(acquire).not.toHaveBeenCalled();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it("preserves search rate-limit status and headers before provider admission", async () => {
    jest.spyOn(marketApiRateLimiter, "allow").mockReturnValue(false);
    const acquire = jest.spyOn(ProviderAdmission.prototype, "acquire");
    const limited = await search();
    expect(limited.response.status).toHaveBeenCalledWith(429);
    expect(limited.response.setHeader).toHaveBeenCalledWith(
      "Retry-After",
      "60",
    );
    expect(acquire).not.toHaveBeenCalled();
  });

  it.each([
    ["quote", "headers"],
    ["quote", "body"],
    ["chart", "headers"],
    ["chart", "body"],
  ])(
    "times out native %s %s and releases capacity for a normal request",
    async (provider, stalled) => {
      let requests = 0;
      onRequest = (_, response) => {
        requests += 1;
        if (stalled === "body") {
          response.writeHead(200, { "Content-Type": "application/json" });
          response.flushHeaders();
          response.write('{"partial":');
        }
      };
      const start = Date.now();
      const failed =
        provider === "quote"
          ? fetchYahooQuoteSnapshots(["CBA.AX"], { fetchImpl, timeoutMs: 100 })
          : fetchYahooChartSnapshot("CBA.AX", { fetchImpl, timeoutMs: 100 });
      await expect(failed).rejects.toMatchObject({
        code: "network",
        status: null,
      });
      expect(Date.now() - start).toBeLessThan(500);
      expect(requests).toBe(1);
      onRequest = (request, response) => respond(response, payloadFor(request));
      expect(
        (await fetchYahooChartSnapshot("CBA.AX", { fetchImpl }))
          .regularMarketPrice,
      ).toBe(170);
    },
  );

  it("uses the original operation deadline across delayed spark and fallback body reads", async () => {
    let requests = 0;
    onRequest = (request, response) => {
      requests += 1;
      if (request.url?.includes("/spark")) {
        setTimeout(
          () => respond(response, { error: "unauthorized" }, 401),
          100,
        );
      } else if (request.url?.includes("/CBA.AX")) {
        respond(response, chartPayload);
      } else {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.flushHeaders();
        response.write('{"partial":');
      }
    };
    const acquire = jest.spyOn(ProviderAdmission.prototype, "acquire");
    const start = Date.now();
    const results = await fetchYahooQuoteSnapshots(["CBA.AX", "BHP.AX"], {
      // Deliberately fixed so the cancellation signal must also preserve the budget.
      clock: () => 0,
      fetchImpl,
      timeoutMs: 300,
    });
    expect(results).toEqual([
      expect.objectContaining({ price: 170, symbol: "CBA.AX" }),
      expect.objectContaining({ price: null, symbol: "BHP.AX" }),
    ]);
    expect(Date.now() - start).toBeLessThan(380);
    expect(requests).toBe(3);
    const admissionSignals = acquire.mock.calls.map(
      ([options]) => options.signal,
    );
    expect(admissionSignals).toHaveLength(3);
    expect(new Set(admissionSignals).size).toBe(1);
    expect(admissionSignals[0]?.aborted).toBe(true);
  });

  it.each(["headers", "body"])(
    "bounds search %s even when its fetcher ignores abort",
    async (stalled) => {
      jest.useFakeTimers();
      const cancel = jest.fn<() => void>();
      const fetcher = jest
        .fn<typeof fetch>()
        .mockImplementation(() =>
          stalled === "headers"
            ? new Promise<Response>(() => undefined)
            : Promise.resolve(new Response(new ReadableStream({ cancel }))),
        );
      jest.spyOn(globalThis, "fetch").mockImplementation(fetcher);
      jest.spyOn(console, "error").mockImplementation(() => undefined);
      try {
        const pending = search();
        await jest.advanceTimersByTimeAsync(MARKET_PROVIDER_TIMEOUT_MS + 1);
        const failed = await pending;
        expect(failed.response.status).toHaveBeenCalledWith(502);
        expect(failed.json).toHaveBeenCalledWith({
          error: "Symbol search is temporarily unavailable.",
        });
        if (stalled === "body") expect(cancel).toHaveBeenCalledTimes(1);
      } finally {
        jest.useRealTimers();
      }
    },
  );

  it("reuses a cached chart without fetching or acquiring another permit", async () => {
    onRequest = (request, response) => respond(response, payloadFor(request));
    const acquire = jest.spyOn(ProviderAdmission.prototype, "acquire");
    const fetcher = jest.fn(fetchImpl);
    const first = await fetchCachedYahooChartSnapshot("CBA.AX", {
      fetchImpl: fetcher,
      rangeId: "max",
      now: () => 1_000,
    });
    expect(acquire).toHaveBeenCalledTimes(1);
    const cached = await fetchCachedYahooChartSnapshot("CBA.AX", {
      fetchImpl: fetcher,
      rangeId: "max",
      now: () => 2_000,
    });
    expect(cached).toBe(first);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(acquire).toHaveBeenCalledTimes(1);
  });
});
