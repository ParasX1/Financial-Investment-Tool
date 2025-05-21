// pages/dashboardView.tsx

import React, { useEffect, useState } from 'react';
// @ts-ignore
import Sidebar from '@/components/sidebar';
import {
  Navbar,
  NavbarContent,
  NavbarItem,
  Link as NextUILink,
  Spacer,
} from '@nextui-org/react';
import ModalLogin from '@/components/Modal/ModalLogin';
import ModalSignUp from '@/components/Modal/ModalSignUp';
import { Grid, Box, Autocomplete, TextField, Chip, Tooltip } from '@mui/material';
import supabase from "@/components/supabase";
import StockChartCard, { stockDataMap } from '@/components/StockCardComponent';

const NUM_CARDS = 6;

const DashboardView: React.FC = () => {
    const [showSignUp, setSignUp] = useState(false);
    const [showLogIn, setLogIn] = useState(false);
    const [session, setSession] = useState(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session as any);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session as any);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Instead of image content, now we use stock selection
    // now we track an array of tickers per card
    const [selectedStocks, setSelectedStocks] = useState<string[][]>(
      Array(NUM_CARDS).fill([]).map(() => [])
    );
    

    const handleSelectStock = (index: number, stock: string) => {
           const newStocks = selectedStocks.map((arr, i) =>
             i === index
               ? arr.includes(stock)
                 ? arr 
                 : [...arr, stock] 
               : arr
           );
        setSelectedStocks(newStocks);
    };

    const handleClear = (index: number) => {
        setSelectedStocks(ss =>
          ss.map((arr, i) => (i === index ? [] : arr))
        );
      };

    const handleSwap = (i: number) => {
      if (i === 0) return;
    
      // swap the stocks
      setSelectedStocks(ss => {
        const x = [...ss];
        [x[0], x[i]] = [x[i], x[0]];
        return x;
      });
    
      // swap the per-card settings
      setCardSettings(cs => {
        const x = [...cs];
        [x[0], x[i]] = [x[i], x[0]];
        return x;
      });
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

    const [searchTags, setSearchTags] = useState<string[]>([]);
    const stockOptions = Object.keys(stockDataMap);

    // global time range to initialize and pass to each card
    const [globalStart, setGlobalStart] = useState<string>(() => {
        // initialize to “now” in local ISO format YYYY‑MM‑DDThh:mm
        const tzOffset = new Date().getTimezoneOffset() * 60000;
        return new Date(Date.now() - tzOffset).toISOString().slice(0, 16);
    });
    const [globalEnd, setGlobalEnd] = useState<string>(globalStart);

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
                    <Navbar maxWidth={'full'}>
                        <NavbarContent className="hidden sm:flex gap-4" justify="start">
                            <NavbarItem>
                                <NextUILink color="foreground" href="#">
                                    About Us
                                </NextUILink>
                            </NavbarItem>
                            <Spacer x={6} />
                            <NavbarItem>
                                <NextUILink href="search" color="foreground">
                                    Services
                                </NextUILink>
                            </NavbarItem>
                            <Spacer x={6} />
                            <NavbarItem>
                                <NextUILink color="foreground" href="#">
                                    Tools
                                </NextUILink>
                            </NavbarItem>
                            <Spacer x={6} />
                            <NavbarItem>
                                <NextUILink color="foreground" href="#">
                                    People
                                </NextUILink>
                            </NavbarItem>
                        </NavbarContent>
                    </Navbar>

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
                                if (reason === 'selectOption' && details?.option) {
                                    handleSelectStock(0, details.option as string);
                                    }
                                    if (reason === 'removeOption' && details?.option) {
                                      handleClear(0);
                                  }
                            }}
                            sx={{
                                flexGrow: 1,
                                minWidth: 200,
                                '& .MuiAutocomplete-inputRoot': {
                                  flexWrap: 'wrap',
                                },
                              }}
                  
                            renderTags={(value, getTagProps) =>
                                value.map((option, idx) => {
                                    const tagProps = getTagProps({ index: idx });
                                    const isActive = selectedStocks[0]?.includes(option);
                                    return(
                                        <Chip
                                            {...tagProps}   
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
                                onChange={e => setGlobalStart(e.target.value)}
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
                                onChange={e => setGlobalEnd(e.target.value)}
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
                                    selectedStocks={selectedStocks[0]}
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
                                                selectedStocks={selectedStocks[index]}
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
                                                selectedStocks={selectedStocks[index]}
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