import type { Article } from "@/lib/news/contracts";
import { resolveNewsTopicProfileId } from "./newsTopicProfiles";
import { getSymbolResultFilter } from "./symbolAliases";
import type { ServerNewsRequest } from "./types";

const TOPIC_KEYWORDS: Record<string, readonly string[]> = {
  "top-stories": [
    "asx",
    "australia",
    "australian",
    "business",
    "central bank",
    "companies",
    "company",
    "earnings",
    "economy",
    "economic",
    "inflation",
    "investing",
    "market",
    "markets",
    "rba",
    "shares",
    "stocks",
    "wall street",
  ],
  "australian-markets": [
    "all ords",
    "asx",
    "asx 200",
    "australia",
    "australian",
    "australian shares",
    "bank",
    "bhp",
    "cba",
    "cash rate",
    "equities",
    "equity",
    "market index",
    "miners",
    "monetary policy",
    "rba",
    "sector",
    "share market",
    "shares",
  ],
  commodities: [
    "commodity",
    "commodities",
    "copper",
    "crude",
    "crude oil",
    "energy",
    "energy markets",
    "gold",
    "gold prices",
    "metals",
    "oil",
    "oil prices",
  ],
  "companies-earnings": [
    "acquisition",
    "annual results",
    "asx",
    "company",
    "companies",
    "corporate results",
    "dividend",
    "earnings",
    "guidance",
    "half-year results",
    "merger",
    "profit",
    "revenue",
    "sales update",
    "takeover",
  ],
  "cost-of-living": [
    "bill",
    "cash rate",
    "cash rates",
    "consumer price",
    "consumer prices",
    "cpi",
    "cost of living",
    "cost-of-living",
    "energy bill",
    "energy bills",
    "food price",
    "food prices",
    "fuel price",
    "fuel prices",
    "grocery",
    "grocery price",
    "grocery prices",
    "household",
    "household budget",
    "household budgets",
    "household debt",
    "australian inflation",
    "homeowner",
    "homeowners",
    "housing affordability",
    "inflation",
    "interest rate",
    "interest rates",
    "living cost",
    "living costs",
    "milk price",
    "milk prices",
    "mortgage",
    "mortgage rate",
    "mortgage rates",
    "mortgage stress",
    "oil price",
    "oil prices",
    "rate hike",
    "rate hikes",
    "rent",
    "rents",
    "rba",
    "wage",
    "wages",
  ],
  "international-markets": [
    "asia",
    "bond yield",
    "bond yields",
    "central bank",
    "central banks",
    "china",
    "dow",
    "dow jones",
    "equities",
    "europe",
    "fed",
    "federal reserve",
    "global",
    "index",
    "indexes",
    "japan",
    "nasdaq",
    "nasdaq-100",
    "s&p",
    "s&p 500",
    "stock market",
    "stock markets",
    "stocks",
    "us market",
    "us markets",
    "us stocks",
    "wall street",
  ],
  "economy-work": [
    "australian economy",
    "cash rate",
    "economic growth",
    "economy",
    "employment",
    "gdp",
    "inflation",
    "interest rates",
    "jobs",
    "labour",
    "productivity",
    "rba",
    "wage",
    "wages",
    "workplace",
  ],
  "economy-policy": [
    "australian economy",
    "budget",
    "business conditions",
    "consumer spending",
    "economic",
    "economic growth",
    "economy",
    "federal budget",
    "gdp",
    "government policy",
    "productivity",
    "recession",
    "regulation",
    "treasury",
  ],
  money: [
    "ato",
    "bank",
    "banks",
    "banking",
    "borrower",
    "borrowers",
    "capital gains tax",
    "cgt",
    "consumer finance",
    "credit card",
    "credit cards",
    "finance",
    "financial stress",
    "home loan",
    "home loans",
    "insurance",
    "interest rate",
    "interest rates",
    "money",
    "mortgage",
    "mortgage rate",
    "mortgage rates",
    "negative gearing",
    "pension",
    "retirement",
    "saving",
    "savings",
    "super",
    "superannuation",
    "tax",
    "tax liability",
    "tax return",
    "tax returns",
  ],
  "personal-finance": [
    "budget",
    "budgeting",
    "credit card",
    "financial advice",
    "financial stress",
    "home loan",
    "insurance",
    "mortgage",
    "mortgage rate",
    "personal finance",
    "retirement",
    "retirement planning",
    "saving",
    "savings",
  ],
  "property-news": [
    "home price",
    "housing",
    "mortgage",
    "property",
    "real estate",
    "rent",
  ],
  "rates-inflation": [
    "bond yield",
    "bond yields",
    "cash rate",
    "central bank",
    "consumer price",
    "consumer prices",
    "cpi",
    "inflation",
    "interest rate",
    "interest rates",
    "monetary policy",
    "rate cut",
    "rate hike",
    "rba",
  ],
  "super-tax": [
    "ato",
    "australian tax",
    "capital gains tax",
    "cgt",
    "contribution",
    "contributions",
    "pension",
    "retirement",
    "super",
    "super fund",
    "super funds",
    "superannuation",
    "tax",
    "tax return",
  ],
  technology: [
    "5g",
    "ai",
    "broadcom",
    "chip",
    "cybersecurity",
    "nvidia",
    "semiconductor",
    "software",
    "tech",
    "technology",
  ],
  work: [
    "employment",
    "jobs",
    "labour",
    "productivity",
    "wage",
    "work",
    "workplace",
  ],
};

