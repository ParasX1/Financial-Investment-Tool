import type { NextApiRequest, NextApiResponse } from "next";
import {
  getRequestClientKey,
  marketApiRateLimiter,
  MARKET_API_RETRY_AFTER_SECONDS,
  MARKET_PROVIDER_TIMEOUT_MS,
} from "@/lib/server/marketApiGuard";
import {
  fetchYahooQuoteSnapshots,
  getYahooQuoteProviderLog,
  normalizeYahooMarketSymbol,
  type YahooQuoteSnapshot,
} from "@/lib/server/yahooQuoteProvider";

const MAX_WATCHLIST_QUOTES = 20;
const WATCHLIST_SYMBOL_PATTERN = /^[A-Z0-9^][A-Z0-9.^=_-]{0,19}$/;
const PRIVATE_NO_STORE = "private, no-store, max-age=0";
const MARKET_DATA_UNAVAILABLE = "Market data is temporarily unavailable.";

type WatchlistQuotesResponse =
  | { quotes: YahooQuoteSnapshot[]; unavailableSymbols: string[] }
  | { error: string };

export function parseWatchlistQuoteSymbols(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  const uniqueSymbols = new Set<string>();

  for (const candidate of values.flatMap((entry) =>
    typeof entry === "string" ? entry.split(",") : [],
  )) {
    const symbol = normalizeYahooMarketSymbol(candidate);
    if (symbol && WATCHLIST_SYMBOL_PATTERN.test(symbol)) {
      uniqueSymbols.add(symbol);
    }
    if (uniqueSymbols.size === MAX_WATCHLIST_QUOTES) break;
  }

  return Array.from(uniqueSymbols);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WatchlistQuotesResponse>,
) {
  res.setHeader("Cache-Control", PRIVATE_NO_STORE);

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const clientKey = `watchlist-quotes:${getRequestClientKey(req)}`;
  if (!marketApiRateLimiter.allow(clientKey)) {
    res.setHeader("Retry-After", String(MARKET_API_RETRY_AFTER_SECONDS));
    res.status(429).json({
      error: "Too many quote requests. Please wait a moment.",
    });
    return;
  }

  const symbols = parseWatchlistQuoteSymbols(req.query.symbols);
  if (!symbols.length) {
    res.status(400).json({ error: "Enter at least one valid market symbol." });
    return;
  }

  try {
    const quotes = await fetchYahooQuoteSnapshots(symbols, {
      timeoutMs: MARKET_PROVIDER_TIMEOUT_MS,
    });

    res.status(200).json({
      quotes,
      unavailableSymbols: quotes
        .filter((quote) => quote.price === null)
        .map((quote) => quote.symbol),
    });
  } catch (error: unknown) {
    console.error(
      "Watchlist quote provider error",
      getYahooQuoteProviderLog(error),
    );
    res.status(502).json({ error: MARKET_DATA_UNAVAILABLE });
  }
}
