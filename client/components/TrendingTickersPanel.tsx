import { useEffect, useMemo, useState } from 'react';
import { Box, Divider, Typography } from '@mui/material';
import { TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon } from '@mui/icons-material';
import { getQuote, useQuoteAndLine } from '@/components/MarketTrendsPanel';

const GREEN = '#00c853';
const RED = '#ff1744';
const SEEDS_AU = ['^AORD', 'TEAM', 'WOW.AX', 'CBA.AX', 'NAB.AX'];

type Quote = {
  symbol: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
};

/* ---------- Sparkline ---------- */
function Sparkline({ data, w, h }: { data: number[]; w: number; h: number }) {
  const path = useMemo(() => {
    if (!data || data.length === 0) return '';
    const min = Math.min(...data);
    const max = Math.max(...data);
    const ny = (v: number) => (max === min ? h / 2 : h - ((v - min) / (max - min)) * h);
    const step = data.length > 1 ? w / (data.length - 1) : 0;
    return data.map((v, i) => `${i ? 'L' : 'M'} ${i * step} ${ny(v)}`).join(' ');
  }, [data, w, h]);

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

/* ---------- fallback trending ---------- */
async function fallbackTrending(watchlist?: string[], region = 'AU'): Promise<string[]> {
  const seedAU = ['^AORD', '^AXJO', 'BHP.AX', 'CBA.AX', 'NAB.AX', 'WBC.AX', 'ANZ.AX', 'CSL.AX', 'WES.AX', 'WOW.AX', 'TLS.AX', 'XRO.AX'];
  const universe = Array.from(new Set([...(watchlist ?? []), ...seedAU]));
  const qs = await Promise.all(universe.map((s) => getQuote(s)));
  const ranked = qs
    .filter((q): q is Quote & { changePct: number } => !!q && q.changePct != null)
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, 5)
    .map((q) => q.symbol);
  return ranked.length ? ranked : universe.slice(0, 5);
}

/* ---------- Single ticker row ---------- */
function TrendingRow({ symbol }: { symbol: string }) {
  const { quote, series, name } = useQuoteAndLine(symbol);
  const price = quote?.price ?? null;
  const change = quote?.change ?? null;
  const pct = quote?.changePct ?? null;
  const up = (change ?? 0) >= 0;
  const color = up ? GREEN : RED;

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center',
      px: 2, py: 1.5,
      gap: 2,
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      '&:last-child': { borderBottom: 'none' },
      '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
    }}>
      {/* Symbol + name */}
      <Box sx={{ minWidth: 80 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#5a8fff' }}>{symbol}</Typography>
        <Typography sx={{
          fontSize: 12, color: 'grey.500',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {name !== symbol ? name : ''}
        </Typography>
      </Box>

      {/* Sparkline */}
      <Box sx={{ flex: 1, color, display: 'flex', alignItems: 'center' }}>
        <Sparkline data={series} w={120} h={36} />
      </Box>

      {/* Price */}
      <Typography sx={{ fontWeight: 700, fontSize: 14, color: 'white', minWidth: 80, textAlign: 'right' }}>
        {price != null ? price.toLocaleString() : '—'}
      </Typography>

      {/* Change */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 110, justifyContent: 'flex-end' }}>
        {up
          ? <TrendingUpIcon sx={{ color, fontSize: 16 }} />
          : <TrendingDownIcon sx={{ color, fontSize: 16 }} />}
        <Typography sx={{ fontWeight: 700, fontSize: 13, color }}>
          {change != null && pct != null
            ? `${up ? '+' : ''}${pct.toFixed(2)}%`
            : '—'}
        </Typography>
      </Box>
    </Box>
  );
}

/* ---------- TrendingTickersPanel ---------- */
export default function TrendingTickersPanel({
  region = 'AU',
  watchlist,
}: {
  region?: string;
  watchlist?: string[];
}) {
  const [trendSyms, setTrendSyms] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      // Optimistic pre-fill
      const pre = Array.from(new Set([...(watchlist ?? []), ...SEEDS_AU])).slice(0, 5);
      if (alive) setTrendSyms(pre);
      try {
        const wl = (watchlist ?? []).join(',');
        const url = `/api/market/trending?region=${encodeURIComponent(region)}` +
          (wl ? `&watchlist=${encodeURIComponent(wl)}` : '');
        const r = await fetch(url);
        const j = await r.json();
        let arr: string[] = (j?.symbols ?? []).slice(0, 5);
        if (!arr.length) arr = await fallbackTrending(watchlist, region);
        if (alive && arr.length) setTrendSyms(arr);
      } catch {
        const arr = await fallbackTrending(watchlist, region);
        if (alive && arr.length) setTrendSyms(arr);
      }
    };
    load();
    const iv = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(iv); };
  }, [region, JSON.stringify(watchlist ?? [])]);

  return (
    <Box sx={{
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 3,
      bgcolor: '#0f0f0f',
      overflow: 'hidden',
      width: '100%',
    }}>
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 16, color: 'white' }}>
          Trending Tickers
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'grey.600' }} />
      {/* <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} /> */}
      {trendSyms.length ? (
        trendSyms.map((s) => <TrendingRow key={s} symbol={s} />)
      ) : (
        <Box sx={{ px: 2, py: 3 }}>
          <Typography sx={{ color: 'grey.600', fontSize: 13 }}>No data</Typography>
        </Box>
      )}
    </Box>
  );
}

