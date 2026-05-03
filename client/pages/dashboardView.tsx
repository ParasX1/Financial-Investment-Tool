import React, {useContext, useEffect, useState} from 'react';

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
import { Grid, Box, Autocomplete, TextField, Chip, Tooltip, Typography, InputAdornment} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import img1 from '@/assets/gridBackground1.png';
import teamImage from '@/assets/team.png';
import { StaticImageData } from 'next/image';
import supabase from "@/components/supabase";
import OHLCChart from '@/components/ohlc';
import { Select, SelectItem } from "@nextui-org/react";
import StockChartCard, { stockDataMap } from '@/components/StockCardComponent';
import { MetricType } from '@/components/graphSettingsModal';
import { useAuth } from '@/components/authContext'
import { loadPortfolioConfig, savePortfolioConfig } from '@/services/portfolioPrefs'

export interface CardSettings {
    barColor: string;
    dateRange: { start: string; end: string };
    metricType: MetricType;
    marketTicker?: string;
    riskRate?: number;
    confidenceLevel?: number;
    graphMade: boolean;
}

const DashboardView: React.FC = () => {
    const { user, loading } = useAuth()
    const [searchTags, setSearchTags] = useState<string[]>([])
    const [selectedStocks, setSelectedStocks] = useState<string[]>([])
    const [prefsLoaded, setPrefsLoaded] = useState(false)
    const [activeCards, setActiveCards] = useState<boolean[]>([false, false, false, false, false, false]);

    // global time range to initialize and pass to each card
    const [globalStart, setGlobalStart] = useState<string>(() => {
        // initialize to "now" in local ISO format YYYY‑MM‑DDThh:mm
        const tzOffset = new Date().getTimezoneOffset() * 60000;
        return new Date(Date.now() - tzOffset).toISOString().slice(0, 10);
    });
    const [globalEnd, setGlobalEnd] = useState<string>(globalStart);

    const [cardSettings, setCardSettings] = useState<CardSettings[]>(
        () => Array.from({length: 6},
            () => ({
                barColor: '#fc03d7', 
                dateRange: {start: globalStart, end: globalEnd},
                metricType: 'BetaAnalysis' as MetricType,
                graphMade: false
            })
        )
    );

    useEffect(() => {
        setCardSettings(prev =>
            prev.map(settings => {
                if (
                    settings.dateRange.start === globalStart &&
                    settings.dateRange.end === globalEnd
                ) {
                    return settings
                }

                return {
                    ...settings,
                    dateRange: { start: globalStart, end: globalEnd },
                }
            })
        )
    }, [globalStart, globalEnd])

    const userId = user?.id;

     useEffect(() => {
        if (loading) {
            setPrefsLoaded(false);
            return;
        }

        if (!userId) {
            setPrefsLoaded(false);
            setSearchTags([]);
            setSelectedStocks([]);
            return;
        }

        let cancelled = false;
        setPrefsLoaded(false);

        (async () => {
            const cfg = await loadPortfolioConfig(userId);
            if (cancelled) return;

            const tags = cfg?.tags ?? [];
            setSearchTags(tags);

            setSelectedStocks(prev => {
                if (prev.length === tags.length && prev.every((v, i) => v === tags[i])) {
                    return prev;
                }
                return tags;
            });
            setPrefsLoaded(true);
        })();

        return () => {
            cancelled = true;
        };
    }, [loading, userId]);

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

    const handleCardSettingsUpdate = (index: number, settings: Partial<CardSettings>) => {
        setCardSettings(prev => {
            const updated = [...prev];
            updated[index] = {...updated[index], ...settings};
            return updated;
        });
    };

    const stockOptions = Object.keys(stockDataMap);
    useEffect(() => {
        if (!userId || !prefsLoaded) return
        const h = setTimeout(() => {
        savePortfolioConfig(userId, { tags: searchTags }).catch(console.error)
        }, 600)
        return () => clearTimeout(h)
    }, [userId, prefsLoaded, searchTags]) 

    return (
        <div>
            <div style={{ display: 'flex' }}>
                <Sidebar />
                <Box sx={{ flex: 1, paddingLeft: '50px', backgroundColor: 'black' }}>

{/* Title and Search Bar-----------------------------------------------------------------------------------------------------------*/}
                    <Box
                        sx={{
                            px: 2,
                            py: 1.5,
                            backgroundColor: 'transparent',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'stretch',
                            gap: 1,
                        }}
                    >    
                        <Typography
                            variant="h6"
                            sx={{ 
                                color: 'white', 
                                fontWeight: 600, 
                                fontSize: 35,
                                lineHeight: 1.1,
                            }}
                            >
                            Portfolio Analytics
                        </Typography>

                        <Typography
                            variant="h5"
                            sx={{ 
                                color: 'rgba(255, 255, 255, 0.65)', 
                                fontWeight: 300, 
                                fontSize: 15,
                                mt: 0,
                            }}
                        >
                            Analyze stock performance with customizable metrics and charts
                        </Typography>


{/* Search Bar UI only ---------------------------------------------------------------------------------------------------*/}
                        <Typography
                            variant="h5"
                            sx={{ 
                                color: 'rgba(255, 255, 255, 0.65)', 
                                fontWeight: 300, 
                                fontSize: 15,
                                mt: 3,
                            }}
                        >
                            Select Stocks
                        </Typography>


                        <Autocomplete
                            multiple
                            freeSolo
                            filterSelectedOptions
                            options={stockOptions}
                            value={searchTags}
                            onChange={(_, newTags) => {
                                const normalizedTags = Array.from(
                                    new Set(
                                        newTags
                                            .map(tag => String(tag).trim().toUpperCase())
                                            .filter(Boolean)
                                    )
                                ).slice(0, 5);

                                setSearchTags(normalizedTags);
                                setSelectedStocks(prev => {
                                    const stillSelected = prev.filter(stock => normalizedTags.includes(stock));
                                    const newlyAdded = normalizedTags.filter(stock => !searchTags.includes(stock));
                                    return Array.from(new Set([...stillSelected, ...newlyAdded]));
                                });
                            }}
                            sx={{
                                flexGrow: 1,
                                minWidth: 200,
                                '& .MuiAutocomplete-inputRoot': {
                                    flexWrap: 'wrap',
                                    gap: 0.5,
                                    minHeight: 45,
                                    backgroundColor: '#1b1b20',
                                    color: '#fff',
                                    borderRadius: 1,
                                    py: 0.5,
                                    pl: 1,
                                },
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                        borderColor: '#2c2c33',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: '#3a3a42',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: '#6d5dfc',
                                    },
                                },
                                '& input': {
                                    color: '#fff',
                                },
                                '& input::placeholder': {
                                    color: '#a09ca8',
                                    opacity: 1,
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
                                                bgcolor: isSelected ? '#6d5dfc' : '#2c2c33',
                                                color: isSelected ? '#fff' : '#a09ca8',
                                                border: '1px solid',
                                                borderColor: isSelected ? '#8c80ff' : '#3a3a42',
                                                '&:hover': {
                                                    bgcolor: isSelected ? '#7b6cff' : '#35353d',
                                                },
                                                '& .MuiChip-deleteIcon': {
                                                    color: isSelected ? '#d8d4ff' : '#8b8794',
                                                    '&:hover': {
                                                        color: '#fff',
                                                    },
                                                },
                                            }}
                                        />
                                    );
                                })
                            }
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    placeholder={searchTags.length >= 5 ? 'Maximum 5 stocks' : `Add stock (${searchTags.length}/5)`}
                                    size="small"
                                    variant="outlined"
                                    InputProps={{
                                        ...params.InputProps,
                                        startAdornment: (
                                            <>
                                                <InputAdornment position="start">
                                                    <SearchIcon sx={{ color: '#8b8794', fontSize: 22 }} />
                                                </InputAdornment>
                                                {params.InputProps.startAdornment}
                                            </>
                                        ),
                                    }}
                                />
                            )}
                        />


