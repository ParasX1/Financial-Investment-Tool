import type { NextApiRequest, NextApiResponse } from 'next';

type Pt = { t: number; v: number };
type SparkResp = { symbol: string; points: Pt[] };

export default async function handler(req: NextApiRequest, res: NextApiResponse<SparkResp | { error: string }>) {
  try {
    const symbol = String(req.query.symbol ?? '').trim().toUpperCase();
    if (!symbol) { res.status(400).json({ error: 'symbol is required' }); return; }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m`;
    const r = await fetch(url, { headers: { 'User-Agent': 'trend-proxy' } });
    const json = await r.json();

    const chart = json?.chart?.result?.[0];
    const ts: number[] = chart?.timestamp ?? [];
    const closes: number[] = chart?.indicators?.quote?.[0]?.close ?? [];

    const points: Pt[] = [];
    for (let i = 0; i < Math.min(ts.length, closes.length); i++) {
      const v = closes[i];
      if (typeof v === 'number') points.push({ t: ts[i] * 1000, v });
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json({ symbol, points });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'internal error' });
  }
}
