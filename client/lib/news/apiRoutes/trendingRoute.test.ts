import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/market/trending";
import { marketApiRateLimiter } from "@/lib/server/marketApiGuard";

function createRequest(query: NextApiRequest["query"], method = "GET") {
  return {
    headers: {},
    method,
    query,
    socket: { remoteAddress: "198.51.100.42" },
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

describe("/api/market/trending", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("returns official Yahoo trending symbols with public short cache", async () => {
    global.fetch = jest.fn(
      async () =>
        new Response(
          JSON.stringify({
            finance: {
              result: [
                {
                  quotes: [
                    { symbol: "BHP.AX" },
                    { symbol: "CBA.AX" },
                    { symbol: "BHP.AX" },
                  ],
                },
              ],
            },
          }),
          { status: 200 },
        ),
    ) as unknown as typeof fetch;
    const { headers, res } = createResponse();

    await handler(createRequest({ region: "au" }), res);

    expect(headers.get("cache-control")).toBe(
      "s-maxage=60, stale-while-revalidate=300",
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      region: "AU",
      source: "official",
      symbols: ["BHP.AX", "CBA.AX"],
    });
  });

  it("does not share-cache personalized watchlist requests", async () => {
    global.fetch = jest.fn(
      async () =>
        new Response(
          JSON.stringify({
            finance: {
              result: [{ quotes: [{ symbol: "NVDA" }] }],
            },
          }),
          { status: 200 },
        ),
    ) as unknown as typeof fetch;
    const { headers, res } = createResponse();

    await handler(
      createRequest({ region: "us", watchlist: "NVDA, MSFT" }),
      res,
    );

    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      region: "US",
      source: "official",
      symbols: ["NVDA"],
    });
  });

  it("falls back to ranked quote movers when official trending has no symbols", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ finance: { result: [{ quotes: [] }] } }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            quoteResponse: {
              result: [
                {
                  regularMarketChangePercent: -3.4,
                  symbol: "WBC.AX",
                },
                {
                  regularMarketChangePercent: 5.1,
                  symbol: "BHP.AX",
                },
                {
                  regularMarketPreviousClose: 100,
                  regularMarketPrice: 102,
                  symbol: "CBA.AX",
                },
              ],
            },
          }),
          { status: 200 },
        ),
      ) as unknown as typeof fetch;
    const { headers, res } = createResponse();

    await handler(
      createRequest({ region: "au", watchlist: "CBA.AX,WBC.AX" }),
      res,
    );

    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      region: "AU",
      source: "fallback",
      symbols: ["BHP.AX", "WBC.AX", "CBA.AX"],
    });
  });

  it("uses a region-specific fallback universe for US trending requests", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ finance: { result: [{ quotes: [] }] } }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            quoteResponse: {
              result: [
                {
                  regularMarketChangePercent: 4.2,
                  symbol: "NVDA",
                },
                {
                  regularMarketChangePercent: -2.1,
                  symbol: "TSLA",
                },
              ],
            },
          }),
          { status: 200 },
        ),
      ) as unknown as typeof fetch;
    const { res } = createResponse();

    await handler(createRequest({ region: "us" }), res);

    expect(global.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining(
        encodeURIComponent("^GSPC,^DJI,^IXIC,NVDA,AAPL,MSFT,AMZN,META,TSLA"),
      ),
      expect.any(Object),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      region: "US",
      source: "fallback",
      symbols: ["NVDA", "TSLA"],
    });
  });

  it("uses the global fallback universe for unsupported region codes", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ finance: { result: [{ quotes: [] }] } }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            quoteResponse: {
              result: [
                {
                  regularMarketChangePercent: 3.8,
                  symbol: "MSFT",
                },
              ],
            },
          }),
          { status: 200 },
        ),
      ) as unknown as typeof fetch;
    const { res } = createResponse();

    await handler(createRequest({ region: "mars" }), res);

    expect(global.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining(
        encodeURIComponent("^GSPC,^DJI,^IXIC,NVDA,AAPL,MSFT"),
      ),
      expect.any(Object),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      region: "MARS",
      source: "fallback",
      symbols: ["MSFT"],
    });
  });

  it("redacts fallback quote failures from client responses", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ finance: { result: [{ quotes: [] }] } }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response("limited", { status: 429 }),
      ) as unknown as typeof fetch;
    const { headers, res } = createResponse();

    await handler(createRequest({ region: "au" }), res);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(res.json).toHaveBeenCalledWith({
      error: "Market data unavailable",
    });
  });

  it("rejects non-GET requests before provider work", async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    const { headers, res } = createResponse();
    await handler(createRequest({ region: "AU" }, "POST"), res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(headers.get("allow")).toBe("GET");
    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each([
    { region: ["AU", "US"] },
    { region: "AU/../../US" },
    { region: "A".repeat(9) },
    { watchlist: ["AAPL", "MSFT"] },
    { watchlist: "AAPL,../MSFT" },
    { watchlist: "AAPL," },
    { watchlist: Array.from({ length: 31 }, (_, i) => `S${i}`).join(",") },
    { watchlist: "A".repeat(1001) },
  ])(
    "rejects malformed or oversized inputs %# before provider work",
    async (query) => {
      global.fetch = jest.fn() as unknown as typeof fetch;
      const { res } = createResponse();
      await handler(createRequest(query), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(global.fetch).not.toHaveBeenCalled();
    },
  );

  it("charges its maximum two provider requests before admitting work", async () => {
    const allow = jest
      .spyOn(marketApiRateLimiter, "allow")
      .mockReturnValue(false);
    global.fetch = jest.fn() as unknown as typeof fetch;
    const { headers, res } = createResponse();
    await handler(createRequest({}), res);
    expect(allow).toHaveBeenCalledWith("market-trending:198.51.100.42", 2);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(headers.get("retry-after")).toBe("60");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("preserves AU defaults, normalized watchlists and fallback seeds", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(new Response("limited", { status: 429 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            quoteResponse: {
              result: [
                { symbol: "bad" },
                {
                  symbol: "CBA.AX",
                  regularMarketPreviousClose: 0,
                  regularMarketPrice: 10,
                },
              ],
            },
          }),
        ),
      ) as typeof fetch;
    const { headers, res } = createResponse();
    await handler(createRequest({ watchlist: "cba.ax,CBA.AX,wbc.ax" }), res);
    expect(res.json).toHaveBeenCalledWith({
      region: "AU",
      source: "fallback",
      symbols: ["CBA.AX", "WBC.AX", "^AORD", "^AXJO", "BHP.AX"],
    });
    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0");
  });

  it("bounds fallback body completion by the remaining shared deadline", async () => {
    jest.useFakeTimers();
    const cancel = jest.fn();
    global.fetch = jest
      .fn()
      .mockImplementationOnce(async () => {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return new Response(
          JSON.stringify({ finance: { result: [{ quotes: [] }] } }),
        );
      })
      .mockResolvedValueOnce(
        new Response(new ReadableStream({ cancel })),
      ) as typeof fetch;
    const { headers, res } = createResponse();
    const pending = handler(createRequest({}), res);
    await jest.advanceTimersByTimeAsync(5000);
    await pending;
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(res.json).toHaveBeenCalledWith({ error: "Market data unavailable" });
  });

  it("does not start fallback after the official provider exhausts the deadline", async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn(
      () => new Promise<Response>(() => undefined),
    ) as typeof fetch;
    const { res } = createResponse();
    const pending = handler(createRequest({}), res);
    await jest.advanceTimersByTimeAsync(5000);
    await pending;
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(502);
  });
});
