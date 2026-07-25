import type {
  MarketNewsMarketScope,
  MarketNewsNavGroup,
  MarketNewsTicker,
} from "../types";

export const MARKET_NEWS_NAV_GROUPS: readonly MarketNewsNavGroup[] = [
  {
    id: "top-stories",
    label: "Top Stories",
    description:
      "The most important Australian and global market stories in one scan.",
    topics: [
      {
        id: "top-stories",
        label: "Top Stories",
        eyebrow: "Market briefing",
        description:
          "A broad but finance-focused briefing across markets, companies, the economy, and household money.",
        source: {
          kind: "general",
          context:
            "Australia markets business economy companies investing finance",
        },
      },
    ],
  },
  {
    id: "cost-of-living",
    label: "Cost of Living",
    description:
      "Household budgets, inflation pressure, wages, and everyday costs.",
    topics: [
      {
        id: "cost-of-living",
        label: "Cost of Living",
        eyebrow: "Household pressure",
        description:
          "Consumer prices, rates, wages, bills, and saving decisions that affect Australian households.",
        source: {
          kind: "search",
          query:
            "Australia cost of living inflation wages bills interest rates",
          context: "Australian household finance cost of living",
        },
      },
    ],
  },
  {
    id: "markets",
    label: "Markets",
    description:
      "Australian shares, global markets, commodities, currencies, and macro signals.",
    topics: [
      {
        id: "australian-markets",
        label: "Australian Markets",
        shortLabel: "Australia",
        eyebrow: "ASX focus",
        description:
          "ASX headlines, Australian business news, market moves, and domestic macro signals.",
        source: {
          kind: "regional",
          country: "au",
          context: "Australia ASX market business economy",
        },
      },
      {
        id: "international-markets",
        label: "Global Markets",
        shortLabel: "Global",
        eyebrow: "Global market watch",
        description:
          "US, European, and Asian market headlines that can influence portfolio decisions.",
        source: {
          kind: "search",
          query: "global markets US Europe Asia stocks bonds currencies",
          context: "international stock markets global economy",
        },
      },
      {
        id: "companies-earnings",
        label: "Companies & Earnings",
        shortLabel: "Companies",
        eyebrow: "Corporate signals",
        description:
          "Results, guidance, dividends, deals, and company news that can change an investment thesis.",
        source: {
          kind: "search",
          query:
            "Australia ASX companies earnings results profit revenue dividends deals",
          context: "company earnings corporate results ASX business",
        },
      },
      {
        id: "commodities",
        label: "Commodities",
        eyebrow: "Macro inputs",
        description:
          "Energy, metals, agriculture, and supply-chain stories that move inflation and earnings expectations.",
        source: {
          kind: "commodity",
          commodity: "commodities",
          context: "commodity markets energy metals agriculture",
        },
      },
    ],
  },
  {
    id: "money",
    label: "Money",
    description:
      "Personal finance, property, banking, superannuation, tax, and saving decisions.",
    topics: [
      {
        id: "personal-finance",
        label: "Personal Finance",
        shortLabel: "Personal",
        eyebrow: "Household decisions",
        description:
          "Budgeting, mortgage costs, retirement planning, insurance, and practical financial choices.",
        source: {
          kind: "search",
          query:
            "personal finance Australia mortgage retirement insurance savings",
          context: "personal finance household money Australia",
        },
      },
      {
        id: "property-news",
        label: "Property & Housing",
        shortLabel: "Property",
        eyebrow: "Housing market",
        description:
          "Housing affordability, rents, mortgage pressure, property prices, and real-estate policy.",
        source: {
          kind: "search",
          query:
            "Australia property news housing prices rent mortgage affordability",
          context: "Australian property housing market",
        },
      },
      {
        id: "super-tax",
        label: "Super & Tax",
        eyebrow: "Long-term money",
        description:
          "Superannuation, retirement, ATO updates, tax policy, and rules that affect long-term wealth.",
        source: {
          kind: "search",
          query:
            "Australia superannuation retirement ATO tax policy capital gains",
          context: "Australian superannuation tax retirement policy",
        },
      },
    ],
  },
  {
    id: "economy-work",
    label: "Economy & Work",
    description:
      "Economic policy, rates, inflation, jobs, wages, and workplace trends.",
    topics: [
      {
        id: "economy-policy",
        label: "Economy & Policy",
        shortLabel: "Economy",
        eyebrow: "Economic direction",
        description:
          "Growth, budgets, regulation, productivity, and policy changes that shape Australian markets.",
        source: {
          kind: "search",
          query:
            "Australian economy GDP budget Treasury policy productivity growth",
          context: "Australian economy government policy budget growth",
        },
      },
      {
        id: "rates-inflation",
        label: "Rates & Inflation",
        shortLabel: "Rates",
        eyebrow: "Macro pulse",
        description:
          "RBA decisions, inflation data, bond yields, and monetary-policy signals for investors and households.",
        source: {
          kind: "search",
          query:
            "Australia RBA interest rates cash rate inflation CPI bond yields",
          context: "Australian rates inflation monetary policy RBA",
        },
      },
      {
        id: "work",
        label: "Work & Wages",
        eyebrow: "Jobs and wages",
        description:
          "Employment, wages, workplace policy, and productivity stories that affect income and markets.",
        source: {
          kind: "search",
          query: "Australia work jobs wages workplace employment economy",
          context: "Australian labour market work wages employment",
        },
      },
    ],
  },
  {
    id: "technology",
    label: "Technology",
    description:
      "Tech companies, AI, platforms, cybersecurity, and innovation-led market moves.",
    topics: [
      {
        id: "technology",
        label: "Tech & AI",
        shortLabel: "Tech",
        eyebrow: "Innovation watch",
        description:
          "Technology sector headlines, AI, platform companies, and market-moving innovation stories.",
        source: {
          kind: "industry",
          industry: "technology",
          context: "technology sector AI software semiconductor stocks",
        },
      },
    ],
  },
];

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
