import type { Article } from "@/services/news";
import {
  dedupeArticles,
  normaliseNewsPageSize,
  describeNewsRequest,
} from "./providerUtils";
import { getDemoMarketNewsArticles } from "./providers/demoMarketNewsProvider";
import { gdeltProvider } from "./providers/gdeltProvider";
import { googleNewsRssProvider } from "./providers/googleNewsRssProvider";
import { marketAuxProvider } from "./providers/marketAuxProvider";
import { newsApiProvider } from "./providers/newsApiProvider";
import { yahooFinanceRssProvider } from "./providers/yahooFinanceRssProvider";
import { filterRelevantNewsArticles } from "./relevance";
import type {
  NewsProvider,
  NewsProviderId,
  ServerNewsRequest,
  ServerNewsResponse,
} from "./types";

const PROVIDER_REGISTRY: Record<
  Exclude<NewsProviderId, "demo">,
  NewsProvider
> = {
  gdelt: gdeltProvider,
  "google-news-rss": googleNewsRssProvider,
  marketaux: marketAuxProvider,
  newsapi: newsApiProvider,
  "yahoo-finance-rss": yahooFinanceRssProvider,
};

const DEFAULT_PROVIDER_IDS: readonly Exclude<NewsProviderId, "demo">[] = [
  "marketaux",
  "gdelt",
  "newsapi",
  "google-news-rss",
  "yahoo-finance-rss",
];

const DEVELOPMENT_PROVIDER_IDS: readonly Exclude<NewsProviderId, "demo">[] = [
  "google-news-rss",
  "yahoo-finance-rss",
  "gdelt",
  "marketaux",
  "newsapi",
];
const DEVELOPMENT_MIN_STRICT_ARTICLES = 13;
const DEVELOPMENT_PROVIDER_TIMEOUT_MS = 5000;

const PROVIDER_ALIASES: Record<string, Exclude<NewsProviderId, "demo">> = {
  gdelt: "gdelt",
  google: "google-news-rss",
  "google-news": "google-news-rss",
  "google-news-rss": "google-news-rss",
  "google-rss": "google-news-rss",
  marketaux: "marketaux",
  "market-aux": "marketaux",
  newsapi: "newsapi",
  "news-api": "newsapi",
  yahoo: "yahoo-finance-rss",
  "yahoo-finance": "yahoo-finance-rss",
  "yahoo-finance-rss": "yahoo-finance-rss",
  "yahoo-rss": "yahoo-finance-rss",
};

function normaliseProviderId(value: string) {
  return PROVIDER_ALIASES[value.trim().toLowerCase()];
}

function isProductionEnvironment(env: Record<string, string | undefined>) {
  return (env.NODE_ENV ?? "").trim().toLowerCase() === "production";
}

export function resolveNewsProviders(
  env: Record<string, string | undefined> = process.env,
): NewsProvider[] {
  const requested = (env.NEWS_PROVIDER_ORDER ?? "")
    .split(",")
    .map(normaliseProviderId)
    .filter((id): id is Exclude<NewsProviderId, "demo"> => Boolean(id));
  const orderedIds = requested.length
    ? requested
    : isProductionEnvironment(env)
      ? DEFAULT_PROVIDER_IDS
      : DEVELOPMENT_PROVIDER_IDS;
  const seen = new Set<NewsProviderId>();

  return orderedIds
    .filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((id) => PROVIDER_REGISTRY[id]);
}

function providerWarning(provider: NewsProvider, cause: unknown) {
  const message = cause instanceof Error ? cause.message : "Unavailable";
  return `${provider.label}: ${message}`;
}

function strictEmptyWarning(
  provider: NewsProvider,
  request: ServerNewsRequest,
) {
  return `${provider.label}: no stories matched the strict ${
    request.topicId ?? request.kind
  } view.`;
}

function providerBlendLabel(providers: readonly NewsProvider[]) {
  const labels = providers
    .map((provider) => provider.label)
    .filter((label, index, list) => list.indexOf(label) === index);

  if (labels.length <= 1) return labels[0] ?? "Market news service";
  if (labels.length === 2) return `${labels[0]} + ${labels[1]}`;

  return `${labels[0]} + ${labels[1]} + ${labels.length - 2} more`;
}

function readPositiveInteger(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return Math.floor(parsed);
}

function minimumStrictArticles(
  env: Record<string, string | undefined>,
  pageSize: number,
) {
  const configured = readPositiveInteger(env.NEWS_MIN_STRICT_ARTICLES);
  if (configured) return Math.min(pageSize, configured);

  return isProductionEnvironment(env)
    ? pageSize
    : Math.min(pageSize, DEVELOPMENT_MIN_STRICT_ARTICLES);
}

