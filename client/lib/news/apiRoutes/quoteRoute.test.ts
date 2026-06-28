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

describe("/api/market/quote", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("returns Yahoo quote payloads with cache headers", async () => {
    global.fetch = jest.fn(async () =>
      new Response(
        JSON.stringify({
          quoteResponse: {
            result: [
              {
                currency: "AUD",
                marketState: "REGULAR",
                regularMarketChange: 1.7,
                regularMarketChangePercent: 1.05,
                regularMarketPreviousClose: 160,
                regularMarketPrice: 162,
                shortName: "CBA",
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
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        change: 1.7,
        changePct: 1.05,
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

  it("treats empty Yahoo quote payloads as unavailable market data", async () => {
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ quoteResponse: { result: [] } }), {
        status: 200,
      }),
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
