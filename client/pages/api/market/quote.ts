import type { NextApiRequest, NextApiResponse } from 'next';

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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

const MARKET_DATA_UNAVAILABLE = 'Market data unavailable';
const MARKET_DATA_ERROR_CACHE = 'private, no-store, max-age=0';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QuoteResp | { error: string }>
) {
  try {
    const symbol = String(req.query.symbol ?? '').trim().toUpperCase();
    if (!symbol) {
      res.status(400).json({ error: 'symbol is required' });
      return;
    }

    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
      symbol
    )}`;
    const r = await fetch(url, { headers: { 'User-Agent': 'trend-proxy' } });
    if (!r.ok) {
      throw new Error(`Yahoo Finance quote ${r.status}`);
    }

    const json = await r.json();

    const q = json?.quoteResponse?.result?.[0];
    if (!q) {
      throw new Error('Yahoo Finance quote missing result');
    }

    const price = isFiniteNumber(q?.regularMarketPrice)
      ? q.regularMarketPrice
      : null;
    const prevClose = isFiniteNumber(q?.regularMarketPreviousClose)
      ? q.regularMarketPreviousClose
      : null;
    const change =
      isFiniteNumber(q?.regularMarketChange)
        ? q.regularMarketChange
        : price != null && prevClose != null
          ? price - prevClose
          : null;
    const changePct =
      isFiniteNumber(q?.regularMarketChangePercent)
        ? q.regularMarketChangePercent
        : price != null && prevClose != null && prevClose !== 0
          ? ((price - prevClose) / prevClose) * 100
          : null;

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

    res.status(200).json({
      symbol,
      price,
      prevClose,
      change,
      changePct,
      currency: q?.currency,
      marketState: q?.marketState,
      shortName: q?.shortName,
      longName: q?.longName,
    });
  } catch (error: unknown) {
    console.error('Market quote error', error);
    res.setHeader('Cache-Control', MARKET_DATA_ERROR_CACHE);
    res.status(502).json({
      error: MARKET_DATA_UNAVAILABLE,
    });
  }
}
