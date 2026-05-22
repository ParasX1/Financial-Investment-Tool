import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import Sidebar from '@/components/sidebar';
import NewsCardComponent from '@/components/NewsCardComponent';
import { useAuth } from '@/components/authContext';
import supabase from '@/components/supabase';

type TabKey = 'general' | 'watchlist' | 'regional' | 'industry' | 'commodity';

const TOPBAR_H = 64;

const REGION_OPTIONS = [
  { code: 'au', label: 'Australia', market: 'ASX' },
  { code: 'us', label: 'United States', market: 'NYSE / Nasdaq' },
  { code: 'gb', label: 'United Kingdom', market: 'LSE' },
  { code: 'jp', label: 'Japan', market: 'TSE' },
  { code: 'cn', label: 'China', market: 'SSE / SZSE' },
];

const INDUSTRY_OPTIONS = [
  { value: 'technology', label: 'Technology' },
  { value: 'finance', label: 'Finance' },
  { value: 'health', label: 'Healthcare' },
  { value: 'internet', label: 'Internet' },
  { value: 'pharmaceutical', label: 'Pharmaceutical' },
];

const COMMODITY_OPTIONS = [
  { value: 'gold', label: 'Gold' },
  { value: 'oil', label: 'Oil' },
  { value: 'wheat', label: 'Wheat' },
  { value: 'copper', label: 'Copper' },
  { value: 'silver', label: 'Silver' },
];

const REGION_BY_ACCOUNT_LOCATION: Record<string, string> = {
  australia: 'au',
  au: 'au',
  usa: 'us',
  us: 'us',
  'united states': 'us',
  america: 'us',
  uk: 'gb',
  gb: 'gb',
  'united kingdom': 'gb',
  japan: 'jp',
  jp: 'jp',
  china: 'cn',
  cn: 'cn',
};

function inferRegionFromUser(user: any) {
  const metadata = user?.user_metadata ?? {};
  const candidates = [
    metadata.country,
    metadata.region,
    metadata.location,
    metadata.market_region,
    metadata.marketRegion,
  ];

  for (const value of candidates) {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (REGION_BY_ACCOUNT_LOCATION[normalized]) return REGION_BY_ACCOUNT_LOCATION[normalized];
  }

  return null;
}

