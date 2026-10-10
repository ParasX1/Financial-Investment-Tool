import type { NextApiRequest, NextApiResponse } from "next";
import { fetchBoundedProviderResponse } from "@/lib/server/boundedProviderFetch";
import {
  getRequestClientKey,
  marketApiRateLimiter,
  MARKET_API_RETRY_AFTER_SECONDS,
} from "@/lib/server/marketApiGuard";
import { normalizeYahooMarketSymbol } from "@/lib/server/yahooQuoteProvider";

type Pt = { t: number; v: number };
type SparkResp = {
  symbol: string;
  points: Pt[];
  previousClose: number | null;
  regularMarketPrice: number | null;
};

const MARKET_DATA_UNAVAILABLE = "Market data unavailable";
const MARKET_DATA_ERROR_CACHE = "private, no-store, max-age=0";

async function fetchYahooChart(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m`;
  const r = await fetchBoundedProviderResponse(url, {
    headers: { "User-Agent": "trend-proxy" },
  });
  if (!r.ok) {
    throw new Error(`Yahoo Finance chart ${r.status}`);
  }

  const json = await r.json();
  const chart = json?.chart?.result?.[0];
  if (!chart) {
    throw new Error("Yahoo Finance chart missing result");
  }

  const ts: number[] = chart?.timestamp ?? [];
  const closes: number[] = chart?.indicators?.quote?.[0]?.close ?? [];
  const previousClose =
    typeof chart?.meta?.previousClose === "number"
      ? chart.meta.previousClose
      : typeof chart?.meta?.chartPreviousClose === "number"
        ? chart.meta.chartPreviousClose
        : typeof chart?.meta?.regularMarketPreviousClose === "number"
          ? chart.meta.regularMarketPreviousClose
          : null;
  const regularMarketPrice =
    typeof chart?.meta?.regularMarketPrice === "number"
      ? chart.meta.regularMarketPrice
      : null;

  const points: Pt[] = [];
  for (let i = 0; i < Math.min(ts.length, closes.length); i++) {
    const v = closes[i];
    if (typeof v === "number") points.push({ t: ts[i] * 1000, v });
  }

  return { points, previousClose, regularMarketPrice };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SparkResp | { error: string }>,
) {
  res.setHeader("Cache-Control", MARKET_DATA_ERROR_CACHE);
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const symbol = normalizeYahooMarketSymbol(req.query.symbol);
  if (!symbol) {
    res.status(400).json({ error: "symbol is required" });
    return;
  }
  if (!marketApiRateLimiter.allow(`market-data:${getRequestClientKey(req)}`)) {
    res.setHeader("Retry-After", String(MARKET_API_RETRY_AFTER_SECONDS));
    res
      .status(429)
      .json({ error: "Too many chart requests. Please wait a moment." });
    return;
  }

  try {
    const { points, previousClose, regularMarketPrice } =
      await fetchYahooChart(symbol);

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    res.status(200).json({ symbol, points, previousClose, regularMarketPrice });
  } catch (error: unknown) {
    console.error("Market sparkline error", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    res.setHeader("Cache-Control", MARKET_DATA_ERROR_CACHE);
    res.status(502).json({
      error: MARKET_DATA_UNAVAILABLE,
    });
  }
}
