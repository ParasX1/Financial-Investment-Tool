import {
  getPrimarySymbolName,
  getSymbolAliases,
} from "./symbolAliases";
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
  sourceCountry?: string;
};

type SearchProfile = {
  displayText: string;
  gdeltQuery: string;
  googleNewsQuery: string;
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
  "australian-markets": {
    phrases: ["ASX", "Australian shares"],
    terms: ["Australia", "stocks", "earnings", "RBA", "banks", "miners"],
    sourceCountry: "AS",
  },
  commodities: {
    phrases: ["commodity markets"],
    terms: ["oil", "gold", "copper", "energy", "metals", "supply"],
  },
  "cost-of-living": {
    phrases: ["cost of living"],
    terms: ["Australia", "inflation", "mortgage", "rent", "RBA", "wages"],
    sourceCountry: "AS",
  },
  "international-markets": {
    phrases: ["global markets", "Wall Street"],
    terms: ["stocks", "bonds", "inflation", "earnings", "Europe", "Asia"],
  },
  "money-news": {
    phrases: ["personal finance"],
    terms: ["Australia", "banking", "tax", "superannuation", "savings"],
    sourceCountry: "AS",
  },
  "personal-finance": {
    phrases: ["personal finance"],
    terms: ["Australia", "mortgage", "retirement", "insurance", "savings"],
    sourceCountry: "AS",
  },
  "property-news": {
    phrases: ["property market"],
    terms: ["Australia", "housing", "mortgage", "rent", "prices"],
    sourceCountry: "AS",
  },
  technology: {
    phrases: ["technology stocks"],
    terms: ["AI", "software", "semiconductors", "earnings", "Nvidia"],
  },
  work: {
    phrases: ["labour market"],
    terms: ["Australia", "jobs", "wages", "employment", "workplace"],
    sourceCountry: "AS",
  },
};

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
  "asia-markets": ["Asia", "central banks"],
  "europe-markets": ["Europe", "ECB"],
  rates: ["United States", "Federal Reserve"],
  "us-markets": ["United States", "Federal Reserve"],
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
  if (request.topicId && TOPIC_QUERY_PACKS[request.topicId]) {
    return TOPIC_QUERY_PACKS[request.topicId]!;
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
  locale,
  phrases,
  sourceCountry,
  terms,
}: {
  displayText: string;
  exclude?: readonly string[];
  locale: GoogleLocale;
  phrases: readonly string[];
  sourceCountry?: string;
  terms: readonly string[];
}): SearchProfile {
  const core = unique([...phrases, ...terms]).slice(0, 9);
  const gdeltCore = orBlock(core.slice(0, 8));
  const gdeltExclude = unique(exclude)
    .slice(0, 5)
    .map((value) => `-${quoteGdelt(value)}`)
    .join(" ");
  const gdeltCountry = sourceCountry ? `sourcecountry:${sourceCountry}` : "";
  const googleCore = unique([...phrases.map(quoteGoogle), ...terms]).slice(
    0,
    9,
  );
  const googleTerms = [...googleCore, "when:7d"];

  return {
    displayText: compact(displayText),
    gdeltQuery: compact([gdeltCore, gdeltCountry, gdeltExclude].join(" ")),
    googleLocale: locale,
    googleNewsQuery: compact(googleTerms.join(" ")),
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
  const terms = [...topicTermsForScope(request, pack), ...scopedTerms(request)];
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

export function getGoogleNewsLocale(request: ServerNewsRequest): GoogleLocale {
  return buildNewsSearchProfile(request).googleLocale;
}
