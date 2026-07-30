import type { Article } from "@/services/news";
import type { MarketNewsLensId, MarketNewsLensOption } from "../types";

function watchlistSet(symbols: readonly string[]) {
  return new Set(symbols.map((symbol) => symbol.toUpperCase()));
}

export function articleMatchesWatchlist(
  article: Article,
  symbols: readonly string[],
) {
  const symbolsSet = watchlistSet(symbols);

  if (!symbolsSet.size) return false;

  return (article.relatedSymbols ?? []).some((symbol) =>
    symbolsSet.has(symbol.toUpperCase()),
  );
}

export function articleMatchesLens({
  article,
  lensId,
  watchlistSymbols,
}: {
  article: Article;
  lensId: MarketNewsLensId;
  watchlistSymbols: readonly string[];
}) {
  if (lensId === "all") return true;
  if (lensId === "watchlist") {
    return articleMatchesWatchlist(article, watchlistSymbols);
  }
  if (lensId === "ticker-linked") {
    return Boolean(article.relatedSymbols?.length);
  }

  return true;
}

export function filterArticlesByLens({
  articles,
  lensId,
  watchlistSymbols,
}: {
  articles: readonly Article[];
  lensId: MarketNewsLensId;
  watchlistSymbols: readonly string[];
}) {
  return articles.filter((article) =>
    articleMatchesLens({ article, lensId, watchlistSymbols }),
  );
}

export function buildMarketNewsLensOptions({
  articles,
  watchlistSymbols,
}: {
  articles: readonly Article[];
  watchlistSymbols: readonly string[];
}): MarketNewsLensOption[] {
  const specs: Array<Omit<MarketNewsLensOption, "count" | "selectable">> = [
    {
      id: "all",
      label: "All",
      description: "Every headline that matched this topic or search.",
    },
    {
      id: "watchlist",
      label: "My watchlist",
      description: "Stories linked to symbols you follow.",
    },
    {
      id: "ticker-linked",
      label: "Ticker stories",
      description: "Stories with market symbols attached.",
    },
  ];

  return specs.map((spec) => {
    const count = filterArticlesByLens({
      articles,
      lensId: spec.id,
      watchlistSymbols,
    }).length;

    return {
      ...spec,
      count,
      selectable: spec.id === "all" || count > 0,
    };
  });
}
