import type { NextApiRequest, NextApiResponse } from 'next';
import {
  admitMarketApiRequest,
  beginMarketApiRequest,
  MARKET_API_PRIVATE_CACHE_CONTROL,
  MARKET_PROVIDER_TIMEOUT_MS,
} from '@/lib/server/marketApiGuard';
import {
  fetchYahooQuoteSnapshots,
  getYahooQuoteProviderLog,
  normalizeYahooMarketSymbol,
  YahooQuoteProviderError,
} from '@/lib/server/yahooQuoteProvider';

type QuoteResp = {
  symbol: string;
  price: number | null;
  prevClose: number | null;
  change: number | null;
  changePct: number | null;
  currency?: string;
  marketState?: string;
  shortName?: string;
  longName?: string;
};

const MARKET_DATA_UNAVAILABLE = 'Market data unavailable';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QuoteResp | { error: string }>
) {
  if (!beginMarketApiRequest(req, res)) return;
  if (
    !admitMarketApiRequest(req, res, {
      namespace: 'market-quote',
      errorMessage: 'Too many quote requests. Please wait a moment.',
    })
  ) {
    return;
  }

  try {
    const symbol = normalizeYahooMarketSymbol(String(req.query.symbol ?? ''));
    if (!symbol) {
      res.status(400).json({ error: 'symbol is required' });
      return;
    }

    const [quote] = await fetchYahooQuoteSnapshots([symbol], {
      timeoutMs: MARKET_PROVIDER_TIMEOUT_MS,
    });
    if (!quote || quote.price === null) {
      throw new YahooQuoteProviderError('invalid-payload');
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

    res.status(200).json({
      symbol,
      price: quote.price,
      prevClose: quote.previousClose,
      change: quote.change,
      changePct: quote.changePercent,
      currency: quote.currency ?? undefined,
      marketState: quote.marketState ?? undefined,
      shortName: quote.shortName ?? undefined,
      longName: quote.longName ?? undefined,
    });
  } catch (error: unknown) {
    console.error('Market quote error', getYahooQuoteProviderLog(error));
    res.setHeader('Cache-Control', MARKET_API_PRIVATE_CACHE_CONTROL);
    res.status(502).json({
      error: MARKET_DATA_UNAVAILABLE,
    });
  }
}
