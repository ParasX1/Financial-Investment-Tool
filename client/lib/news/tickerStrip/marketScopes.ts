import type {
  MarketNewsMarketScope,
  MarketNewsMarketScopeId,
  MarketNewsTicker,
} from "./types";

function quotePlaceholder(symbol: string, label: string): MarketNewsTicker {
  return {
    symbol,
    label,
    value: "Quote unavailable",
    change: "No live data",
    tone: "neutral",
    sparkline: [],
    sparklineSource: "fallback",
  };
}

const MARKET_NEWS_AU_TICKERS: readonly MarketNewsTicker[] = [
  quotePlaceholder("^AORD", "ALL ORDS"),
  quotePlaceholder("AUDUSD=X", "AUD/USD"),
  quotePlaceholder("^AXJO", "ASX 200"),
  quotePlaceholder("CL=F", "Oil"),
  quotePlaceholder("GC=F", "Gold"),
  quotePlaceholder("BTC-AUD", "Bitcoin AUD"),
];

const MARKET_NEWS_US_TICKERS: readonly MarketNewsTicker[] = [
  quotePlaceholder("^GSPC", "S&P 500"),
  quotePlaceholder("^IXIC", "Nasdaq"),
  quotePlaceholder("^DJI", "Dow"),
  quotePlaceholder("^RUT", "Russell 2000"),
  quotePlaceholder("^VIX", "VIX"),
];

const MARKET_NEWS_EUROPE_TICKERS: readonly MarketNewsTicker[] = [
  quotePlaceholder("^FTSE", "FTSE 100"),
  quotePlaceholder("^GDAXI", "DAX"),
  quotePlaceholder("^FCHI", "CAC 40"),
  quotePlaceholder("^STOXX50E", "Euro Stoxx 50"),
];

const MARKET_NEWS_ASIA_TICKERS: readonly MarketNewsTicker[] = [
  quotePlaceholder("^N225", "Nikkei 225"),
  quotePlaceholder("^HSI", "Hang Seng"),
  quotePlaceholder("000001.SS", "Shanghai"),
  quotePlaceholder("^STI", "Straits Times"),
];

const MARKET_NEWS_CRYPTO_TICKERS: readonly MarketNewsTicker[] = [
  quotePlaceholder("BTC-AUD", "Bitcoin AUD"),
  quotePlaceholder("ETH-AUD", "Ethereum AUD"),
  quotePlaceholder("SOL-AUD", "Solana AUD"),
  quotePlaceholder("XRP-AUD", "XRP AUD"),
];

const MARKET_NEWS_RATES_TICKERS: readonly MarketNewsTicker[] = [
  quotePlaceholder("^TNX", "US 10Y"),
  quotePlaceholder("^TYX", "US 30Y"),
  quotePlaceholder("^FVX", "US 5Y"),
  quotePlaceholder("IRX", "US 13W"),
];

const MARKET_NEWS_COMMODITY_TICKERS: readonly MarketNewsTicker[] = [
  quotePlaceholder("CL=F", "Oil"),
  quotePlaceholder("GC=F", "Gold"),
  quotePlaceholder("SI=F", "Silver"),
  quotePlaceholder("HG=F", "Copper"),
];

const MARKET_NEWS_CURRENCY_TICKERS: readonly MarketNewsTicker[] = [
  quotePlaceholder("AUDUSD=X", "AUD/USD"),
  quotePlaceholder("EURUSD=X", "EUR/USD"),
  quotePlaceholder("USDJPY=X", "USD/JPY"),
  quotePlaceholder("GBPUSD=X", "GBP/USD"),
];

