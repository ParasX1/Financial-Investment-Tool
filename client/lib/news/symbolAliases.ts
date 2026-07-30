const SYMBOL_SUFFIX_PATTERN = /(\.AX|=X|=F)$/i;

export const NEWS_SYMBOL_ALIASES: Record<string, readonly string[]> = {
  AAPL: ["Apple Inc.", "Apple"],
  AMZN: ["Amazon"],
  "AUDUSD=X": ["Australian dollar", "AUD/USD", "Aussie dollar"],
  "BTC-USD": ["Bitcoin", "BTC", "Bitcoin USD", "Bitcoin US dollar"],
  "BTC-AUD": ["Bitcoin Australia", "Bitcoin", "BTC"],
  "CL=F": ["oil futures", "oil", "crude", "WTI"],
  "CBA.AX": ["Commonwealth Bank", "CBA"],
  "ETH-AUD": ["Ethereum Australia", "Ethereum", "ETH"],
  "EURUSD=X": ["Euro dollar", "EUR/USD"],
  "GC=F": ["gold futures", "gold"],
  GOOG: ["Alphabet"],
  GOOGL: ["Alphabet"],
  "GBPUSD=X": ["Pound dollar", "GBP/USD", "sterling"],
  "HG=F": ["copper futures", "copper"],
  IRX: ["13 week treasury bill", "US 13W"],
  META: ["Meta Platforms", "Meta"],
  MSFT: ["Microsoft"],
  NVDA: ["NVIDIA"],
  "SI=F": ["silver futures", "silver"],
  "SOL-AUD": ["Solana Australia", "Solana", "SOL"],
  SPCX: ["SpaceX", "Space Exploration Technologies"],
  TEAM: ["Atlassian"],
  TSLA: ["Tesla"],
  "USDJPY=X": ["Dollar yen", "USD/JPY", "yen"],
  "WOW.AX": ["Woolworths", "WOW"],
  "XRP-AUD": ["XRP Australia", "XRP"],
  "^AORD": ["Australia All Ordinaries", "All Ords", "All Ordinaries"],
  "^AXJO": ["ASX 200", "S&P/ASX 200"],
  "^DJI": ["Dow Jones", "Dow"],
  "^FCHI": ["CAC 40"],
  "^FTSE": ["FTSE 100", "FTSE"],
  "^FVX": ["US 5Y", "5 year treasury"],
  "^GDAXI": ["DAX", "German DAX"],
  "^GSPC": ["S&P 500", "Standard & Poor's 500"],
  "^HSI": ["Hang Seng"],
  "^IXIC": ["Nasdaq"],
  "^N225": ["Nikkei 225", "Nikkei"],
  "^RUT": ["Russell 2000"],
  "^STI": ["Straits Times"],
  "^STOXX50E": ["Euro Stoxx 50", "Stoxx 50"],
  "^TNX": ["US 10Y", "10 year treasury"],
  "^TYX": ["US 30Y", "30 year treasury"],
  "^VIX": ["VIX", "volatility index"],
  "000001.SS": ["Shanghai Composite", "Shanghai"],
};

/**
 * Conservative aliases used for user-visible ticker attribution.
 *
 * Query aliases can be broad so a ticker search still finds useful coverage.
 * Article attribution has a higher bar: only exact symbols or unambiguous
 * instrument/company names belong here. When the text is ambiguous, returning
 * no symbol is preferable to showing a confidently wrong ticker.
 */
const NEWS_SYMBOL_INFERENCE_ALIASES: Readonly<
  Record<string, readonly string[]>
> = {
  AAPL: ["Apple Inc."],
  AMZN: ["Amazon.com"],
  "AUDUSD=X": ["AUD/USD", "Australian dollar / US dollar"],
  "BTC-USD": ["BTC/USD", "Bitcoin USD", "Bitcoin US dollar"],
  "BTC-AUD": ["BTC/AUD", "Bitcoin AUD", "Bitcoin Australian dollar"],
  "CL=F": ["WTI futures", "WTI crude futures"],
  "CBA.AX": ["Commonwealth Bank", "CBA"],
  "ETH-AUD": ["ETH/AUD", "Ethereum AUD", "Ethereum Australian dollar"],
  "EURUSD=X": ["EUR/USD", "Euro / US dollar"],
  "GC=F": ["gold futures"],
  "GBPUSD=X": ["GBP/USD", "British pound / US dollar"],
  "HG=F": ["copper futures"],
  META: ["Meta Platforms"],
  MSFT: ["Microsoft"],
  NVDA: ["NVIDIA"],
  "SI=F": ["silver futures"],
  SPCX: ["SpaceX", "Space Exploration Technologies"],
  TEAM: ["Atlassian"],
  TSLA: ["Tesla"],
  "USDJPY=X": ["USD/JPY", "US dollar / Japanese yen"],
  "WOW.AX": ["Woolworths Group"],
  "^AORD": ["All Ordinaries", "All Ords"],
  "^AXJO": ["ASX 200", "S&P/ASX 200"],
  "^DJI": ["Dow Jones Industrial Average"],
  "^GSPC": ["S&P 500", "Standard & Poor's 500"],
  "^IXIC": ["Nasdaq Composite"],
  "^VIX": ["CBOE Volatility Index", "VIX"],
};

