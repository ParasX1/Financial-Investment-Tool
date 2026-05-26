import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/sidebar';
import {
  Box, Button, ButtonGroup, Chip, Collapse, CssBaseline, Grid,
  Divider, IconButton, Snackbar, Alert,
  TextField, Tooltip, Typography, ThemeProvider, Autocomplete,
} from '@mui/material';
import { TrendingDown, TrendingUp } from '@mui/icons-material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Search as SearchIcon,
  UnfoldMore as UnfoldMoreIcon,
  UnfoldLess as UnfoldLessIcon,
  SwapVert as SwapVertIcon,
} from '@mui/icons-material';
import { createFilterOptions } from '@mui/material/Autocomplete';
import StockChartCard, { stockDataMap } from '@/components/StockCardComponent';
import NewsCardComponent from '@/components/NewsCardComponent';
import WatchlistCollapsibleCard from '@/components/WatchlistCollapsibleCard';
import MarketTrendsPanel from '@/components/MarketTrendsPanel';
import TrendingTickersPanel from '@/components/TrendingTickersPanel';

import supabase from '@/components/supabase';
import { useAuth } from '@/components/authContext';
import { theme } from '@/styles/theme';

const MAX_ROWS = 3;

// ─── Market index card (new UI style) ────────────────────────────────────────
function StatisticsCard({ stock_name, stock_value, stock_growth_rate }: {
  stock_name: string;
  stock_value: number;
  stock_growth_rate: number;
}) {
  const isPositive = stock_growth_rate > 0;
  const color = isPositive ? '#00c853' : '#ff1744';
  const text = (isPositive ? '+' : '') + stock_growth_rate + '%';
  return (
    <Box sx={{
      width: 200, height: 120, border: '1px solid rgba(255,255,255,0.1)',
      m: 2, padding: 2, borderRadius: 3, display: 'flex', flexDirection: 'column',
      background: '#0f0f0f',
      '&:hover': { borderColor: 'rgba(255,255,255,0.25)' },
    }}>
      <Typography color="text.secondary" sx={{ fontSize: 13 }}>{stock_name}</Typography>
      <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white', my: 0.5 }}>{stock_value}</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 0.5 }}>
        {isPositive
          ? <TrendingUp sx={{ color, fontSize: 18 }} />
          : <TrendingDown sx={{ color, fontSize: 18 }} />}
        <Typography sx={{ color, fontSize: 13 }}>{text}</Typography>
      </Box>
    </Box>
  );
}

