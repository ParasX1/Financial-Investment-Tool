import type { NextApiRequest, NextApiResponse } from "next";
import { resolveMarketNewsMarketScope } from "@/features/market-news/lib/marketNewsNavigation";
import {
  buildMarketNewsTickerStripSnapshot,
  type MarketNewsTickerStripSnapshot,
} from "@/features/market-news/lib/marketNewsTickerStripService";

type TickerStripResponse = MarketNewsTickerStripSnapshot | { error: string };

function parseWatchlist(value: NextApiRequest["query"][string]) {
  if (typeof value !== "string") return [];

  return value
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 30);
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

    res.setHeader("Cache-Control", "s-maxage=45, stale-while-revalidate=120");
    res.status(200).json(snapshot);
  } catch (error: unknown) {
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to build market ticker strip",
    });
  }
}
