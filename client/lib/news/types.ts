import type {
  Article,
  MarketNewsRequestKind,
  NewsResponseMeta,
} from "./contracts";

export type NewsProviderId = string;

export type ServerNewsRequestKind = MarketNewsRequestKind;

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

export type ServerNewsResponseMeta = Omit<
  NewsResponseMeta,
  "attemptedProviders" | "hasMore" | "nextCursor" | "provider"
> & {
  attemptedProviders: NewsProviderId[];
  hasMore?: boolean;
  nextCursor?: string | null;
  provider: NewsProviderId | "none";
};

export interface ServerNewsResponse {
  articles: Article[];
  meta: ServerNewsResponseMeta;
}
