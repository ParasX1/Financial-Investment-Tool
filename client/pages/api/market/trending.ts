import type { NextApiRequest, NextApiResponse } from 'next';

type Ok = { region: string; symbols: string[]; source: 'official' | 'fallback' };
type Resp = Ok | { error: string };

type YahooFetchResponse = Pick<Response, 'json' | 'ok' | 'status'>;
type YahooTrendingQuote = {
  symbol?: unknown;
};
type YahooQuoteRow = {
  regularMarketChangePercent?: unknown;
  regularMarketPreviousClose?: unknown;
  regularMarketPrice?: unknown;
  symbol?: unknown;
};

const PUBLIC_TRENDING_CACHE = 's-maxage=60, stale-while-revalidate=300';
const PRIVATE_TRENDING_CACHE = 'private, no-store, max-age=0';
const YAHOO_USER_AGENT = 'trend-proxy';
const MARKET_DATA_UNAVAILABLE = 'Market data unavailable';
const FALLBACK_SEEDS_BY_REGION: Record<string, readonly string[]> = {
  AU: [
    '^AORD', '^AXJO', 'BHP.AX', 'CBA.AX', 'NAB.AX', 'WBC.AX',
    'ANZ.AX', 'CSL.AX', 'WES.AX', 'WOW.AX', 'TLS.AX', 'XRO.AX',
  ],
  GB: [
    '^FTSE', '^FCHI', '^GDAXI', '^STOXX50E', 'ASML.AS', 'SHEL.L',
    'AZN.L', 'HSBA.L', 'SAP.DE', 'MC.PA',
  ],
  SG: [
    '000001.SS', '^N225', '^HSI', '^KS11', '9988.HK', '0700.HK',
    '7203.T', '6758.T', '005930.KS',
  ],
  US: [
    '^GSPC', '^DJI', '^IXIC', 'NVDA', 'AAPL', 'MSFT', 'AMZN',
    'META', 'TSLA', 'GOOGL', 'AMD',
  ],
};

class YahooProviderError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function parseSymbol(value: unknown) {
  return typeof value === 'string' ? normalizeSymbol(value) : '';
}

function dedupeSymbols(symbols: readonly string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  symbols.forEach((symbol) => {
    const normalized = normalizeSymbol(symbol);
    if (!normalized || seen.has(normalized)) return;

    seen.add(normalized);
    unique.push(normalized);
  });

  return unique;
}

function parseWatchlist(value: string | string[] | undefined) {
  const raw = firstQueryValue(value);
  if (!raw) return [];

  return dedupeSymbols(raw.split(',')).slice(0, 30);
}

function getCacheControl(watchlist: readonly string[]) {
  return watchlist.length ? PRIVATE_TRENDING_CACHE : PUBLIC_TRENDING_CACHE;
}

async function fetchYahooJson(url: string, label: string): Promise<unknown> {
  const response = (await fetch(url, {
    headers: { 'User-Agent': YAHOO_USER_AGENT },
  })) as YahooFetchResponse;

  if (!response.ok) {
    throw new YahooProviderError(502, `Yahoo Finance ${label} ${response.status}`);
  }

  return response.json();
}

async function fetchOfficial(region: string): Promise<string[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/trending/region/${encodeURIComponent(
    region
  )}?count=10`;
  const json = await fetchYahooJson(url, 'trending');
  const quotes =
    (json as { finance?: { result?: Array<{ quotes?: YahooTrendingQuote[] }> } })
      ?.finance?.result?.[0]?.quotes ?? [];

  return dedupeSymbols(quotes.map((quote) => parseSymbol(quote.symbol)));
}

async function fetchFallback(region: string, watchlist: readonly string[]): Promise<string[]> {
  const seeds =
    FALLBACK_SEEDS_BY_REGION[region.toUpperCase()] ??
    FALLBACK_SEEDS_BY_REGION.US;
  const universe = dedupeSymbols([...watchlist, ...seeds]).slice(0, 30);
  if (universe.length === 0) return [];

  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
    universe.join(',')
  )}`;
  const json = await fetchYahooJson(url, 'quote');
  const rows =
    (json as { quoteResponse?: { result?: YahooQuoteRow[] } })?.quoteResponse
      ?.result ?? [];

  const scored = rows
    .map((q) => {
      const price = q.regularMarketPrice;
      const previousClose = q.regularMarketPreviousClose;
      const pct = isFiniteNumber(q.regularMarketChangePercent)
        ? q.regularMarketChangePercent
        : isFiniteNumber(price) &&
            isFiniteNumber(previousClose) &&
            previousClose !== 0
          ? ((price - previousClose) / previousClose) * 100
          : null;

      return { symbol: parseSymbol(q.symbol), pct };
    })
    .filter(
      (candidate): candidate is { symbol: string; pct: number } =>
        Boolean(candidate.symbol) && isFiniteNumber(candidate.pct),
    )
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, 5)
    .map((x) => x.symbol);

  return scored.length ? scored : universe.slice(0, 5);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Resp>
) {
  try {
    const region = (firstQueryValue(req.query.region) || 'AU')
      .trim()
      .toUpperCase();
    const watchlist = parseWatchlist(req.query.watchlist);
    const cacheControl = getCacheControl(watchlist);

    let symbols: string[] = [];
    try {
      symbols = await fetchOfficial(region);
    } catch {
      symbols = [];
    }

    if (!symbols.length) {
      const fb = await fetchFallback(region, watchlist);
      res.setHeader('Cache-Control', cacheControl);
      res.status(200).json({ region, symbols: fb, source: 'fallback' });
      return;
    }

    res.setHeader('Cache-Control', cacheControl);
    res.status(200).json({ region, symbols, source: 'official' });
  } catch (cause: unknown) {
    if (cause instanceof YahooProviderError) {
      console.error('Market trending provider error', cause);
      res.status(cause.statusCode).json({ error: MARKET_DATA_UNAVAILABLE });
      return;
    }

    console.error('Market trending error', cause);
    res.status(500).json({
      error: MARKET_DATA_UNAVAILABLE,
    });
  }
}
