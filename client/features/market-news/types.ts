export type MarketNewsGroupId =
  | "cost-of-living"
  | "markets"
  | "money"
  | "work"
  | "technology";

export type MarketNewsTopicId =
  | "cost-of-living"
  | "australian-markets"
  | "international-markets"
  | "commodities"
  | "money-news"
  | "personal-finance"
  | "property-news"
  | "work"
  | "technology";

export type MarketNewsSource =
  | {
      kind: "general";
      context: string;
    }
  | {
      kind: "regional";
      country: string;
      context: string;
    }
  | {
      kind: "industry";
      industry: string;
      context: string;
    }
  | {
      kind: "commodity";
      commodity: string;
      context: string;
    }
  | {
      kind: "search";
      query: string;
      context: string;
    };

export interface MarketNewsTopic {
  id: MarketNewsTopicId;
  label: string;
  shortLabel?: string;
  eyebrow: string;
  description: string;
  source: MarketNewsSource;
}

export interface MarketNewsNavGroup {
  id: MarketNewsGroupId;
  label: string;
  description: string;
  topics: readonly MarketNewsTopic[];
}

export interface MarketNewsTicker {
  symbol: string;
  label: string;
  value: string;
  change: string;
  tone: "positive" | "negative" | "neutral";
  sparkline: readonly number[];
}

export type MarketNewsMarketScopeId =
  | "australia"
  | "us-markets"
  | "europe-markets"
  | "asia-markets"
  | "cryptocurrencies"
  | "rates"
  | "commodities"
  | "currencies";

export interface MarketNewsMarketScope {
  id: MarketNewsMarketScopeId;
  label: string;
  shortLabel: string;
  description: string;
  tickers: readonly MarketNewsTicker[];
}

export type MarketNewsLensId =
  | "all"
  | "watchlist"
  | "ticker-linked"
  | "high-relevance"
  | "positive"
  | "negative";

export type MarketNewsSortId = "latest" | "relevance" | "watchlist-first";

export interface MarketNewsLensOption {
  id: MarketNewsLensId;
  label: string;
  description: string;
  count: number;
  selectable: boolean;
}

export interface MarketNewsSortOption {
  id: MarketNewsSortId;
  label: string;
  description: string;
}

export interface MarketNewsRequest {
  kind: MarketNewsSource["kind"] | "ticker";
  title: string;
  context: string;
  query?: string;
  ticker?: string;
  topicId?: MarketNewsTopicId;
  userSearch?: boolean;
  country?: string;
  industry?: string;
  commodity?: string;
  marketScopeId?: MarketNewsMarketScopeId;
}
