import type { Article } from "@/services/news";
import type { MarketNewsTicker } from "../types";

export type MarketNewsRailMentionedTicker = {
  change?: string;
  count: number;
  inWatchlist: boolean;
  label: string;
  symbol: string;
  tone?: MarketNewsTicker["tone"];
  value?: string;
};

export type MarketNewsRailSummary = {
  mentionedTickers: MarketNewsRailMentionedTicker[];
  totalLinkedStoryCount: number;
  watchlistHitCount: number;
  watchlistStoryCount: number;
  watchlistTickers: MarketNewsRailMentionedTicker[];
};

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

export function buildMarketNewsRailSummary({
  articles,
  tickers,
  watchlistSymbols,
}: {
  articles: readonly Article[];
  tickers: readonly MarketNewsTicker[];
  watchlistSymbols: readonly string[];
}): MarketNewsRailSummary {
  const watchlistSet = new Set(watchlistSymbols.map(normalizeSymbol));
  const tickerBySymbol = new Map(
    tickers.map((ticker) => [normalizeSymbol(ticker.symbol), ticker]),
  );
  const counts = new Map<string, number>();
  let totalLinkedStoryCount = 0;
  let watchlistStoryCount = 0;

  for (const article of articles) {
    const articleSymbols = Array.from(
      new Set((article.relatedSymbols ?? []).map(normalizeSymbol)),
    ).filter(Boolean);

    if (!articleSymbols.length) continue;

    totalLinkedStoryCount += 1;

    if (articleSymbols.some((symbol) => watchlistSet.has(symbol))) {
      watchlistStoryCount += 1;
    }

    for (const symbol of articleSymbols) {
      counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
    }
  }

  const allMentionedTickers = Array.from(counts.entries())
    .map(([symbol, count]) => {
      const ticker = tickerBySymbol.get(symbol);

      return {
        change: ticker?.change,
        count,
        inWatchlist: watchlistSet.has(symbol),
        label: ticker?.label ?? symbol,
        symbol,
        tone: ticker?.tone,
        value: ticker?.value,
      } satisfies MarketNewsRailMentionedTicker;
    })
    .sort(
      (left, right) =>
        right.count - left.count ||
        Number(right.inWatchlist) - Number(left.inWatchlist) ||
        left.symbol.localeCompare(right.symbol),
    );

  return {
    mentionedTickers: allMentionedTickers.slice(0, 6),
    totalLinkedStoryCount,
    watchlistHitCount: allMentionedTickers.filter((ticker) => ticker.inWatchlist)
      .length,
    watchlistStoryCount,
    watchlistTickers: allMentionedTickers
      .filter((ticker) => ticker.inWatchlist)
      .slice(0, 6),
  };
}
