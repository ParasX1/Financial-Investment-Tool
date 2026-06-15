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
  futureRoute?: string;
}

export interface MarketNewsNavGroup {
  id: MarketNewsGroupId;
  label: string;
  description: string;
  topics: readonly MarketNewsTopic[];
  futureRoute?: string;
}

export interface MarketNewsTicker {
  symbol: string;
  label: string;
  value: string;
  change: string;
  tone: "positive" | "negative" | "neutral";
  sparkline: readonly number[];
  futureQuoteRoute?: string;
}

export interface MarketNewsRequest {
  kind: MarketNewsSource["kind"];
  title: string;
  context: string;
  query?: string;
  country?: string;
  industry?: string;
  commodity?: string;
}

