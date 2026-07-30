import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/market/quote";

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

function createRequest(
  symbol: string,
  address: string,
  method = "GET",
): NextApiRequest {
  return {
    headers: { "x-forwarded-for": address },
    method,
    query: { symbol },
    socket: {},
  } as unknown as NextApiRequest;
}

describe("/api/market/quote", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("returns Yahoo spark quote payloads with cache headers", async () => {
    global.fetch = jest.fn(async () =>
      new Response(
        JSON.stringify({
          spark: {
            error: null,
            result: [
              {
                response: [{
                  meta: {
                    chartPreviousClose: 160,
                    currency: "AUD",
                    regularMarketPrice: 162,
                    shortName: "CBA",
                    symbol: "CBA.AX",
                  },
                }],
                symbol: "CBA.AX",
              },
            ],
          },
        }),
        { status: 200 },
      ),
    ) as unknown as typeof fetch;
    const { headers, res } = createResponse();

    await handler(createRequest("cba.ax", "203.0.113.1"), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(headers.get("cache-control")).toBe(
      "s-maxage=60, stale-while-revalidate=300",
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        change: 2,
        changePct: 1.25,
        currency: "AUD",
        price: 162,
        prevClose: 160,
        symbol: "CBA.AX",
      }),
    );
  });

  it("redacts upstream Yahoo quote failures from client responses", async () => {
    global.fetch = jest.fn(
      async () => new Response("limited", { status: 429 }),
    ) as unknown as typeof fetch;
    const { headers, res } = createResponse();

    await handler(createRequest("cba.ax", "203.0.113.2"), res);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(res.json).toHaveBeenCalledWith({
      error: "Market data unavailable",
    });
  });

  it("treats empty Yahoo quote payloads as unavailable market data", async () => {
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ quoteResponse: { result: [] } }), {
        status: 200,
      }),
    ) as unknown as typeof fetch;
    const { headers, res } = createResponse();

    await handler(createRequest("cba.ax", "203.0.113.3"), res);

    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      error: "Market data unavailable",
    });
  });

  it("rejects non-GET requests before contacting the provider", async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    const { headers, res } = createResponse();

    await handler(createRequest("CBA.AX", "203.0.113.4", "POST"), res);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(headers.get("allow")).toBe("GET");
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: "Method not allowed." });
  });

  it("rate limits repeated requests from the same client", async () => {
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({
        spark: {
          error: null,
          result: [{
            response: [{ meta: {
              chartPreviousClose: 160,
              regularMarketPrice: 162,
              symbol: "CBA.AX",
            } }],
            symbol: "CBA.AX",
          }],
        },
      }), { status: 200 }),
    ) as unknown as typeof fetch;

    let lastResponse = createResponse();
    for (let requestNumber = 0; requestNumber < 61; requestNumber += 1) {
      lastResponse = createResponse();
      await handler(createRequest("CBA.AX", "203.0.113.61"), lastResponse.res);
    }

    expect(global.fetch).toHaveBeenCalledTimes(60);
    expect(lastResponse.headers.get("retry-after")).toBe("60");
    expect(lastResponse.res.status).toHaveBeenCalledWith(429);
    expect(lastResponse.res.json).toHaveBeenCalledWith({
      error: "Too many quote requests. Please wait a moment.",
    });
  });
});
