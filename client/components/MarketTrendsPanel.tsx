import React, { useEffect, useMemo, useState } from 'react';
import { Box, Grid, IconButton } from '@mui/material';
import { ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from '@mui/icons-material';

type Quote = {
  symbol: string;
  price: number | null;
  prevClose?: number | null;
  change: number | null;
  changePct: number | null;
  shortName?: string;
  longName?: string;
};
type Pt = { t: number; v: number };

const GREEN = '#1db954';
const RED = '#ff4d4f';
const CARD = { bg: '#111', border: '#3b3b3b' };
const SEEDS_AU = ['^AORD', 'TEAM', 'WOW.AX', 'CBA.AX', 'NAB.AX'];

/* ---------- Sparkline ---------- */
type SparkProps = { data: number[]; base?: number | null; w: number; h: number };
function Sparkline({ data, base, w, h }: SparkProps) {
  const { path, yBase, endY } = useMemo(() => {
    if (!data || data.length === 0) {
      return { path: '', yBase: null as number | null, endY: null as number | null };
    }
    const min = Math.min(...data);
    const max = Math.max(...data);
    const ny = (v: number) => (max === min ? h / 2 : h - ((v - min) / (max - min)) * h);
    const step = data.length > 1 ? w / (data.length - 1) : 0;
    const d = data.map((v, i) => `${i ? 'L' : 'M'} ${i * step} ${ny(v)}`).join(' ');
    const yb = base == null ? null : ny(base);
    const ey = ny(data[data.length - 1]);
    return { path: d, yBase: yb, endY: ey };
  }, [data, base, w, h]);

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {yBase != null && (
        <line
          x1={0}
          x2={w}
          y1={yBase}
          y2={yBase}
          stroke="#888"
          strokeDasharray="2 4"
          strokeWidth="1"
          opacity={0.7}
        />
      )}
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.4" />
      {endY != null && <circle cx={w} cy={endY} r="2" fill="currentColor" />}
    </svg>
  );
}

/* ---------- data hooks ---------- */
async function getQuote(symbol: string): Promise<Quote | null> {
  try {
    const r = await fetch(`/api/market/quote?symbol=${encodeURIComponent(symbol)}`);
    const q = await r.json();
    if (q?.error) return null;
    return q;
  } catch {
    return null;
  }
}

function useQuoteAndLine(symbol: string) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [series, setSeries] = useState<number[]>([]);
  const [name, setName] = useState<string>(symbol);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [qr, sr] = await Promise.all([
        getQuote(symbol),
        fetch(`/api/market/sparkline?symbol=${encodeURIComponent(symbol)}`)
          .then((r) => r.json())
          .catch(() => null),
      ]);
      if (!alive) return;
      if (qr) {
        setQuote(qr);
        setName(qr.shortName || qr.longName || symbol);
      }
      const pts = (sr?.points ?? []).map((p: Pt) => p.v);
      setSeries(pts);
    };
    load();
    const iv = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [symbol]);

  return { quote, series, name };
}

/* ---------- sizes ---------- */
const SIZES = {
  compact: { tileMinH: 88, pad: 1, titleFs: 11, priceFs: 16, changeFs: 11, w: 96, h: 24 },
  regular: { tileMinH: 118, pad: 1.25, titleFs: 13, priceFs: 20, changeFs: 12, w: 120, h: 34 },
};

/* ---------- Overview tile ---------- */
interface OverviewTileProps {
  label: string;
  symbol: string;
  priceDigits?: number;
  size?: 'compact' | 'regular';
}
function OverviewTile({ label, symbol, priceDigits = 2, size = 'compact' }: OverviewTileProps) {
  const { quote, series } = useQuoteAndLine(symbol);
  const S = SIZES[size];
  const price = quote?.price ?? null;
  const prev = quote?.prevClose ?? null;
  const change = quote?.change ?? null;
  const pct = quote?.changePct ?? null;
  const up = (change ?? 0) >= 0;

  return (
    <Box
      sx={{
        p: S.pad,
        border: `1px dashed ${CARD.border}`,
        borderRadius: 1.5,
        bgcolor: CARD.bg,
        color: '#ddd',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        minHeight: S.tileMinH,
      }}
    >
      <Box sx={{ fontSize: S.titleFs, fontWeight: 700, color: '#4ea3ff', lineHeight: 1 }}>{label}</Box>
      <Box sx={{ fontSize: S.priceFs, fontWeight: 800 }}>
        {price != null ? price.toLocaleString(undefined, { maximumFractionDigits: priceDigits }) : '—'}
      </Box>
      <Box sx={{ color: up ? GREEN : RED }}>
        <Sparkline data={series} base={prev ?? undefined} w={S.w} h={S.h} />
      </Box>
      <Box sx={{ fontSize: S.changeFs, fontWeight: 700, color: up ? GREEN : RED }}>
        {change != null && pct != null ? `${up ? '+' : ''}${change.toFixed(2)} (${pct.toFixed(2)}%)` : '—'}
      </Box>
    </Box>
  );
}

