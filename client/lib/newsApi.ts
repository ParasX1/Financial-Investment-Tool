import type { Article } from "@/services/news";

export type NewsApiEndpoint = "everything" | "top-headlines";

export interface NewsApiCandidate {
  endpoint: NewsApiEndpoint;
  params: Record<string, string | undefined>;
}

const DEFAULT_NEWS_QUERY = "finance markets business economy";
const MAX_PAGE_SIZE = 100;

function compact(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function unique(values: readonly string[]): string[] {
  return values.filter(
    (value, index, list) => value && list.indexOf(value) === index,
  );
}

function extractRegionHint(value: string): string {
  const lower = value.toLowerCase();

  if (lower.includes("australia") || lower.includes("asx")) return "Australia";
  if (lower.includes("us ") || lower.includes("united states")) return "US";
  if (lower.includes("europe")) return "Europe";
  if (lower.includes("asia")) return "Asia";

  return "";
}

export function normaliseNewsApiPageSize(value: string | undefined): string {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return "10";

  return String(Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(parsed))));
}

export function buildNewsSearchQueries({
  context = "",
  fallback = DEFAULT_NEWS_QUERY,
  query,
}: {
  context?: string;
  fallback?: string;
  query: string;
}): string[] {
  const cleanedQuery = compact(query);
  const cleanedContext = compact(context);
  const regionHint = extractRegionHint(`${cleanedQuery} ${cleanedContext}`);
  const regionalQuery = regionHint ? `${cleanedQuery} ${regionHint}` : "";

  return unique([
    cleanedQuery,
    regionalQuery,
    cleanedContext,
    compact(fallback),
  ]);
}

export function mapNewsApiArticles(articles: readonly any[] = []): Article[] {
  const mapped = articles
    .map((article) => {
      const url = compact(article?.url);
      const title = compact(article?.title);

      if (!url || !title || title === "[Removed]") return null;

      return {
        id: url,
        title,
        summary: compact(article?.description),
        url,
        image: compact(article?.urlToImage) || null,
        publishedAt: compact(article?.publishedAt) || new Date().toISOString(),
        source: compact(article?.source?.name) || "Unknown",
      } satisfies Article;
    })
    .filter((article): article is Article => Boolean(article));

  const seen = new Set<string>();

  return mapped.filter((article) => {
    if (seen.has(article.url)) return false;
    seen.add(article.url);
    return true;
  });
}

export async function fetchNewsApiArticles({
  apiKey,
  candidates,
  pageSize,
}: {
  apiKey: string | undefined;
  candidates: readonly NewsApiCandidate[];
  pageSize: string;
}): Promise<Article[]> {
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_NEWSAPI_KEY is not configured");
  }

  const targetCount = Number(pageSize) || 10;
  const articles: Article[] = [];
  const seenUrls = new Set<string>();

  for (const candidate of candidates) {
    const url = new URL(`https://newsapi.org/v2/${candidate.endpoint}`);

    Object.entries(candidate.params).forEach(([key, value]) => {
      const cleanedValue = compact(value);
      if (cleanedValue) url.searchParams.set(key, cleanedValue);
    });
    url.searchParams.set("pageSize", pageSize);

    const response = await fetch(url.toString(), {
      headers: { "X-Api-Key": apiKey },
    });

    if (!response.ok) {
      throw new Error(`NewsAPI ${response.status}`);
    }

    const data = await response.json();
    const nextArticles = mapNewsApiArticles(data.articles || []);

    nextArticles.forEach((article) => {
      if (articles.length >= targetCount || seenUrls.has(article.url)) return;

      seenUrls.add(article.url);
      articles.push(article);
    });

    if (articles.length >= targetCount) return articles;
  }

  return articles;
}

export function businessHeadlineFallback(
  country?: string,
): readonly NewsApiCandidate[] {
  return [
    {
      endpoint: "top-headlines",
      params: {
        category: "business",
        country,
      },
    },
    {
      endpoint: "everything",
      params: {
        language: "en",
        q: DEFAULT_NEWS_QUERY,
        sortBy: "publishedAt",
      },
    },
  ];
}
