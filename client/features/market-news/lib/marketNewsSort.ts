import type { Article } from "@/services/news";
import type { MarketNewsSortId, MarketNewsSortOption } from "../types";
import { articleMatchesWatchlist } from "./marketNewsLens";

export const MARKET_NEWS_SORT_OPTIONS: readonly MarketNewsSortOption[] = [
  {
    id: "latest",
    label: "Latest",
    description: "Newest headlines first.",
  },
  {
    id: "watchlist-first",
    label: "Watchlist first",
    description: "Saved tickers first, then company-linked stories.",
  },
];

function publishedAtMs(article: Article) {
  const time = new Date(article.publishedAt).getTime();

  return Number.isFinite(time) ? time : 0;
}

function tickerLinkedScore(article: Article) {
  return article.relatedSymbols?.length ? 1 : 0;
}

function compareNumberDesc(left: number, right: number) {
  return right - left;
}

export function sortMarketNewsArticles({
  articles,
  sortId,
  watchlistSymbols,
}: {
  articles: readonly Article[];
  sortId: MarketNewsSortId;
  watchlistSymbols: readonly string[];
}) {
  return articles
    .map((article, index) => ({ article, index }))
    .sort((left, right) => {
      if (sortId === "watchlist-first") {
        return (
          compareNumberDesc(
            articleMatchesWatchlist(left.article, watchlistSymbols) ? 1 : 0,
            articleMatchesWatchlist(right.article, watchlistSymbols) ? 1 : 0,
          ) ||
          compareNumberDesc(
            tickerLinkedScore(left.article),
            tickerLinkedScore(right.article),
          ) ||
          compareNumberDesc(
            publishedAtMs(left.article),
            publishedAtMs(right.article),
          ) ||
          left.index - right.index
        );
      }

      return (
        compareNumberDesc(
          publishedAtMs(left.article),
          publishedAtMs(right.article),
        ) || left.index - right.index
      );
    })
    .map(({ article }) => article);
}