export function hasNewsTopicRelevanceProfile(topicId: string) {
  return Boolean(TOPIC_KEYWORDS[resolveNewsTopicProfileId(topicId) ?? ""]);
}

const TOPIC_MINIMUM_MATCHES: Record<string, number> = {
  "top-stories": 2,
  "australian-markets": 2,
  commodities: 2,
  "companies-earnings": 2,
  "cost-of-living": 2,
  "economy-work": 2,
  "economy-policy": 2,
  money: 2,
  "personal-finance": 2,
  "rates-inflation": 2,
  "super-tax": 2,
};

const TOPIC_HIGH_SIGNAL_KEYWORDS: Record<string, readonly string[]> = {
  "top-stories": [
    "asx",
    "australian",
    "earnings",
    "economy",
    "inflation",
    "markets",
    "rba",
    "wall street",
  ],
  "australian-markets": [
    "all ords",
    "asx",
    "asx 200",
    "australian shares",
    "market index",
    "rba",
    "share market",
  ],
  commodities: [
    "commodities",
    "commodity",
    "crude oil",
    "energy markets",
    "gold prices",
    "oil prices",
  ],
  "companies-earnings": [
    "annual results",
    "corporate results",
    "dividend",
    "earnings",
    "guidance",
    "half-year results",
    "merger",
    "profit",
    "revenue",
    "takeover",
  ],
  "cost-of-living": [
    "cash rate",
    "cost of living",
    "fuel prices",
    "grocery prices",
    "homeowners",
    "housing affordability",
    "australian inflation",
    "interest rates",
    "milk prices",
    "mortgage rates",
    "mortgage stress",
    "oil prices",
    "rate hike",
    "rate hikes",
  ],
  "economy-work": [
    "australian economy",
    "cash rate",
    "economic growth",
    "employment",
    "inflation",
    "interest rates",
    "labour market",
    "productivity",
    "rba",
    "wages",
  ],
  "economy-policy": [
    "australian economy",
    "economic growth",
    "federal budget",
    "gdp",
    "government policy",
    "productivity",
    "recession",
  ],
  money: [
    "ato",
    "capital gains tax",
    "cgt",
    "credit card",
    "credit cards",
    "home loan",
    "home loans",
    "mortgage",
    "mortgage rates",
    "negative gearing",
    "pension",
    "retirement",
    "savings",
    "super",
    "superannuation",
    "tax return",
    "tax returns",
  ],
  "personal-finance": [
    "credit card",
    "financial advice",
    "financial stress",
    "home loan",
    "mortgage rate",
    "personal finance",
    "retirement planning",
    "savings",
  ],
  "rates-inflation": [
    "bond yields",
    "cash rate",
    "consumer prices",
    "inflation",
    "interest rates",
    "monetary policy",
    "rate cut",
    "rate hike",
    "rba",
  ],
  "super-tax": [
    "ato",
    "capital gains tax",
    "cgt",
    "pension",
    "retirement",
    "super fund",
    "superannuation",
    "tax return",
  ],
};

const TOPIC_EXCLUDED_PHRASES: Record<string, readonly string[]> = {
  money: ["$ato", "atmos energy"],
  "super-tax": ["$ato", "atmos energy"],
};

const AUSTRALIAN_CONTEXT_TOPIC_IDS = new Set([
  "australian-markets",
  "companies-earnings",
  "cost-of-living",
  "economy-work",
  "economy-policy",
  "money",
  "personal-finance",
  "property-news",
  "rates-inflation",
  "super-tax",
  "work",
]);

const AUSTRALIAN_CONTEXT_KEYWORDS = [
  "australia",
  "australian",
  "aussie",
  "aussies",
  "asx",
  "ato",
  "cba",
  "commbank",
  "rba",
  "reserve bank of australia",
];

const AUSTRALIAN_SOURCE_HINTS = [
  "abc",
  "afr",
  "capital brief",
  "courier mail",
  "livewire markets",
  "market index",
  "michael west media",
  "nab news",
  "news.com.au",
  "perthnow",
  "rask media",
  "smh",
  "the age",
  "the australian",
  "the nightly",
  "the west australian",
  "yahoo finance australia",
];

