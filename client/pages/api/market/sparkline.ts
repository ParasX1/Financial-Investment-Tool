import type { NextApiRequest, NextApiResponse } from 'next';

type Pt = { t: number; v: number };
type SparkResp = {
  symbol: string;
  points: Pt[];
  previousClose: number | null;
  regularMarketPrice: number | null;
};

const MARKET_DATA_UNAVAILABLE = 'Market data unavailable';
const MARKET_DATA_ERROR_CACHE = 'private, no-store, max-age=0';

async function fetchYahooChart(
  symbol: string,
) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m`;
  const r = await fetch(url, { headers: { 'User-Agent': 'trend-proxy' } });
  if (!r.ok) {
    throw new Error(`Yahoo Finance chart ${r.status}`);
  }

  const json = await r.json();
  const chart = json?.chart?.result?.[0];
  if (!chart) {
    throw new Error('Yahoo Finance chart missing result');
  }

  const ts: number[] = chart?.timestamp ?? [];
  const closes: number[] = chart?.indicators?.quote?.[0]?.close ?? [];
  const previousClose =
    typeof chart?.meta?.previousClose === 'number'
      ? chart.meta.previousClose
      : typeof chart?.meta?.chartPreviousClose === 'number'
        ? chart.meta.chartPreviousClose
        : typeof chart?.meta?.regularMarketPreviousClose === 'number'
          ? chart.meta.regularMarketPreviousClose
          : null;
  const regularMarketPrice =
    typeof chart?.meta?.regularMarketPrice === 'number'
      ? chart.meta.regularMarketPrice
      : null;

  const points: Pt[] = [];
  for (let i = 0; i < Math.min(ts.length, closes.length); i++) {
    const v = closes[i];
    if (typeof v === 'number') points.push({ t: ts[i] * 1000, v });
  }

  return { points, previousClose, regularMarketPrice };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<SparkResp | { error: string }>) {
  try {
    const symbol = String(req.query.symbol ?? '').trim().toUpperCase();
    if (!symbol) { res.status(400).json({ error: 'symbol is required' }); return; }

    const { points, previousClose, regularMarketPrice } =
      await fetchYahooChart(symbol);

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json({ symbol, points, previousClose, regularMarketPrice });
  } catch (error: unknown) {
    console.error('Market sparkline error', error);
    res.setHeader('Cache-Control', MARKET_DATA_ERROR_CACHE);
    res.status(502).json({
      error: MARKET_DATA_UNAVAILABLE,
    });
  }
}
