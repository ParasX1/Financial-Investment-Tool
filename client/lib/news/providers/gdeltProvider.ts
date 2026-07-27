import type { Article } from "@/services/news";
import { buildGdeltSearchQuery } from "../queryPacks";
import {
  compact,
  dedupeArticles,
  newsCandidateLimit,
  safeExternalUrl,
} from "../providerUtils";
import { inferRelatedSymbolsFromText } from "../symbolAliases";
import type {
  NewsProvider,
  NewsProviderFetchContext,
  ServerNewsRequest,
} from "../types";

const GDELT_ENDPOINT = "https://api.gdeltproject.org/api/v2/doc/doc";
const DEFAULT_GDELT_TIMESPAN = "7d";
const MAX_GDELT_RECORDS = 75;

type GdeltArticle = {
  domain?: string | null;
  language?: string | null;
  seendate?: string | null;
  socialimage?: string | null;
  sourcecountry?: string | null;
  title?: string | null;
  url?: string | null;
  url_mobile?: string | null;
};

type GdeltResponse = {
  articles?: GdeltArticle[];
};

function envFlag(value: string | undefined) {
  const cleaned = compact(value).toLowerCase();

  if (["1", "true", "yes", "on"].includes(cleaned)) return true;
  if (["0", "false", "no", "off"].includes(cleaned)) return false;

  return null;
}

export function isGdeltNewsEnabled(env: Record<string, string | undefined>) {
  const configured = envFlag(env.GDELT_NEWS_ENABLED);
  if (configured !== null) return configured;

  return false;
}

function normaliseTimespan(value: string | undefined) {
  const cleaned = compact(value);
  if (/^\d+(min|h|d|week|month)$/i.test(cleaned)) return cleaned;

  return DEFAULT_GDELT_TIMESPAN;
}

function normaliseMaxRecords(pageSize: string) {
  return Math.min(MAX_GDELT_RECORDS, newsCandidateLimit(pageSize));
}

export function buildGdeltUrl({
  env,
  request,
}: {
  env: Record<string, string | undefined>;
  request: ServerNewsRequest;
}): string {
  const query = buildGdeltSearchQuery(request);
  const url = new URL(GDELT_ENDPOINT);

  url.searchParams.set("query", query || compact(request.context));
  url.searchParams.set("mode", "artlist");
  url.searchParams.set("format", "json");
  url.searchParams.set("sort", "datedesc");
  url.searchParams.set("timespan", normaliseTimespan(env.GDELT_NEWS_TIMESPAN));
  url.searchParams.set(
    "maxrecords",
    String(normaliseMaxRecords(request.pageSize)),
  );

  return url.toString();
}

export function parseGdeltSeenDate(value: string | null | undefined) {
  const cleaned = compact(value ?? undefined);
  const match = cleaned.match(
    /^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})Z?$/i,
  );

  if (!match) return cleaned;

  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
}

export function mapGdeltArticles(
  articles: readonly GdeltArticle[] = [],
): Article[] {
  const mapped = articles
    .map((article) => {
      const title = compact(article.title ?? undefined);
      const url = safeExternalUrl(article.url ?? undefined);

      if (!title || !url) return null;

      const domain = compact(article.domain ?? undefined);
      const sourceCountry = compact(article.sourcecountry ?? undefined);
      const source = domain || sourceCountry || "GDELT source";
      const relatedSymbols = inferRelatedSymbolsFromText(
        `${title} ${source} ${sourceCountry}`,
      );

      return {
        confidence: relatedSymbols.length ? 0.58 : null,
        id: url,
        image: safeExternalUrl(article.socialimage ?? undefined) || null,
        provider: "gdelt",
        providerLabel: "GDELT",
        publishedAt: parseGdeltSeenDate(article.seendate),
        relatedSymbols,
        sentiment: "neutral",
        source,
        summary: sourceCountry ? `Source country: ${sourceCountry}` : "",
        title,
        url,
      } satisfies Article;
    })
    .filter((article): article is Exclude<typeof article, null> =>
      Boolean(article),
    );

  return dedupeArticles(mapped);
}

export const gdeltProvider: NewsProvider = {
  id: "gdelt",
  label: "GDELT",
  isConfigured: isGdeltNewsEnabled,
  async fetchArticles(request, context: NewsProviderFetchContext) {
    const response = await context.fetcher(
      buildGdeltUrl({ env: context.env, request }),
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "FIT-MarketNews/0.1",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`GDELT ${response.status}`);
    }

    const data = (await response.json()) as GdeltResponse;
    return mapGdeltArticles(data.articles || []).slice(
      0,
      normaliseMaxRecords(request.pageSize),
    );
  },
};
