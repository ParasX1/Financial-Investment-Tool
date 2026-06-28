import type { Article } from "@/services/news";
import {
  buildStrictSearchText,
  compact,
  dedupeArticles,
  newsCandidateLimit,
  safeExternalUrl,
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

const DEFAULT_RECENT_WINDOW_DAYS = 7;
const LOW_VOLUME_RECENT_WINDOW_DAYS = 14;

function getNewsApiKey(env: Record<string, string | undefined>) {
  return compact(env.NEWSAPI_KEY);
}

function recentFromDate(request: ServerNewsRequest) {
  const windowDays =
    request.kind === "ticker" || request.kind === "industry"
      ? LOW_VOLUME_RECENT_WINDOW_DAYS
      : DEFAULT_RECENT_WINDOW_DAYS;
  const from = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  return from.toISOString().slice(0, 10);
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
          from: recentFromDate(request),
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
        from: recentFromDate(request),
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
      const url = safeExternalUrl(article?.url);

      if (!title || !url || title === "[Removed]") return null;
      const description = compact(article?.description);
      const source = compact(article?.source?.name) || "NewsAPI source";

      return {
        id: url,
        title,
        summary: description,
        url,
        image: safeExternalUrl(article?.urlToImage) || null,
        publishedAt: compact(article?.publishedAt),
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

    const targetCount = newsCandidateLimit(request.pageSize);
    const articles: Article[] = [];
    const seenUrls = new Set<string>();
    let lastError: Error | null = null;
    let successfulCandidate = false;

    for (const candidate of buildNewsApiCandidates(request)) {
      const url = new URL(`https://newsapi.org/v2/${candidate.endpoint}`);

      Object.entries(candidate.params).forEach(([key, value]) => {
        const cleaned = compact(value);
        if (cleaned) url.searchParams.set(key, cleaned);
      });
      url.searchParams.set("pageSize", String(targetCount));

      const response = await context.fetcher(url.toString(), {
        headers: { "X-Api-Key": apiKey },
      });

      if (!response.ok) {
        lastError = new Error(`NewsAPI ${response.status}`);
        continue;
      }

      const data = await response.json();
      successfulCandidate = true;
      mapNewsApiArticles(data.articles || []).forEach((article) => {
        if (articles.length >= targetCount || seenUrls.has(article.url)) return;

        seenUrls.add(article.url);
        articles.push(article);
      });

      if (articles.length >= targetCount) return articles;
    }

    if (!successfulCandidate && lastError) throw lastError;

    return articles;
  },
};