const NEWS_SYMBOL_CONTEXTUAL_ALIASES: Readonly<
  Record<string, readonly string[]>
> = {
  AAPL: ["Apple"],
  AMZN: ["Amazon"],
};

const COMPANY_CONTEXT_PATTERN =
  /\b(company|earnings|iphone|investor|revenue|share|shares|stock|stocks)\b/i;
const TAGGED_ONLY_TICKER_SYMBOLS = new Set(["META", "TEAM"]);

type SymbolResultFilter = {
  aliases: readonly string[];
  conflictingAliases: readonly string[];
  exactAliases: readonly string[];
};

const SYMBOL_RESULT_FILTERS: Readonly<
  Record<
    string,
    Pick<SymbolResultFilter, "conflictingAliases" | "exactAliases">
  >
> = {
  "BTC-USD": {
    conflictingAliases: [
      "BTC/AUD",
      "BTC-AUD",
      "Bitcoin AUD",
      "Bitcoin Australian dollar",
    ],
    exactAliases: ["BTC/USD", "BTC-USD", "Bitcoin USD", "Bitcoin US dollar"],
  },
  "BTC-AUD": {
    conflictingAliases: [
      "BTC/USD",
      "BTC-USD",
      "Bitcoin USD",
      "Bitcoin US dollar",
    ],
    exactAliases: [
      "BTC/AUD",
      "BTC-AUD",
      "Bitcoin AUD",
      "Bitcoin Australian dollar",
    ],
  },
};

function normalize(value: string | undefined): string {
  return (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
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

export function compactSymbol(symbol: string | undefined): string {
  return (symbol ?? "").trim().toUpperCase();
}

export function getSymbolAliases(
  symbol: string | undefined,
): readonly string[] {
  const cleaned = compactSymbol(symbol);
  if (!cleaned) return [];

  const plain = cleaned.replace(SYMBOL_SUFFIX_PATTERN, "");
  return Array.from(
    new Set(
      [cleaned, plain, ...(NEWS_SYMBOL_ALIASES[cleaned] ?? [])].filter(Boolean),
    ),
  );
}

export function getPrimarySymbolName(symbol: string | undefined) {
  return NEWS_SYMBOL_ALIASES[compactSymbol(symbol)]?.[0];
}

export function getSymbolResultFilter(
  symbol: string | undefined,
): SymbolResultFilter {
  const cleaned = compactSymbol(symbol);
  const pairFilter = SYMBOL_RESULT_FILTERS[cleaned];

  return {
    aliases: getSymbolAliases(cleaned),
    conflictingAliases: pairFilter?.conflictingAliases ?? [],
    exactAliases: pairFilter?.exactAliases ?? [],
  };
}

function containsExplicitTicker(value: string, symbol: string): boolean {
  const escapedSymbol = escapeRegExp(symbol);
  const taggedTicker = new RegExp(
    `(?:\\$|\\b(?:ASX|NASDAQ|NYSE):)${escapedSymbol}(?=$|[^A-Z0-9])`,
    "i",
  );
  if (taggedTicker.test(value)) return true;
  if (TAGGED_ONLY_TICKER_SYMBOLS.has(symbol)) return false;

  if (/[.^=_-]/.test(symbol)) {
    return new RegExp(
      `(^|[^a-z0-9])${escapedSymbol}([^a-z0-9]|$)`,
      "i",
    ).test(value);
  }

  if (!COMPANY_CONTEXT_PATTERN.test(value)) return false;
  return new RegExp(
    `(^|[^A-Z0-9])${escapedSymbol}([^A-Z0-9]|$)`,
  ).test(value);
}

export function inferRelatedSymbolsFromText(
  value: string,
  { limit = 6 }: { limit?: number } = {},
): string[] {
  const text = normalize(value);
  const sourceText = value.replace(/\s+/g, " ").trim();
  const matches: string[] = [];

  for (const symbol of Object.keys(NEWS_SYMBOL_ALIASES)) {
    const inferenceAliases = NEWS_SYMBOL_INFERENCE_ALIASES[symbol] ?? [];
    const hasDirectMatch = inferenceAliases.some(
      (alias) => alias.length >= 2 && containsBoundedPhrase(text, alias),
    );
    const hasExplicitTicker = containsExplicitTicker(sourceText, symbol);
    const hasContextualMatch =
      COMPANY_CONTEXT_PATTERN.test(text) &&
      (NEWS_SYMBOL_CONTEXTUAL_ALIASES[symbol] ?? []).some(
        (alias) => alias.length >= 2 && containsBoundedPhrase(text, alias),
      );

    if (hasDirectMatch || hasExplicitTicker || hasContextualMatch) {
      matches.push(symbol);
    }

    if (matches.length >= limit) break;
  }

  return matches;
}
