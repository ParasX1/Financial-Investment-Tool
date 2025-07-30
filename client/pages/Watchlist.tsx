import React, { useState } from "react";
import Sidebar from "@/components/sidebar";
import {
  Box,
  Grid,
  Autocomplete,
  TextField,
  Chip,
  Tooltip,
} from "@mui/material";
import NewsCardComponent from "@/components/NewsCardComponent";
import StockChartCard, { stockDataMap } from "@/components/StockCardComponent";


export default function WatchlistPage() {
  // stock search
  const stockOptions = Object.keys(stockDataMap);
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [selectedStocks, setSelectedStocks] = useState<(string | null)[]>([
    null,
    null,
  ]);

  const handleSelectStock = (idx: number, symbol: string) => {
    setSelectedStocks((prev) => {
      const next = [...prev];
      next[idx] = symbol;
      return next;
    });
  };

  const handleClear = (idx: number) => {
    setSelectedStocks((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
  };

  const newsTitles = ["Watchlist News • 1", "Watchlist News • 2"];

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />

      {/* Main content */}
      <Box sx={{ flex: 1, pl: "50px", bgcolor: "black" }}>
        {/* Search bar row */}
        <Box
          sx={{
            px: 2,
            py: 1,
            borderBottom: "1px solid #333",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}>
          <Autocomplete
            multiple
            freeSolo
            options={stockOptions}
            value={searchTags}
            onChange={(_, newTags) => setSearchTags(newTags as string[])}
            sx={{ flexGrow: 1, maxWidth: 400 }}
            renderTags={(value, getTagProps) =>
              value.map((option, idx) => (
                <Chip
                  {...getTagProps({ index: idx })}
                  key={option}
                  label={option}
                  size="small"
                  sx={{ bgcolor: "#800080", color: "#fff" }}
                  onClick={() => handleSelectStock(0, option)}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search Stocks…"
                size="small"
                variant="outlined"
                sx={{ bgcolor: "white", input: { color: "#000" } }}
              />
            )}
          />
        </Box>

        {/* 2×2 grid: (graph, news) × 2 */}
        <Box sx={{ p: 2 }}>
          <Grid container spacing={2}>
            {/* Row 1 */}
            <Grid item xs={12} md={6}>
              <StockChartCard
                index={0}
                selectedStock={selectedStocks[0]}
                onSelectStock={(i, s) => handleSelectStock(0, s)}
                onClear={() => handleClear(0)}
                height={400}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <NewsCardComponent index={0} title={newsTitles[0]} height="400px" />
            </Grid>

            {/* Row 2 */}
            <Grid item xs={12} md={6}>
              <StockChartCard
                index={1}
                selectedStock={selectedStocks[1]}
                onSelectStock={(i, s) => handleSelectStock(1, s)}
                onClear={() => handleClear(1)}
                height={400}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <NewsCardComponent index={1} title={newsTitles[1]} height="400px" />
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
}
