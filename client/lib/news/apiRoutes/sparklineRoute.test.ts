import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/market/sparkline";

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
  });

  it("returns one-day Yahoo chart points with cache headers", async () => {
    global.fetch = jest.fn(async () =>
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

    await handler(
      { query: { symbol: "cba.ax" } } as unknown as NextApiRequest,
      res,
    );

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

    await handler(
      { query: { symbol: "cba.ax" } } as unknown as NextApiRequest,
      res,
    );

    expect(res.status).toHaveBeenCalledWith(502);
    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(res.json).toHaveBeenCalledWith({
      error: "Market data unavailable",
    });
  });

  it("treats missing Yahoo chart payloads as unavailable market data", async () => {
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ chart: { result: [] } }), { status: 200 }),
    ) as unknown as typeof fetch;
    const { headers, res } = createResponse();

    await handler(
      { query: { symbol: "cba.ax" } } as unknown as NextApiRequest,
      res,
    );

    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      error: "Market data unavailable",
    });
  });
});
