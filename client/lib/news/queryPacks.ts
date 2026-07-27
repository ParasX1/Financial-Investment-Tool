import { resolveNewsTopicProfileId } from "./newsTopicProfiles";
import { getPrimarySymbolName, getSymbolAliases } from "./symbolAliases";
import type { ServerNewsRequest } from "./types";

type GoogleLocale = {
  ceid: string;
  gl: string;
  hl: string;
};

type QueryPack = {
  phrases: readonly string[];
  terms: readonly string[];
  exclude?: readonly string[];
  googleAlternates?: readonly (readonly string[])[];
  googleRawQueries?: readonly string[];
  sourceCountry?: string;
};

type SearchProfile = {
  displayText: string;
  gdeltQuery: string;
  googleNewsQuery: string;
  googleNewsQueries: readonly string[];
  searchText: string;
  googleLocale: GoogleLocale;
};

const DEFAULT_GOOGLE_LOCALE: GoogleLocale = {
  ceid: "AU:en",
  gl: "AU",
  hl: "en-AU",
};

const GOOGLE_LOCALES_BY_SCOPE: Record<string, GoogleLocale> = {
  australia: DEFAULT_GOOGLE_LOCALE,
  "asia-markets": { ceid: "SG:en", gl: "SG", hl: "en-SG" },
  commodities: DEFAULT_GOOGLE_LOCALE,
  cryptocurrencies: DEFAULT_GOOGLE_LOCALE,
  currencies: DEFAULT_GOOGLE_LOCALE,
  "europe-markets": { ceid: "GB:en", gl: "GB", hl: "en-GB" },
  rates: { ceid: "US:en", gl: "US", hl: "en-US" },
  "us-markets": { ceid: "US:en", gl: "US", hl: "en-US" },
};

