import type { NextApiRequest, NextApiResponse } from "next";
import {
  resolveMarketNewsMarketScope,
  type MarketNewsTickerStripSnapshot,
} from "@/lib/news/tickerStrip";
import { buildMarketNewsTickerStripSnapshot } from "@/lib/news/tickerStrip/snapshotService";
import {
  admitMarketApiRequest,
  beginMarketApiRequest,
  MARKET_API_PRIVATE_CACHE_CONTROL,
} from "@/lib/server/marketApiGuard";
import { normalizeYahooMarketSymbol } from "@/lib/server/yahooQuoteProvider";

type TickerStripResponse = MarketNewsTickerStripSnapshot | { error: string };

const TICKER_STRIP_UNAVAILABLE_ERROR =
  "Market ticker snapshots are temporarily unavailable.";
const MAX_WATCHLIST_SYMBOLS = 20;

function parseWatchlistBody(value: unknown): string[] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!("watchlistSymbols" in value)) return null;
  const candidates = value.watchlistSymbols;
  if (!Array.isArray(candidates)) return null;

  const symbols = new Set<string>();
  for (const candidate of candidates) {
    const symbol = normalizeYahooMarketSymbol(candidate);
    if (symbol) symbols.add(symbol);
    if (symbols.size === MAX_WATCHLIST_SYMBOLS) break;
  }
  return Array.from(symbols);
}

function getTickerStripCacheControl(watchlistSymbols: readonly string[]) {
  return watchlistSymbols.length
    ? MARKET_API_PRIVATE_CACHE_CONTROL
    : "s-maxage=45, stale-while-revalidate=120";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TickerStripResponse>,
) {
  if (!beginMarketApiRequest(req, res, ["GET", "POST"])) return;
  if (
    !admitMarketApiRequest(req, res, {
      namespace: "market-ticker-strip",
      errorMessage: "Too many market requests. Please wait a moment.",
    })
  ) {
    return;
  }

  if (req.method === "GET" && req.query.watchlist !== undefined) {
    res.status(400).json({
      error: "Send personalized ticker symbols in a POST body.",
    });
    return;
  }

  const watchlistSymbols =
    req.method === "POST" ? parseWatchlistBody(req.body) : [];
  if (
    watchlistSymbols === null ||
    (req.method === "POST" && !watchlistSymbols.length)
  ) {
    res.status(400).json({ error: "Enter at least one valid market symbol." });
    return;
  }

  try {
    const scopeId =
      typeof req.query.scope === "string" ? req.query.scope : undefined;
    const marketScope = resolveMarketNewsMarketScope(scopeId);
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
    console.error("Market ticker strip error", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    res.status(502).json({ error: TICKER_STRIP_UNAVAILABLE_ERROR });
  }
}
