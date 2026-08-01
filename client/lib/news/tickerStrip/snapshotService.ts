import type {
  MarketNewsMarketScope,
  MarketNewsQuoteResponse,
  MarketNewsSparklineResponse,
  MarketNewsTickerStripSnapshot,
  MarketNewsTickerStripSource,
} from "./types";
import {
  buildMarketNewsTickerFallback,
  selectMarketNewsTickerSymbols,
  type SelectedMarketNewsTicker,
} from "./dynamicTickers";
import { resolveMarketNewsTickerQuoteState } from "./quoteState";

export const MARKET_NEWS_TICKER_STRIP_REFRESH_MS = 60_000;

type MarketNewsTickerFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Pick<Response, "json" | "ok">>;

interface YahooQuoteRow {
  currency?: string;
  longName?: string;
  marketState?: string;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketPreviousClose?: number;
  regularMarketPrice?: number;
  shortName?: string;
  symbol?: string;
}

const YAHOO_USER_AGENT = "trend-proxy";
const MAX_SPARKLINE_POINTS = 42;

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function uniqueSymbols(symbols: readonly string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  symbols.forEach((symbol) => {
    const normalized = normalizeSymbol(symbol);
    if (!normalized || seen.has(normalized)) return;

    seen.add(normalized);
    unique.push(normalized);
  });

  return unique;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function selectionForScope(marketScope: MarketNewsMarketScope) {
  return (
    marketScope.tickerSelection ?? {
      coreSymbols: marketScope.tickers
        .slice(0, 3)
        .map((ticker) => ticker.symbol),
      dynamicSymbols: marketScope.tickers
        .slice(3)
        .map((ticker) => ticker.symbol),
      macroSymbols: [],
      maxTickers: marketScope.tickers.length,
      trendingRegion: marketScope.shortLabel,
    }
  );
}

async function fetchJson(
  fetcher: MarketNewsTickerFetch,
  url: string,
): Promise<unknown | null> {
  try {
    const response = await fetcher(url, {
      headers: { "User-Agent": YAHOO_USER_AGENT },
    });

    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

async function fetchYahooTrendingSymbols({
  fetcher,
  region,
}: {
  fetcher: MarketNewsTickerFetch;
  region: string;
}) {
  const url = `https://query1.finance.yahoo.com/v1/finance/trending/region/${encodeURIComponent(
    region,
  )}?count=15`;
  const json = await fetchJson(fetcher, url);
  const quotes =
    (json as { finance?: { result?: Array<{ quotes?: YahooQuoteRow[] }> } })
      ?.finance?.result?.[0]?.quotes ?? [];

  return uniqueSymbols(
    quotes.map((quote) => quote.symbol ?? "").filter(Boolean),
  );
}

function toQuoteResponse(row: YahooQuoteRow): MarketNewsQuoteResponse | null {
  if (!row.symbol) return null;

  const price = isFiniteNumber(row.regularMarketPrice)
    ? row.regularMarketPrice
    : null;
  const prevClose = isFiniteNumber(row.regularMarketPreviousClose)
    ? row.regularMarketPreviousClose
    : null;
  const change = isFiniteNumber(row.regularMarketChange)
    ? row.regularMarketChange
    : price !== null && prevClose !== null
      ? price - prevClose
      : null;
  const changePct = isFiniteNumber(row.regularMarketChangePercent)
    ? row.regularMarketChangePercent
    : price !== null && prevClose !== null && prevClose !== 0
      ? ((price - prevClose) / prevClose) * 100
      : null;

  return {
    symbol: row.symbol,
    price,
    prevClose,
    change,
    changePct,
    currency: row.currency,
    marketState: row.marketState,
    shortName: row.shortName,
    longName: row.longName,
  };
}

async function fetchYahooQuotes({
  fetcher,
  symbols,
}: {
  fetcher: MarketNewsTickerFetch;
  symbols: readonly string[];
}) {
  const unique = uniqueSymbols(symbols).slice(0, 40);
  const quoteMap = new Map<string, MarketNewsQuoteResponse>();
  if (!unique.length) return quoteMap;

  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
    unique.join(","),
  )}`;
  const json = await fetchJson(fetcher, url);
  const rows =
    (json as { quoteResponse?: { result?: YahooQuoteRow[] } })?.quoteResponse
      ?.result ?? [];

  rows.forEach((row) => {
    const quote = toQuoteResponse(row);
    if (!quote) return;
    quoteMap.set(normalizeSymbol(quote.symbol), quote);
  });

  return quoteMap;
}

async function fetchYahooSparkline({
  fetcher,
  symbol,
}: {
  fetcher: MarketNewsTickerFetch;
  symbol: string;
}): Promise<MarketNewsSparklineResponse | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?range=1d&interval=5m`;
  const json = await fetchJson(fetcher, url);
  const result = (
    json as {
      chart?: {
        result?: Array<{
          indicators?: { quote?: Array<{ close?: Array<number | null> }> };
          meta?: {
            chartPreviousClose?: number;
            previousClose?: number;
            regularMarketPrice?: number;
            regularMarketPreviousClose?: number;
          };
          timestamp?: number[];
        }>;
      };
    }
  )?.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const points = timestamps
    .map((timestamp, index) => ({
      t: timestamp,
      v: closes[index],
    }))
    .filter(
      (point): point is { t: number; v: number } =>
        isFiniteNumber(point.t) && isFiniteNumber(point.v),
    );

  const previousClose = [
    result?.meta?.previousClose,
    result?.meta?.chartPreviousClose,
    result?.meta?.regularMarketPreviousClose,
  ].find(isFiniteNumber);
  const regularMarketPrice = isFiniteNumber(result?.meta?.regularMarketPrice)
    ? result.meta.regularMarketPrice
    : null;

  if (points.length <= MAX_SPARKLINE_POINTS) {
    return { points, previousClose, regularMarketPrice, symbol };
  }

  const step = (points.length - 1) / (MAX_SPARKLINE_POINTS - 1);
  const seenIndexes = new Set<number>();
  const compactPoints = Array.from(
    { length: MAX_SPARKLINE_POINTS },
    (_, index) => Math.round(index * step),
  )
    .filter((index) => {
      if (seenIndexes.has(index)) return false;
      seenIndexes.add(index);
      return true;
    })
    .map((index) => points[index]!)
    .filter(Boolean);

  return { points: compactPoints, previousClose, regularMarketPrice, symbol };
}

function rankDynamicCandidates({
  candidates,
  quoteMap,
}: {
  candidates: readonly string[];
  quoteMap: ReadonlyMap<string, MarketNewsQuoteResponse>;
}) {
  return uniqueSymbols(candidates)
    .map((symbol, index) => {
      const quote = quoteMap.get(normalizeSymbol(symbol));
      const move = Math.abs(quote?.changePct ?? 0);

      return {
        index,
        move,
        symbol,
      };
    })
    .sort((a, b) => b.move - a.move || a.index - b.index)
    .map((candidate) => candidate.symbol);
}

function resolveStripSource({
  liveCount,
  tickerCount,
}: {
  liveCount: number;
  tickerCount: number;
}): MarketNewsTickerStripSource {
  if (liveCount <= 0) return "fallback";
  if (liveCount >= tickerCount) return "live";
  return "mixed";
}

function buildFallbackTickers(
  marketScope: MarketNewsMarketScope,
  selectedTickers: readonly SelectedMarketNewsTicker[],
) {
  return selectedTickers.map((selectedTicker) =>
    buildMarketNewsTickerFallback({
      marketScope,
      signal: selectedTicker.signal,
      symbol: selectedTicker.symbol,
    }),
  );
}

export async function buildMarketNewsTickerStripSnapshot({
  fetcher = fetch,
  marketScope,
  now = () => new Date(),
  watchlistSymbols = [],
}: {
  fetcher?: MarketNewsTickerFetch;
  marketScope: MarketNewsMarketScope;
  now?: () => Date;
  watchlistSymbols?: readonly string[];
}): Promise<MarketNewsTickerStripSnapshot> {
  const selection = selectionForScope(marketScope);
  const officialTrendingSymbols = await fetchYahooTrendingSymbols({
    fetcher,
    region: selection.trendingRegion,
  });
  const watchlistCandidateSymbols = uniqueSymbols(watchlistSymbols);
  const dynamicCandidateSymbols = uniqueSymbols([
    ...officialTrendingSymbols,
    ...selection.dynamicSymbols,
  ]);
  const quotePool = uniqueSymbols([
    ...selection.coreSymbols,
    ...selection.macroSymbols,
    ...watchlistCandidateSymbols,
    ...dynamicCandidateSymbols,
  ]);
  const quoteMap = await fetchYahooQuotes({ fetcher, symbols: quotePool });
  const rankedWatchlistSymbols = rankDynamicCandidates({
    candidates: watchlistCandidateSymbols,
    quoteMap,
  });
  const rankedDynamicSymbols = rankDynamicCandidates({
    candidates: dynamicCandidateSymbols,
    quoteMap,
  });
  const selectedTickers = selectMarketNewsTickerSymbols({
    marketScope,
    trendingSymbols: rankedDynamicSymbols,
    watchlistSymbols: rankedWatchlistSymbols,
  });
  const fallbackTickers = buildFallbackTickers(marketScope, selectedTickers);
  const sparklines = await Promise.all(
    fallbackTickers.map((ticker) =>
      fetchYahooSparkline({ fetcher, symbol: ticker.symbol }),
    ),
  );
  let liveCount = 0;
  let unavailableSparklineCount = 0;
  const tickers = fallbackTickers.map((fallbackTicker, index) => {
    const quote = quoteMap.get(normalizeSymbol(fallbackTicker.symbol)) ?? null;
    const sparkline = sparklines[index] ?? null;
    const resolvedTicker = resolveMarketNewsTickerQuoteState(fallbackTicker, {
      quote,
      sparkline,
    });
    const ticker = resolvedTicker.ticker;

    if (resolvedTicker.recoveredLiveData) liveCount += 1;
    if (ticker.sparklineSource === "unavailable")
      unavailableSparklineCount += 1;

    return ticker;
  });
  const source = resolveStripSource({
    liveCount,
    tickerCount: tickers.length,
  });
  const warnings = [
    ...(source === "fallback"
      ? [
          "Live Yahoo Finance quote data was unavailable, so quote cards show no live data.",
        ]
      : source === "mixed"
        ? [
            "Some quote snapshots are unavailable because Yahoo Finance did not return live quote data.",
          ]
        : []),
    ...(unavailableSparklineCount
      ? [
          "Some Yahoo 1D quote lines are unavailable, so those cards show price metadata without a sparkline.",
        ]
      : []),
  ];

  return {
    providerLabel: "Yahoo Finance",
    refreshMs: MARKET_NEWS_TICKER_STRIP_REFRESH_MS,
    scopeId: marketScope.id,
    source,
    strategy: "core-plus-dynamic-movers",
    tickers,
    updatedAt: source === "fallback" ? null : now().toISOString(),
    warnings,
  };
}