const TOPIC_QUERY_PACKS: Record<string, QueryPack> = {
  "top-stories": {
    phrases: ["market news", "business news"],
    terms: [
      "Australia",
      "markets",
      "economy",
      "companies",
      "investing",
      "inflation",
      "earnings",
    ],
    googleAlternates: [
      ["ASX", "Australian economy", "RBA", "business"],
      ["global markets", "Wall Street", "commodities", "central banks"],
      ["company earnings", "mergers", "dividends", "market outlook"],
    ],
    googleRawQueries: [
      '(ASX OR RBA OR "Australian economy" OR "company earnings") when:3d',
    ],
  },
  "australian-markets": {
    phrases: ["ASX", "Australian shares"],
    terms: ["Australia", "stocks", "earnings", "RBA", "banks", "miners"],
    googleRawQueries: [
      'site:au.finance.yahoo.com/news (ASX OR "Australian shares" OR "ASX Preview" OR "stock market") when:7d',
      'site:marketindex.com.au/news (ASX OR "ASX 200" OR "Australian shares") when:7d',
    ],
    sourceCountry: "AS",
  },
  "companies-earnings": {
    phrases: ["company earnings", "corporate results"],
    terms: [
      "Australia",
      "ASX",
      "profit",
      "revenue",
      "guidance",
      "dividend",
      "acquisition",
    ],
    googleAlternates: [
      ["ASX results", "earnings", "profit", "revenue"],
      ["company guidance", "dividend", "merger", "acquisition"],
      ["sales update", "annual results", "half-year results", "investors"],
    ],
    googleRawQueries: [
      "site:au.finance.yahoo.com/news (earnings OR results OR profit OR revenue OR dividend OR acquisition) ASX when:7d",
    ],
    sourceCountry: "AS",
  },
  commodities: {
    phrases: ["commodity markets"],
    terms: ["oil", "gold", "copper", "energy", "metals", "supply"],
    googleAlternates: [
      ["oil prices", "gold prices", "copper supply", "energy markets"],
      ["commodity prices", "metals", "crude oil", "supply disruption"],
    ],
    googleRawQueries: [
      "site:finance.yahoo.com/news (oil OR gold OR copper OR commodities OR crude) when:7d",
      "site:au.finance.yahoo.com/news (oil OR gold OR commodities OR energy) when:7d",
    ],
  },
  "cost-of-living": {
    phrases: ["cost of living", "household bills"],
    terms: [
      "Australia",
      "inflation",
      "mortgage",
      "rent",
      "RBA",
      "wages",
      "energy bills",
      "housing affordability",
    ],
    googleAlternates: [
      ["cost of living", "inflation", "household budgets", "consumer prices"],
      ["mortgage stress", "rent", "housing affordability", "interest rates"],
      ["energy bills", "grocery prices", "wages", "household bills"],
      ["RBA", "cash rate", "fuel prices", "electricity prices"],
      ["consumer prices", "rent increases", "mortgage repayments"],
    ],
    googleRawQueries: [
      'site:au.finance.yahoo.com/news ("cost of living" OR inflation OR mortgage OR rent OR "cash rate") Australia when:7d',
      '("RBA rate hike" OR "cash rate" OR "rate hike" OR "interest rates" OR mortgage OR rent OR homeowners) Australia when:3d',
      '("oil prices" OR "fuel prices" OR "milk prices" OR groceries OR "food prices") inflation Australia when:3d',
    ],
    sourceCountry: "AS",
  },
  "international-markets": {
    phrases: ["global markets", "Wall Street"],
    terms: ["stocks", "bonds", "inflation", "earnings", "Europe", "Asia"],
    googleAlternates: [
      ["global markets", "stocks", "bonds", "Wall Street"],
      ["Europe markets", "Asia markets", "earnings", "central banks"],
    ],
    googleRawQueries: [
      'site:finance.yahoo.com/news ("Wall Street" OR "S&P 500" OR Nasdaq OR "global markets") when:7d',
    ],
  },
  "economy-work": {
    phrases: ["Australian economy", "labour market"],
    terms: [
      "Australia",
      "GDP",
      "RBA",
      "inflation",
      "interest rates",
      "jobs",
      "wages",
      "employment",
      "productivity",
    ],
    googleAlternates: [
      ["Australian economy", "GDP", "budget", "economic growth"],
      ["RBA", "inflation", "cash rate", "interest rates"],
      ["labour market", "jobs", "wages", "employment"],
      ["workplace", "unemployment", "productivity", "pay growth"],
    ],
    googleRawQueries: [
      'site:au.finance.yahoo.com/news (economy OR RBA OR inflation OR jobs OR wages OR employment) Australia when:7d',
      '("Australian economy" OR RBA OR inflation OR jobs OR wages) Australia when:3d',
    ],
    sourceCountry: "AS",
  },
  "economy-policy": {
    phrases: ["Australian economy", "economic policy"],
    terms: [
      "GDP",
      "budget",
      "Treasury",
      "productivity",
      "economic growth",
      "recession",
      "regulation",
    ],
    googleAlternates: [
      ["Australian economy", "GDP", "economic growth", "Treasury"],
      ["federal budget", "economic policy", "productivity", "regulation"],
      ["business conditions", "consumer spending", "recession", "Australia"],
    ],
    googleRawQueries: [
      '(GDP OR budget OR Treasury OR productivity OR "economic growth") Australia when:7d',
    ],
    sourceCountry: "AS",
  },
  money: {
    exclude: ["Atmos Energy"],
    phrases: ["personal finance", "money news"],
    terms: [
      "Australia",
      "ATO",
      "banking",
      "capital gains tax",
      "CGT",
      "consumer finance",
      "mortgage rates",
      "negative gearing",
      "property",
      "housing",
      "savings",
      "superannuation",
      "tax",
      "tax return",
    ],
    googleAlternates: [
      ["Australia money news", "consumer finance", "banking", "savings"],
      ["ATO", "tax return", "tax liability", "superannuation", "CGT"],
      ["capital gains tax", "negative gearing", "tax changes", "Australia"],
      ["mortgage rates", "home loans", "bank fees", "credit cards"],
      ["property", "housing", "rent", "home buyers"],
      ["superannuation", "retirement", "pension", "insurance"],
      ["interest rates", "household savings", "financial stress", "Australia"],
    ],
    googleRawQueries: [
      'site:au.finance.yahoo.com/news (superannuation OR ATO OR tax OR CGT OR savings OR "credit cards" OR banking OR "negative gearing") Australia when:7d',
    ],
    sourceCountry: "AS",
  },
  "personal-finance": {
    phrases: ["personal finance"],
    terms: ["Australia", "mortgage", "retirement", "insurance", "savings"],
    googleAlternates: [
      ["personal finance", "mortgage", "savings", "insurance"],
      ["retirement", "superannuation", "household budget", "tax"],
      ["ATO", "tax return", "home loans", "credit cards"],
      ["consumer finance", "bank fees", "mortgage rates", "Australia"],
    ],
    googleRawQueries: [
      'site:au.finance.yahoo.com/news ("personal finance" OR superannuation OR mortgage OR insurance OR savings) Australia when:7d',
    ],
    sourceCountry: "AS",
  },
  "property-news": {
    phrases: ["property market"],
    terms: ["Australia", "housing", "mortgage", "rent", "prices"],
    googleAlternates: [
      ["property market", "house prices", "housing", "mortgage"],
      ["rent", "housing affordability", "real estate", "home buyers"],
    ],
    googleRawQueries: [
      'site:au.finance.yahoo.com/news (property OR housing OR rent OR mortgage OR "house prices") Australia when:7d',
    ],
    sourceCountry: "AS",
  },
  "rates-inflation": {
    phrases: ["interest rates", "monetary policy"],
    terms: [
      "Australia",
      "RBA",
      "cash rate",
      "inflation",
      "CPI",
      "bond yields",
      "rate hike",
      "rate cut",
    ],
    googleAlternates: [
      ["RBA", "cash rate", "interest rates", "monetary policy"],
      ["Australian inflation", "CPI", "consumer prices", "bond yields"],
      ["rate hike", "rate cut", "mortgage rates", "inflation outlook"],
    ],
    googleRawQueries: [
      '(RBA OR "cash rate" OR inflation OR CPI OR "interest rates") Australia when:7d',
    ],
    sourceCountry: "AS",
  },
  "super-tax": {
    phrases: ["superannuation", "Australian tax"],
    terms: [
      "Australia",
      "ATO",
      "tax return",
      "capital gains tax",
      "CGT",
      "retirement",
      "pension",
      "super fund",
    ],
    googleAlternates: [
      ["superannuation", "super fund", "retirement", "contributions"],
      ["ATO", "tax return", "capital gains tax", "CGT"],
      ["pension", "retirement income", "super rules", "Australia"],
    ],
    googleRawQueries: [
      "site:au.finance.yahoo.com/news (superannuation OR ATO OR tax OR CGT OR retirement) Australia when:7d",
    ],
    sourceCountry: "AS",
  },
  technology: {
    phrases: ["technology stocks"],
    terms: ["AI", "software", "semiconductors", "earnings", "Nvidia"],
    googleAlternates: [
      ["technology stocks", "AI", "semiconductors", "earnings"],
      ["Nvidia", "software", "chip stocks", "cloud"],
    ],
    googleRawQueries: [
      "site:au.finance.yahoo.com/news (AI OR Nvidia OR semiconductors OR software OR technology) when:7d",
      'site:finance.yahoo.com/news (AI OR Nvidia OR semiconductors OR software OR "technology stocks") when:7d',
    ],
  },
  work: {
    phrases: ["labour market"],
    terms: ["Australia", "jobs", "wages", "employment", "workplace"],
    googleAlternates: [
      ["labour market", "jobs", "wages", "employment"],
      ["workplace", "unemployment", "productivity", "pay growth"],
    ],
    googleRawQueries: [
      "site:au.finance.yahoo.com/news (jobs OR wages OR employment OR workplace OR salary) Australia when:7d",
    ],
    sourceCountry: "AS",
  },
};

