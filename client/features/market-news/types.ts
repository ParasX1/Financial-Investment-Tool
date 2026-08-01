import type { MarketNewsSource, MarketNewsTopicId } from "@/lib/news/catalog";
import type { MarketNewsMarketScopeId } from "@/lib/news/tickerStrip";

export type {
  MarketNewsGroupId,
  MarketNewsNavGroup,
  MarketNewsSource,
  MarketNewsTopic,
  MarketNewsTopicId,
} from "@/lib/news/catalog";

export type {
  MarketNewsMarketScope,
  MarketNewsMarketScopeId,
  MarketNewsTicker,
} from "@/lib/news/tickerStrip";

export type MarketNewsLensId = "all" | "watchlist" | "ticker-linked";

export type MarketNewsSortId = "latest" | "watchlist-first";

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