// import React, { useEffect, useMemo, useState } from 'react';
// import { Box, Divider, Typography } from '@mui/material';
// import { TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon } from '@mui/icons-material';
// import { getQuote, useQuoteAndLine } from '@/components/MarketTrendsPanel';

// const GREEN = '#00c853';
// const RED = '#ff1744';
// const SEEDS_AU = ['^AORD', 'TEAM', 'WOW.AX', 'CBA.AX', 'NAB.AX'];

// type Quote = {
//   symbol: string;
//   price: number | null;
//   change: number | null;
//   changePct: number | null;
// };

// /* ---------- Sparkline ---------- */
// function Sparkline({ data, w, h }: { data: number[]; w: number; h: number }) {
//   const path = useMemo(() => {
//     if (!data || data.length === 0) return '';
//     const min = Math.min(...data);
//     const max = Math.max(...data);
//     const ny = (v: number) => (max === min ? h / 2 : h - ((v - min) / (max - min)) * h);
//     const step = data.length > 1 ? w / (data.length - 1) : 0;
//     return data.map((v, i) => `${i ? 'L' : 'M'} ${i * step} ${ny(v)}`).join(' ');
//   }, [data, w, h]);

//   return (
//     <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
//       <path d={path} fill="none" stroke="currentColor" strokeWidth="1.4" />
//     </svg>
//   );
// }

// /* ---------- fallback trending ---------- */
// async function fallbackTrending(watchlist?: string[], region = 'AU'): Promise<string[]> {
//   const seedAU = ['^AORD', '^AXJO', 'BHP.AX', 'CBA.AX', 'NAB.AX', 'WBC.AX', 'ANZ.AX', 'CSL.AX', 'WES.AX', 'WOW.AX', 'TLS.AX', 'XRO.AX'];
//   const universe = Array.from(new Set([...(watchlist ?? []), ...seedAU]));
//   const qs = await Promise.all(universe.map((s) => getQuote(s)));
//   const ranked = qs
//     .filter((q): q is Quote & { changePct: number } => !!q && q.changePct != null)
//     .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
//     .slice(0, 5)
//     .map((q) => q.symbol);
//   return ranked.length ? ranked : universe.slice(0, 5);
// }

// /* ---------- Single ticker row ---------- */
// function TrendingRow({ symbol }: { symbol: string }) {
//   const { quote, series, name } = useQuoteAndLine(symbol);
//   const price = quote?.price ?? null;
//   const change = quote?.change ?? null;
//   const pct = quote?.changePct ?? null;
//   const up = (change ?? 0) >= 0;
//   const color = up ? GREEN : RED;

//   return (
//     <Box sx={{
//       display: 'flex', alignItems: 'center',
//       px: 2, py: 1.5,
//       gap: 2,
//       '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
//     }}>
//       {/* Symbol + name */}
//       <Box sx={{ minWidth: 80 }}>
//         <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#5a8fff' }}>{symbol}</Typography>
//         <Typography sx={{
//           fontSize: 12, color: 'grey.500',
//           whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
//         }}>
//           {name !== symbol ? name : ''}
//         </Typography>
//       </Box>

//       {/* Sparkline */}
//       <Box sx={{ flex: 1, color, display: 'flex', alignItems: 'center' }}>
//         <Sparkline data={series} w={120} h={36} />
//       </Box>