export function hasNewsTopicQueryPack(topicId: string) {
  return Boolean(TOPIC_QUERY_PACKS[resolveNewsTopicProfileId(topicId) ?? ""]);
}

const SCOPE_QUERY_TERMS: Record<string, readonly string[]> = {
  "asia-markets": ["Asia", "Nikkei", "Hang Seng"],
  commodities: ["oil", "gold", "copper"],
  cryptocurrencies: ["Bitcoin", "Ethereum", "crypto"],
  currencies: ["foreign exchange", "Australian dollar"],
  "europe-markets": ["Europe", "FTSE", "DAX"],
  rates: ["bond yields", "interest rates"],
  "us-markets": ["US markets", "S&P 500", "Nasdaq"],
};

const SCOPE_LOCAL_CONTEXT_TERMS: Record<string, readonly string[]> = {
  "asia-markets": ["Asia", "central banks", "Japan", "China"],
  "europe-markets": ["Europe", "ECB", "eurozone", "UK"],
  rates: ["United States", "Federal Reserve"],
  "us-markets": ["United States", "Federal Reserve"],
};

const SCOPE_GOOGLE_ALTERNATES: Record<string, readonly (readonly string[])[]> =
  {
    "asia-markets": [
      ["Asia stocks", "Nikkei", "Hang Seng", "China markets"],
      ["Japan stocks", "China stocks", "Asian markets", "central banks"],
    ],
    commodities: [["oil prices", "gold prices", "copper", "commodity markets"]],
    "europe-markets": [
      ["European stocks", "FTSE", "DAX", "STOXX Europe"],
      ["eurozone markets", "European shares", "ECB", "bond yields"],
    ],
    rates: [
      ["Federal Reserve", "bond yields", "interest rates", "Treasury yields"],
    ],
    "us-markets": [
      ["US stocks", "Wall Street", "S&P 500", "Nasdaq", "Dow Jones"],
      ["Federal Reserve", "bond yields", "earnings", "US markets"],
    ],
  };

