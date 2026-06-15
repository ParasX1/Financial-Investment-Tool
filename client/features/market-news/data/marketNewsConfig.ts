import type { MarketNewsNavGroup, MarketNewsTicker } from "../types";

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
          kind: "search",
          query: "commodities oil gold copper wheat market",
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

export const MARKET_NEWS_TICKERS: readonly MarketNewsTicker[] = [
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

export const MARKET_NEWS_TRENDING_SYMBOLS = [
  "SPCX",
  "^AORD",
  "TEAM",
  "WOW.AX",
  "CBA.AX",
] as const;