/* ---------- Trending row ---------- */
function TrendingRow({ symbol }: { symbol: string }) {
  const { quote, series, name } = useQuoteAndLine(symbol);
  const price = quote?.price ?? null;
  const change = quote?.change ?? null;
  const pct = quote?.changePct ?? null;
  const up = (change ?? 0) >= 0;

  return (
    <Box
      sx={{
        px: 1,
        py: 0.75,
        borderBottom: `1px solid ${CARD.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Box sx={{ minWidth: 84, color: '#4ea3ff', fontWeight: 700, fontSize: 12 }}>{symbol}</Box>
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          color: '#aaa',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontSize: 12,
        }}
      >
        {name}
      </Box>
      <Box sx={{ width: 96, color: up ? GREEN : RED }}>
        <Sparkline data={series} w={96} h={24} />
      </Box>
      <Box sx={{ width: 100, textAlign: 'right', fontWeight: 800, fontSize: 12 }}>
        {price != null ? price.toLocaleString() : '—'}
      </Box>
      <Box sx={{ width: 100, textAlign: 'right', color: up ? GREEN : RED, fontWeight: 800, fontSize: 12 }}>
        {change != null && pct != null ? `${up ? '+' : ''}${change.toFixed(2)} (${pct.toFixed(2)}%)` : '—'}
      </Box>
    </Box>
  );
}

/* ---------- fallback trending ---------- */
async function fallbackTrending(watchlist?: string[], region = 'AU'): Promise<string[]> {
  const seedAU = [
    '^AORD',
    '^AXJO',
    'BHP.AX',
    'CBA.AX',
    'NAB.AX',
    'WBC.AX',
    'ANZ.AX',
    'CSL.AX',
    'WES.AX',
    'WOW.AX',
    'TLS.AX',
    'XRO.AX',
  ];
  const universe = Array.from(new Set([...(watchlist ?? []), ...(region === 'AU' ? seedAU : seedAU)]));
  const qs = await Promise.all(universe.map((s) => getQuote(s)));
  const ranked = qs
    .filter((q): q is Quote => !!q && q.changePct != null)
    .sort((a, b) => Math.abs(b.changePct!) - Math.abs(a.changePct!))
    .slice(0, 5)
    .map((q) => q.symbol);
  return ranked.length ? ranked : universe.slice(0, 5);
}

/* ---------- main panel ---------- */
export default function MarketTrendsPanel({
  region = 'AU',
  watchlist,
  variant = 'compact',
}: {
  region?: string;
  watchlist?: string[];
  variant?: 'compact' | 'regular';
}) {
  const [mode, setMode] = useState<0 | 1>(0);
  const left = () => setMode((m) => (m === 0 ? 1 : 0));
  const right = () => setMode((m) => (m === 1 ? 0 : 1));

  const overviewItems = useMemo(
    () => [
      { label: 'ALL ORDS', symbol: '^AORD' },
      { label: 'AUD/USD', symbol: 'AUDUSD=X', priceDigits: 6 },
      { label: 'ASX 200', symbol: '^AXJO' },
      { label: 'OIL', symbol: 'CL=F' },
      { label: 'GOLD', symbol: 'GC=F' },
      { label: 'Bitcoin AUD', symbol: 'BTC-AUD' },
    ],
    [region]
  );

  const [trendSyms, setTrendSyms] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const pre = Array.from(new Set([...(watchlist ?? []), ...SEEDS_AU])).slice(0, 5);
      if (alive) setTrendSyms(pre);
      try {

        const wl = (watchlist ?? []).join(',');
        const url =
            `/api/market/trending?region=${encodeURIComponent(region)}` +
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
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [region, JSON.stringify(watchlist ?? [])]);

  const S = SIZES[variant];

  return (
    <Box sx={{ mb: 1.25, color: '#ddd', maxWidth: 560 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Box sx={{ fontWeight: 900, fontSize: 14 }}>Today&apos;s Trend</Box>
        <Box>
          <IconButton size="small" onClick={left}  sx={{ color:'#bbb', border:'1px solid #555', mr:0.5 }}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={right} sx={{ color:'#bbb', border:'1px solid #555' }}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {mode === 0 ? (
        <Grid container spacing={1}>
          {overviewItems.map((it) => (
            <Grid key={it.label} item xs={12} sm={6} md={4}>
              <OverviewTile
                label={it.label}
                symbol={it.symbol}
                priceDigits={(it as any).priceDigits}
                size={variant}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ border: `1px solid ${CARD.border}`, borderRadius: 1.5, overflow: 'hidden', bgcolor: CARD.bg }}>
          <Box
            sx={{
              px: 1,
              py: 0.75,
              fontWeight: 800,
              borderBottom: `1px solid ${CARD.border}`,
              bgcolor: '#0f0f0f',
              fontSize: 12,
            }}
          >
            Trending tickers
          </Box>
          {trendSyms.length ? (
            trendSyms.map((s) => <TrendingRow key={s} symbol={s} />)
          ) : (
            <Box sx={{ p: 1.25, color: '#888', fontSize: 12 }}>No data</Box>
          )}
        </Box>
      )}
    </Box>
  );
}
