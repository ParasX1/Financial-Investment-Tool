import type { Article } from "@/services/news";
import {
  buildStrictSearchText,
  compact,
  dedupeArticles,
} from "../providerUtils";
import type {
  NewsProvider,
  NewsProviderFetchContext,
  ServerNewsRequest,
} from "../types";

const MARKETAUX_ENDPOINT = "https://api.marketaux.com/v1/news/all";
const RECENT_WINDOW_DAYS = 45;

type MarketAuxEntity = {
  industry?: string | null;
  match_score?: number | null;
  name?: string | null;
  sentiment_score?: number | null;
  symbol?: string | null;
};

type MarketAuxArticle = {
  data?: unknown;
  description?: string | null;
  entities?: MarketAuxEntity[] | null;
  image_url?: string | null;
  published_at?: string | null;
  relevance_score?: number | null;
  snippet?: string | null;
  source?: string | null;
  title?: string | null;
  url?: string | null;
  uuid?: string | null;
};

function getMarketAuxApiKey(env: Record<string, string | undefined>) {
  return compact(env.MARKETAUX_API_KEY);
}

function recentPublishedAfter() {
  const recent = new Date(
    Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
  return recent.toISOString().slice(0, 10);
}

function industryLabel(industry: string | undefined) {
  const cleaned = compact(industry).toLowerCase();

  if (cleaned === "technology") return "Technology";

  return compact(industry);
}

function entitySymbols(entities: readonly MarketAuxEntity[] = []) {
  return entities
    .map((entity) => compact(entity.symbol ?? undefined).toUpperCase())
    .filter((symbol, index, list) => symbol && list.indexOf(symbol) === index);
}

function averageNumber(values: ReadonlyArray<number | null | undefined>) {
  const numeric = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );

  if (!numeric.length) return null;

  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
}

function toneFromSentiment(value: number | null) {
  if (value === null) return "neutral" as const;
  if (value > 0.15) return "positive" as const;
  if (value < -0.15) return "negative" as const;
  return "neutral" as const;
}

export function buildMarketAuxUrl({
  apiKey,
  request,
}: {
  apiKey: string;
  request: ServerNewsRequest;
}): string {
  const url = new URL(MARKETAUX_ENDPOINT);

  url.searchParams.set("api_token", apiKey);
  url.searchParams.set("language", "en");
  url.searchParams.set("limit", request.pageSize);
  url.searchParams.set("group_similar", "true");
  url.searchParams.set("filter_entities", "true");
  url.searchParams.set("sort", "published_at");
  url.searchParams.set("published_after", recentPublishedAfter());

  if (request.kind === "ticker" && request.ticker) {
    url.searchParams.set("symbols", request.ticker);
    url.searchParams.set("must_have_entities", "true");
    return url.toString();
  }

  if (request.kind === "regional" && request.country) {
    url.searchParams.set("countries", request.country);
    url.searchParams.set("entity_types", "index,equity");
    url.searchParams.set("must_have_entities", "true");
  }

  if (request.kind === "industry") {
    const label = industryLabel(request.industry);
    if (label) {
      url.searchParams.set("industries", label);
      url.searchParams.set("must_have_entities", "true");
    }
  }

  const searchText = buildStrictSearchText(request);
  if (searchText) {
    url.searchParams.set("search", searchText);
  }

  return url.toString();
}

export function mapMarketAuxArticles(
  articles: readonly MarketAuxArticle[] = [],
): Article[] {
  const mapped = articles
    .map((article) => {
      const title = compact(article.title ?? undefined);
      const url = compact(article.url ?? undefined);

      if (!title || !url) return null;

      const entities = article.entities ?? [];
      const sentiment = averageNumber(
        entities.map((entity) => entity.sentiment_score),
      );
      const confidence =
        article.relevance_score ??
        averageNumber(entities.map((entity) => entity.match_score));

      return {
        id: compact(article.uuid ?? undefined) || url,
        title,
        summary:
          compact(article.description ?? undefined) ||
          compact(article.snippet ?? undefined),
        url,
        image: compact(article.image_url ?? undefined) || null,
        publishedAt:
          compact(article.published_at ?? undefined) ||
          new Date().toISOString(),
        source: compact(article.source ?? undefined) || "MarketAux source",
        provider: "marketaux",
        providerLabel: "MarketAux",
        relatedSymbols: entitySymbols(entities),
        sentiment: toneFromSentiment(sentiment),
        confidence,
      } satisfies Article;
    })
    .filter((article): article is Exclude<typeof article, null> =>
      Boolean(article),
    );

  return dedupeArticles(mapped);
}

export const marketAuxProvider: NewsProvider = {
  id: "marketaux",
  label: "MarketAux",
  isConfigured: (env) => Boolean(getMarketAuxApiKey(env)),
  async fetchArticles(request, context: NewsProviderFetchContext) {
    const apiKey = getMarketAuxApiKey(context.env);
    if (!apiKey) return [];

    const response = await context.fetcher(
      buildMarketAuxUrl({
        apiKey,
        request,
      }),
    );

    if (!response.ok) {
      throw new Error(`MarketAux ${response.status}`);
    }

    const data = await response.json();
    return mapMarketAuxArticles(data.data || []);
  },
};
