import React, { useEffect, useMemo, useState } from 'react';
import { Box, Tabs, Tab, FormControl, InputLabel, Select, MenuItem, Divider, Chip, Stack } from '@mui/material';
import Sidebar from '@/components/sidebar';
import NewsCardComponent from '@/components/NewsCardComponent';
import { useAuth } from '@/components/authContext';
import supabase from '@/components/supabase';

type TabKey = 'general' | 'watchlist' | 'regional' | 'industry' | 'commodity';

const TOPBAR_H = 64;

const MarketNews: React.FC = () => {
  const { user } = useAuth();

  const [active, setActive] = useState<TabKey>('general');
  const [region, setRegion] = useState('au');
  const [industry, setIndustry] = useState('technology');
  const [commodity, setCommodity] = useState('gold');
  const [limit, setLimit] = useState<number>(12);

  const [watchlistSyms, setWatchlistSyms] = useState<string[]>([]);
  const [watchSel, setWatchSel] = useState<'ALL' | string>('ALL');

  useEffect(() => {
    if (!user) { setWatchlistSyms([]); setWatchSel('ALL'); return; }
    (async () => {
      const { data, error } = await supabase
        .from('user_watchlist')
        .select('symbol, position')
        .eq('user_id', user.id)
        .order('position', { ascending: true });

      if (error) { console.error('load watchlist failed:', error); setWatchlistSyms([]); setWatchSel('ALL'); return; }

      const symbols = (data ?? []).map(d => d.symbol).filter(Boolean) as string[];
      setWatchlistSyms(symbols);
      setWatchSel(prev => (prev !== 'ALL' && symbols.includes(prev) ? prev : 'ALL'));
    })();
  }, [user]);

  const watchlistQuery = useMemo(() => {
    if (!watchlistSyms.length) return '';
    return watchSel === 'ALL'
      ? watchlistSyms.slice(0, 3).join(' OR ')
      : watchSel;
  }, [watchlistSyms, watchSel]);

  const chipSx = (active: boolean) => ({
    color: active ? '#fff' : 'rgba(255,255,255,0.88)',
    borderColor: 'rgba(255,255,255,0.36)',
    bgcolor: active ? 'secondary.main' : 'rgba(255,255,255,0.08)',
    fontWeight: 600,
    '&:hover': {
        bgcolor: active ? 'secondary.dark' : 'rgba(255,255,255,0.16)',
        borderColor: 'rgba(255,255,255,0.48)',
    },
    });

  const section = useMemo(() => {
    const commonProps = { height: '100%', limit, dark: true, fullscreenOffsetTop: TOPBAR_H } as const;

    switch (active) {
      case 'general':
        return <NewsCardComponent {...commonProps} index={0} title="General News" />;
      case 'watchlist':
        return (
          <NewsCardComponent
            {...commonProps}
            index={1}
            title={watchSel === 'ALL' ? 'Watchlist News' : `Watchlist · ${watchSel}`}
            filterTicker={watchlistQuery || undefined}
          />
        );
      case 'regional':
        return <NewsCardComponent {...commonProps} index={2} title="Regional News" paramOverride={region} />;
      case 'industry':
        return <NewsCardComponent {...commonProps} index={3} title="Industry News" paramOverride={industry} />;
      case 'commodity':
        return <NewsCardComponent {...commonProps} index={4} title="Commodity News" paramOverride={commodity} />;
      default:
        return null;
    }
  }, [active, region, industry, commodity, limit, watchlistQuery, watchSel]);

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#000', color: '#fff' }}>
      <Sidebar />

      <Box component="main" sx={{ flex: 1, pl: { xs: 0, md: '50px' }, pr: 2, py: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Box
          sx={(theme) => ({
            position: 'sticky',
            top: 0,
            zIndex: theme.zIndex.appBar,
            bgcolor: '#000',
            borderBottom: '1px solid rgba(255,255,255,0.12)'
          })}
        >
          <Tabs
            value={active}
            onChange={(_, v) => setActive(v)}
            textColor="inherit"
            indicatorColor="secondary"
            variant="scrollable"
            scrollButtons="auto"
            sx={{
                minHeight: TOPBAR_H,
                '& .MuiTab-root': {
                opacity: 1,                           
                color: 'rgba(255,255,255,0.80)',       
                fontWeight: 600,
                },
                '& .MuiTab-root.Mui-selected': {
                color: '#fff',                          
                },
            }}
            >

            <Tab label="GENERAL" value="general" />
            <Tab label="WATCHLIST" value="watchlist" />
            <Tab label="REGIONAL" value="regional" />
            <Tab label="INDUSTRY" value="industry" />
            <Tab label="COMMODITY" value="commodity" />
          </Tabs>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {active === 'regional' && (
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel id="region-label" sx={{ color: '#fff' }}>Region</InputLabel>
                <Select
                  labelId="region-label" label="Region" value={region} onChange={e => setRegion(e.target.value)}
                  sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.24)' } }}
                >
                  {['au','cn','jp','us','gb'].map(r => <MenuItem key={r} value={r}>{r.toUpperCase()}</MenuItem>)}
                </Select>
              </FormControl>
            )}

            {active === 'industry' && (
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="industry-label" sx={{ color: '#fff' }}>Industry</InputLabel>
                <Select
                  labelId="industry-label" label="Industry" value={industry} onChange={e => setIndustry(e.target.value)}
                  sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.24)' } }}
                >
                  {['technology','health','finance','internet','pharmaceutical'].map(i => <MenuItem key={i} value={i}>{i}</MenuItem>)}
                </Select>
              </FormControl>
            )}

            {active === 'commodity' && (
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="commodity-label" sx={{ color: '#fff' }}>Commodity</InputLabel>
                <Select
                  labelId="commodity-label" label="Commodity" value={commodity} onChange={e => setCommodity(e.target.value)}
                  sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.24)' } }}
                >
                  {['gold','oil','wheat','copper','silver'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            )}

            {active === 'watchlist' && (
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                    <Chip
                    label="ALL"
                    size="small"
                    clickable
                    onClick={() => setWatchSel('ALL')}
                    variant="filled"
                    sx={chipSx(watchSel === 'ALL')}
                    />
                    {watchlistSyms.length ? (
                    watchlistSyms.map(sym => (
                        <Chip
                        key={sym}
                        label={sym}
                        size="small"
                        clickable
                        onClick={() => setWatchSel(sym)}
                        variant="filled"
                        sx={chipSx(watchSel === sym)}
                        />
                    ))
                    ) : (
                    <Chip label={user ? 'No symbols yet' : 'Sign in to load watchlist'} size="small" variant="outlined" sx={chipSx(false)} />
                    )}
                </Stack>
                )}

            <FormControl size="small" sx={{ minWidth: 110, marginLeft: 'auto' }}>
              <InputLabel id="limit-label" sx={{ color: '#fff' }}>Items</InputLabel>
              <Select
                labelId="limit-label" label="Items" value={limit} onChange={e => setLimit(Number(e.target.value))}
                sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.24)' } }}
              >
                {[6, 9, 12, 15].map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        </Box>

        <Divider sx={{ opacity: 0.1 }} />

        <Box sx={{ flex: 1, minHeight: 0, pt: 1 }}>
          {section}
        </Box>
      </Box>
    </Box>
  );
};

export default MarketNews;
