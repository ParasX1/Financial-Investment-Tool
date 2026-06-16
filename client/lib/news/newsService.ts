import type { Article } from "@/services/news";
import { normaliseNewsPageSize, describeNewsRequest } from "./providerUtils";
import { getDemoMarketNewsArticles } from "./providers/demoMarketNewsProvider";
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
  marketaux: marketAuxProvider,
  newsapi: newsApiProvider,
  "yahoo-finance-rss": yahooFinanceRssProvider,
};

const DEFAULT_PROVIDER_IDS: readonly Exclude<NewsProviderId, "demo">[] = [
  "marketaux",
  "newsapi",
  "yahoo-finance-rss",
];

const PROVIDER_ALIASES: Record<string, Exclude<NewsProviderId, "demo">> = {
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

export function resolveNewsProviders(
  env: Record<string, string | undefined> = process.env,
): NewsProvider[] {
  const requested = (env.NEWS_PROVIDER_ORDER ?? "")
    .split(",")
    .map(normaliseProviderId)
    .filter((id): id is Exclude<NewsProviderId, "demo"> => Boolean(id));
  const orderedIds = requested.length ? requested : DEFAULT_PROVIDER_IDS;
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
  const normalizedRequest = { ...request, pageSize };
  const providerList = providers ?? resolveNewsProviders(env);
  const configuredProviders = providerList.filter((provider) =>
    provider.isConfigured(env),
  );
  const attemptedProviders: NewsProviderId[] = [];
  const warnings: string[] = [];
  let emptyProvider: NewsProvider | null = null;
  let failedProviders = 0;
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
        fetcher,
      });
      const articles = filterRelevantNewsArticles(
        providerArticles,
        normalizedRequest,
      );

      if (articles.length) {
        return {
          articles,
          meta: {
            attemptedProviders,
            provider: provider.id,
            providerLabel: provider.label,
            query: describeNewsRequest(normalizedRequest),
            strictCategory: true,
            warnings,
          },
        };
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
