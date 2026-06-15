import type { Article } from "@/services/news";
import {
  buildStrictSearchText,
  compact,
  dedupeArticles,
} from "../providerUtils";
import {
  getPrimarySymbolName,
  inferRelatedSymbolsFromText,
} from "../symbolAliases";
import type {
  NewsProvider,
  NewsProviderFetchContext,
  ServerNewsRequest,
} from "../types";

type NewsApiEndpoint = "everything" | "top-headlines";

interface NewsApiCandidate {
  endpoint: NewsApiEndpoint;
  params: Record<string, string | undefined>;
}

function getNewsApiKey(env: Record<string, string | undefined>) {
  return compact(env.NEWSAPI_KEY);
}

function tickerQuery(ticker: string | undefined) {
  const symbol = compact(ticker).toUpperCase();
  const name = getPrimarySymbolName(symbol);

  return name ? `${symbol} OR "${name}"` : symbol;
}

export function buildNewsApiCandidates(
  request: ServerNewsRequest,
): NewsApiCandidate[] {
  if (request.kind === "regional" && request.country) {
    return [
      {
        endpoint: "top-headlines",
        params: {
          category: "business",
          country: request.country,
        },
      },
      {
        endpoint: "everything",
        params: {
          language: "en",
          q: buildStrictSearchText(request),
          sortBy: "publishedAt",
        },
      },
    ];
  }

  return [
    {
      endpoint: "everything",
      params: {
        language: "en",
        q:
          request.kind === "ticker"
            ? tickerQuery(request.ticker)
            : buildStrictSearchText(request),
        sortBy: "publishedAt",
      },
    },
  ];
}

function mapNewsApiArticles(articles: readonly any[] = []): Article[] {
  const mapped = articles
    .map((article) => {
      const title = compact(article?.title);
      const url = compact(article?.url);

      if (!title || !url || title === "[Removed]") return null;
      const description = compact(article?.description);
      const source = compact(article?.source?.name) || "NewsAPI source";

      return {
        id: url,
        title,
        summary: description,
        url,
        image: compact(article?.urlToImage) || null,
        publishedAt: compact(article?.publishedAt) || new Date().toISOString(),
        source,
        provider: "newsapi",
        providerLabel: "NewsAPI",
        relatedSymbols: inferRelatedSymbolsFromText(
          `${title} ${description} ${source}`,
        ),
        sentiment: "neutral",
        confidence: null,
      } satisfies Article;
    })
    .filter((article): article is Exclude<typeof article, null> =>
      Boolean(article),
    );

  return dedupeArticles(mapped);
}

export const newsApiProvider: NewsProvider = {
  id: "newsapi",
  label: "NewsAPI",
  isConfigured: (env) => Boolean(getNewsApiKey(env)),
  async fetchArticles(request, context: NewsProviderFetchContext) {
    const apiKey = getNewsApiKey(context.env);
    if (!apiKey) return [];

    const targetCount = Number(request.pageSize) || 10;
    const articles: Article[] = [];
    const seenUrls = new Set<string>();

    for (const candidate of buildNewsApiCandidates(request)) {
      const url = new URL(`https://newsapi.org/v2/${candidate.endpoint}`);

      Object.entries(candidate.params).forEach(([key, value]) => {
        const cleaned = compact(value);
        if (cleaned) url.searchParams.set(key, cleaned);
      });
      url.searchParams.set("pageSize", request.pageSize);

      const response = await context.fetcher(url.toString(), {
        headers: { "X-Api-Key": apiKey },
      });

      if (!response.ok) {
        throw new Error(`NewsAPI ${response.status}`);
      }

      const data = await response.json();
      mapNewsApiArticles(data.articles || []).forEach((article) => {
        if (articles.length >= targetCount || seenUrls.has(article.url)) return;

        seenUrls.add(article.url);
        articles.push(article);
      });

      if (articles.length >= targetCount) return articles;
    }

    return articles;
  },
};
