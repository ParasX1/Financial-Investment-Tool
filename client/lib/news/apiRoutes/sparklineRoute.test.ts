import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/market/sparkline";
import { marketApiRateLimiter } from "@/lib/server/marketApiGuard";

function createRequest(query: NextApiRequest["query"], method = "GET") {
  return {
    headers: {},
    method,
    query,
    socket: { remoteAddress: "198.51.100.41" },
  } as unknown as NextApiRequest;
}

function createResponse() {
  const headers = new Map<string, string>();
  const res = {
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn((name: string, value: string) => {
      headers.set(name.toLowerCase(), value);
      return res;
    }),
    status: jest.fn().mockReturnThis(),
  } as unknown as NextApiResponse;

  return { headers, res };
}

describe("/api/market/sparkline", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("returns one-day Yahoo chart points with cache headers", async () => {
    global.fetch = jest.fn(
      async () =>
        new Response(
          JSON.stringify({
            chart: {
              result: [
                {
                  indicators: { quote: [{ close: [160, null, 162] }] },
                  meta: {
                    previousClose: 159,
                    regularMarketPrice: 162,
                  },
                  timestamp: [1, 2, 3],
                },
              ],
            },
          }),
          { status: 200 },
        ),
    ) as unknown as typeof fetch;
    const { headers, res } = createResponse();

    await handler(createRequest({ symbol: "cba.ax" }), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(headers.get("cache-control")).toBe(
      "s-maxage=60, stale-while-revalidate=300",
    );
    expect(res.json).toHaveBeenCalledWith({
      points: [
        { t: 1000, v: 160 },
        { t: 3000, v: 162 },
      ],
      previousClose: 159,
      regularMarketPrice: 162,
      symbol: "CBA.AX",
    });
  });

  it("redacts upstream Yahoo chart failures from client responses", async () => {
    global.fetch = jest.fn(
      async () => new Response("limited", { status: 429 }),
    ) as unknown as typeof fetch;
    const { headers, res } = createResponse();

    await handler(createRequest({ symbol: "cba.ax" }), res);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(res.json).toHaveBeenCalledWith({
      error: "Market data unavailable",
    });
  });

  it("treats missing Yahoo chart payloads as unavailable market data", async () => {
    global.fetch = jest.fn(
      async () =>
        new Response(JSON.stringify({ chart: { result: [] } }), {
          status: 200,
        }),
    ) as unknown as typeof fetch;
    const { headers, res } = createResponse();

    await handler(createRequest({ symbol: "cba.ax" }), res);

    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      error: "Market data unavailable",
    });
  });

  it("rejects non-GET requests before provider work", async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    const { headers, res } = createResponse();
    await handler(createRequest({ symbol: "CBA.AX" }, "POST"), res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(headers.get("allow")).toBe("GET");
    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each([undefined, "../AAPL", "A".repeat(21), ["AAPL", "MSFT"]])(
    "rejects an invalid or repeated symbol %p before provider work",
    async (symbol) => {
      global.fetch = jest.fn() as unknown as typeof fetch;
      const { res } = createResponse();
      await handler(createRequest({ symbol }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(global.fetch).not.toHaveBeenCalled();
    },
  );

  it("rejects exhausted admission before provider work", async () => {
    jest.spyOn(marketApiRateLimiter, "allow").mockReturnValue(false);
    global.fetch = jest.fn() as unknown as typeof fetch;
    const { headers, res } = createResponse();
    await handler(createRequest({ symbol: "AAPL" }), res);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(headers.get("retry-after")).toBe("60");
    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each([
    { meta: { chartPreviousClose: 158 }, previousClose: 158 },
    { meta: { regularMarketPreviousClose: 157 }, previousClose: 157 },
    { meta: {}, previousClose: null },
    { meta: undefined, previousClose: null },
  ])(
    "preserves previous-close aliases and empty chart payloads %#",
    async ({ meta, previousClose }) => {
      global.fetch = jest.fn(
        async () =>
          new Response(JSON.stringify({ chart: { result: [{ meta }] } })),
      ) as typeof fetch;
      const { res } = createResponse();
      await handler(createRequest({ symbol: "^AORD" }), res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        symbol: "^AORD",
        points: [],
        previousClose,
        regularMarketPrice: null,
      });
    },
  );

  it("bounds a stalled upstream body and keeps its failure private", async () => {
    jest.useFakeTimers();
    const cancel = jest.fn();
    global.fetch = jest.fn(
      async () => new Response(new ReadableStream({ cancel })),
    ) as typeof fetch;
    const { headers, res } = createResponse();
    const pending = handler(createRequest({ symbol: "AAPL" }), res);
    await jest.advanceTimersByTimeAsync(5000);
    await pending;
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({ error: "Market data unavailable" });
    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0");
  });

  it("rotated forged headers cannot bypass legacy chart admission", async () => {
    global.fetch = jest.fn(
      async () =>
        new Response(JSON.stringify({ chart: { result: [{ meta: {} }] } })),
    ) as typeof fetch;
    let lastResponse = createResponse();
    for (let index = 0; index < 61; index += 1) {
      lastResponse = createResponse();
      const request = createRequest({ symbol: "AAPL" });
      Object.defineProperty(request.socket, "remoteAddress", {
        value: "198.51.100.90",
      });
      request.headers["x-forwarded-for"] = `203.0.113.${index + 1}`;
      request.headers["x-real-ip"] = `203.0.113.${index + 1}`;
      await handler(request, lastResponse.res);
    }
    expect(global.fetch).toHaveBeenCalledTimes(60);
    expect(lastResponse.res.status).toHaveBeenCalledWith(429);
  });
});
