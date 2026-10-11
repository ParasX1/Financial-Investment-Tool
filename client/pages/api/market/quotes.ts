import type { NextApiRequest, NextApiResponse } from "next";
import {
  admitMarketApiRequest,
  beginMarketApiRequest,
  MARKET_PROVIDER_TIMEOUT_MS,
} from "@/lib/server/marketApiGuard";
import {
  fetchYahooQuoteSnapshots,
  getYahooQuoteProviderLog,
  normalizeYahooMarketSymbol,
  type YahooQuoteSnapshot,
} from "@/lib/server/yahooQuoteProvider";

const MAX_MARKET_QUOTES = 20;
const MARKET_SYMBOL_PATTERN = /^[A-Z0-9^][A-Z0-9.^=_-]{0,19}$/;
const MARKET_DATA_UNAVAILABLE = "Market data is temporarily unavailable.";

type MarketQuotesResponse =
  | { quotes: YahooQuoteSnapshot[]; unavailableSymbols: string[] }
  | { error: string };

export function parseMarketQuoteSymbols(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  const uniqueSymbols = new Set<string>();

  for (const candidate of values.flatMap((entry) =>
    typeof entry === "string" ? entry.split(",") : [],
  )) {
    const symbol = normalizeYahooMarketSymbol(candidate);
    if (symbol && MARKET_SYMBOL_PATTERN.test(symbol)) {
      uniqueSymbols.add(symbol);
    }
    if (uniqueSymbols.size === MAX_MARKET_QUOTES) break;
  }

  return Array.from(uniqueSymbols);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MarketQuotesResponse>,
) {
  if (!beginMarketApiRequest(req, res)) return;
  if (
    !admitMarketApiRequest(req, res, {
      namespace: "market-quotes",
      errorMessage: "Too many quote requests. Please wait a moment.",
    })
  ) {
    return;
  }

  const symbols = parseMarketQuoteSymbols(req.query.symbols);
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
      "Market quote provider error",
      getYahooQuoteProviderLog(error),
    );
    res.status(502).json({ error: MARKET_DATA_UNAVAILABLE });
  }
}
