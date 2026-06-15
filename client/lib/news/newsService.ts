import { normaliseNewsPageSize, describeNewsRequest } from "./providerUtils";
import { getDemoMarketNewsArticles } from "./providers/demoMarketNewsProvider";
import { marketAuxProvider } from "./providers/marketAuxProvider";
import { newsApiProvider } from "./providers/newsApiProvider";
import { filterRelevantNewsArticles } from "./relevance";
import type {
  NewsProvider,
  NewsProviderId,
  ServerNewsRequest,
  ServerNewsResponse,
} from "./types";

const DEFAULT_PROVIDERS: readonly NewsProvider[] = [
  marketAuxProvider,
  newsApiProvider,
];

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
    providers = DEFAULT_PROVIDERS,
  }: {
    env?: Record<string, string | undefined>;
    fetcher?: typeof fetch;
    providers?: readonly NewsProvider[];
  } = {},
): Promise<ServerNewsResponse> {
  const pageSize = normaliseNewsPageSize(request.pageSize);
  const normalizedRequest = { ...request, pageSize };
  const configuredProviders = providers.filter((provider) =>
    provider.isConfigured(env),
  );
  const attemptedProviders: NewsProviderId[] = [];
  const warnings: string[] = [];
  let emptyProvider: NewsProvider | null = null;
  let failedProviders = 0;

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
          "Demo stories are shown because MARKETAUX_API_KEY is not configured.",
        ],
      },
    };
  }

  for (const provider of configuredProviders) {
    attemptedProviders.push(provider.id);

    try {
      const articles = filterRelevantNewsArticles(
        await provider.fetchArticles(normalizedRequest, {
          env,
          fetcher,
        }),
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

      emptyProvider = provider;
      warnings.push(strictEmptyWarning(provider, normalizedRequest));
    } catch (cause) {
      failedProviders += 1;
      warnings.push(providerWarning(provider, cause));
    }
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