function normalize(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function articleText(
  article: Article,
  { includeSource = false, includeSymbols = true } = {},
): string {
  return normalize(
    [
      article.title,
      article.summary,
      ...(includeSource ? [article.source] : []),
      ...(includeSymbols ? (article.relatedSymbols ?? []) : []),
    ].join(" "),
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsBoundedPhrase(text: string, phrase: string): boolean {
  const cleaned = normalize(phrase);
  if (!cleaned) return false;

  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(cleaned)}([^a-z0-9]|$)`).test(
    text,
  );
}

function requestNeedsAustralianContext(request: ServerNewsRequest): boolean {
  if (request.userSearch) return false;
  if (normalize(request.country) === "au") return true;
  const profileId = resolveNewsTopicProfileId(request.topicId);
  if (!profileId || !AUSTRALIAN_CONTEXT_TOPIC_IDS.has(profileId)) {
    return false;
  }

  return !request.marketScopeId || request.marketScopeId === "australia";
}

function articleMatchesAustralianContext(article: Article): boolean {
  const text = articleText(article, { includeSource: true });

  return [...AUSTRALIAN_CONTEXT_KEYWORDS, ...AUSTRALIAN_SOURCE_HINTS].some(
    (keyword) => containsBoundedPhrase(text, keyword),
  );
}

function compactSymbol(symbol: string | undefined): string {
  return (symbol ?? "").trim().toUpperCase();
}

function tokeniseQuery(query: string | undefined): string[] {
  return normalize(query)
    .split(/[^a-z0-9.=&^]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .filter(
      (token) =>
        ![
          "and",
          "are",
          "for",
          "market",
          "markets",
          "news",
          "stock",
          "stocks",
          "the",
          "with",
        ].includes(token),
    );
}

function articleMatchesKeywords(
  article: Article,
  keywords: readonly string[],
  {
    highSignalKeywords = [],
    minimumMatches = 1,
  }: { highSignalKeywords?: readonly string[]; minimumMatches?: number } = {},
): boolean {
  const text = articleText(article);
  const highSignalSet = new Set(
    highSignalKeywords.map((keyword) => normalize(keyword)),
  );
  let matches = 0;

  for (const keyword of keywords) {
    const normalizedKeyword = normalize(keyword);

    if (containsBoundedPhrase(text, normalizedKeyword)) {
      matches +=
        normalizedKeyword.includes(" ") || highSignalSet.has(normalizedKeyword)
          ? 2
          : 1;
    }

    if (matches >= minimumMatches) {
      return true;
    }
  }

  return false;
}

function articleMatchesTicker(article: Article, ticker: string | undefined) {
  const symbol = compactSymbol(ticker);
  if (!symbol) return true;

  const text = articleText(article, { includeSymbols: false });
  const filter = getSymbolResultFilter(symbol);
  const matches = (alias: string) => {
    const cleaned = normalize(alias);
    return cleaned.length >= 2 && containsBoundedPhrase(text, cleaned);
  };

  if (filter.exactAliases.some(matches)) return true;
  if (filter.conflictingAliases.some(matches)) return false;

  return filter.aliases.some(matches);
}

function requestKeywords(request: ServerNewsRequest): string[] {
  const profileId = resolveNewsTopicProfileId(request.topicId);
  if (profileId && TOPIC_KEYWORDS[profileId]) {
    return [...TOPIC_KEYWORDS[profileId]];
  }

  if (request.kind === "commodity") {
    return [
      ...(TOPIC_KEYWORDS.commodities ?? []),
      ...tokeniseQuery(request.commodity),
    ];
  }

  if (request.kind === "industry") {
    return tokeniseQuery(`${request.industry ?? ""} ${request.context}`);
  }

  if (request.kind === "regional") {
    return tokeniseQuery(`${request.country ?? ""} ${request.context}`);
  }

  return tokeniseQuery(request.query ?? request.context);
}

export function filterRelevantNewsArticles(
  articles: readonly Article[],
  request: ServerNewsRequest,
): Article[] {
  if (request.kind === "ticker") {
    return articles.filter((article) =>
      articleMatchesTicker(article, request.ticker),
    );
  }

  const keywords = requestKeywords(request);
  if (!keywords.length) return [...articles];
  const profileId = resolveNewsTopicProfileId(request.topicId);
  const minimumMatches = profileId
    ? (TOPIC_MINIMUM_MATCHES[profileId] ?? 1)
    : 1;
  const highSignalKeywords = profileId
    ? (TOPIC_HIGH_SIGNAL_KEYWORDS[profileId] ?? [])
    : [];
  const excludedPhrases = profileId
    ? (TOPIC_EXCLUDED_PHRASES[profileId] ?? [])
    : [];

  return articles.filter((article) => {
    if (articleMatchesKeywords(article, excludedPhrases)) return false;

    if (
      !articleMatchesKeywords(article, keywords, {
        highSignalKeywords,
        minimumMatches,
      })
    ) {
      return false;
    }

    if (
      requestNeedsAustralianContext(request) &&
      !articleMatchesAustralianContext(article)
    ) {
      return false;
    }

    return true;
  });
}
