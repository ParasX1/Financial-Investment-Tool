const SYMBOL_SUFFIX_PATTERN = /(\.AX|=X|=F)$/i;

export const NEWS_SYMBOL_ALIASES: Record<string, readonly string[]> = {
  AAPL: ["Apple Inc.", "Apple"],
  AMZN: ["Amazon"],
  "AUDUSD=X": ["Australian dollar", "AUD/USD", "Aussie dollar"],
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

export function inferRelatedSymbolsFromText(
  value: string,
  { limit = 6 }: { limit?: number } = {},
): string[] {
  const text = normalize(value);
  const matches: string[] = [];

  for (const symbol of Object.keys(NEWS_SYMBOL_ALIASES)) {
    if (
      getSymbolAliases(symbol).some(
        (alias) => alias.length >= 2 && containsBoundedPhrase(text, alias),
      )
    ) {
      matches.push(symbol);
    }

    if (matches.length >= limit) break;
  }

  return matches;
}