const GDELT_SOURCE_COUNTRY_BY_SCOPE: Record<string, string> = {
  australia: "AS",
  rates: "US",
  "us-markets": "US",
};

const MARKET_SCOPE_TOPIC_IDS = new Set([
  "australian-markets",
  "commodities",
  "international-markets",
  "technology",
]);

function compact(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function cleanTerm(value: string | undefined): string {
  return compact(value)
    .replace(/[^\w\s.%=&^/+\-:"]/g, "")
    .slice(0, 80)
    .trim();
}

function unique(values: readonly string[]): string[] {
  const seen = new Set<string>();

  return values
    .map(cleanTerm)
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
}

function uniqueQueries(values: readonly string[]): string[] {
  const seen = new Set<string>();

  return values
    .map(compact)
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
}

function appendGoogleRecency(query: string, recency: string) {
  const cleaned = compact(query);
  if (!cleaned) return "";
  if (/\bwhen:\d+[hdmy]\b/i.test(cleaned)) return cleaned;

  return compact([cleaned, recency].join(" "));
}

function quoteGdelt(value: string) {
  return /\s/.test(value) ? `"${value}"` : value;
}

function quoteGoogle(value: string) {
  return /\s/.test(value) ? `"${value}"` : value;
}

function orBlock(values: readonly string[]) {
  const cleaned = unique(values);
  if (!cleaned.length) return "";
  if (cleaned.length === 1) return quoteGdelt(cleaned[0]!);

  return `(${cleaned.map(quoteGdelt).join(" OR ")})`;
}

function googleOrBlock(values: readonly string[]) {
  const cleaned = unique(values);
  if (!cleaned.length) return "";
  if (cleaned.length === 1) return quoteGoogle(cleaned[0]!);

  return `(${cleaned.map(quoteGoogle).join(" OR ")})`;
}

function googleLocaleFor(request: ServerNewsRequest) {
  if (request.topicId === "australian-markets") return DEFAULT_GOOGLE_LOCALE;
  if (request.marketScopeId && GOOGLE_LOCALES_BY_SCOPE[request.marketScopeId]) {
    return GOOGLE_LOCALES_BY_SCOPE[request.marketScopeId]!;
  }

  return DEFAULT_GOOGLE_LOCALE;
}

function tickerTerms(ticker: string | undefined) {
  const symbol = cleanTerm(ticker).toUpperCase();
  if (!symbol) return [];

  return unique([
    symbol,
    getPrimarySymbolName(symbol) ?? "",
    ...getSymbolAliases(symbol).slice(0, 3),
  ]);
}

function packForRequest(request: ServerNewsRequest): QueryPack {
  const profileId = resolveNewsTopicProfileId(request.topicId);
  if (profileId && TOPIC_QUERY_PACKS[profileId]) {
    return TOPIC_QUERY_PACKS[profileId]!;
  }

  if (request.kind === "commodity") {
    return TOPIC_QUERY_PACKS.commodities!;
  }

  if (request.kind === "industry") {
    return {
      phrases: [request.industry ?? ""],
      terms: [request.context],
    };
  }

  return {
    phrases: [],
    terms: [
      request.query ?? "",
      request.commodity ?? "",
      request.country ?? "",
      request.context,
    ],
  };
}

function scopedTerms(request: ServerNewsRequest) {
  if (!request.marketScopeId || request.marketScopeId === "australia") {
    return [];
  }

  if (request.topicId && !MARKET_SCOPE_TOPIC_IDS.has(request.topicId)) {
    return [];
  }

  return SCOPE_QUERY_TERMS[request.marketScopeId] ?? [];
}

function topicTermsForScope(request: ServerNewsRequest, pack: QueryPack) {
  if (!request.marketScopeId || request.marketScopeId === "australia") {
    return [...pack.terms];
  }

  const localContext = SCOPE_LOCAL_CONTEXT_TERMS[request.marketScopeId] ?? [];
  if (!localContext.length) return [...pack.terms];

  return [
    ...pack.terms.filter(
      (term) => !["Australia", "RBA"].includes(cleanTerm(term)),
    ),
    ...localContext,
  ];
}

function sourceCountryFor(request: ServerNewsRequest, pack: QueryPack) {
  if (
    request.marketScopeId &&
    GDELT_SOURCE_COUNTRY_BY_SCOPE[request.marketScopeId]
  ) {
    return GDELT_SOURCE_COUNTRY_BY_SCOPE[request.marketScopeId];
  }

  return pack.sourceCountry;
}

function profileFromTerms({
  displayText,
  exclude = [],
  googleAlternates = [],
  googleContextTerms = [],
  googleRawQueries = [],
  locale,
  phrases,
  sourceCountry,
  terms,
}: {
  displayText: string;
  exclude?: readonly string[];
  googleAlternates?: readonly (readonly string[])[];
  googleContextTerms?: readonly string[];
  googleRawQueries?: readonly string[];
  locale: GoogleLocale;
  phrases: readonly string[];
  sourceCountry?: string;
  terms: readonly string[];
}): SearchProfile {
  const core = unique([...phrases, ...terms]).slice(0, 12);
  const context = unique(googleContextTerms).slice(0, 5);
  const contextKeys = new Set(
    context.map((value) => cleanTerm(value).toLowerCase()),
  );
  const googleCore = core.filter(
    (value) => !contextKeys.has(cleanTerm(value).toLowerCase()),
  );
  const googleContext = googleOrBlock(context);
  const gdeltCore = orBlock(core.slice(0, 8));
  const gdeltExclude = unique(exclude)
    .slice(0, 5)
    .map((value) => `-${quoteGdelt(value)}`)
    .join(" ");
  const googleExclude = unique(exclude)
    .slice(0, 5)
    .map((value) => `-${quoteGoogle(value)}`)
    .join(" ");
  const gdeltCountry = sourceCountry ? `sourcecountry:${sourceCountry}` : "";
  const freshRecency = "when:3d";
  const recentRecency = "when:7d";
  const fallbackRecency = "when:30d";
  const primaryGoogleQuery = compact(
    [googleOrBlock(googleCore.slice(0, 10)), googleContext].join(" "),
  );
  const alternateGoogleQueries = googleAlternates.map((alternate) =>
    compact([googleOrBlock(alternate), googleContext].join(" ")),
  );
  const googleQueries = uniqueQueries([
    appendGoogleRecency(primaryGoogleQuery, freshRecency),
    ...googleRawQueries.map((query) =>
      appendGoogleRecency(query, freshRecency),
    ),
    ...alternateGoogleQueries.map((query) =>
      appendGoogleRecency(query, freshRecency),
    ),
    appendGoogleRecency(primaryGoogleQuery, fallbackRecency),
    appendGoogleRecency(primaryGoogleQuery, recentRecency),
    ...alternateGoogleQueries.map((query) =>
      appendGoogleRecency(query, recentRecency),
    ),
  ])
    .map((query) => compact([query, googleExclude].join(" ")))
    .slice(0, 10);

  return {
    displayText: compact(displayText),
    gdeltQuery: compact([gdeltCore, gdeltCountry, gdeltExclude].join(" ")),
    googleLocale: locale,
    googleNewsQuery: googleQueries[0] ?? freshRecency,
    googleNewsQueries: googleQueries.length ? googleQueries : [freshRecency],
    searchText: compact(core.join(" ")),
  };
}

export function buildNewsSearchProfile(
  request: ServerNewsRequest,
): SearchProfile {
  const locale = googleLocaleFor(request);

  if (request.kind === "ticker") {
    const terms = tickerTerms(request.ticker);
    return profileFromTerms({
      displayText: terms[0] ?? request.context,
      locale,
      phrases: [],
      terms: [...terms, "stock news"],
    });
  }

  if (request.userSearch || request.kind === "search") {
    const userTerms = unique([request.query ?? "", ...scopedTerms(request)]);

    if (request.userSearch && userTerms.length) {
      return profileFromTerms({
        displayText: userTerms.join(" "),
        locale,
        phrases: [],
        terms: userTerms,
      });
    }
  }

  const pack = packForRequest(request);
  const marketTerms = scopedTerms(request);
  const localContextTerms =
    SCOPE_LOCAL_CONTEXT_TERMS[request.marketScopeId ?? ""] ?? [];
  const googleContextTerms = request.marketScopeId
    ? request.marketScopeId === "australia"
      ? pack.terms.includes("Australia")
        ? ["Australia"]
        : []
      : localContextTerms.length
        ? localContextTerms
        : marketTerms
    : [];
  const terms = [...topicTermsForScope(request, pack), ...marketTerms];
  const displayText =
    request.query ??
    request.ticker ??
    request.commodity ??
    request.industry ??
    request.country ??
    request.context;

  return profileFromTerms({
    displayText,
    exclude: pack.exclude,
    googleAlternates: [
      ...(pack.googleAlternates ?? []),
      ...(SCOPE_GOOGLE_ALTERNATES[request.marketScopeId ?? ""] ?? []),
    ],
    googleRawQueries: pack.googleRawQueries,
    googleContextTerms,
    locale,
    phrases: pack.phrases,
    sourceCountry: sourceCountryFor(request, pack),
    terms,
  });
}

export function buildGdeltSearchQuery(request: ServerNewsRequest): string {
  return buildNewsSearchProfile(request).gdeltQuery;
}

export function buildGoogleNewsSearchQuery(request: ServerNewsRequest): string {
  return buildNewsSearchProfile(request).googleNewsQuery;
}

export function buildGoogleNewsSearchQueries(
  request: ServerNewsRequest,
): readonly string[] {
  return buildNewsSearchProfile(request).googleNewsQueries;
}

export function getGoogleNewsLocale(request: ServerNewsRequest): GoogleLocale {
  return buildNewsSearchProfile(request).googleLocale;
}