export const MARKET_NEWS_MARKET_SCOPES: readonly MarketNewsMarketScope[] = [
  {
    id: "australia",
    label: "Australia",
    shortLabel: "AU",
    description:
      "Australian indices, currency, commodities, and crypto watched by local investors.",
    tickers: MARKET_NEWS_AU_TICKERS,
    tickerSelection: {
      coreSymbols: ["^AORD", "^AXJO", "AUDUSD=X"],
      dynamicSymbols: [
        "BHP.AX",
        "CBA.AX",
        "CSL.AX",
        "NAB.AX",
        "WBC.AX",
        "ANZ.AX",
        "WES.AX",
        "WOW.AX",
        "MQG.AX",
        "RIO.AX",
      ],
      macroSymbols: ["CL=F", "GC=F", "BTC-AUD"],
      maxTickers: 8,
      trendingRegion: "AU",
    },
  },
  {
    id: "us-markets",
    label: "US Markets",
    shortLabel: "US",
    description: "Major US equity benchmarks and volatility signals.",
    tickers: MARKET_NEWS_US_TICKERS,
    tickerSelection: {
      coreSymbols: ["^GSPC", "^DJI", "^IXIC", "^RUT"],
      dynamicSymbols: [
        "NVDA",
        "AAPL",
        "MSFT",
        "AMZN",
        "META",
        "TSLA",
        "GOOGL",
        "AMD",
        "NFLX",
      ],
      macroSymbols: ["^VIX", "GC=F", "BTC-USD", "CL=F"],
      maxTickers: 9,
      trendingRegion: "US",
    },
  },
  {
    id: "europe-markets",
    label: "Europe Markets",
    shortLabel: "EU",
    description:
      "European index snapshots across London, Frankfurt, Paris, and the euro area.",
    tickers: MARKET_NEWS_EUROPE_TICKERS,
    tickerSelection: {
      coreSymbols: ["^FTSE", "^FCHI", "^GDAXI", "^STOXX50E"],
      dynamicSymbols: [
        "ASML.AS",
        "SHEL.L",
        "AZN.L",
        "HSBA.L",
        "SAP.DE",
        "MC.PA",
      ],
      macroSymbols: ["EURUSD=X", "GBPUSD=X", "GC=F"],
      maxTickers: 8,
      trendingRegion: "GB",
    },
  },
  {
    id: "asia-markets",
    label: "Asia Markets",
    shortLabel: "AS",
    description:
      "Asian market benchmarks that shape the Australian trading day.",
    tickers: MARKET_NEWS_ASIA_TICKERS,
    tickerSelection: {
      coreSymbols: ["000001.SS", "^N225", "^HSI", "^KS11"],
      dynamicSymbols: ["9988.HK", "0700.HK", "7203.T", "6758.T", "005930.KS"],
      macroSymbols: ["USDJPY=X", "AUDJPY=X", "GC=F"],
      maxTickers: 8,
      trendingRegion: "SG",
    },
  },
  {
    id: "cryptocurrencies",
    label: "Cryptocurrencies",
    shortLabel: "CR",
    description:
      "Digital asset snapshots shown in Australian dollar pairs where available.",
    tickers: MARKET_NEWS_CRYPTO_TICKERS,
    tickerSelection: {
      coreSymbols: ["BTC-AUD", "ETH-AUD"],
      dynamicSymbols: ["SOL-AUD", "XRP-AUD", "ADA-AUD", "DOGE-AUD"],
      macroSymbols: [],
      maxTickers: 6,
      trendingRegion: "AU",
    },
  },
  {
    id: "rates",
    label: "Rates",
    shortLabel: "RT",
    description:
      "Yield and short-rate proxies for macro and equity valuation context.",
    tickers: MARKET_NEWS_RATES_TICKERS,
    tickerSelection: {
      coreSymbols: ["^TNX", "^TYX", "^FVX", "IRX"],
      dynamicSymbols: [],
      macroSymbols: ["AUDUSD=X", "GC=F"],
      maxTickers: 6,
      trendingRegion: "US",
    },
  },
  {
    id: "commodities",
    label: "Commodities",
    shortLabel: "CM",
    description:
      "Energy and metals futures that feed inflation, earnings, and currency moves.",
    tickers: MARKET_NEWS_COMMODITY_TICKERS,
    tickerSelection: {
      coreSymbols: ["CL=F", "GC=F", "SI=F", "HG=F"],
      dynamicSymbols: ["NG=F", "BZ=F", "ZC=F", "ZS=F"],
      macroSymbols: ["AUDUSD=X", "BTC-USD"],
      maxTickers: 7,
      trendingRegion: "US",
    },
  },
  {
    id: "currencies",
    label: "Currencies",
    shortLabel: "FX",
    description: "Major foreign exchange pairs for cross-market context.",
    tickers: MARKET_NEWS_CURRENCY_TICKERS,
    tickerSelection: {
      coreSymbols: ["AUDUSD=X", "EURUSD=X", "USDJPY=X", "GBPUSD=X"],
      dynamicSymbols: ["AUDJPY=X", "AUDNZD=X", "USDCAD=X"],
      macroSymbols: ["GC=F"],
      maxTickers: 7,
      trendingRegion: "AU",
    },
  },
];

export const defaultMarketNewsMarketScopeId: MarketNewsMarketScopeId =
  MARKET_NEWS_MARKET_SCOPES[0]!.id;

export function resolveMarketNewsMarketScope(
  scopeId: string | null | undefined,
  scopes: readonly MarketNewsMarketScope[] = MARKET_NEWS_MARKET_SCOPES,
): MarketNewsMarketScope {
  return (
    scopes.find((scope) => scope.id === scopeId) ??
    scopes.find((scope) => scope.id === defaultMarketNewsMarketScopeId) ??
    scopes[0]!
  );
}
