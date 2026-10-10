import type { NextApiRequest, NextApiResponse } from "next";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import handler from "@/pages/api/market/chart";

function responseHarness() {
  const headers = new Map<string, string>();
  const response = {
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn((name: string, value: string) => {
      headers.set(name.toLowerCase(), value);
      return response;
    }),
    status: jest.fn().mockReturnThis(),
  } as unknown as NextApiResponse;
  return { headers, response };
}

function request(symbol: string, method = "GET"): NextApiRequest {
  return {
    headers: { "x-forwarded-for": "203.0.113.77" },
    method,
    query: { symbol },
    socket: {},
  } as unknown as NextApiRequest;
}

describe("/api/market/chart", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns a safe one-day chart contract without shared stale caching", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          chart: {
            error: null,
            result: [
              {
                indicators: { quote: [{ close: [169, 170] }] },
                meta: {
                  chartPreviousClose: 168,
                  currency: "AUD",
                  marketState: "REGULAR",
                  regularMarketPrice: 170,
                  symbol: "CBA.AX",
                },
                timestamp: [1784094000, 1784094060],
              },
            ],
          },
        }),
        { status: 200 },
      ),
    );
    const { headers, response } = responseHarness();

    await handler(request("cba.ax"), response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        points: [
          { timeMs: 1784094000000, value: 169 },
          { timeMs: 1784094060000, value: 170 },
        ],
        symbol: "CBA.AX",
      }),
    );
  });

  it("rejects unsupported methods and unsafe symbols before provider work", async () => {
    const fetchSpy = jest.spyOn(global, "fetch");
    const post = responseHarness();
    await handler(request("CBA.AX", "POST"), post.response);
    expect(post.response.status).toHaveBeenCalledWith(405);
    expect(post.headers.get("allow")).toBe("GET");

    const unsafe = responseHarness();
    await handler(request("https://169.254.169.254"), unsafe.response);
    expect(unsafe.response.status).toHaveBeenCalledWith(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("redacts provider failures", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response("provider secret", { status: 429 }));
    const { response } = responseHarness();

    await handler(request("BHP.AX"), response);

    expect(response.status).toHaveBeenCalledWith(502);
    expect(response.json).toHaveBeenCalledWith({
      error: "Market chart is temporarily unavailable.",
    });
  });
});