//       {/* Price */}
//       <Typography sx={{ fontWeight: 700, fontSize: 14, color: 'white', minWidth: 80, textAlign: 'right' }}>
//         {price != null ? price.toLocaleString() : '—'}
//       </Typography>

//       {/* Change */}
//       <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 110, justifyContent: 'flex-end' }}>
//         {up
//           ? <TrendingUpIcon sx={{ color, fontSize: 16 }} />
//           : <TrendingDownIcon sx={{ color, fontSize: 16 }} />}
//         <Typography sx={{ fontWeight: 700, fontSize: 13, color }}>
//           {change != null && pct != null
//             ? `${up ? '+' : ''}${pct.toFixed(2)}%`
//             : '—'}
//         </Typography>
//       </Box>
//     </Box>
//   );
// }

// /* ---------- TrendingTickersPanel ---------- */
// export default function TrendingTickersPanel({
//   region = 'AU',
//   watchlist,
// }: {
//   region?: string;
//   watchlist?: string[];
// }) {
//   const [trendSyms, setTrendSyms] = useState<string[]>([]);

//   useEffect(() => {
//     let alive = true;
//     const load = async () => {
//       // Optimistic pre-fill
//       const pre = Array.from(new Set([...(watchlist ?? []), ...SEEDS_AU])).slice(0, 5);
//       if (alive) setTrendSyms(pre);
//       try {
//         const wl = (watchlist ?? []).join(',');
//         const url = `/api/market/trending?region=${encodeURIComponent(region)}` +
//           (wl ? `&watchlist=${encodeURIComponent(wl)}` : '');
//         const r = await fetch(url);
//         const j = await r.json();
//         let arr: string[] = (j?.symbols ?? []).slice(0, 5);
//         if (!arr.length) arr = await fallbackTrending(watchlist, region);
//         if (alive && arr.length) setTrendSyms(arr);
//       } catch {
//         const arr = await fallbackTrending(watchlist, region);
//         if (alive && arr.length) setTrendSyms(arr);
//       }
//     };
//     load();
//     const iv = setInterval(load, 60_000);
//     return () => { alive = false; clearInterval(iv); };
//   }, [region, JSON.stringify(watchlist ?? [])]);

//   return (
//     <Box sx={{
//       border: '1px solid rgba(255,255,255,0.1)',
//       borderRadius: 3,
//       bgcolor: '#0f0f0f',
//       overflow: 'hidden',
//       width: '100%',
//     }}>
//       <Box sx={{ px: 2, py: 1.5 }}>
//         <Typography sx={{ fontWeight: 700, fontSize: 16, color: 'white' }}>
//           Trending Tickers
//         </Typography>
//       </Box>
//       <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
//       {trendSyms.length ? (
//         trendSyms.map((s, i) => (
//           <React.Fragment key={s}>
//             <TrendingRow symbol={s} />
//             {i < trendSyms.length - 1 && (
//               <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mx: 2 }} />
//             )}
//           </React.Fragment>
//         ))
//       ) : (
//         <Box sx={{ px: 2, py: 3 }}>
//           <Typography sx={{ color: 'grey.600', fontSize: 13 }}>No data</Typography>
//         </Box>
//       )}
//     </Box>
//   );
// }

// import React, { useEffect, useState } from 'react';
// import { Box, Divider, Typography } from '@mui/material';
// import { TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon } from '@mui/icons-material';
// import { getQuote, useQuoteAndLine } from '@/components/MarketTrendsPanel';

// const GREEN = '#00c853';
// const RED = '#ff1744';
// const SEEDS_AU = ['^AORD', 'TEAM', 'WOW.AX', 'CBA.AX', 'NAB.AX'];

// type Quote = {
//   symbol: string;
//   price: number | null;
//   change: number | null;
//   changePct: number | null;
// };

// /* ---------- fallback trending ---------- */
// async function fallbackTrending(watchlist?: string[], region = 'AU'): Promise<string[]> {
//   const seedAU = ['^AORD', '^AXJO', 'BHP.AX', 'CBA.AX', 'NAB.AX', 'WBC.AX', 'ANZ.AX', 'CSL.AX', 'WES.AX', 'WOW.AX', 'TLS.AX', 'XRO.AX'];
//   const universe = Array.from(new Set([...(watchlist ?? []), ...seedAU]));
//   const qs = await Promise.all(universe.map((s) => getQuote(s)));
//   const ranked = qs
//     .filter((q): q is Quote & { changePct: number } => !!q && q.changePct != null)
//     .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
//     .slice(0, 5)
//     .map((q) => q.symbol);
//   return ranked.length ? ranked : universe.slice(0, 5);
// }

