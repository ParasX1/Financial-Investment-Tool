// pages/dashboardView.tsx


import React, {useContext, useEffect, useState} from 'react';
// @ts-ignore
import Sidebar from '@/components/sidebar';
import {
  Navbar,
  NavbarContent,
  NavbarItem,
  Link as NextUILink,
  Spacer,
} from '@nextui-org/react';
import { Grid, Box, Autocomplete, TextField, Chip, Tooltip } from '@mui/material';
import { StaticImageData } from 'next/image';
import supabase from "@/components/supabase";
import StockChartCard, { stockDataMap } from '@/components/StockCardComponent';
import { GraphSettingsContext } from '@/components/GraphSettingsContext';

const NUM_CARDS = 6;

const DashboardView: React.FC = () => {

    const { settings, setSettings } = useContext(GraphSettingsContext);
    const {globalStart, globalEnd } = settings;

    // Instead of image content, now we use stock selection
    const [selectedStocks, setSelectedStocks] = useState<(string | null)[]>(
      Array(NUM_CARDS).fill(null)
    );


    const handleSelectStock = (index: number, stock: string) => {
        const newStocks = [...selectedStocks];
        newStocks[index] = stock;
        setSettings({ ...settings, selectedStocks: newStocks });
    };

    const handleClear = (index: number) => {
        const newStocks = [...selectedStocks];
        newStocks[index] = null;
        setSettings({ ...settings, selectedStocks: newStocks });
    };

    const handleSwap = (index: number) => {
        if (index === 0) return;
        const newStocks = [...selectedStocks];
        const temp = newStocks[0];
        newStocks[0] = newStocks[index];
        newStocks[index] = temp;
        setSettings({ ...settings, selectedStocks: newStocks });
    };
    

    const handleSettingsChange = (i: number, s: any) => {
      setCardSettings(cs => {
        const x = [...cs];
        x[i] = {
          color: s.stockColour,
          start: s.metricParams.startDate,
          end: s.metricParams.endDate,
        };
        return x;
      });
    };

    // Tags UI (optional local state for tags, not chart data)
    const [searchTags, setSearchTags] = React.useState<string[]>([]);
    const stockOptions = Object.keys(stockDataMap);

    const handleTimeChange = (field: 'globalStart' | 'globalEnd', value: string) => {
        setSettings({ ...settings, [field]: value });
    };


    const [cardSettings, setCardSettings] = useState<
      { color: string; start: string; end: string }[]
    >(() =>
      Array(NUM_CARDS)
        .fill(0)
        .map(() => ({
          color: '#fc03d7',
          start: globalStart,
          end: globalEnd,
        }))
    );
      
    return (
        <div>
            <div style={{ display: 'flex' }}>
                <Sidebar />
                <Box sx={{ flex: 1, paddingLeft: '50px', backgroundColor: 'black' }}>

                     {/* Search Bar*/}
                    <Box
                        sx={{
                            px: 2,
                            py: 1,
                            backgroundColor: '#111',
                            borderBottom: '1px solid #333',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                    >
                        {/* Stock label input: Multiple select, free input */}
                        <Autocomplete
                            multiple
                            freeSolo
                            options={stockOptions}
                            value={searchTags}
                            onChange={(_, newTags, reason, details) => {
                                 // Updaate tag array
                                setSearchTags(newTags as string[]);

                                // If delete tag, clean the state
                                if (reason === 'removeOption' && details?.option) {
                                    const removed = details.option as string;
                                    const updated = selectedStocks.map(s => s === removed ? null : s);
                                    setSettings({ ...settings, selectedStocks: updated });
                                }
                            }}
                            sx={{
                                flexGrow: 1,
                                minWidth: 200,
                                '& .MuiAutocomplete-inputRoot': {
                                  flexWrap: 'wrap',
                                },
                              }}
                  
                            renderTags={(value, getTagProps) => value.map((option, idx) => {
                                const isActive = selectedStocks[0] === option;
                                return(
                                    <Chip
                                    {...getTagProps({ index: idx })}
                                    key={option}
                                    label={option}
                                    size="small"
                                    onClick={() => {
                                        if (isActive) handleClear(0);
                                        else handleSelectStock(0, option);
                                            }
                                        }        
                                            sx={{
                                                mr: 0.5,
                                                cursor: 'pointer',
                                                bgcolor: isActive ? '#800080' : '#ddd',
                                                color: isActive ? '#fff' : '#000',
                                                '&:hover': {
                                                    bgcolor: isActive ? '#9a0f9a' : '#ccc',
                                                },
                                        }}
                                            
                                        />
                                    );
                                })
                            }
                            renderInput={(params) => (
                                <TextField
                                {...params}
                                placeholder="Search Stocks…"
                                size="small"
                                variant="outlined"
                                InputProps={{
                                    ...params.InputProps,
                                    style: {
                                      backgroundColor: 'white',
                                      color: '#000',
                                    },
                                  }}
                                  sx={{
                                    minWidth: 150,
                                  }}
                                />
                            )}
                        />

                        {/* Global Time Selection */}
                        <Tooltip title="Start" arrow>
                            <TextField
                                type="datetime-local"
                                variant="outlined"
                                size="small"
                                value={globalStart}
                                onChange={e => handleTimeChange('globalStart', e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                sx={{
                                    ml: 2,
                                    backgroundColor: '#fff',
                                    input: { color: '#000' },
                                    '& .MuiOutlinedInput-root': { height: 40 },
                                    minWidth: 200,
                                }}
                        />
                      </Tooltip>

                      <Tooltip title="End" arrow>
                        <TextField
                                type="datetime-local"
                                variant="outlined"
                                size="small"
                                value={globalEnd}
                                onChange={e => handleTimeChange('globalEnd', e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                sx={{
                                    ml: 2,
                                    backgroundColor: '#fff',
                                    input: { color: '#000' },
                                    '& .MuiOutlinedInput-root': { height: 40 },
                                    minWidth: 200,
                                }}
                        />
                      </Tooltip>

                    </Box>

                    <div style={{ padding: '20px' }}>
                        <Grid container spacing={2}>
                            {/* Main Large Card */}
                            <Grid item xs={12} md={8}>
                                <StockChartCard
                                    index={0}
                                    selectedStock={selectedStocks[0]}
                                    onSelectStock={handleSelectStock}
                                    onClear={handleClear}
                                    onSwap={handleSwap}
                                    height={816}
                                    defaultStart={cardSettings[0].start}
                                    defaultEnd={cardSettings[0].end}
                                    color={cardSettings[0].color}
                                    onSettingsChange={handleSettingsChange}

                                />
                            </Grid>

                            {/* Vertical Stack of Cards */}
                            <Grid item xs={12} md={4}>
                                <Grid container direction="column" spacing={2}>
                                    {[1, 2].map((index) => (
                                        <Grid item key={index}>
                                            <StockChartCard
                                                index={index}
                                                selectedStock={selectedStocks[index]}
                                                onSelectStock={handleSelectStock}
                                                onClear={handleClear}
                                                onSwap={handleSwap}
                                                defaultStart={cardSettings[index].start}
                                                defaultEnd={cardSettings[index].end}
                                                color={cardSettings[index].color}
                                                onSettingsChange={handleSettingsChange}                                                
                                            />
                                        </Grid>
                                    ))}
                                </Grid>
                            </Grid>

                            {/* Bottom Row of Cards */}
                            <Grid item xs={12}>
                                <Grid container spacing={2}>
                                    {[3, 4, 5].map((index) => (
                                        <Grid item xs={12} sm={4} key={index}>
                                            <StockChartCard
                                                index={index}
                                                selectedStock={selectedStocks[index]}
                                                onSelectStock={handleSelectStock}
                                                onClear={handleClear}
                                                onSwap={handleSwap}
                                                defaultStart={cardSettings[index].start}
                                                defaultEnd={cardSettings[index].end}
                                                color={cardSettings[index].color}
                                                onSettingsChange={handleSettingsChange}                                                
                                            />
                                        </Grid>
                                    ))}
                                </Grid>
                            </Grid>
                        </Grid>
                    </div>
                </Box>
            </div>
        </div>
    );
};

export default DashboardView;