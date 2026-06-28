import type { NextApiRequest, NextApiResponse } from "next";
import { resolveMarketNewsMarketScope } from "@/features/market-news/lib/marketNewsNavigation";
import {
  buildMarketNewsTickerStripSnapshot,
  type MarketNewsTickerStripSnapshot,
} from "@/features/market-news/lib/marketNewsTickerStripService";

type TickerStripResponse = MarketNewsTickerStripSnapshot | { error: string };

const TICKER_STRIP_UNAVAILABLE_ERROR =
  "Market ticker snapshots are temporarily unavailable.";

function parseWatchlist(value: NextApiRequest["query"][string]) {
  if (typeof value !== "string") return [];

  return value
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 30);
}

function getTickerStripCacheControl(watchlistSymbols: readonly string[]) {
  return watchlistSymbols.length
    ? "private, no-store, max-age=0"
    : "s-maxage=45, stale-while-revalidate=120";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TickerStripResponse>,
) {
  try {
    const scopeId =
      typeof req.query.scope === "string" ? req.query.scope : undefined;
    const marketScope = resolveMarketNewsMarketScope(scopeId);
    const watchlistSymbols = parseWatchlist(req.query.watchlist);
    const snapshot = await buildMarketNewsTickerStripSnapshot({
      marketScope,
      watchlistSymbols,
    });

    res.setHeader(
      "Cache-Control",
      getTickerStripCacheControl(watchlistSymbols),
    );
    res.status(200).json(snapshot);
  } catch (error: unknown) {
    console.error("Market ticker strip error", error);
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.status(502).json({ error: TICKER_STRIP_UNAVAILABLE_ERROR });
  }
}
