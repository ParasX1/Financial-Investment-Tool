// pages/dashboardView.tsx

import React, {useEffect, useState} from 'react';
// @ts-ignore
import Sidebar from '@/components/sidebar';
import {
    Navbar,
    NavbarContent,
    NavbarItem,
    Link as NextUILink,
    Button as NextUIButton,
    Spacer,
} from '@nextui-org/react';
import ModalLogin from '@/components/Modal/ModalLogin';
import ModalSignUp from '@/components/Modal/ModalSignUp';
import CardComponent from '@/components/CardComponent';
import { Grid, Box, Autocomplete, TextField, Chip, Tooltip } from '@mui/material';
import img1 from '@/assets/gridBackground1.png';
import teamImage from '@/assets/team.png';
import { StaticImageData } from 'next/image';
import supabase from "@/components/supabase";
import OHLCChart from '@/components/ohlc';
import { Select, SelectItem } from "@nextui-org/react";
import StockChartCard, { stockDataMap } from '@/components/StockCardComponent';

export interface CardSettings {
    barColor: string;
    dateRange: { start: string; end: string };
    metricType: string;
    graphMade: boolean;
}

const DashboardView: React.FC = () => {
    const [showSignUp, setSignUp] = useState(false);
    const [showLogIn, setLogIn] = useState(false);
    const [session, setSession] = useState(null);
    const [activeCards, setActiveCards] = useState<boolean[]>([false, false, false, false, false, false]);

    // global time range to initialize and pass to each card
    const [globalStart, setGlobalStart] = useState<string>(() => {
        // initialize to “now” in local ISO format YYYY‑MM‑DDThh:mm
        const tzOffset = new Date().getTimezoneOffset() * 60000;
        return new Date(Date.now() - tzOffset).toISOString().slice(0, 16);
    });
    const [globalEnd, setGlobalEnd] = useState<string>(globalStart);

    const [cardSettings, setCardSettings] = useState<CardSettings[]>(
        () => Array.from({length: 6},
            () => ({
                barColor: '#fc03d7', 
                dateRange: {start: globalStart, end: globalEnd},
                metricType: 'BetaAnalysis',
                graphMade: false
            })
        )
    );

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
    const [selectedStocks, setSelectedStocks] = useState<string[]>([]);

    const handleSelectStock = (stock: string) => {
        setSelectedStocks(prev => {
            if (prev.includes(stock)) {
                return prev.filter(s => s !== stock);
            } else {
                return [...prev, stock]
            }
        });
    };

    const handleClear = (index: number) => {
        setActiveCards(prev => {
            const updated = [...prev];
            updated[index] = false;
            return updated;
        })

        setCardSettings(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], graphMade: false};
            return updated;
        });
    };

    const handleActivate = (index: number) => {
        setActiveCards(prev => {
            const updated = [...prev];
            updated[index] = true;
            return updated
        })
    }

    const handleSwap = (index: number) => {
        if (index === 0) return;

        setActiveCards(prev => {
            const updated = [...prev];
            [updated[0], updated[index]] = [updated[index], updated[0]];
            return updated;
        });

        setCardSettings(prev => {
            const updated = [...prev];
            [updated[0], updated[index]] = [updated[index], updated[0]];
            return updated;
        });
    };

    const handleCardSettingsUpdate = (index: number, settings: CardSettings) => {
        setCardSettings(prev => {
            const updated = [...prev];
            updated[index] = {...updated[index], ...settings};
            return updated;
        });
    };

    const [searchTags, setSearchTags] = useState<string[]>([]);
    const stockOptions = Object.keys(stockDataMap);

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
                                 // Update tag array
                                setSearchTags(newTags as string[]);
                                
                                // Stock start selected
                                if (reason === 'selectOption') {
                                    const selected = details?.option as string;
                                    setSelectedStocks(prev => prev.includes(selected)
                                        ? prev
                                        : [...prev, selected] 
                                    );
                                }
                                // If delete tag, clean the state
                                else if (reason === 'removeOption' && details?.option) {
                                    const removed = details.option as string;
                                    setSelectedStocks((prev) => prev.filter(s => s !== removed));
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
                                    const isSelected = selectedStocks.includes(option);
                                    return(
                                        <Chip
                                            {...tagProps}   
                                            key={option}
                                            label={option}
                                            size="small"
                                            onClick={() => handleSelectStock(option)}
                                            sx={{
                                                mr: 0.5,
                                                cursor: 'pointer',
                                                bgcolor: isSelected ? '#800080' : '#ddd',
                                                color: isSelected ? '#fff' : '#000',
                                                '&:hover': {
                                                    bgcolor: isSelected ? '#9a0f9a' : '#ccc',
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
                        {/* ToDo: Pass globalStart/globalEnd to each StockChartCard to initialize its own time range */}
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
                                    selectedStocks={selectedStocks}
                                    isActive={activeCards[0]}
                                    cardSettings={cardSettings[0]}
                                    onClear={handleClear}
                                    onSwap={handleSwap}
                                    onActivate={handleActivate}
                                    onUpdateSettings={handleCardSettingsUpdate}
                                    height={816}
                                    // TODO: As each card initial start/endDate
                                    defaultStart={globalStart}
                                    defaultEnd={globalEnd}
                                />
                            </Grid>

                            {/* Vertical Stack of Cards */}
                            <Grid item xs={12} md={4}>
                                <Grid container direction="column" spacing={2}>
                                    {[1, 2].map((index) => (
                                        <Grid item key={index}>
                                            <StockChartCard
                                                index={index}
                                                selectedStocks={selectedStocks}
                                                isActive={activeCards[index]}
                                                cardSettings={cardSettings[index]}
                                                onClear={handleClear}
                                                onSwap={handleSwap}
                                                onActivate={handleActivate}
                                                onUpdateSettings={handleCardSettingsUpdate}
                                                defaultStart={globalStart}
                                                defaultEnd={globalEnd}
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
                                                selectedStocks={selectedStocks}
                                                isActive={activeCards[index]}
                                                cardSettings={cardSettings[index]}
                                                onClear={handleClear}
                                                onSwap={handleSwap}
                                                onActivate={handleActivate}
                                                onUpdateSettings={handleCardSettingsUpdate}
                                                defaultStart={globalStart}
                                                defaultEnd={globalEnd}
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