function providerTimeoutMs(env: Record<string, string | undefined>) {
  const configured = readPositiveInteger(env.NEWS_PROVIDER_TIMEOUT_MS);
  if (configured) return configured;

  return isProductionEnvironment(env) ? 8000 : DEVELOPMENT_PROVIDER_TIMEOUT_MS;
}

function withTimeout(
  fetcher: typeof fetch,
  env: Record<string, string | undefined>,
): typeof fetch {
  const timeoutMs = providerTimeoutMs(env);

  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetcher(input, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }) as typeof fetch;
}

export async function fetchMarketNewsWithProviders(
  request: ServerNewsRequest,
  {
    env = process.env,
    fetcher = fetch,
    providers,
  }: {
    env?: Record<string, string | undefined>;
    fetcher?: typeof fetch;
    providers?: readonly NewsProvider[];
  } = {},
): Promise<ServerNewsResponse> {
  const pageSize = normaliseNewsPageSize(request.pageSize);
  const pageSizeNumber = Number(pageSize);
  const minimumArticleCount = minimumStrictArticles(env, pageSizeNumber);
  const normalizedRequest = { ...request, pageSize };
  const providerList = providers ?? resolveNewsProviders(env);
  const timedFetcher = withTimeout(fetcher, env);
  const configuredProviders = providerList.filter((provider) =>
    provider.isConfigured(env),
  );
  const attemptedProviders: NewsProviderId[] = [];
  const warnings: string[] = [];
  let emptyProvider: NewsProvider | null = null;
  let failedProviders = 0;
  let strictArticles: Article[] = [];
  const strictProviders: NewsProvider[] = [];
  let broadFallback: {
    articles: Article[];
    provider: NewsProvider;
    warning: string;
  } | null = null;

  if (!configuredProviders.length) {
    const demoArticles = getDemoMarketNewsArticles(normalizedRequest);

    return {
      articles: demoArticles,
      meta: {
        attemptedProviders,
        provider: "demo",
        providerLabel: "Demo",
        query: describeNewsRequest(normalizedRequest),
        strictCategory: true,
        warnings: [
          "Demo stories are shown because no live market news provider is configured.",
        ],
      },
    };
  }

  for (const provider of configuredProviders) {
    attemptedProviders.push(provider.id);

    try {
      const providerArticles = await provider.fetchArticles(normalizedRequest, {
        env,
        fetcher: timedFetcher,
      });
      const articles = filterRelevantNewsArticles(
        providerArticles,
        normalizedRequest,
      );

      if (articles.length) {
        strictProviders.push(provider);
        strictArticles = dedupeArticles([...strictArticles, ...articles]).slice(
          0,
          pageSizeNumber,
        );

        if (strictArticles.length >= minimumArticleCount) {
          return {
            articles: strictArticles,
            meta: {
              attemptedProviders,
              provider: strictProviders[0]!.id,
              providerLabel: providerBlendLabel(strictProviders),
              query: describeNewsRequest(normalizedRequest),
              strictCategory: true,
              warnings,
            },
          };
        }

        continue;
      }

      if (
        providerArticles.length &&
        provider.allowBroadFallback?.(normalizedRequest)
      ) {
        const warning = `${provider.label}: showing broad finance headlines because this free feed does not expose exact FIT categories.`;
        broadFallback ??= {
          articles: providerArticles,
          provider,
          warning,
        };
        warnings.push(warning);
        continue;
      }

      emptyProvider = provider;
      warnings.push(strictEmptyWarning(provider, normalizedRequest));
    } catch (cause) {
      failedProviders += 1;
      warnings.push(providerWarning(provider, cause));
    }
  }

  if (strictArticles.length) {
    return {
      articles: strictArticles,
      meta: {
        attemptedProviders,
        provider: strictProviders[0]!.id,
        providerLabel: providerBlendLabel(strictProviders),
        query: describeNewsRequest(normalizedRequest),
        strictCategory: true,
        warnings,
      },
    };
  }

  if (broadFallback) {
    return {
      articles: broadFallback.articles,
      meta: {
        attemptedProviders,
        provider: broadFallback.provider.id,
        providerLabel: broadFallback.provider.label,
        query: describeNewsRequest(normalizedRequest),
        strictCategory: false,
        warnings: [
          broadFallback.warning,
          ...warnings.filter((warning) => warning !== broadFallback.warning),
        ],
      },
    };
  }

  if (failedProviders === configuredProviders.length) {
    throw new Error(`Market news providers failed: ${warnings.join("; ")}`);
  }

  return {
    articles: [],
    meta: {
      attemptedProviders,
      provider: emptyProvider?.id ?? attemptedProviders[0] ?? "none",
      providerLabel: emptyProvider?.label ?? "No matching provider result",
      query: describeNewsRequest(normalizedRequest),
      strictCategory: true,
      warnings,
    },
  };
}
