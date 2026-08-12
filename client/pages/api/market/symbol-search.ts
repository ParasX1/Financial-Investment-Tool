import type { NextApiRequest, NextApiResponse } from "next";
import {
  getRequestClientKey,
  marketApiRateLimiter,
  MARKET_API_RETRY_AFTER_SECONDS,
  MARKET_PROVIDER_TIMEOUT_MS,
} from "@/lib/server/marketApiGuard";

const SUPPORTED_QUOTE_TYPES = new Set([
  "CRYPTOCURRENCY",
  "EQUITY",
  "ETF",
  "INDEX",
]);
const SYMBOL_PATTERN = /^[A-Z0-9^][A-Z0-9.^=_-]{0,19}$/;
const MAX_RESULTS = 10;
const MAX_QUERY_LENGTH = 50;
const PRIVATE_NO_STORE = "private, no-store, max-age=0";
const SEARCH_UNAVAILABLE = "Symbol search is temporarily unavailable.";

type YahooSearchQuote = Record<string, unknown>;

export type SymbolSearchResult = {
  exchange: string | null;
  name: string;
  quoteType: "CRYPTOCURRENCY" | "EQUITY" | "ETF" | "INDEX";
  symbol: string;
};

type SymbolSearchResponse =
  | { results: SymbolSearchResult[] }
  | { error: string };

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeSearchQuery(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const query = value.trim().replace(/\s+/g, " ");

  if (
    !query ||
    query.length > MAX_QUERY_LENGTH ||
    /[<>\u0000-\u001f\u007f]/.test(query)
  ) {
    return null;
  }

  return query;
}

export function mapYahooSymbolSearchResults(
  values: readonly YahooSearchQuote[],
): SymbolSearchResult[] {
  const results = new Map<string, SymbolSearchResult>();

  for (const value of values) {
    const symbol = (cleanString(value.symbol) ?? "").toUpperCase();
    const quoteType = (cleanString(value.quoteType) ?? "").toUpperCase();

    if (
      !SYMBOL_PATTERN.test(symbol) ||
      !SUPPORTED_QUOTE_TYPES.has(quoteType) ||
      results.has(symbol)
    ) {
      continue;
    }

    results.set(symbol, {
      exchange: cleanString(value.exchDisp) ?? cleanString(value.exchange),
      name:
        cleanString(value.longname) ??
        cleanString(value.shortname) ??
        symbol,
      quoteType: quoteType as SymbolSearchResult["quoteType"],
      symbol,
    });

    if (results.size === MAX_RESULTS) break;
  }

  return Array.from(results.values());
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SymbolSearchResponse>,
) {
  res.setHeader("Cache-Control", PRIVATE_NO_STORE);

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const clientKey = `symbol-search:${getRequestClientKey(req)}`;
  if (!marketApiRateLimiter.allow(clientKey)) {
    res.setHeader("Retry-After", String(MARKET_API_RETRY_AFTER_SECONDS));
    res.status(429).json({ error: "Too many searches. Please wait a moment." });
    return;
  }

  const query = normalizeSearchQuery(req.query.q);
  if (!query) {
    res.status(400).json({ error: "Enter a valid symbol or company name." });
    return;
  }

  try {
    const url = new URL("https://query1.finance.yahoo.com/v1/finance/search");
    url.searchParams.set("q", query);
    url.searchParams.set("quotesCount", String(MAX_RESULTS));
    url.searchParams.set("newsCount", "0");

    const response = await fetch(url, {
      headers: { "User-Agent": "financial-investment-tool" },
      signal: AbortSignal.timeout(MARKET_PROVIDER_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`Symbol search provider returned ${response.status}`);
    }

    const payload = await response.json();
    const quotes: YahooSearchQuote[] = Array.isArray(payload?.quotes)
      ? payload.quotes
      : [];

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
    res.status(200).json({ results: mapYahooSymbolSearchResults(quotes) });
  } catch (error: unknown) {
    console.error("Symbol search provider error", error);
    res.status(502).json({ error: SEARCH_UNAVAILABLE });
  }
}