{/* Global Date Selection ------------------------------------------------------------------------------------------------*/}
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 3,
                                mt: 1,
                                width: '100%',
                                flexDirection: { xs: 'column', md: 'row' },
                            }}
                        >
                            <Box sx={{ flex: 1 }}>
                                <Typography
                                    sx={{
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        fontSize: 15,
                                        fontWeight: 300,
                                        mb: 1,
                                    }}
                                >
                                    Start Date
                                </Typography>
                                <Tooltip title="Start" arrow>
                                    <TextField
                                        fullWidth
                                        type="date"
                                        variant="outlined"
                                        size="small"
                                        value={globalStart}
                                        onChange={e => setGlobalStart(e.target.value)}

                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                height: 45,
                                                backgroundColor: '#1b1b20',
                                                color: '#fff',
                                                borderRadius: 2,
                                                fontSize: 18,
                                                '& fieldset': {
                                                    borderColor: '#2c2c33',
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: '#3a3a42',
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: '#6d5dfc',
                                                },
                                            },
                                            '& input': {
                                                color: '#fff',
                                            },
                                            '& input::-webkit-calendar-picker-indicator': {
                                                filter: 'invert(1)',
                                            },
                                        }}
                                    />
                                </Tooltip>
                            </Box>

                            <Box sx={{ flex: 1 }}>
                                <Typography
                                    sx={{
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        fontSize: 15,
                                        fontWeight: 300,
                                        mb: 1,
                                    }}
                                >
                                    End Date
                                </Typography>
                                <Tooltip title="End" arrow>
                                    <TextField
                                        fullWidth
                                        type="date"
                                        variant="outlined"
                                        size="small"
                                        value={globalEnd}
                                        onChange={e => setGlobalEnd(e.target.value)}

                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                height: 45,
                                                backgroundColor: '#1b1b20',
                                                color: '#fff',
                                                borderRadius: 2,
                                                fontSize: 18,
                                                '& fieldset': {
                                                    borderColor: '#2c2c33',
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: '#3a3a42',
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: '#6d5dfc',
                                                },
                                            },
                                            '& input': {
                                                color: '#fff',
                                            },
                                            '& input::-webkit-calendar-picker-indicator': {
                                                filter: 'invert(1)',
                                            },
                                        }}
                                    />
                                </Tooltip>
                            </Box>
                        </Box>
                    </Box>

{/*Visulization Box--------------------------------------------------------------------------------------------------------------*/}
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
                                    variant="main"
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
                                                variant="main"
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
                                                variant="main"
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
