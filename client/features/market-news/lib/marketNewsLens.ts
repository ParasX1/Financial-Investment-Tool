import type { Article } from "@/services/news";
import type { MarketNewsLensId, MarketNewsLensOption } from "../types";

const HIGH_RELEVANCE_THRESHOLD = 0.72;

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
  if (lensId === "high-relevance") {
    return (
      typeof article.confidence === "number" &&
      Number.isFinite(article.confidence) &&
      article.confidence >= HIGH_RELEVANCE_THRESHOLD
    );
  }
  if (lensId === "positive") return article.sentiment === "positive";
  if (lensId === "negative") return article.sentiment === "negative";

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
  const specs: Array<Omit<MarketNewsLensOption, "count">> = [
    {
      id: "all",
      label: "All",
      description: "Every strict-match headline in this view.",
    },
    {
      id: "watchlist",
      label: "My watchlist",
      description: "Stories linked to symbols you already follow.",
    },
    {
      id: "ticker-linked",
      label: "Company-linked",
      description: "Headlines with explicit market symbols attached.",
    },
    {
      id: "high-relevance",
      label: "Best matches",
      description: "Provider or demo stories with a strong match score.",
    },
    {
      id: "negative",
      label: "Risks",
      description: "Negative sentiment stories worth checking first.",
    },
    {
      id: "positive",
      label: "Opportunities",
      description: "Positive sentiment stories for opportunity scanning.",
    },
  ];

  return specs.map((spec) => ({
    ...spec,
    count: filterArticlesByLens({
      articles,
      lensId: spec.id,
      watchlistSymbols,
    }).length,
  }));
}
