import type { Article } from "@/services/news";
import {
  dedupeArticles,
  normaliseNewsPageSize,
  describeNewsRequest,
  newsCandidateLimit,
} from "./providerUtils";
import { getDemoMarketNewsArticles } from "./providers/demoMarketNewsProvider";
import { resolveNewsProviders } from "./providerRegistry";
import { filterRelevantNewsArticles } from "./relevance";
import type {
  NewsProvider,
  NewsProviderId,
  ServerNewsRequest,
  ServerNewsResponse,
} from "./types";

const DEVELOPMENT_PROVIDER_TIMEOUT_MS = 5000;

function isProductionEnvironment(env: Record<string, string | undefined>) {
  return (env.NODE_ENV ?? "").trim().toLowerCase() === "production";
}

export { resolveNewsProviders } from "./providerRegistry";

function providerFailureMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : String(cause);
}

function logProviderFailure(provider: NewsProvider, cause: unknown) {
  console.warn("Market news provider failed", {
    message: providerFailureMessage(cause),
    provider: provider.id,
    providerLabel: provider.label,
  });
}

function providerWarning(provider: NewsProvider) {
  return `${provider.label}: temporarily unavailable.`;
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

function publishedAtMs(article: Article) {
  const time = new Date(article.publishedAt).getTime();

  return Number.isFinite(time) ? time : 0;
}

function stableArticleKey(article: Article) {
  return `${article.id}\u0000${article.url}`;
}

function selectFreshStrictArticles(
  articles: readonly Article[],
  limit: number,
): Article[] {
  return dedupeArticles(articles)
    .sort(
      (left, right) =>
        publishedAtMs(right) - publishedAtMs(left) ||
        stableArticleKey(left).localeCompare(stableArticleKey(right)),
    )
    .slice(0, limit)
}

type ProviderAttemptResult =
  | {
      articles: Article[];
      ok: true;
      provider: NewsProvider;
    }
  | {
      cause: unknown;
      ok: false;
      provider: NewsProvider;
    };

async function attemptProvider(
  provider: NewsProvider,
  request: ServerNewsRequest,
  env: Record<string, string | undefined>,
  fetcher: typeof fetch,
): Promise<ProviderAttemptResult> {
  try {
    return {
      articles: await provider.fetchArticles(request, { env, fetcher }),
      ok: true,
      provider,
    };
  } catch (cause) {
    return { cause, ok: false, provider };
  }
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
  const strictCandidateLimit = newsCandidateLimit(pageSize);
  const minimumArticleCount = pageSizeNumber;
  const normalizedRequest = { ...request, pageSize };
  const providerList = providers ?? resolveNewsProviders(env);
  const timedFetcher = withTimeout(fetcher, env);
  const configuredProviders = providerList.filter((provider) =>
    provider.isConfigured(env),
  );
  const attemptedProviders: NewsProviderId[] = [];
  const emptyWarnings: string[] = [];
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

  const providerBatches = [
    [configuredProviders[0]!],
    configuredProviders.slice(1),
  ].filter((batch) => batch.length);

  for (const providerBatch of providerBatches) {
    attemptedProviders.push(...providerBatch.map((provider) => provider.id));
    const providerResults = await Promise.all(
      providerBatch.map((provider) =>
        attemptProvider(provider, normalizedRequest, env, timedFetcher),
      ),
    );

    for (const providerResult of providerResults) {
      const { provider } = providerResult;

      if (!providerResult.ok) {
        failedProviders += 1;
        logProviderFailure(provider, providerResult.cause);
        warnings.push(providerWarning(provider));
        continue;
      }

      const providerArticles = providerResult.articles;
      const articles = filterRelevantNewsArticles(
        providerArticles,
        normalizedRequest,
      );

      if (articles.length) {
        strictProviders.push(provider);
        strictArticles = selectFreshStrictArticles(
          [...strictArticles, ...articles],
          strictCandidateLimit,
        );

        if (strictArticles.length >= minimumArticleCount) {
          return {
            articles: selectFreshStrictArticles(strictArticles, pageSizeNumber),
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
      emptyWarnings.push(strictEmptyWarning(provider, normalizedRequest));
    }
  }

  if (strictArticles.length) {
    return {
      articles: selectFreshStrictArticles(strictArticles, pageSizeNumber),
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
          "Live market news is temporarily unavailable. Demo stories are shown instead.",
          ...warnings,
        ],
      },
    };
  }

  return {
    articles: [],
    meta: {
      attemptedProviders,
      provider: emptyProvider?.id ?? attemptedProviders[0] ?? "none",
      providerLabel: emptyProvider?.label ?? "No matching provider result",
      query: describeNewsRequest(normalizedRequest),
      strictCategory: true,
      warnings: [...warnings, ...emptyWarnings],
    },
  };
}