// ─── Collapsible stock row (new UI card style, old backend components inside) ─
function CollapsableStockItem({
  row,
  selectedStock,
  displayName,
  newsQuery,
  expanded,
  onToggle,
  onSwap,
}: {
  row: number;
  selectedStock: string | null;
  displayName: string | undefined;
  newsQuery: string | undefined;
  expanded: boolean;
  onToggle: () => void;
  onSwap: (i: number) => void;
}) {
  return (
    <Box sx={{
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 3,
      overflow: 'hidden',
      background: '#0f0f0f',
      mb: 2,
    }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', px: 3, py: 2,
          cursor: 'pointer',
          '&:hover': { background: 'rgba(255,255,255,0.03)' },
        }}
        onClick={onToggle}
      >
        <Box>
          <Typography sx={{ fontWeight: 'bold', fontSize: 20, color: 'white' }}>
            {selectedStock ?? <span style={{ color: '#555' }}>Empty slot {row + 1}</span>}
          </Typography>
          {displayName && (
            <Typography sx={{ color: 'grey.500', fontSize: 13, mt: 0.25 }}>
              {displayName}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {row > 0 && (
            <Tooltip title="Move up">
              <IconButton
                size="small"
                sx={{ color: 'grey.500' }}
                onClick={e => { e.stopPropagation(); onSwap(row); }}
              >
                <SwapVertIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <IconButton sx={{ color: 'grey.400' }}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>

      {/* Collapsible content */}
      <Collapse in={expanded} sx={{ width: '100%' }}>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
        <Box sx={{ display: 'flex', flexDirection: 'row', px: 3, py: 3, gap: 4, width: '100%' }}>

          {/* Chart — reuse old WatchlistCollapsibleCard */}
          <Box sx={{ flex: 1, width: '50%' }}>
            <Typography sx={{ fontWeight: 'bold', color: 'white', mb: 2 }}>
              90-Day Performance
            </Typography>
            <WatchlistCollapsibleCard
              index={row}
              selectedStock={selectedStock}
              onSwap={onSwap}
              height={300}
              collapsed={false}
              onCollapsedChange={() => { }}
              hideHeader
            />
          </Box>

          {/* News — reuse old NewsCardComponent */}
          <Box sx={{ width: '50%', display: 'flex', flexDirection: 'column' }}>
            <Typography sx={{ fontWeight: 'bold', color: 'white', mb: 2 }}>
              Related News
            </Typography>
            <NewsCardComponent
              index={row}
              title={selectedStock ? `News: ${displayName ?? selectedStock}` : 'Watchlist News'}
              height={300}
              filterTicker={newsQuery}
            />
          </Box>

        </Box>
      </Collapse>
    </Box>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function WatchlistPage() {
  const { user } = useAuth();
  const stockOptions = useMemo(() => Object.keys(stockDataMap), []);
  const [tags, setTags] = useState<string[]>([]);
  const [charts, setCharts] = useState<(string | null)[]>(Array(MAX_ROWS).fill(null));
  const [expandedSet, setExpandedSet] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({ open: false, msg: '', type: 'success' });
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const filter = createFilterOptions<string>();

  const showToast = (msg: string, type: 'success' | 'error' = 'success') =>
    setToast({ open: true, msg, type });

  // Load watchlist from DB
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from('user_watchlist')
        .select('symbol, position')
        .eq('user_id', user.id)
        .order('position', { ascending: true });

      if (error) { showToast(`Load watchlist failed: ${error.message}`, 'error'); return; }

      const arr: (string | null)[] = Array(MAX_ROWS).fill(null);
      const allSymbols = new Set<string>();
      (data ?? []).forEach((r: { symbol: string; position: number }) => {
        if (r.position >= 0 && r.position < MAX_ROWS) arr[r.position] = r.symbol;
        allSymbols.add(r.symbol);
      });
      setCharts(arr);
      setTags(Array.from(allSymbols));
    })();
  }, [user]);

  // Auto-save watchlist to DB (debounced)
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(async () => {
      try {
        const { error: delErr } = await supabase
          .from('user_watchlist').delete().eq('user_id', user.id);
        if (delErr) throw delErr;

        const toInsert = charts
          .map((sym, i) => sym ? { user_id: user.id, position: i, symbol: sym } : null)
          .filter(Boolean) as { user_id: string; position: number; symbol: string }[];

        if (toInsert.length) {
          const { error: insErr } = await supabase.from('user_watchlist').insert(toInsert);
          if (insErr) throw insErr;
        }
      } catch (e: any) {
        showToast(`Save failed: ${e.message ?? e}`, 'error');
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [charts, user]);

  // Load ticker names
  useEffect(() => {
    const syms = charts.filter(Boolean) as string[];
    if (!syms.length) return;
    (async () => {
      const { data, error } = await supabase
        .from('tickers').select('symbol,name').in('symbol', syms);
      if (!error && data) {
        const m: Record<string, string> = {};
        data.forEach((r: { symbol: string; name: string }) => { m[r.symbol] = r.name; });
        setNameMap(prev => ({ ...prev, ...m }));
      }
    })();
  }, [charts.join('|')]);

  const displayName = (t?: string | null) => (t ? (nameMap[t] ?? t) : undefined);
  const newsQuery = (t?: string | null) => {
    if (!t) return undefined;
    const n = nameMap[t];
    return n ? `${t} OR "${n}"` : t;
  };

  // Tag / chart management
  const onTagsChange = (_: any, newTags: string[]) => {
    const dedup = Array.from(new Set(newTags)).slice(0, MAX_ROWS);
    setTags(dedup);
    setCharts(prev => prev.map(s => (s && dedup.includes(s)) ? s : null));
  };

  const handleSelectStock = (stock: string) => {
    setCharts(prev => {
      if (prev.includes(stock)) return prev.map(s => s === stock ? null : s);
      const firstEmpty = prev.findIndex(s => s === null);
      if (firstEmpty !== -1) { const next = [...prev]; next[firstEmpty] = stock; return next; }
      return prev;
    });
  };

  const swapVert = (i: number) => {
    if (i === 0) return;
    setCharts(([a, b, c]) => (i === 1 ? [b, a, c] : [c, b, a]));
    setExpandedSet(prev => {
      // swap expanded state for the two rows being swapped
      const next = new Set(prev);
      const iHad = next.has(i);
      const jHad = next.has(i === 1 ? 0 : 2);  // the row being swapped with
      const j = i === 1 ? 0 : 2;
      iHad ? next.add(j) : next.delete(j);
      jHad ? next.add(i) : next.delete(i);
      return next;
    });
  };

  // Expand / collapse
  const handleToggle = (index: number) => {
    setExpandedSet(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };
  const handleExpandAll = () => setExpandedSet(new Set([0, 1, 2]));
  const handleCollapseAll = () => setExpandedSet(new Set());

  // Market index cards (static — same as new UI)
  const marketIndices = [
    { stock_name: 'S&P 500', stock_value: 5284.31, stock_growth_rate: 0.87 },
    { stock_name: 'NASDAQ', stock_value: 16920.79, stock_growth_rate: 1.24 },
    { stock_name: 'Dow Jones', stock_value: 39512.84, stock_growth_rate: 0.23 },
    { stock_name: 'VIX', stock_value: 14.23, stock_growth_rate: -2.45 },
  ];

  const allExpanded = [0, 1, 2].every(i => expandedSet.has(i));

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <Box
          component="main"
          id="main-content"
          tabIndex={-1}
          sx={{
            flex: 1,
            pl: 'var(--app-sidebar-width, 64px)',
            bgcolor: 'black',
            transition: 'padding-left 200ms ease',
          }}
        >

          {/* ── Page title + market index cards ── */}
          <Box sx={{ px: 4, pt: 4 }}>
            <Typography sx={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>Watchlist</Typography>
            <Typography color="text.secondary">Monitor your favorite stocks with charts and related news</Typography>

            {/* Search bar */}
            <Box sx={{ mt: 2, mb: 1, display: 'flex', justifyContent: 'center' }}>
              <Autocomplete
                multiple freeSolo
                options={stockOptions}
                value={tags}
                onChange={onTagsChange}
                disabled={!user}
                filterOptions={filter}
                renderTags={(value, getTagProps) =>
                  value.map((opt, i) => {
                    const isSelected = charts.includes(opt);
                    return (
                      <Chip
                        {...getTagProps({ index: i })}
                        key={opt}
                        label={opt}
                        size="small"
                        onClick={() => handleSelectStock(opt)}
                        sx={{
                          bgcolor: isSelected ? '#7a3cff' : '#ddd',
                          color: isSelected ? '#fff' : '#000',
                          fontWeight: 700, borderRadius: '16px',
                          '& .MuiChip-label': { px: 0.75 },
                          '&:hover': { bgcolor: isSelected ? '#6530d9' : '#ccc' },
                        }}
                      />
                    );
                  })
                }
                renderInput={(params) => {
                  const { InputProps, ...rest } = params;
                  return (
                    <TextField
                      {...rest}
                      placeholder="Search Stocks…"
                      size="small"
                      variant="outlined"
                      InputProps={{
                        ...InputProps,
                        startAdornment: (
                          <>
                            <SearchIcon fontSize="small" sx={{ mr: 1, color: '#666' }} />
                            {InputProps.startAdornment}
                          </>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: '#fff', color: '#000', borderRadius: 2,
                          '& fieldset': { borderColor: '#c8c8c8' },
                          '&:hover fieldset': { borderColor: '#9c9c9c' },
                          '&.Mui-focused fieldset': { borderColor: '#7a3cff' },
                        },
                      }}
                    />
                  );
                }}
                slotProps={{
                  paper: {
                    sx: {
                      bgcolor: '#fff', color: '#000', borderRadius: 2,
                      boxShadow: '0 8px 28px rgba(0,0,0,.35)',
                      '& .MuiAutocomplete-option[aria-selected="true"]': { bgcolor: 'rgba(122,60,255,.12)' },
                      '& .MuiAutocomplete-option.Mui-focused': { bgcolor: 'rgba(122,60,255,.18)' },
                    },
                  },
                }}
                sx={{ width: '100%', maxWidth: 600 }}
              />
            </Box>

            {/* <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', mt: 1 }}>
              {marketIndices.map(item => (
                <StatisticsCard key={item.stock_name} {...item} />
              ))}
            </Box> */}

            <Grid container spacing={3} sx={{ mt: 1, mb: 1 }}>
              <Grid item xs={12} md={6}>
                <MarketTrendsPanel region="AU" variant="compact" watchlist={charts.filter(Boolean) as string[]} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TrendingTickersPanel region="AU" watchlist={charts.filter(Boolean) as string[]} />
              </Grid>
            </Grid>

          </Box>

          {/* ── Stock rows ── */}
          <Box sx={{ px: 4, pb: 4 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 16, color: 'white', p: 2 }}>My Watchlist</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              {/* <ButtonGroup variant="outlined" size="small">
                <Tooltip title="Expand all">
                  <Button onClick={handleExpandAll} startIcon={<UnfoldMoreIcon fontSize="small" />}>
                    OPEN ALL
                  </Button>
                </Tooltip>
                <Tooltip title="Collapse all">
                  <Button onClick={handleCollapseAll} startIcon={<UnfoldLessIcon fontSize="small" />}>
                    CLOSE ALL
                  </Button>
                </Tooltip>
              </ButtonGroup> */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Tooltip title={allExpanded ? 'Collapse all' : 'Expand all'}>
                  {/* <Button
                    variant="outlined"
                    size="small"
                    onClick={allExpanded ? handleCollapseAll : handleExpandAll}
                    startIcon={allExpanded ? <UnfoldLessIcon fontSize="small" /> : <UnfoldMoreIcon fontSize="small" />}
                  >
                    {allExpanded ? 'CLOSE ALL' : 'OPEN ALL'}
                  </Button> */}
                  <Button
                    variant="contained"
                    size="small"
                    onClick={allExpanded ? handleCollapseAll : handleExpandAll}
                    startIcon={allExpanded ? <UnfoldLessIcon fontSize="small" /> : <UnfoldMoreIcon fontSize="small" />}
                    sx={{
                      background: 'linear-gradient(45deg, #5a5afc 30%, #ea19ea 90%)',
                      color: 'white',
                      fontWeight: 'bold',
                      '&:hover': { background: 'linear-gradient(45deg, #4444e0 30%, #c010c0 90%)' },
                    }}
                  >
                    {allExpanded ? 'CLOSE ALL' : 'OPEN ALL'}
                  </Button>
                </Tooltip>
              </Box>
            </Box>
            {[0, 1, 2].map(row => (
              <CollapsableStockItem
                key={row}
                row={row}
                selectedStock={charts[row]}
                displayName={displayName(charts[row])}
                newsQuery={newsQuery(charts[row])}
                expanded={expandedSet.has(row)}
                onToggle={() => handleToggle(row)}
                onSwap={swapVert}
              />
            ))}
          </Box>

        </Box>
      </Box>

      <Snackbar open={toast.open} autoHideDuration={2200} onClose={() => setToast({ ...toast, open: false })}>
        <Alert severity={toast.type} variant="filled" sx={{ width: '100%' }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

// import React, { useEffect, useMemo, useState } from 'react';
// import Sidebar from '@/components/sidebar';
// import {
//   Box, Button, ButtonGroup, Chip, Collapse, CssBaseline,
//   Divider, IconButton, Paper, Snackbar, Alert,
//   TextField, Tooltip, Typography, ThemeProvider, Autocomplete,
// } from '@mui/material';
// import { TrendingDown, TrendingUp } from '@mui/icons-material';
// import ExpandLessIcon from '@mui/icons-material/ExpandLess';
// import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
// import {
//   Search as SearchIcon,
//   UnfoldMore as UnfoldMoreIcon,
//   UnfoldLess as UnfoldLessIcon,
//   SwapVert as SwapVertIcon,
// } from '@mui/icons-material';
// import { createFilterOptions } from '@mui/material/Autocomplete';
// import StockChartCard, { stockDataMap } from '@/components/StockCardComponent';
// import NewsCardComponent from '@/components/NewsCardComponent';
// import WatchlistCollapsibleCard from '@/components/WatchlistCollapsibleCard';
// import MarketTrendsPanel from '@/components/MarketTrendsPanel';
// import supabase from '@/components/supabase';
// import { useAuth } from '@/components/authContext';
// import { theme } from '@/styles/theme';

// const MAX_ROWS = 3;

// // ─── Market index card (new UI style) ────────────────────────────────────────
// function StatisticsCard({ stock_name, stock_value, stock_growth_rate }: {
//   stock_name: string;
//   stock_value: number;
//   stock_growth_rate: number;
// }) {
//   const isPositive = stock_growth_rate > 0;
//   const color = isPositive ? '#00c853' : '#ff1744';
//   const text = (isPositive ? '+' : '') + stock_growth_rate + '%';
//   return (
//     <Box sx={{
//       width: 200, height: 120, border: '1px solid rgba(255,255,255,0.1)',
//       m: 2, padding: 2, borderRadius: 3, display: 'flex', flexDirection: 'column',
//       background: '#0f0f0f',
//       '&:hover': { borderColor: 'rgba(255,255,255,0.25)' },
//     }}>
//       <Typography color="text.secondary" sx={{ fontSize: 13 }}>{stock_name}</Typography>
//       <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white', my: 0.5 }}>{stock_value}</Typography>
//       <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 0.5 }}>
//         {isPositive
//           ? <TrendingUp sx={{ color, fontSize: 18 }} />
//           : <TrendingDown sx={{ color, fontSize: 18 }} />}
//         <Typography sx={{ color, fontSize: 13 }}>{text}</Typography>
//       </Box>
//     </Box>
//   );
// }

// // ─── Collapsible stock row (new UI card style, old backend components inside) ─
// function CollapsableStockItem({
//   row,
//   selectedStock,
//   displayName,
//   newsQuery,
//   expanded,
//   onToggle,
//   onSwap,
// }: {
//   row: number;
//   selectedStock: string | null;
//   displayName: string | undefined;
//   newsQuery: string | undefined;
//   expanded: boolean;
//   onToggle: () => void;
//   onSwap: (i: number) => void;
// }) {
//   return (
//     <Box sx={{
//       border: '1px solid rgba(255,255,255,0.1)',
//       borderRadius: 3,
//       overflow: 'hidden',
//       background: '#0f0f0f',
//       mb: 2,
//     }}>
//       {/* Header */}
//       <Box
//         sx={{
//           display: 'flex', alignItems: 'center',
//           justifyContent: 'space-between', px: 3, py: 2,
//           cursor: 'pointer',
//           '&:hover': { background: 'rgba(255,255,255,0.03)' },
//         }}
//         onClick={onToggle}
//       >
//         <Box>
//           <Typography sx={{ fontWeight: 'bold', fontSize: 20, color: 'white' }}>
//             {selectedStock ?? <span style={{ color: '#555' }}>Empty slot {row + 1}</span>}
//           </Typography>
//           {displayName && (
//             <Typography sx={{ color: 'grey.500', fontSize: 13, mt: 0.25 }}>
//               {displayName}
//             </Typography>
//           )}
//         </Box>
//         <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
//           {row > 0 && (
//             <Tooltip title="Move up">
//               <IconButton
//                 size="small"
//                 sx={{ color: 'grey.500' }}
//                 onClick={e => { e.stopPropagation(); onSwap(row); }}
//               >
//                 <SwapVertIcon fontSize="small" />
//               </IconButton>
//             </Tooltip>
//           )}
//           <IconButton sx={{ color: 'grey.400' }}>
//             {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
//           </IconButton>
//         </Box>
//       </Box>

//       {/* Collapsible content */}
//       <Collapse in={expanded} sx={{ width: '100%' }}>
//         <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
//         <Box sx={{ display: 'flex', flexDirection: 'row', px: 3, py: 3, gap: 4, width: '100%' }}>

//           {/* Chart — reuse old WatchlistCollapsibleCard */}
//           <Box sx={{ flex: 1, width: '50%' }}>
//             <Typography sx={{ fontWeight: 'bold', color: 'white', mb: 2 }}>
//               90-Day Performance
//             </Typography>
//             <WatchlistCollapsibleCard
//               index={row}
//               selectedStock={selectedStock}
//               onSwap={onSwap}
//               height={300}
//               collapsed={false}
//               onCollapsedChange={() => {}}
//               hideHeader
//             />
//           </Box>

//           {/* News — reuse old NewsCardComponent */}
//           <Box sx={{ width: '50%', display: 'flex', flexDirection: 'column' }}>
//             <Typography sx={{ fontWeight: 'bold', color: 'white', mb: 2 }}>
//               Related News
//             </Typography>
//             <NewsCardComponent
//               index={row}
//               title={selectedStock ? `News: ${displayName ?? selectedStock}` : 'Watchlist News'}
//               height={300}
//               filterTicker={newsQuery}
//             />
//           </Box>

//         </Box>
//       </Collapse>
//     </Box>
//   );
// }

// // ─── Main page ────────────────────────────────────────────────────────────────
// export default function WatchlistPage() {
//   const { user } = useAuth();
//   const stockOptions = useMemo(() => Object.keys(stockDataMap), []);
//   const [tags, setTags] = useState<string[]>([]);
//   const [charts, setCharts] = useState<(string | null)[]>(Array(MAX_ROWS).fill(null));
//   const [expandedSet, setExpandedSet] = useState<Set<number>>(new Set());
//   const [toast, setToast] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({ open: false, msg: '', type: 'success' });
//   const [nameMap, setNameMap] = useState<Record<string, string>>({});
//   const filter = createFilterOptions<string>();

//   const showToast = (msg: string, type: 'success' | 'error' = 'success') =>
//     setToast({ open: true, msg, type });

//   // Load watchlist from DB
//   useEffect(() => {
//     if (!user) return;
//     (async () => {
//       const { data, error } = await supabase
//         .from('user_watchlist')
//         .select('symbol, position')
//         .eq('user_id', user.id)
//         .order('position', { ascending: true });

//       if (error) { showToast(`Load watchlist failed: ${error.message}`, 'error'); return; }

//       const arr: (string | null)[] = Array(MAX_ROWS).fill(null);
//       const allSymbols = new Set<string>();
//       (data ?? []).forEach((r: { symbol: string; position: number }) => {
//         if (r.position >= 0 && r.position < MAX_ROWS) arr[r.position] = r.symbol;
//         allSymbols.add(r.symbol);
//       });
//       setCharts(arr);
//       setTags(Array.from(allSymbols));
//     })();
//   }, [user]);

//   // Auto-save watchlist to DB (debounced)
//   useEffect(() => {
//     if (!user) return;
//     const timer = setTimeout(async () => {
//       try {
//         const { error: delErr } = await supabase
//           .from('user_watchlist').delete().eq('user_id', user.id);
//         if (delErr) throw delErr;

//         const toInsert = charts
//           .map((sym, i) => sym ? { user_id: user.id, position: i, symbol: sym } : null)
//           .filter(Boolean) as { user_id: string; position: number; symbol: string }[];

//         if (toInsert.length) {
//           const { error: insErr } = await supabase.from('user_watchlist').insert(toInsert);
//           if (insErr) throw insErr;
//         }
//       } catch (e: any) {
//         showToast(`Save failed: ${e.message ?? e}`, 'error');
//       }
//     }, 400);
//     return () => clearTimeout(timer);
//   }, [charts, user]);

//   // Load ticker names
//   useEffect(() => {
//     const syms = charts.filter(Boolean) as string[];
//     if (!syms.length) return;
//     (async () => {
//       const { data, error } = await supabase
//         .from('tickers').select('symbol,name').in('symbol', syms);
//       if (!error && data) {
//         const m: Record<string, string> = {};
//         data.forEach((r: { symbol: string; name: string }) => { m[r.symbol] = r.name; });
//         setNameMap(prev => ({ ...prev, ...m }));
//       }
//     })();
//   }, [charts.join('|')]);

//   const displayName = (t?: string | null) => (t ? (nameMap[t] ?? t) : undefined);
//   const newsQuery = (t?: string | null) => {
//     if (!t) return undefined;
//     const n = nameMap[t];
//     return n ? `${t} OR "${n}"` : t;
//   };

//   // Tag / chart management
//   const onTagsChange = (_: any, newTags: string[]) => {
//     const dedup = Array.from(new Set(newTags)).slice(0, MAX_ROWS);
//     setTags(dedup);
//     setCharts(prev => prev.map(s => (s && dedup.includes(s)) ? s : null));
//   };

//   const handleSelectStock = (stock: string) => {
//     setCharts(prev => {
//       if (prev.includes(stock)) return prev.map(s => s === stock ? null : s);
//       const firstEmpty = prev.findIndex(s => s === null);
//       if (firstEmpty !== -1) { const next = [...prev]; next[firstEmpty] = stock; return next; }
//       return prev;
//     });
//   };

//   const swapVert = (i: number) => {
//     if (i === 0) return;
//     setCharts(([a, b, c]) => (i === 1 ? [b, a, c] : [c, b, a]));
//     setExpandedSet(prev => {
//       // swap expanded state for the two rows being swapped
//       const next = new Set(prev);
//       const iHad = next.has(i);
//       const jHad = next.has(i === 1 ? 0 : 2);  // the row being swapped with
//       const j = i === 1 ? 0 : 2;
//       iHad ? next.add(j) : next.delete(j);
//       jHad ? next.add(i) : next.delete(i);
//       return next;
//     });
//   };

//   // Expand / collapse
//   const handleToggle = (index: number) => {
//     setExpandedSet(prev => {
//       const next = new Set(prev);
//       next.has(index) ? next.delete(index) : next.add(index);
//       return next;
//     });
//   };
//   const handleExpandAll = () => setExpandedSet(new Set([0, 1, 2]));
//   const handleCollapseAll = () => setExpandedSet(new Set());

//   // Market index cards (static — same as new UI)
//   const marketIndices = [
//     { stock_name: 'S&P 500',  stock_value: 5284.31,  stock_growth_rate: 0.87 },
//     { stock_name: 'NASDAQ',   stock_value: 16920.79, stock_growth_rate: 1.24 },
//     { stock_name: 'Dow Jones',stock_value: 39512.84, stock_growth_rate: 0.23 },
//     { stock_name: 'VIX',      stock_value: 14.23,    stock_growth_rate: -2.45 },
//   ];

//   return (
//     <ThemeProvider theme={theme}>
//       <CssBaseline />
//       <Box sx={{ display: 'flex', minHeight: '100vh' }}>
//         <Sidebar />
//         <Box
//           component="main"
//           id="main-content"
//           tabIndex={-1}
//           sx={{
//             flex: 1,
//             pl: 'var(--app-sidebar-width, 64px)',
//             bgcolor: 'black',
//             transition: 'padding-left 200ms ease',
//           }}
//         >

//           {/* ── Sticky header (new UI glass style) ── */}
//           <Paper elevation={0} sx={{
//             px: 2, py: 1.25,
//             position: 'sticky', top: 0, zIndex: 9,
//             bgcolor: 'rgba(10,10,10,.55)',
//             backdropFilter: 'blur(10px) saturate(130%)',
//             WebkitBackdropFilter: 'blur(10px) saturate(130%)',
//             border: '1px solid rgba(255,255,255,.06)',
//             borderRadius: 2,
//             boxShadow: '0 8px 20px rgba(0,0,0,.35)',
//           }}>
//             <Box sx={{
//               display: 'grid',
//               gridTemplateColumns: { xs: '1fr', md: 'minmax(360px,1fr) minmax(420px,560px)' },
//               alignItems: 'start', gap: 2,
//             }}>
//               {/* Search */}
//               <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
//                 <Autocomplete
//                   multiple freeSolo
//                   options={stockOptions}
//                   value={tags}
//                   onChange={onTagsChange}
//                   disabled={!user}
//                   filterOptions={filter}
//                   renderTags={(value, getTagProps) =>
//                     value.map((opt, i) => {
//                       const isSelected = charts.includes(opt);
//                       return (
//                         <Chip
//                           {...getTagProps({ index: i })}
//                           key={opt}
//                           label={opt}
//                           size="small"
//                           onClick={() => handleSelectStock(opt)}
//                           sx={{
//                             bgcolor: isSelected ? '#7a3cff' : '#ddd',
//                             color: isSelected ? '#fff' : '#000',
//                             fontWeight: 700, borderRadius: '16px',
//                             '& .MuiChip-label': { px: 0.75 },
//                             '&:hover': { bgcolor: isSelected ? '#6530d9' : '#ccc' },
//                           }}
//                         />
//                       );
//                     })
//                   }
//                   renderInput={(params) => {
//                     const { InputProps, ...rest } = params;
//                     return (
//                       <TextField
//                         {...rest}
//                         placeholder="Search Stocks…"
//                         size="small"
//                         variant="outlined"
//                         InputProps={{
//                           ...InputProps,
//                           startAdornment: (
//                             <>
//                               <SearchIcon fontSize="small" sx={{ mr: 1, color: '#666' }} />
//                               {InputProps.startAdornment}
//                             </>
//                           ),
//                         }}
//                         sx={{
//                           minWidth: 150,
//                           '& .MuiOutlinedInput-root': {
//                             bgcolor: '#fff', color: '#000', borderRadius: 2,
//                             '& fieldset': { borderColor: '#c8c8c8' },
//                             '&:hover fieldset': { borderColor: '#9c9c9c' },
//                             '&.Mui-focused fieldset': { borderColor: '#7a3cff' },
//                           },
//                         }}
//                       />
//                     );
//                   }}
//                   slotProps={{
//                     paper: {
//                       sx: {
//                         bgcolor: '#fff', color: '#000', borderRadius: 2,
//                         boxShadow: '0 8px 28px rgba(0,0,0,.35)',
//                         '& .MuiAutocomplete-option[aria-selected="true"]': { bgcolor: 'rgba(122,60,255,.12)' },
//                         '& .MuiAutocomplete-option.Mui-focused': { bgcolor: 'rgba(122,60,255,.18)' },
//                       },
//                     },
//                   }}
//                   sx={{ flexGrow: 1, minWidth: 260 }}
//                 />

//               </Box>

//               {/* MarketTrendsPanel */}
//               <Box sx={{ justifySelf: { xs: 'stretch', md: 'end' } }}>
//                 <MarketTrendsPanel
//                   region="AU"
//                   variant="compact"
//                   watchlist={charts.filter(Boolean) as string[]}
//                 />
//               </Box>
//             </Box>
//           </Paper>

//           {/* ── Page title + market index cards ── */}
//           <Box sx={{ px: 4, pt: 4 }}>
//             <Typography sx={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>Watchlist</Typography>
//             <Typography color="text.secondary">Monitor your favorite stocks with charts and related news</Typography>

//             <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', mt: 1 }}>
//               {marketIndices.map(item => (
//                 <StatisticsCard key={item.stock_name} {...item} />
//               ))}
//             </Box>
//           </Box>

//           {/* ── Stock rows ── */}
//           <Box sx={{ px: 4, pb: 4 }}>
//             <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
//               <ButtonGroup variant="outlined" size="small">
//                 <Tooltip title="Expand all">
//                   <Button onClick={handleExpandAll} startIcon={<UnfoldMoreIcon fontSize="small" />}>
//                     OPEN ALL
//                   </Button>
//                 </Tooltip>
//                 <Tooltip title="Collapse all">
//                   <Button onClick={handleCollapseAll} startIcon={<UnfoldLessIcon fontSize="small" />}>
//                     CLOSE ALL
//                   </Button>
//                 </Tooltip>
//               </ButtonGroup>
//             </Box>
//             {[0, 1, 2].map(row => (
//               <CollapsableStockItem
//                 key={row}
//                 row={row}
//                 selectedStock={charts[row]}
//                 displayName={displayName(charts[row])}
//                 newsQuery={newsQuery(charts[row])}
//                 expanded={expandedSet.has(row)}
//                 onToggle={() => handleToggle(row)}
//                 onSwap={swapVert}
//               />
//             ))}
//           </Box>

//         </Box>
//       </Box>

//       <Snackbar open={toast.open} autoHideDuration={2200} onClose={() => setToast({ ...toast, open: false })}>
//         <Alert severity={toast.type} variant="filled" sx={{ width: '100%' }}>
//           {toast.msg}
//         </Alert>
//       </Snackbar>
//     </ThemeProvider>
//   );
// }