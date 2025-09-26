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
    const json = await r.json();

    const q = json?.quoteResponse?.result?.[0];
    const price = q?.regularMarketPrice ?? null;
    const prevClose = q?.regularMarketPreviousClose ?? null;
    const change =
      price != null && prevClose != null ? price - prevClose : null;
    const changePct =
      price != null && prevClose != null && prevClose !== 0
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
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'internal error' });
  }
}
