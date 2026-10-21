import type { NextApiRequest, NextApiResponse } from "next";
import {
  admitMarketApiRequest,
  beginMarketApiRequest,
  MARKET_PROVIDER_TIMEOUT_MS,
} from "@/lib/server/marketApiGuard";
import { fetchCachedYahooChartSnapshot } from "@/lib/server/marketChartCache";
import {
  getYahooChartProviderLog,
  type YahooChartSnapshot,
} from "@/lib/server/yahooChartProvider";
import { normalizeYahooMarketSymbol } from "@/lib/server/yahooQuoteProvider";
import {
  isMarketChartRangeId,
  type MarketChartRangeId,
} from "@/lib/market/chartRanges";

const MARKET_CHART_UNAVAILABLE = "Market chart is temporarily unavailable.";

type MarketChartResponse = YahooChartSnapshot | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MarketChartResponse>,
) {
  if (!beginMarketApiRequest(req, res)) return;

  const symbol = normalizeYahooMarketSymbol(String(req.query.symbol ?? ""));
  if (!symbol) {
    res.status(400).json({ error: "Enter a valid market symbol." });
    return;
  }
  const rawRange = Array.isArray(req.query.range)
    ? req.query.range[0]
    : req.query.range;
  const candidateRange = rawRange ?? "1d";
  if (!isMarketChartRangeId(candidateRange)) {
    res.status(400).json({ error: "Select a valid chart range." });
    return;
  }
  const rangeId: MarketChartRangeId = candidateRange;

  if (
    !admitMarketApiRequest(req, res, {
      namespace: "market-data",
      errorMessage: "Too many chart requests. Please wait a moment.",
    })
  ) {
    return;
  }

  try {
    const snapshot = await fetchCachedYahooChartSnapshot(symbol, {
      rangeId,
      timeoutMs: MARKET_PROVIDER_TIMEOUT_MS,
    });
    res.status(200).json(snapshot);
  } catch (error: unknown) {
    console.error(
      "Market chart provider error",
      getYahooChartProviderLog(error),
    );
    res.status(502).json({ error: MARKET_CHART_UNAVAILABLE });
  }
}
