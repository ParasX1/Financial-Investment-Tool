export type Article = {
  id: string;
  title: string;
  summary: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: string;
  provider?: string;
  providerLabel?: string;
  relatedSymbols?: string[];
};

export type MarketNewsRequestKind =
  | "general"
  | "regional"
  | "industry"
  | "commodity"
  | "search"
  | "ticker";

export type NewsResponseMeta = {
  attemptedProviders: string[];
  hasMore: boolean;
  nextCursor: string | null;
  provider: string;
  providerLabel: string;
  query: string;
  strictCategory: boolean;
  warnings: string[];
};

export type MarketNewsFetchParams = {
  kind: MarketNewsRequestKind;
  context: string;
  commodity?: string;
  country?: string;
  industry?: string;
  marketScopeId?: string;
  query?: string;
  ticker?: string;
  topicId?: string;
  userSearch?: boolean;
};

export type MarketNewsFetchResult = {
  articles: Article[];
  meta: NewsResponseMeta;
};
