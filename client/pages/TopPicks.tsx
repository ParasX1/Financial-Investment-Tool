import React, { useMemo, useState, useContext } from 'react';
import Sidebar from '@/components/sidebar';
import {
  Box,
  Grid,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  Button,
  Typography,
  Divider,
  Stack,
  Tooltip,
} from '@mui/material';
import StockChartCard from '@/components/StockCardComponent';
import NewsCardComponent from '@/components/NewsCardComponent';
import { GraphSettingsContext } from '@/components/GraphSettingsContext';

type TopPick = {
  symbol: string;
  name: string;
  score: number;
  tags: string[];
  notes?: string;
};

const DEFAULT_PICKS: TopPick[] = [
  { symbol: 'AAPL',  name: 'Apple Inc.', score: 92, tags: ['Quality', 'Moat', 'Buybacks'], notes: 'Consistent cash flows and ecosystem lock-in.' },
  { symbol: 'MSFT',  name: 'Microsoft Corp.', score: 90, tags: ['Cloud', 'AI', 'Margin'], notes: 'Azure + Copilot tailwinds.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', score: 86, tags: ['Search', 'YouTube', 'AI'], notes: 'Ads resilience; AI optionality.' },
  { symbol: 'AMZN',  name: 'Amazon.com, Inc.', score: 84, tags: ['AWS', 'Retail', 'Scale'], notes: 'AWS growth + retail efficiencies.' },
];

export default function TopPicksPage() {
  const { settings, setSettings } = useContext(GraphSettingsContext);
  const globalStart = settings?.globalStart ?? new Date().toISOString().slice(0,16);
  const globalEnd = settings?.globalEnd ?? globalStart;

  const [picks] = useState<TopPick[]>(DEFAULT_PICKS);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const selected = picks[selectedIdx];
  const selectedSymbol = selected?.symbol ?? null;

  const addToWatchlist = (symbol: string) => {
    if (!setSettings) return;
    setSettings(prev => {
      const next = { ...prev };
      const arr = [...(prev.selectedStocks || [])];
      const empty = arr.findIndex(s => s === null);
      if (empty >= 0) {
        arr[empty] = symbol;
      } else if (arr.length > 0) {
        arr[arr.length - 1] = symbol;
      } else {
        arr.push(symbol);
      }
      next.selectedStocks = arr;
      return next;
    });
  };

  const miniSymbols = useMemo(() => {
    const other = picks.filter((_, i) => i !== selectedIdx).slice(0, 2);
    return other.map(o => o.symbol);
  }, [picks, selectedIdx]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flex: 1, pl: '50px', bgcolor: 'black', minHeight: 0 }}>
        <Box sx={{ px: 2, py: 1, borderBottom: '1px solid #333' }}>
          <Typography variant="h6" sx={{ color: 'white' }}>Top Picks</Typography>
          <Typography variant="body2" sx={{ color: '#aaa' }}>
            Curated list of high-conviction ideas. Click a pick to preview its chart and related news.
          </Typography>
        </Box>
        <Box sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Box sx={{ bgcolor: '#111', border: '1px solid #555', borderRadius: 1, p: 1 }}>
                <List dense disablePadding>
                  {picks.map((p, idx) => (
                    <React.Fragment key={p.symbol}>
                      <ListItem disableGutters
                        secondaryAction={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip size="small" label={p.score} sx={{ bgcolor: '#222', color: '#fff' }} />
                            <Tooltip title="Add to Watchlist">
                              <Button variant="contained" size="small" onClick={() => addToWatchlist(p.symbol)}>＋</Button>
                            </Tooltip>
                          </Stack>
                        }
                      >
                        <ListItemButton
                          selected={idx === selectedIdx}
                          onClick={() => setSelectedIdx(idx)}
                          sx={{
                            borderRadius: 1,
                            '&.Mui-selected': { bgcolor: '#26203a' }
                          }}
                        >
                          <ListItemText
                          primary={
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography sx={{ color: 'white', fontWeight: 600 }}>{p.symbol}</Typography>
                              <Typography sx={{ color: '#bbb' }} variant="body2">{p.name}</Typography>
                            </Stack>
                          }
                          secondary={
                            <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                              {p.tags.map(t => (
                                <Chip key={t} size="small" label={t} sx={{ bgcolor: '#222', color: '#ddd' }} />
                              ))}
                            </Stack>
                          }
                          primaryTypographyProps={{ component: 'div' }}
                          secondaryTypographyProps={{ component: 'div' }}
                          />
                        </ListItemButton>
                      </ListItem>
                      {idx < picks.length - 1 && <Divider sx={{ borderColor: '#333' }} />}
                    </React.Fragment>
                  ))}
                </List>
              </Box>
            </Grid>
            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <StockChartCard
                    index={0}
                    selectedStock={selectedSymbol}
                    onSelectStock={() => {}}
                    onClear={() => {}}
                    onSwap={() => {}}
                    height={400}
                    defaultStart={globalStart}
                    defaultEnd={globalEnd}
                    color="#7c3aed"
                  />
                </Grid>
                {miniSymbols.map((sym, i) => (
                  <Grid item xs={12} sm={6} key={sym}>
                    <StockChartCard
                      index={i + 1}
                      selectedStock={sym}
                      onSelectStock={() => {}}
                      onClear={() => {}}
                      onSwap={() => {}}
                      height={220}
                      defaultStart={globalStart}
                      defaultEnd={globalEnd}
                      color="#334155"
                    />
                  </Grid>
                ))}
                <Grid item xs={12}>
                  <NewsCardComponent
                    index={1}
                    title={selectedSymbol ? `News: ${selectedSymbol}` : 'Watchlist News'}
                    height={320}
                    filterTicker={selectedSymbol ?? undefined}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
}