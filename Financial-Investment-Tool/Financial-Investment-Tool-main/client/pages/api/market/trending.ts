import type { NextApiRequest, NextApiResponse } from 'next';

type Ok = { region: string; symbols: string[]; source: 'official' | 'fallback' };
type Resp = Ok | { error: string };

async function fetchOfficial(region: string): Promise<string[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/trending/region/${encodeURIComponent(
    region
  )}?count=10`;
  const r = await fetch(url, { headers: { 'User-Agent': 'trend-proxy' } });
  const json = await r.json();
  const quotes = json?.finance?.result?.[0]?.quotes ?? [];
  return quotes.map((q: any) => q?.symbol).filter(Boolean);
}

function dedupe<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

async function fetchFallback(region: string, watchlist?: string[]): Promise<string[]> {
  const seedAU = [
    '^AORD', '^AXJO', 'BHP.AX', 'CBA.AX', 'NAB.AX', 'WBC.AX',
    'ANZ.AX', 'CSL.AX', 'WES.AX', 'WOW.AX', 'TLS.AX', 'XRO.AX',
  ];

  const seeds = region.toUpperCase() === 'AU' ? seedAU : seedAU;
  const universe = dedupe([...(watchlist ?? []), ...seeds]).slice(0, 30);
  if (universe.length === 0) return [];

  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
    universe.join(',')
  )}`;
  const r = await fetch(url, { headers: { 'User-Agent': 'trend-proxy' } });
  const json = await r.json();
  const rows: any[] = json?.quoteResponse?.result ?? [];

  const scored = rows
    .map((q) => {
      const pct =
        typeof q?.regularMarketChangePercent === 'number'
          ? q.regularMarketChangePercent
          : (() => {
              const p = q?.regularMarketPrice;
              const pc = q?.regularMarketPreviousClose;
              if (typeof p === 'number' && typeof pc === 'number' && pc !== 0) {
                return ((p - pc) / pc) * 100;
              }
              return null;
            })();
      return { symbol: q?.symbol as string, pct };
    })
    .filter((x) => x.symbol && typeof x.pct === 'number')
    .sort((a, b) => Math.abs(b.pct!) - Math.abs(a.pct!))
    .slice(0, 5)
    .map((x) => x.symbol);

  return scored.length ? scored : universe.slice(0, 5);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Resp>
) {
  try {
    const region = String(req.query.region ?? 'AU').toUpperCase();
    const watchlistParam = String(req.query.watchlist ?? '').trim();
    const watchlist = watchlistParam
      ? watchlistParam.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;

    let symbols: string[] = [];
    try {
      symbols = await fetchOfficial(region);
    } catch {
      symbols = [];
    }

    if (!symbols.length) {
      const fb = await fetchFallback(region, watchlist);
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
      res.status(200).json({ region, symbols: fb, source: 'fallback' });
      return;
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json({ region, symbols, source: 'official' });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'internal error' });
  }
}
