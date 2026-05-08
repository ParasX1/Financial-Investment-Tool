import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  FormControl,
  Select,
  MenuItem,
  Chip,
  Stack,
  Typography
} from '@mui/material';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import Sidebar from '@/components/sidebar';
import NewsCardComponent from '@/components/NewsCardComponent';
import { useAuth } from '@/components/authContext';
import supabase from '@/components/supabase';

type TabKey = 'general' | 'watchlist' | 'regional' | 'industry' | 'commodity';

const regionOptions = [
  { value: 'all', label: 'All Regions' },
  { value: 'us', label: 'North America' },
  { value: 'gb', label: 'Europe' },
  { value: 'cn', label: 'Asia' },
  { value: 'ae', label: 'Middle East' }
];

const industryOptions = [
  { value: 'all', label: 'All Industries' },
  { value: 'technology', label: 'Technology' },
  { value: 'health', label: 'Healthcare' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'finance', label: 'Finance' }
];

const commodityOptions = [
  { value: 'all', label: 'All Commodities' },
  { value: 'oil', label: 'Energy' },
  { value: 'gold', label: 'Metals' },
  { value: 'wheat', label: 'Agriculture' }
];

const MarketNews: React.FC = () => {
  const { user } = useAuth();

  const [active, setActive] = useState<TabKey>('general');
  const [region, setRegion] = useState('all');
  const [industry, setIndustry] = useState('all');
  const [commodity, setCommodity] = useState('all');
  const [limit, setLimit] = useState<number>(20);

  const [watchlistSyms, setWatchlistSyms] = useState<string[]>([]);
  const [watchSel, setWatchSel] = useState<'ALL' | string>('ALL');

  useEffect(() => {
    if (!user) {
      setWatchlistSyms([]);
      setWatchSel('ALL');
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from('user_watchlist')
        .select('symbol, position')
        .eq('user_id', user.id)
        .order('position', { ascending: true });

      if (error) {
        console.error('load watchlist failed:', error);
        setWatchlistSyms([]);
        setWatchSel('ALL');
        return;
      }

      const symbols = (data ?? []).map((item) => item.symbol).filter(Boolean) as string[];
      setWatchlistSyms(symbols);
      setWatchSel((prev) => (prev !== 'ALL' && symbols.includes(prev) ? prev : 'ALL'));
    })();
  }, [user]);

  const watchlistQuery = useMemo(() => {
    if (!watchlistSyms.length) return '';
    return watchSel === 'ALL' ? watchlistSyms.slice(0, 3).join(' OR ') : watchSel;
  }, [watchSel, watchlistSyms]);

  const watchChipSx = (selected: boolean) => ({
    color: selected ? '#dbeafe' : 'rgba(255,255,255,0.8)',
    borderColor: selected ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.12)',
    bgcolor: selected ? 'rgba(30,64,175,0.42)' : 'rgba(255,255,255,0.04)',
    fontWeight: 600,
    borderRadius: '10px',
    '&:hover': {
      bgcolor: selected ? 'rgba(30,64,175,0.56)' : 'rgba(255,255,255,0.1)'
    }
  });

  const commonNewsProps = useMemo(
    () =>
      ({
        height: '100%',
        limit,
        dark: true,
        fullscreenOffsetTop: 0,
        layout: 'list'
      }) as const,
    [limit]
  );

  const section = useMemo(() => {
    switch (active) {
      case 'general':
        return <NewsCardComponent {...commonNewsProps} index={0} title="General News" />;
      case 'watchlist':
        return (
          <NewsCardComponent
            {...commonNewsProps}
            index={1}
            title={watchSel === 'ALL' ? 'Watchlist News' : `Watchlist ${watchSel}`}
            filterTicker={watchlistQuery || undefined}
          />
        );
      case 'regional':
        return (
          <NewsCardComponent
            {...commonNewsProps}
            index={2}
            title="Regional News"
            paramOverride={region === 'all' ? 'us' : region}
          />
        );
      case 'industry':
        return (
          <NewsCardComponent
            {...commonNewsProps}
            index={3}
            title="Industry News"
            paramOverride={industry === 'all' ? 'technology' : industry}
          />
        );
      case 'commodity':
        return (
          <NewsCardComponent
            {...commonNewsProps}
            index={4}
            title="Commodity News"
            paramOverride={commodity === 'all' ? 'gold' : commodity}
          />
        );
      default:
        return null;
    }
  }, [active, commodity, commonNewsProps, industry, region, watchSel, watchlistQuery]);

  const selectSx = {
    minWidth: 128,
    height: 36,
    color: '#f8fafc',
    bgcolor: '#1a1b20',
    borderRadius: '12px',
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: 'rgba(255,255,255,0.1)'
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: 'rgba(255,255,255,0.16)'
    },
    '& .MuiSelect-select': {
      py: 0.9,
      px: 1.6,
      fontSize: '0.95rem'
    },
    '& .MuiSvgIcon-root': {
      color: 'rgba(255,255,255,0.62)'
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#050505', color: '#fff' }}>
      <Sidebar />

      <Box
        component="main"
        sx={{
          flex: 1,
          ml: { xs: 0, md: '50px' },
          px: { xs: 2, md: 3.5 },
          py: { xs: 3, md: 4 },
          minHeight: '100vh'
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 980, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box>
            <Typography sx={{ fontSize: { xs: '2.2rem', md: '2.6rem' }, fontWeight: 760, letterSpacing: '-0.03em', lineHeight: 1.04 }}>
              Market News
            </Typography>
            <Typography sx={{ mt: 1, color: 'rgba(255,255,255,0.62)', fontSize: '1.05rem' }}>
              Stay informed with real-time financial news and market updates
            </Typography>
          </Box>

          <Tabs
            value={active}
            onChange={(_, value) => setActive(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 44,
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              '& .MuiTabs-indicator': {
                backgroundColor: '#2f81f7',
                height: 2
              },
              '& .MuiTab-root': {
                minHeight: 44,
                minWidth: 'auto',
                px: 1.7,
                mr: 1,
                textTransform: 'none',
                fontSize: '1rem',
                color: 'rgba(255,255,255,0.56)',
                opacity: 1
              },
              '& .MuiTab-root.Mui-selected': {
                color: '#f8fafc'
              }
            }}
          >
            <Tab label="General" value="general" />
            <Tab label="Watchlist" value="watchlist" />
            <Tab label="Regional" value="regional" />
            <Tab label="Industry" value="industry" />
            <Tab label="Commodity" value="commodity" />
          </Tabs>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'rgba(255,255,255,0.62)' }}>
              <FilterAltOutlinedIcon sx={{ fontSize: 18 }} />
              <Typography sx={{ fontSize: '0.98rem' }}>Show:</Typography>
            </Box>

            <FormControl size="small">
              <Select value={limit} onChange={(e) => setLimit(Number(e.target.value))} sx={selectSx}>
                {[5, 10, 20, 50].map((count) => (
                  <MenuItem key={count} value={count}>
                    {count} items
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {active === 'regional' && (
              <>
                <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.98rem' }}>Region:</Typography>
                <FormControl size="small">
                  <Select value={region} onChange={(e) => setRegion(e.target.value)} sx={selectSx}>
                    {regionOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}

            {active === 'industry' && (
              <>
                <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.98rem' }}>Industry:</Typography>
                <FormControl size="small">
                  <Select value={industry} onChange={(e) => setIndustry(e.target.value)} sx={selectSx}>
                    {industryOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}

            {active === 'commodity' && (
              <>
                <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.98rem' }}>Commodity:</Typography>
                <FormControl size="small">
                  <Select value={commodity} onChange={(e) => setCommodity(e.target.value)} sx={selectSx}>
                    {commodityOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}

            {active === 'watchlist' && (
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip label="ALL" size="small" clickable onClick={() => setWatchSel('ALL')} variant="filled" sx={watchChipSx(watchSel === 'ALL')} />
                {watchlistSyms.length ? (
                  watchlistSyms.map((symbol) => (
                    <Chip
                      key={symbol}
                      label={symbol}
                      size="small"
                      clickable
                      onClick={() => setWatchSel(symbol)}
                      variant="filled"
                      sx={watchChipSx(watchSel === symbol)}
                    />
                  ))
                ) : (
                  <Chip
                    label={user ? 'No symbols yet' : 'Sign in to load watchlist'}
                    size="small"
                    variant="outlined"
                    sx={watchChipSx(false)}
                  />
                )}
              </Stack>
            )}
          </Box>

          <Box sx={{ minHeight: 0, pb: 2 }}>{section}</Box>
        </Box>
      </Box>
    </Box>
  );
};

export default MarketNews;