const MarketNews: React.FC = () => {
  const { user } = useAuth();

  const [active, setActive] = useState<TabKey>('general');
  const [region, setRegion] = useState('au');
  const [industry, setIndustry] = useState('technology');
  const [commodity, setCommodity] = useState('gold');
  const [limit, setLimit] = useState<number>(10);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [watchlistSyms, setWatchlistSyms] = useState<string[]>([]);
  const [watchSel, setWatchSel] = useState<'ALL' | string>('ALL');

  useEffect(() => {
    const savedRegion = window.localStorage.getItem('market-news-region');
    const accountRegion = inferRegionFromUser(user);
    const browserRegion = navigator.language?.toLowerCase().includes('au') ? 'au' : null;
    const nextRegion = accountRegion || savedRegion || browserRegion;

    if (nextRegion && REGION_OPTIONS.some(option => option.code === nextRegion)) {
      setRegion(nextRegion);
    }
  }, [user]);

  useEffect(() => {
    window.localStorage.setItem('market-news-region', region);
  }, [region]);

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

  const activeRegion = REGION_OPTIONS.find(option => option.code === region) ?? REGION_OPTIONS[0];
  const activeIndustry = INDUSTRY_OPTIONS.find(option => option.value === industry) ?? INDUSTRY_OPTIONS[0];
  const activeCommodity = COMMODITY_OPTIONS.find(option => option.value === commodity) ?? COMMODITY_OPTIONS[0];

  const classification = useMemo(() => {
    switch (active) {
      case 'general':
        return {
          title: 'General News',
          description: 'Broad business headlines from NewsAPI top headlines. Each card shows the original publisher and website domain.',
          context: 'business financial markets',
        };
      case 'watchlist':
        return {
          title: watchSel === 'ALL' ? 'Watchlist News' : `Watchlist - ${watchSel}`,
          description: 'Company news is filtered by saved watchlist symbols from Supabase, then searched through NewsAPI.',
          context: watchlistQuery || 'watchlist stocks',
        };
      case 'regional':
        return {
          title: `${activeRegion.label} Market News`,
          description: `Regional news is grouped by market country through NewsAPI top headlines and defaults from account location when available. Current market: ${activeRegion.market}.`,
          context: `${activeRegion.label} ${activeRegion.market} market business`,
        };
      case 'industry':
        return {
          title: `${activeIndustry.label} Industry News`,
          description: 'Industry news is grouped by sector keyword through NewsAPI so users can scan themes before individual tickers.',
          context: `${activeIndustry.label} industry stocks business`,
        };
      case 'commodity':
        return {
          title: `${activeCommodity.label} Commodity News`,
          description: 'Commodity news is grouped by raw material keyword through NewsAPI for macro and supply-chain coverage.',
          context: `${activeCommodity.label} commodity market`,
        };
      default:
        return { title: 'Market News', description: '', context: '' };
    }
  }, [active, activeCommodity, activeIndustry, activeRegion, watchSel, watchlistQuery]);

  const chipSx = (selected: boolean) => ({
    color: selected ? '#fff' : 'rgba(255,255,255,0.78)',
    borderColor: selected ? 'rgba(74,144,255,0.65)' : 'rgba(255,255,255,0.18)',
    bgcolor: selected ? 'rgba(74,144,255,0.18)' : 'rgba(255,255,255,0.06)',
    fontWeight: 600,
    borderRadius: '6px',
    '&:hover': {
      bgcolor: selected ? 'rgba(74,144,255,0.26)' : 'rgba(255,255,255,0.11)',
      borderColor: 'rgba(74,144,255,0.55)',
    },
  });

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      color: '#fff',
      bgcolor: '#111',
      borderRadius: '8px',
      '& fieldset': { borderColor: 'rgba(255,255,255,0.18)' },
      '&:hover fieldset': { borderColor: 'rgba(74,144,255,0.55)' },
      '&.Mui-focused fieldset': { borderColor: '#4a90ff' },
    },
    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
    '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.72)' },
  } as const;

  const section = useMemo(() => {
    const commonProps = {
      height: '100%',
      limit,
      dark: true,
      fullscreenOffsetTop: TOPBAR_H,
      refreshKey,
      searchQuery,
      searchContext: classification.context,
      categoryDescription: classification.description,
    } as const;

    switch (active) {
      case 'general':
        return <NewsCardComponent {...commonProps} index={0} title={classification.title} />;
      case 'watchlist':
        return (
          <NewsCardComponent
            {...commonProps}
            index={1}
            title={classification.title}
            filterTicker={watchlistQuery || undefined}
          />
        );
      case 'regional':
        return <NewsCardComponent {...commonProps} index={2} title={classification.title} paramOverride={region} />;
      case 'industry':
        return <NewsCardComponent {...commonProps} index={3} title={classification.title} paramOverride={industry} />;
      case 'commodity':
        return <NewsCardComponent {...commonProps} index={4} title={classification.title} paramOverride={commodity} />;
      default:
        return null;
    }
  }, [active, classification, watchlistQuery, region, industry, commodity, limit, refreshKey, searchQuery]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setSearchQuery(searchDraft.trim());
  };

  const clearSearch = () => {
    setSearchDraft('');
    setSearchQuery('');
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#000', color: '#fff' }}>
      <Sidebar />

      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={{
          flex: 1,
          ml: 'var(--app-sidebar-width, 64px)',
          transition: 'margin-left 200ms ease',
          px: { xs: 2, md: 5 },
          py: { xs: 2, md: 4 },
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ maxWidth: 1500, width: '100%', mx: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 3 }}>
            <Box>
              <Typography component="h1" sx={{ fontSize: { xs: 36, md: 48 }, fontWeight: 800, lineHeight: 1.05 }}>
                Market News
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.66)', fontSize: { xs: 16, md: 20 }, mt: 1 }}>
                Stay informed with real-time financial news and market updates.
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.56)', fontSize: 14, mt: 1 }}>
                Data provider: NewsAPI.org. Article cards show the original publisher website.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Tooltip title="Refresh news">
                <Button
                  onClick={() => setRefreshKey(key => key + 1)}
                  startIcon={<RefreshIcon />}
                  sx={{
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.18)',
                    bgcolor: '#111',
                    borderRadius: '8px',
                    px: 2,
                    height: 44,
                    '&:hover': { bgcolor: '#181818', borderColor: 'rgba(74,144,255,0.55)' },
                  }}
                >
                  Refresh
                </Button>
              </Tooltip>
            </Stack>
          </Box>

          <Box
            component="form"
            onSubmit={submitSearch}
            sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 3, flexWrap: { xs: 'wrap', md: 'nowrap' } }}
          >
            <TextField
              fullWidth
              size="small"
              value={searchDraft}
              onChange={event => setSearchDraft(event.target.value)}
              placeholder="Search stocks, markets, regions, sectors, or keywords"
              sx={inputSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: searchDraft ? (
                  <InputAdornment position="end">
                    <Tooltip title="Clear search">
                      <Button onClick={clearSearch} sx={{ minWidth: 34, color: 'rgba(255,255,255,0.75)' }}>
                        <ClearIcon fontSize="small" />
                      </Button>
                    </Tooltip>
                  </InputAdornment>
                ) : undefined,
              }}
            />
            <Button
              type="submit"
              sx={{
                color: '#fff',
                bgcolor: '#1f6fff',
                borderRadius: '8px',
                height: 40,
                px: 2.5,
                '&:hover': { bgcolor: '#155bd6' },
              }}
            >
              Search
            </Button>
          </Box>

          <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.12)', mb: 2 }}>
            <Tabs
              value={active}
              onChange={(_, v) => setActive(v)}
              textColor="inherit"
              indicatorColor="primary"
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: TOPBAR_H,
                '& .MuiTab-root': {
                  opacity: 1,
                  color: 'rgba(255,255,255,0.66)',
                  fontWeight: 600,
                  fontSize: 17,
                  textTransform: 'none',
                  minHeight: TOPBAR_H,
                },
                '& .MuiTab-root.Mui-selected': { color: '#fff' },
              }}
            >
              <Tab label="General" value="general" />
              <Tab label="Watchlist" value="watchlist" />
              <Tab label="Regional" value="regional" />
              <Tab label="Industry" value="industry" />
              <Tab label="Commodity" value="commodity" />
            </Tabs>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 3 }}>
            <FilterListIcon sx={{ color: 'rgba(255,255,255,0.62)' }} />
            <Typography sx={{ color: 'rgba(255,255,255,0.72)', mr: 0.5 }}>Show:</Typography>

            {active === 'regional' && (
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="region-label">Market region</InputLabel>
                <Select
                  labelId="region-label"
                  label="Market region"
                  value={region}
                  onChange={event => setRegion(event.target.value)}
                  sx={inputSx['& .MuiOutlinedInput-root']}
                >
                  {REGION_OPTIONS.map(option => (
                    <MenuItem key={option.code} value={option.code}>
                      {option.label} - {option.market}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {active === 'industry' && (
              <FormControl size="small" sx={{ minWidth: 190 }}>
                <InputLabel id="industry-label">Industry</InputLabel>
                <Select
                  labelId="industry-label"
                  label="Industry"
                  value={industry}
                  onChange={event => setIndustry(event.target.value)}
                  sx={inputSx['& .MuiOutlinedInput-root']}
                >
                  {INDUSTRY_OPTIONS.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                </Select>
              </FormControl>
            )}

            {active === 'commodity' && (
              <FormControl size="small" sx={{ minWidth: 170 }}>
                <InputLabel id="commodity-label">Commodity</InputLabel>
                <Select
                  labelId="commodity-label"
                  label="Commodity"
                  value={commodity}
                  onChange={event => setCommodity(event.target.value)}
                  sx={inputSx['& .MuiOutlinedInput-root']}
                >
                  {COMMODITY_OPTIONS.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                </Select>
              </FormControl>
            )}

            {active === 'watchlist' && (
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center', rowGap: 1 }}>
                <Chip
                  label="ALL"
                  size="small"
                  clickable
                  onClick={() => setWatchSel('ALL')}
                  variant="outlined"
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
                      variant="outlined"
                      sx={chipSx(watchSel === sym)}
                    />
                  ))
                ) : (
                  <Chip label={user ? 'No symbols yet' : 'Sign in to load watchlist'} size="small" variant="outlined" sx={chipSx(false)} />
                )}
              </Stack>
            )}

            <FormControl size="small" sx={{ minWidth: 128, ml: 'auto' }}>
              <InputLabel id="limit-label">Items</InputLabel>
              <Select
                labelId="limit-label"
                label="Items"
                value={limit}
                onChange={event => setLimit(Number(event.target.value))}
                sx={inputSx['& .MuiOutlinedInput-root']}
              >
                {[6, 10, 12, 15].map(n => <MenuItem key={n} value={n}>{n} items</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ flex: 1, minHeight: 0 }}>
            {section}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default MarketNews;
