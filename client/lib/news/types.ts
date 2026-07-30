import type { Article } from "@/services/news";

export type NewsProviderId = string;

export type ServerNewsRequestKind =
  | "general"
  | "regional"
  | "industry"
  | "commodity"
  | "search"
  | "ticker";

export interface ServerNewsRequest {
  kind: ServerNewsRequestKind;
  context: string;
  pageSize: string;
  commodity?: string;
  country?: string;
  industry?: string;
  marketScopeId?: string;
  query?: string;
  ticker?: string;
  topicId?: string;
  userSearch?: boolean;
  continuationCursor?: string;
  publishedBefore?: string;
  publishedBeforeKey?: string;
}

export interface NewsProviderFetchContext {
  env: Record<string, string | undefined>;
  fetcher: typeof fetch;
}

export interface NewsProvider {
  id: NewsProviderId;
  label: string;
  allowBroadFallback?: (request: ServerNewsRequest) => boolean;
  isConfigured: (env: Record<string, string | undefined>) => boolean;
  supports?: (request: ServerNewsRequest) => boolean;
  fetchArticles: (
    request: ServerNewsRequest,
    context: NewsProviderFetchContext,
  ) => Promise<Article[]>;
}

export interface NewsResponseMeta {
  attemptedProviders: NewsProviderId[];
  hasMore?: boolean;
  nextCursor?: string | null;
  provider: NewsProviderId | "none";
  providerLabel: string;
  query: string;
  strictCategory: boolean;
  warnings: string[];
}

export interface ServerNewsResponse {
  articles: Article[];
  meta: NewsResponseMeta;
}