// /* ---------- Single ticker row ---------- */
// function TrendingRow({ symbol }: { symbol: string }) {
//   const { quote, name } = useQuoteAndLine(symbol);
//   const price = quote?.price ?? null;
//   const change = quote?.change ?? null;
//   const pct = quote?.changePct ?? null;
//   const up = (change ?? 0) >= 0;
//   const color = up ? GREEN : RED;

//   return (
//     <Box sx={{
//       display: 'flex', alignItems: 'center',
//       px: 2, py: 1.5,
//       gap: 2,
//       '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
//     }}>
//       {/* Symbol + name */}
//       <Box sx={{ flex: 1, minWidth: 0 }}>
//         <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#5a8fff' }}>{symbol}</Typography>
//         <Typography sx={{
//           fontSize: 12, color: 'grey.500',
//           whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
//         }}>
//           {name !== symbol ? name : ''}
//         </Typography>
//       </Box>

//       {/* Price */}
//       <Typography sx={{ fontWeight: 700, fontSize: 14, color: 'white', minWidth: 80, textAlign: 'right' }}>
//         {price != null ? price.toLocaleString() : '—'}
//       </Typography>

//       {/* Change */}
//       <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 110, justifyContent: 'flex-end' }}>
//         {up
//           ? <TrendingUpIcon sx={{ color, fontSize: 16 }} />
//           : <TrendingDownIcon sx={{ color, fontSize: 16 }} />}
//         <Typography sx={{ fontWeight: 700, fontSize: 13, color }}>
//           {change != null && pct != null
//             ? `${up ? '+' : ''}${pct.toFixed(2)}%`
//             : '—'}
//         </Typography>
//       </Box>
//     </Box>
//   );
// }

// /* ---------- TrendingTickersPanel ---------- */
// export default function TrendingTickersPanel({
//   region = 'AU',
//   watchlist,
// }: {
//   region?: string;
//   watchlist?: string[];
// }) {
//   const [trendSyms, setTrendSyms] = useState<string[]>([]);

//   useEffect(() => {
//     let alive = true;
//     const load = async () => {
//       // Optimistic pre-fill
//       const pre = Array.from(new Set([...(watchlist ?? []), ...SEEDS_AU])).slice(0, 5);
//       if (alive) setTrendSyms(pre);
//       try {
//         const wl = (watchlist ?? []).join(',');
//         const url = `/api/market/trending?region=${encodeURIComponent(region)}` +
//           (wl ? `&watchlist=${encodeURIComponent(wl)}` : '');
//         const r = await fetch(url);
//         const j = await r.json();
//         let arr: string[] = (j?.symbols ?? []).slice(0, 5);
//         if (!arr.length) arr = await fallbackTrending(watchlist, region);
//         if (alive && arr.length) setTrendSyms(arr);
//       } catch {
//         const arr = await fallbackTrending(watchlist, region);
//         if (alive && arr.length) setTrendSyms(arr);
//       }
//     };
//     load();
//     const iv = setInterval(load, 60_000);
//     return () => { alive = false; clearInterval(iv); };
//   }, [region, JSON.stringify(watchlist ?? [])]);

//   return (
//     <Box sx={{
//       border: '1px solid rgba(255,255,255,0.1)',
//       borderRadius: 3,
//       bgcolor: '#0f0f0f',
//       overflow: 'hidden',
//       width: '100%',
//     }}>
//       <Box sx={{ px: 2, py: 1.5 }}>
//         <Typography sx={{ fontWeight: 700, fontSize: 16, color: 'white' }}>
//           Trending Tickers
//         </Typography>
//       </Box>
//       <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
//       {trendSyms.length ? (
//         trendSyms.map((s, i) => (
//           <React.Fragment key={s}>
//             <TrendingRow symbol={s} />
//             {i < trendSyms.length - 1 && (
//               <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mx: 2 }} />
//             )}
//           </React.Fragment>
//         ))
//       ) : (
//         <Box sx={{ px: 2, py: 3 }}>
//           <Typography sx={{ color: 'grey.600', fontSize: 13 }}>No data</Typography>
//         </Box>
//       )}
//     </Box>
//   );
// }