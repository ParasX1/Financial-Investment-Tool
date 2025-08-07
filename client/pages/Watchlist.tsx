import React, { useState } from 'react';
import Sidebar from '@/components/sidebar';
import {
  Box,
  Grid,
  Autocomplete,
  TextField,
  Chip,
} from '@mui/material';
import StockChartCard, { stockDataMap } from '@/components/StockCardComponent';
import NewsCardComponent from '@/components/NewsCardComponent';

export default function WatchlistPage() {
  const stockOptions = Object.keys(stockDataMap);
  const [tags, setTags]     = useState<string[]>([]);
  const [charts, setCharts] = useState<(string | null)[]>([null, null, null]);

  const sync = (t: string[]) =>
    setCharts([t[0] ?? null, t[1] ?? null, t[2] ?? null]);

  const onTagsChange = (_: any, t: string[]) => {
    const limited = t.slice(0, 3);
    setTags(limited);
    sync(limited);
  };

  const clearChart = (i: number) =>
    setCharts(prev => {
      const next = [...prev];
      next[i] = null;
      return next;
    });

  const swapVert = (i: number) => {
    if (i === 0) return;
    setCharts(([a, b, c]) =>
      i === 1 ? [b, a, c] : [c, b, a]
    );
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />

      <Box sx={{ flex: 1, pl: '50px', bgcolor: 'black' }}>
        {/* search bar */}
        <Box sx={{
          px: 2, py: 1, borderBottom: '1px solid #333',
          display: 'flex', alignItems: 'center', gap: 2,
        }}>
          <Autocomplete
            multiple freeSolo
            options={stockOptions}
            value={tags}
            onChange={onTagsChange}
            sx={{ flexGrow: 1, maxWidth: 500 }}
            renderInput={p => (
              <TextField {...p} placeholder="Add up to 3 tickers…"
                size="small" variant="outlined"
                sx={{ bgcolor: 'white', input: { color: '#000' } }} />
            )}
            renderTags={(v, getTagProps) =>
              v.map((opt, i) => (
                <Chip {...getTagProps({ index: i })}
                  key={opt} label={opt} size="small"
                  sx={{ bgcolor: '#800080', color: '#fff' }} />
              ))
            }
          />
        </Box>

        {/* 3 × 2 grid */}
        <Box sx={{ p: 2 }}>
          <Grid container spacing={2}>
            {[0, 1, 2].map(row => (
              <React.Fragment key={row}>
                {/* chart */}
                <Grid item xs={12} md={6}>
                  <StockChartCard
                    index={row}
                    selectedStock={charts[row]}
                    onSelectStock={() => {}}
                    onClear={() => clearChart(row)}
                    onSwap={() => swapVert(row)}
                    swapIcon="↕"
                    height={350}
                  />
                </Grid>

                {/* news – index 1 == “watchlist” mode */}
                <Grid item xs={12} md={6}>
                  <NewsCardComponent
                    index={1}
                    title={charts[row] ? `News: ${charts[row]}` : 'Watchlist News'}
                    height={350}
                    filterTicker={charts[row] ?? undefined}
                  />
                </Grid>
              </React.Fragment>
            ))}
          </Grid>
        </Box>
      </Box>
    </Box>
  );
}
