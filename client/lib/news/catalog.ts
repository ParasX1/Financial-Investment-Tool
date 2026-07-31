export type MarketNewsGroupId =
  | "top-stories"
  | "cost-of-living"
  | "markets"
  | "money"
  | "economy-work"
  | "technology";

export type MarketNewsTopicId =
  | "top-stories"
  | "cost-of-living"
  | "money"
  | "economy-work"
  | "australian-markets"
  | "international-markets"
  | "companies-earnings"
  | "commodities"
  | "personal-finance"
  | "property-news"
  | "super-tax"
  | "economy-policy"
  | "rates-inflation"
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
        id: "money",
        label: "Money Overview",
        shortLabel: "Overview",
        eyebrow: "Money decisions",
        description:
          "A practical overview of personal finance, property, banking, superannuation, tax, and saving in Australia.",
        source: {
          kind: "search",
          query:
            "Australia personal finance property housing superannuation tax savings",
          context: "Australian household money decisions",
        },
      },
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
        id: "economy-work",
        label: "Economy & Work Overview",
        shortLabel: "Overview",
        eyebrow: "Economic picture",
        description:
          "A connected view of Australian growth, policy, rates, inflation, jobs, wages, and workplace trends.",
        source: {
          kind: "search",
          query:
            "Australia economy policy interest rates inflation jobs wages employment",
          context: "Australian economy and work",
        },
      },
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
