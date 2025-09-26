import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/sidebar';
import { Box, Grid, Autocomplete, TextField, Chip, Snackbar, Alert, Button } from '@mui/material';
import StockChartCard, { stockDataMap } from '@/components/StockCardComponent';
import NewsCardComponent from '@/components/NewsCardComponent';
import WatchlistCollapsibleCard from '@/components/WatchlistCollapsibleCard';
import supabase from '@/components/supabase';
import { useAuth } from '@/components/authContext';
import MarketTrendsPanel from '@/components/MarketTrendsPanel';
import { Paper, ButtonGroup, Tooltip, InputAdornment, Typography, Divider } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import { createFilterOptions } from '@mui/material/Autocomplete';

const MAX_ROWS = 3;

export default function WatchlistPage() {
  const { user } = useAuth();
  const stockOptions = useMemo(() => Object.keys(stockDataMap), []);
  const [tags, setTags] = useState<string[]>([]);
  const [charts, setCharts] = useState<(string | null)[]>(Array(MAX_ROWS).fill(null));
  const [collapsedRows, setCollapsedRows] = useState<boolean[]>(Array(MAX_ROWS).fill(false));
  const [toast, setToast] = useState<{open: boolean; msg: string; type: 'success'|'error'}>({open:false,msg:'',type:'success'});
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const filter = createFilterOptions<string>();
  const [input, setInput] = useState('');


  const showToast = (msg: string, type: 'success'|'error'='success') =>
    setToast({open:true, msg, type});

  // Loading from DB to watchlist
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from('user_watchlist')
        .select('symbol, position')
        .eq('user_id', user.id)
        .order('position', { ascending: true });

      if (error) { console.error(error); showToast(`Load watchlist failed: ${error.message}`, 'error'); return; }

      const arr: (string|null)[] = Array(MAX_ROWS).fill(null);
      (data ?? []).forEach(r => {
        if (r.position >= 0 && r.position < MAX_ROWS) arr[r.position] = r.symbol;
      });
      setCharts(arr);
      setTags(arr.filter(Boolean) as string[]);
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(async () => {
      try {
        const toUpsert = charts
          .map((sym, i) => sym ? { user_id: user.id, position: i, symbol: sym } : null)
          .filter(Boolean) as {user_id:string;position:number;symbol:string}[];

        if (toUpsert.length) {
          const { error: upErr } = await supabase
            .from('user_watchlist')
            .upsert(toUpsert, { onConflict: 'user_id,position' });
          if (upErr) throw upErr;
        }

        const emptyPositions = charts
          .map((sym, i) => (sym ? null : i))
          .filter((v): v is number => v !== null);

        if (emptyPositions.length) {
          const { error: delErr } = await supabase
            .from('user_watchlist')
            .delete()
            .eq('user_id', user.id)
            .in('position', emptyPositions);
          if (delErr) throw delErr;
        }
      } catch (e: any) {
        console.error(e);
        showToast(`Save failed: ${e.message ?? e}`, 'error');
      }
    }, 400); 
    return () => clearTimeout(timer);
  }, [charts, user]);

  useEffect(() => {
    const syms = (charts.filter(Boolean) as string[]);
    if (!syms.length) return;

    (async () => {
      const { data, error } = await supabase
        .from('tickers')             
        .select('symbol,name')       
        .in('symbol', syms);

      if (!error && data) {
        const m: Record<string, string> = {};
        data.forEach(r => { m[r.symbol] = r.name; });
        setNameMap(prev => ({ ...prev, ...m })); 
      } else if (error) {
        console.error('load ticker names failed:', error);
      }
    })();
  }, [charts.join('|')]);
  const displayName = (t?: string | null) => (t ? (nameMap[t] ?? t) : undefined);
  const newsQuery   = (t?: string | null) => {
    if (!t) return undefined;
    const n = nameMap[t];
    return n ? `${t} OR "${n}"` : t;
  };

  const onTagsChange = (_: any, t: string[]) => {
    const dedup = Array.from(new Set(t)).slice(0, MAX_ROWS);
    setTags(dedup);
    setCharts([dedup[0] ?? null, dedup[1] ?? null, dedup[2] ?? null]);
  };

  const clearChart = (i: number) =>
    setCharts(prev => {
      const next = [...prev];
      next[i] = null;
      setTags(tags.filter(t => t !== prev[i]));
      return next;
    });

  const swapVert = (i: number) => {
    if (i === 0) return;
    setCharts(([a,b,c]) => (i === 1 ? [b,a,c] : [c,b,a]));
    setCollapsedRows(([a,b,c]) => (i === 1 ? [b,a,c] : [c,b,a]));
  };

  const setRowCollapsed = (row: number, val: boolean) =>
    setCollapsedRows(prev => { const n=[...prev]; n[row]=val; return n; });
  const openAll  = () => setCollapsedRows(Array(MAX_ROWS).fill(false));
  const closeAll = () => setCollapsedRows(Array(MAX_ROWS).fill(true));

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flex: 1, pl: '50px', bgcolor: 'black' }}>

        <Paper
            elevation={0}
            sx={{
                px: 2,
                py: 1.25,
                position: 'sticky',
                top: 0,
                zIndex: 9,

                bgcolor: 'rgba(10,10,10,.55)',                
                backdropFilter: 'blur(10px) saturate(130%)',
                WebkitBackdropFilter: 'blur(10px) saturate(130%)',

                border: '1px solid rgba(255,255,255,.06)',
                borderRadius: 2,
                boxShadow: '0 8px 20px rgba(0,0,0,.35)',

                '&::after': {
                content: '""',
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: -1,
                height: 12,
                background: 'linear-gradient(to bottom, rgba(0,0,0,.28), rgba(0,0,0,0))',
                pointerEvents: 'none',
                },
            }}
            >
            

            <Box
                sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'minmax(360px,1fr) minmax(420px,560px)' },
                alignItems: 'start',
                gap: 2,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                <Autocomplete
                    multiple
                    freeSolo
                    options={stockOptions}
                    value={tags}
                    onChange={onTagsChange}
                    disabled={!user}
                    renderTags={(value, getTagProps) =>
                        value.map((opt, i) => (
                        <Chip
                            {...getTagProps({ index: i })}
                            key={opt}
                            label={opt}
                            size="small"
                            sx={{
                            bgcolor: '#7a3cff',
                            color: '#fff',
                            fontWeight: 700,
                            borderRadius: '16px',
                            '& .MuiChip-label': { px: 0.75 },
                            }}
                        />
                        ))
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
                            minWidth: 150,
                            '& .MuiOutlinedInput-root': {
                                bgcolor: '#fff',
                                color: '#000',
                                borderRadius: 2,
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
                        bgcolor: '#fff',
                        color: '#000',
                        borderRadius: 2,
                        boxShadow: '0 8px 28px rgba(0,0,0,.35)',

                        '& .MuiAutocomplete-option[aria-selected="true"]': {
                        bgcolor: 'rgba(122,60,255,.12)',
                        },
                        '& .MuiAutocomplete-option.Mui-focused': {
                        bgcolor: 'rgba(122,60,255,.18)',
                        },
                    },
                    },
                }}
                    sx={{ flexGrow: 1, minWidth: 260, '& .MuiAutocomplete-inputRoot': { flexWrap: 'wrap' } }}
                    />


                <ButtonGroup variant="outlined" size="small" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Expand all cards">
                    <Button onClick={openAll} startIcon={<UnfoldMoreIcon fontSize="small" />}>
                        OPEN ALL
                    </Button>
                    </Tooltip>
                    <Tooltip title="Collapse all cards">
                    <Button onClick={closeAll} startIcon={<UnfoldLessIcon fontSize="small" />}>
                        CLOSE ALL
                    </Button>
                    </Tooltip>
                </ButtonGroup>
                </Box>

                <Box sx={{ justifySelf: { xs: 'stretch', md: 'end' } }}>
                <MarketTrendsPanel
                    region="AU"
                    variant="compact"
                    watchlist={(charts.filter(Boolean) as string[])}
                />
                </Box>
            </Box>
            </Paper>
        
         
        <Box sx={{ p: 2 }}>
          <Grid container spacing={2}>
            {[0,1,2].map(row => {
              const collapsed = collapsedRows[row];
              const newsHeight = collapsed ? 110 : 350;

              return (
                <React.Fragment key={row}>
                  <Grid item xs={12} md={6}>
                    <WatchlistCollapsibleCard
                      index={row}
                      selectedStock={charts[row]}
                      onClear={clearChart}
                      onSwap={swapVert}
                      height={350}
                      collapsed={collapsed}
                      onCollapsedChange={(val) => setRowCollapsed(row, val)}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <NewsCardComponent
                      index={1}
                      title={charts[row] ? `News: ${displayName(charts[row])}` : 'Watchlist News'}
                      height={newsHeight}
                      filterTicker={newsQuery(charts[row])} 
                    />
                  </Grid>
                </React.Fragment>
              );
            })}
          </Grid>
        </Box>
      </Box>

      <Snackbar open={toast.open} autoHideDuration={2200} onClose={() => setToast({ ...toast, open: false })}>
        <Alert severity={toast.type} variant="filled" sx={{ width: '100%' }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
