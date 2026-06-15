import type {
  MarketNewsMarketScope,
  MarketNewsNavGroup,
  MarketNewsTicker,
} from "../types";

export const MARKET_NEWS_NAV_GROUPS: readonly MarketNewsNavGroup[] = [
  {
    id: "cost-of-living",
    label: "Cost of Living",
    description:
      "Household budgets, inflation pressure, wages, and everyday costs.",
    futureRoute: "/MarketNews?topic=cost-of-living",
    topics: [
      {
        id: "cost-of-living",
        label: "Cost of Living",
        eyebrow: "Household pressure",
        description:
          "Consumer prices, rates, wages, bills, and saving decisions that affect Australian households.",
        futureRoute: "/MarketNews?topic=cost-of-living",
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
    futureRoute: "/MarketNews?group=markets",
    topics: [
      {
        id: "australian-markets",
        label: "Australian Markets",
        shortLabel: "Australia",
        eyebrow: "ASX focus",
        description:
          "ASX headlines, Australian business news, market moves, and domestic macro signals.",
        futureRoute: "/MarketNews?topic=australian-markets",
        source: {
          kind: "regional",
          country: "au",
          context: "Australia ASX market business economy",
        },
      },
      {
        id: "international-markets",
        label: "International Markets",
        shortLabel: "International",
        eyebrow: "Global market watch",
        description:
          "US, European, and Asian market headlines that can influence portfolio decisions.",
        futureRoute: "/MarketNews?topic=international-markets",
        source: {
          kind: "search",
          query: "global markets US Europe Asia stocks bonds currencies",
          context: "international stock markets global economy",
        },
      },
      {
        id: "commodities",
        label: "Commodities",
        eyebrow: "Macro inputs",
        description:
          "Energy, metals, agriculture, and supply-chain stories that move inflation and earnings expectations.",
        futureRoute: "/MarketNews?topic=commodities",
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
    futureRoute: "/MarketNews?group=money",
    topics: [
      {
        id: "money-news",
        label: "Money News",
        eyebrow: "Everyday finance",
        description:
          "Banking, superannuation, tax, saving, and consumer finance news for Australian investors.",
        futureRoute: "/MarketNews?topic=money-news",
        source: {
          kind: "search",
          query: "Australia money news banking tax superannuation savings",
          context: "Australian personal finance money news",
        },
      },
      {
        id: "personal-finance",
        label: "Personal Finance",
        shortLabel: "Personal",
        eyebrow: "Household decisions",
        description:
          "Budgeting, mortgage costs, retirement planning, insurance, and practical financial choices.",
        futureRoute: "/MarketNews?topic=personal-finance",
        source: {
          kind: "search",
          query:
            "personal finance Australia mortgage retirement insurance savings",
          context: "personal finance household money Australia",
        },
      },
      {
        id: "property-news",
        label: "Property News",
        shortLabel: "Property",
        eyebrow: "Housing market",
        description:
          "Housing affordability, rents, mortgage pressure, property prices, and real-estate policy.",
        futureRoute: "/MarketNews?topic=property-news",
        source: {
          kind: "search",
          query:
            "Australia property news housing prices rent mortgage affordability",
          context: "Australian property housing market",
        },
      },
    ],
  },
  {
    id: "work",
    label: "Work",
    description:
      "Labour market shifts, wages, career decisions, and workplace trends.",
    futureRoute: "/MarketNews?topic=work",
    topics: [
      {
        id: "work",
        label: "Work",
        eyebrow: "Jobs and wages",
        description:
          "Employment, wages, workplace policy, and productivity stories that affect income and markets.",
        futureRoute: "/MarketNews?topic=work",
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
    futureRoute: "/MarketNews?topic=technology",
    topics: [
      {
        id: "technology",
        label: "Technology",
        shortLabel: "Tech",
        eyebrow: "Innovation watch",
        description:
          "Technology sector headlines, AI, platform companies, and market-moving innovation stories.",
        futureRoute: "/MarketNews?topic=technology",
        source: {
          kind: "industry",
          industry: "technology",
          context: "technology sector AI software semiconductor stocks",
        },
      },
    ],
  },
];

const MARKET_NEWS_AU_TICKERS: readonly MarketNewsTicker[] = [
  {
    symbol: "^AORD",
    label: "ALL ORDS",
    value: "9,128.00",
    change: "+121.90 +1.35%",
    tone: "positive",
    sparkline: [28, 30, 31, 30, 33, 35, 36, 38, 37, 39],
    futureQuoteRoute: "/MarketNews?quote=%5EAORD",
  },
  {
    symbol: "AUDUSD=X",
    label: "AUD/USD",
    value: "0.7071",
    change: "+0.0028 +0.39%",
    tone: "positive",
    sparkline: [20, 21, 22, 21, 24, 23, 25, 27, 26, 28],
    futureQuoteRoute: "/MarketNews?quote=AUDUSD%3DX",
  },
  {
    symbol: "^AXJO",
    label: "ASX 200",
    value: "8,914.00",
    change: "+110.00 +1.25%",
    tone: "positive",
    sparkline: [24, 26, 25, 27, 29, 31, 30, 32, 34, 35],
    futureQuoteRoute: "/MarketNews?quote=%5EAXJO",
  },
  {
    symbol: "CL=F",
    label: "Oil",
    value: "80.21",
    change: "-4.67 -5.50%",
    tone: "negative",
    sparkline: [36, 34, 32, 31, 29, 28, 27, 25, 24, 22],
    futureQuoteRoute: "/MarketNews?quote=CL%3DF",
  },
  {
    symbol: "GC=F",
    label: "Gold",
    value: "4,358.80",
    change: "+120.00 +2.83%",
    tone: "positive",
    sparkline: [19, 20, 22, 23, 25, 24, 27, 29, 31, 34],
    futureQuoteRoute: "/MarketNews?quote=GC%3DF",
  },
  {
    symbol: "BTC-AUD",
    label: "Bitcoin AUD",
    value: "92,897.92",
    change: "+1,646.10 +1.80%",
    tone: "positive",
    sparkline: [22, 21, 20, 23, 25, 27, 29, 30, 32, 33],
    futureQuoteRoute: "/MarketNews?quote=BTC-AUD",
  },
];

const MARKET_NEWS_US_TICKERS: readonly MarketNewsTicker[] = [
  {
    symbol: "^GSPC",
    label: "S&P 500",
    value: "6,005.88",
    change: "+34.42 +0.58%",
    tone: "positive",
    sparkline: [24, 25, 27, 26, 29, 31, 30, 33, 35, 37],
    futureQuoteRoute: "/MarketNews?quote=%5EGSPC",
  },
  {
    symbol: "^IXIC",
    label: "Nasdaq",
    value: "19,113.77",
    change: "+126.18 +0.66%",
    tone: "positive",
    sparkline: [20, 23, 24, 23, 26, 29, 31, 33, 32, 35],
    futureQuoteRoute: "/MarketNews?quote=%5EIXIC",
  },
  {
    symbol: "^DJI",
    label: "Dow",
    value: "42,206.82",
    change: "-41.03 -0.10%",
    tone: "negative",
    sparkline: [34, 33, 35, 32, 31, 30, 29, 30, 28, 27],
    futureQuoteRoute: "/MarketNews?quote=%5EDJI",
  },
  {
    symbol: "^RUT",
    label: "Russell 2000",
    value: "2,152.05",
    change: "+11.76 +0.55%",
    tone: "positive",
    sparkline: [21, 22, 24, 23, 25, 27, 29, 28, 31, 32],
    futureQuoteRoute: "/MarketNews?quote=%5ERUT",
  },
  {
    symbol: "^VIX",
    label: "VIX",
    value: "18.32",
    change: "-0.84 -4.38%",
    tone: "negative",
    sparkline: [38, 36, 34, 35, 32, 30, 29, 27, 25, 23],
    futureQuoteRoute: "/MarketNews?quote=%5EVIX",
  },
];

const MARKET_NEWS_EUROPE_TICKERS: readonly MarketNewsTicker[] = [
  {
    symbol: "^FTSE",
    label: "FTSE 100",
    value: "8,765.33",
    change: "+28.91 +0.33%",
    tone: "positive",
    sparkline: [25, 26, 25, 28, 30, 29, 31, 34, 33, 35],
    futureQuoteRoute: "/MarketNews?quote=%5EFTSE",
  },
  {
    symbol: "^GDAXI",
    label: "DAX",
    value: "23,317.81",
    change: "-54.44 -0.23%",
    tone: "negative",
    sparkline: [36, 35, 34, 33, 35, 32, 31, 29, 28, 27],
    futureQuoteRoute: "/MarketNews?quote=%5EGDAXI",
  },
  {
    symbol: "^FCHI",
    label: "CAC 40",
    value: "7,684.68",
    change: "+17.22 +0.22%",
    tone: "positive",
    sparkline: [24, 23, 25, 27, 26, 29, 31, 30, 32, 34],
    futureQuoteRoute: "/MarketNews?quote=%5EFCHI",
  },
  {
    symbol: "^STOXX50E",
    label: "Euro Stoxx 50",
    value: "5,300.43",
    change: "+8.64 +0.16%",
    tone: "positive",
    sparkline: [26, 27, 28, 27, 29, 30, 31, 30, 33, 34],
    futureQuoteRoute: "/MarketNews?quote=%5ESTOXX50E",
  },
];

const MARKET_NEWS_ASIA_TICKERS: readonly MarketNewsTicker[] = [
  {
    symbol: "^N225",
    label: "Nikkei 225",
    value: "38,311.33",
    change: "+164.55 +0.43%",
    tone: "positive",
    sparkline: [23, 25, 26, 25, 28, 30, 31, 33, 32, 35],
    futureQuoteRoute: "/MarketNews?quote=%5EN225",
  },
  {
    symbol: "^HSI",
    label: "Hang Seng",
    value: "23,792.54",
    change: "-183.10 -0.76%",
    tone: "negative",
    sparkline: [35, 36, 33, 31, 29, 30, 28, 26, 25, 23],
    futureQuoteRoute: "/MarketNews?quote=%5EHSI",
  },
  {
    symbol: "000001.SS",
    label: "Shanghai",
    value: "3,388.73",
    change: "+14.12 +0.42%",
    tone: "positive",
    sparkline: [21, 22, 23, 25, 24, 27, 29, 28, 30, 32],
    futureQuoteRoute: "/MarketNews?quote=000001.SS",
  },
  {
    symbol: "^STI",
    label: "Straits Times",
    value: "3,920.65",
    change: "+9.03 +0.23%",
    tone: "positive",
    sparkline: [26, 27, 26, 28, 29, 31, 30, 32, 33, 34],
    futureQuoteRoute: "/MarketNews?quote=%5ESTI",
  },
];

const MARKET_NEWS_CRYPTO_TICKERS: readonly MarketNewsTicker[] = [
  {
    symbol: "BTC-AUD",
    label: "Bitcoin AUD",
    value: "92,897.92",
    change: "+1,646.10 +1.80%",
    tone: "positive",
    sparkline: [22, 21, 20, 23, 25, 27, 29, 30, 32, 33],
    futureQuoteRoute: "/MarketNews?quote=BTC-AUD",
  },
  {
    symbol: "ETH-AUD",
    label: "Ethereum AUD",
    value: "5,421.18",
    change: "+82.40 +1.54%",
    tone: "positive",
    sparkline: [20, 22, 21, 24, 26, 25, 28, 30, 31, 33],
    futureQuoteRoute: "/MarketNews?quote=ETH-AUD",
  },
  {
    symbol: "SOL-AUD",
    label: "Solana AUD",
    value: "214.63",
    change: "-3.18 -1.46%",
    tone: "negative",
    sparkline: [33, 32, 30, 29, 31, 28, 27, 26, 24, 23],
    futureQuoteRoute: "/MarketNews?quote=SOL-AUD",
  },
  {
    symbol: "XRP-AUD",
    label: "XRP AUD",
    value: "0.84",
    change: "+0.02 +2.44%",
    tone: "positive",
    sparkline: [19, 20, 22, 21, 23, 24, 26, 27, 29, 31],
    futureQuoteRoute: "/MarketNews?quote=XRP-AUD",
  },
];

const MARKET_NEWS_RATES_TICKERS: readonly MarketNewsTicker[] = [
  {
    symbol: "^TNX",
    label: "US 10Y",
    value: "4.39",
    change: "+0.03 +0.69%",
    tone: "positive",
    sparkline: [24, 25, 26, 25, 28, 29, 31, 30, 32, 34],
    futureQuoteRoute: "/MarketNews?quote=%5ETNX",
  },
  {
    symbol: "^TYX",
    label: "US 30Y",
    value: "4.92",
    change: "+0.02 +0.41%",
    tone: "positive",
    sparkline: [23, 24, 26, 25, 27, 28, 30, 31, 30, 32],
    futureQuoteRoute: "/MarketNews?quote=%5ETYX",
  },
  {
    symbol: "^FVX",
    label: "US 5Y",
    value: "4.01",
    change: "-0.01 -0.25%",
    tone: "negative",
    sparkline: [31, 30, 29, 30, 28, 27, 26, 25, 24, 23],
    futureQuoteRoute: "/MarketNews?quote=%5EFVX",
  },
  {
    symbol: "IRX",
    label: "US 13W",
    value: "4.22",
    change: "+0.01 +0.24%",
    tone: "positive",
    sparkline: [22, 22, 23, 24, 24, 25, 26, 25, 27, 28],
    futureQuoteRoute: "/MarketNews?quote=IRX",
  },
];

const MARKET_NEWS_COMMODITY_TICKERS: readonly MarketNewsTicker[] = [
  {
    symbol: "CL=F",
    label: "Oil",
    value: "80.21",
    change: "-4.67 -5.50%",
    tone: "negative",
    sparkline: [36, 34, 32, 31, 29, 28, 27, 25, 24, 22],
    futureQuoteRoute: "/MarketNews?quote=CL%3DF",
  },
  {
    symbol: "GC=F",
    label: "Gold",
    value: "4,358.80",
    change: "+120.00 +2.83%",
    tone: "positive",
    sparkline: [19, 20, 22, 23, 25, 24, 27, 29, 31, 34],
    futureQuoteRoute: "/MarketNews?quote=GC%3DF",
  },
  {
    symbol: "SI=F",
    label: "Silver",
    value: "36.22",
    change: "+0.54 +1.51%",
    tone: "positive",
    sparkline: [20, 21, 23, 22, 25, 26, 27, 29, 30, 32],
    futureQuoteRoute: "/MarketNews?quote=SI%3DF",
  },
  {
    symbol: "HG=F",
    label: "Copper",
    value: "4.82",
    change: "-0.04 -0.82%",
    tone: "negative",
    sparkline: [34, 33, 31, 32, 30, 28, 29, 27, 26, 24],
    futureQuoteRoute: "/MarketNews?quote=HG%3DF",
  },
];

const MARKET_NEWS_CURRENCY_TICKERS: readonly MarketNewsTicker[] = [
  {
    symbol: "AUDUSD=X",
    label: "AUD/USD",
    value: "0.7071",
    change: "+0.0028 +0.39%",
    tone: "positive",
    sparkline: [20, 21, 22, 21, 24, 23, 25, 27, 26, 28],
    futureQuoteRoute: "/MarketNews?quote=AUDUSD%3DX",
  },
  {
    symbol: "EURUSD=X",
    label: "EUR/USD",
    value: "1.1542",
    change: "+0.0031 +0.27%",
    tone: "positive",
    sparkline: [22, 23, 23, 25, 24, 26, 28, 27, 29, 31],
    futureQuoteRoute: "/MarketNews?quote=EURUSD%3DX",
  },
  {
    symbol: "USDJPY=X",
    label: "USD/JPY",
    value: "145.42",
    change: "-0.48 -0.33%",
    tone: "negative",
    sparkline: [35, 34, 32, 33, 31, 30, 28, 27, 26, 24],
    futureQuoteRoute: "/MarketNews?quote=USDJPY%3DX",
  },
  {
    symbol: "GBPUSD=X",
    label: "GBP/USD",
    value: "1.3426",
    change: "+0.0020 +0.15%",
    tone: "positive",
    sparkline: [21, 22, 24, 23, 25, 26, 27, 29, 28, 30],
    futureQuoteRoute: "/MarketNews?quote=GBPUSD%3DX",
  },
];

export const MARKET_NEWS_MARKET_SCOPES: readonly MarketNewsMarketScope[] = [
  {
    id: "australia",
    label: "Australia",
    shortLabel: "AU",
    description:
      "Australian indices, currency, commodities, and crypto watched by local investors.",
    tickers: MARKET_NEWS_AU_TICKERS,
    futureRoute: "/MarketNews?market=australia",
  },
  {
    id: "us-markets",
    label: "US Markets",
    shortLabel: "US",
    description: "Major US equity benchmarks and volatility signals.",
    tickers: MARKET_NEWS_US_TICKERS,
    futureRoute: "/MarketNews?market=us-markets",
  },
  {
    id: "europe-markets",
    label: "Europe Markets",
    shortLabel: "EU",
    description:
      "European index snapshots across London, Frankfurt, Paris, and the euro area.",
    tickers: MARKET_NEWS_EUROPE_TICKERS,
    futureRoute: "/MarketNews?market=europe-markets",
  },
  {
    id: "asia-markets",
    label: "Asia Markets",
    shortLabel: "AS",
    description:
      "Asian market benchmarks that shape the Australian trading day.",
    tickers: MARKET_NEWS_ASIA_TICKERS,
    futureRoute: "/MarketNews?market=asia-markets",
  },
  {
    id: "cryptocurrencies",
    label: "Cryptocurrencies",
    shortLabel: "CR",
    description:
      "Digital asset snapshots shown in Australian dollar pairs where available.",
    tickers: MARKET_NEWS_CRYPTO_TICKERS,
    futureRoute: "/MarketNews?market=cryptocurrencies",
  },
  {
    id: "rates",
    label: "Rates",
    shortLabel: "RT",
    description:
      "Yield and short-rate proxies for macro and equity valuation context.",
    tickers: MARKET_NEWS_RATES_TICKERS,
    futureRoute: "/MarketNews?market=rates",
  },
  {
    id: "commodities",
    label: "Commodities",
    shortLabel: "CM",
    description:
      "Energy and metals futures that feed inflation, earnings, and currency moves.",
    tickers: MARKET_NEWS_COMMODITY_TICKERS,
    futureRoute: "/MarketNews?market=commodities",
  },
  {
    id: "currencies",
    label: "Currencies",
    shortLabel: "FX",
    description: "Major foreign exchange pairs for cross-market context.",
    tickers: MARKET_NEWS_CURRENCY_TICKERS,
    futureRoute: "/MarketNews?market=currencies",
  },
];

export const MARKET_NEWS_TICKERS: readonly MarketNewsTicker[] =
  MARKET_NEWS_AU_TICKERS;

export const MARKET_NEWS_TRENDING_SYMBOLS = [
  "SPCX",
  "^AORD",
  "TEAM",
  "WOW.AX",
  "CBA.AX",
] as const;
