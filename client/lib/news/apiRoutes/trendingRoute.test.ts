import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/market/trending";

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
  });

  it("returns official Yahoo trending symbols with public short cache", async () => {
    global.fetch = jest.fn(async () =>
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

    await handler(
      { query: { region: "au" } } as unknown as NextApiRequest,
      res,
    );

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
    global.fetch = jest.fn(async () =>
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
      {
        query: {
          region: "us",
          watchlist: "NVDA, MSFT",
        },
      } as unknown as NextApiRequest,
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
      {
        query: {
          region: "au",
          watchlist: "CBA.AX,WBC.AX",
        },
      } as unknown as NextApiRequest,
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

    await handler(
      { query: { region: "us" } } as unknown as NextApiRequest,
      res,
    );

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

    await handler(
      { query: { region: "mars" } } as unknown as NextApiRequest,
      res,
    );

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
      .mockResolvedValueOnce(new Response("limited", { status: 429 })) as
      unknown as typeof fetch;
    const { res } = createResponse();

    await handler(
      { query: { region: "au" } } as unknown as NextApiRequest,
      res,
    );

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      error: "Market data unavailable",
    });
  });
});
