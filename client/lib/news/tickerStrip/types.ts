export interface MarketNewsTicker {
  symbol: string;
  label: string;
  value: string;
  change: string;
  previousClose?: number;
  tone: "positive" | "negative" | "neutral";
  sparkline: readonly number[];
  sparklineSource?: "live" | "unavailable" | "fallback";
  marketState?: string;
  signal?: "Core" | "Macro" | "Mover" | "Watchlist";
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
  tickerSelection?: {
    coreSymbols: readonly string[];
    dynamicSymbols: readonly string[];
    macroSymbols: readonly string[];
    maxTickers: number;
    trendingRegion: string;
  };
}

export type MarketNewsTickerSignal = NonNullable<MarketNewsTicker["signal"]>;

export type MarketNewsTickerStripSource = "live" | "mixed" | "fallback";

export interface MarketNewsTickerStripSnapshot {
  scopeId: MarketNewsMarketScopeId;
  providerLabel: string;
  source: MarketNewsTickerStripSource;
  strategy: "core-plus-dynamic-movers";
  refreshMs: number;
  updatedAt: string | null;
  tickers: readonly MarketNewsTicker[];
  warnings: readonly string[];
}

export interface MarketNewsQuoteResponse {
  symbol: string;
  price: number | null;
  prevClose?: number | null;
  change: number | null;
  changePct: number | null;
  currency?: string;
  marketState?: string;
  shortName?: string;
  longName?: string;
}

export interface MarketNewsSparklineResponse {
  symbol: string;
  points?: readonly { t: number; v: number }[];
  previousClose?: number | null;
  regularMarketPrice?: number | null;
}

export interface MarketNewsTickerQuoteState {
  recoveredLiveData: boolean;
  retainedPrevious: boolean;
  ticker: MarketNewsTicker;
}
