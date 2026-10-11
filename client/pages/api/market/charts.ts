import type { NextApiRequest, NextApiResponse } from "next";
import {
  MAX_MARKET_CHART_COMPARISON_SYMBOLS,
  isMarketChartRangeId,
  type MarketChartRangeId,
} from "@/lib/market/chartRanges";
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

interface MarketChartsResponse {
  rangeId: MarketChartRangeId;
  snapshots: YahooChartSnapshot[];
  unavailableSymbols: string[];
}

type MarketChartsApiResponse = MarketChartsResponse | { error: string };

function parseSymbols(value: string | string[] | undefined): string[] | null {
  if (typeof value !== "string") return null;
  const rawSymbols = value.split(",").map((symbol) => symbol.trim());
  if (!rawSymbols.length || rawSymbols.some((symbol) => !symbol)) return null;

  const symbols: string[] = [];
  for (const rawSymbol of rawSymbols) {
    const symbol = normalizeYahooMarketSymbol(rawSymbol);
    if (!symbol) return null;
    if (!symbols.includes(symbol)) symbols.push(symbol);
  }
  return symbols.length > 0 &&
    symbols.length <= MAX_MARKET_CHART_COMPARISON_SYMBOLS
    ? symbols
    : null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MarketChartsApiResponse>,
) {
  if (!beginMarketApiRequest(req, res)) return;

  const symbols = parseSymbols(req.query.symbols);
  const rawRange = Array.isArray(req.query.range)
    ? req.query.range[0]
    : req.query.range;
  if (!symbols || !isMarketChartRangeId(rawRange)) {
    res.status(400).json({
      error: "Choose one to four valid symbols and a chart range.",
    });
    return;
  }
  const rangeId = rawRange;

  if (
    !admitMarketApiRequest(req, res, {
      namespace: "market-data",
      errorMessage: "Too many chart requests. Please wait a moment.",
      cost: symbols.length,
    })
  ) {
    return;
  }

  const results = await Promise.allSettled(
    symbols.map((symbol) =>
      fetchCachedYahooChartSnapshot(symbol, {
        rangeId,
        timeoutMs: MARKET_PROVIDER_TIMEOUT_MS,
      }),
    ),
  );
  const snapshots: YahooChartSnapshot[] = [];
  const unavailableSymbols: string[] = [];

  results.forEach((result, index) => {
    const symbol = symbols[index]!;
    if (result.status === "fulfilled") {
      snapshots.push(result.value);
      return;
    }
    console.error("Market chart comparison provider error", {
      symbol,
      ...getYahooChartProviderLog(result.reason),
    });
    unavailableSymbols.push(symbol);
  });

  res.status(200).json({ rangeId, snapshots, unavailableSymbols });
}
