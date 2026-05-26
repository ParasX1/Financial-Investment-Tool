import React, {useContext, useEffect, useMemo, useRef, useState} from 'react';

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
import { Box, Autocomplete, TextField, Chip, Tooltip, Typography, InputAdornment, Button, IconButton} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
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
import { fetchTopPicks } from '@/services/topPicks';

export interface CardSettings {
    barColor: string;
    dateRange: { start: string; end: string };
    metricType: MetricType;
    marketTicker?: string;
    riskRate?: number;
    confidenceLevel?: number;
    graphMade: boolean;
}

type DashboardState = {
    searchTags: string[];
    selectedStocks: string[];
    activeCards: boolean[];
    cardSettings: CardSettings[];
    globalStart: string;
    globalEnd: string;
}

type ObserverWindow = {
    cardIndex: number;
    x: number;
    y: number;
    w: number;
    h: number;
    z: number;
}

const DASHBOARD_STATE_VERSION = 1;
const OBSERVER_WINDOW_MIN_WIDTH = 360;
const OBSERVER_WINDOW_MIN_HEIGHT = 260;
const OBSERVER_TOOLBAR_HEIGHT = 56;
const OBSERVER_LAYOUT_PADDING = 16;
const OBSERVER_LAYOUT_GAP = 12;

const createObserverWindow = (cardIndex: number, order: number): ObserverWindow => ({
    cardIndex,
    x: 24 + (order % 3) * 36,
    y: 12 + (order % 3) * 28,
    w: cardIndex === 0 ? 720 : 520,
    h: cardIndex === 0 ? 420 : 320,
    z: 10 + order,
});

const createObserverDashboardLayout = (cardIndexes: number[]): ObserverWindow[] => {
    const viewportWidth = typeof window === 'undefined' ? 1440 : window.innerWidth;
    const viewportHeight = typeof window === 'undefined' ? 900 : window.innerHeight - OBSERVER_TOOLBAR_HEIGHT;
    const availableWidth = viewportWidth - OBSERVER_LAYOUT_PADDING * 2 - OBSERVER_LAYOUT_GAP * 5;
    const availableHeight = viewportHeight - OBSERVER_LAYOUT_PADDING * 2 - OBSERVER_LAYOUT_GAP * 2;
    const colWidth = availableWidth / 6;
    const rowUnit = availableHeight / 2.72;
    const rowHeights = [rowUnit, rowUnit, rowUnit * 0.72];
    const colX = (col: number) => OBSERVER_LAYOUT_PADDING + col * (colWidth + OBSERVER_LAYOUT_GAP);
    const rowY = (row: number) =>
        OBSERVER_LAYOUT_PADDING + rowHeights.slice(0, row).reduce((sum, height) => sum + height + OBSERVER_LAYOUT_GAP, 0);
    const spanWidth = (cols: number) => colWidth * cols + OBSERVER_LAYOUT_GAP * (cols - 1);
    const spanHeight = (row: number, rows: number) =>
        rowHeights.slice(row, row + rows).reduce((sum, height, index) => sum + height + (index > 0 ? OBSERVER_LAYOUT_GAP : 0), 0);
    const positions: Record<number, Omit<ObserverWindow, 'cardIndex' | 'z'>> = {
        0: { x: colX(0), y: rowY(0), w: spanWidth(4), h: spanHeight(0, 2) },
        1: { x: colX(4), y: rowY(0), w: spanWidth(2), h: spanHeight(0, 1) },
        2: { x: colX(4), y: rowY(1), w: spanWidth(2), h: spanHeight(1, 1) },
        3: { x: colX(0), y: rowY(2), w: spanWidth(2), h: spanHeight(2, 1) },
        4: { x: colX(2), y: rowY(2), w: spanWidth(2), h: spanHeight(2, 1) },
        5: { x: colX(4), y: rowY(2), w: spanWidth(2), h: spanHeight(2, 1) },
    };

    return cardIndexes.map((cardIndex, order) => {
        const position = positions[cardIndex] ?? createObserverWindow(cardIndex, order);
        return {
            cardIndex,
            x: position.x,
            y: position.y,
            w: Math.max(OBSERVER_WINDOW_MIN_WIDTH, position.w),
            h: Math.max(OBSERVER_WINDOW_MIN_HEIGHT, position.h),
            z: 10 + order,
        };
    });
};

type ObserverChartWindowProps = {
    windowState: ObserverWindow;
    selectedStocks: string[];
    isActive: boolean;
    cardSettings: CardSettings;
    onClear: (index: number) => void;
    onSwap: (index: number) => void;
    onActivate: (index: number) => void;
    onUpdateSettings: (index: number, settings: Partial<CardSettings>) => void;
    onClose: (cardIndex: number) => void;
    onBringForward: (cardIndex: number) => void;
    onStartDrag: (event: React.PointerEvent<HTMLDivElement>, windowState: ObserverWindow) => void;
    onStartResize: (event: React.PointerEvent<HTMLDivElement>, windowState: ObserverWindow) => void;
}

const ObserverChartWindow = React.memo(({
    windowState,
    selectedStocks,
    isActive,
    cardSettings,
    onClear,
    onSwap,
    onActivate,
    onUpdateSettings,
    onClose,
    onBringForward,
    onStartDrag,
    onStartResize,
}: ObserverChartWindowProps) => (
    <Box
        sx={{
            position: 'absolute',
            left: windowState.x,
            top: windowState.y,
            width: windowState.w,
            height: windowState.h,
            minWidth: OBSERVER_WINDOW_MIN_WIDTH,
            minHeight: OBSERVER_WINDOW_MIN_HEIGHT,
            border: '1px solid #343846',
            bgcolor: '#0b0b0f',
            boxShadow: '0 20px 52px rgba(0,0,0,0.42)',
            overflow: 'hidden',
            zIndex: windowState.z,
        }}
        onPointerDown={() => onBringForward(windowState.cardIndex)}
    >
        <Box
            onPointerDown={(event) => onStartDrag(event, windowState)}
            sx={{
                height: 34,
                px: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'move',
                borderBottom: '1px solid #24262d',
                bgcolor: '#121217',
                userSelect: 'none',
            }}
        >
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#dce4ff' }}>
                Chart {windowState.cardIndex + 1}
            </Typography>
            <IconButton
                size="small"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onClose(windowState.cardIndex)}
                sx={{ color: '#9aa0aa' }}
            >
                <CloseIcon fontSize="small" />
            </IconButton>
        </Box>

        <Box sx={{ height: 'calc(100% - 34px)', minHeight: 0 }}>
            <StockChartCard
                index={windowState.cardIndex}
                selectedStocks={selectedStocks}
                isActive={isActive}
                cardSettings={cardSettings}
                onClear={onClear}
                onSwap={onSwap}
                onActivate={onActivate}
                onUpdateSettings={onUpdateSettings}
                height="100%"
                variant="main"
            />
        </Box>

        <Box
            onPointerDown={(event) => onStartResize(event, windowState)}
            sx={{
                position: 'absolute',
                right: 0,
                bottom: 0,
                width: 18,
                height: 18,
                cursor: 'nwse-resize',
                background:
                    'linear-gradient(135deg, transparent 50%, rgba(154,167,255,0.65) 50%)',
            }}
        />
    </Box>
), (prev, next) =>
    prev.windowState === next.windowState &&
    prev.selectedStocks === next.selectedStocks &&
    prev.isActive === next.isActive &&
    prev.cardSettings === next.cardSettings
);
ObserverChartWindow.displayName = 'ObserverChartWindow';

const getTodayDate = () => {
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzOffset).toISOString().slice(0, 10);
};

const createDefaultCardSettings = (start: string, end: string): CardSettings[] =>
    Array.from({length: 6},
        () => ({
            barColor: '#fc03d7',
            dateRange: {start, end},
            metricType: 'BetaAnalysis' as MetricType,
            graphMade: false
        })
    );

const getDashboardStorageKey = (userId?: string) =>
    `fit.dashboardState.v${DASHBOARD_STATE_VERSION}.${userId ?? 'guest'}`;

const readDashboardState = (userId?: string): DashboardState | null => {
    if (typeof window === 'undefined') return null;

    try {
        const raw = window.localStorage.getItem(getDashboardStorageKey(userId));
        if (!raw) return null;

        const parsed = JSON.parse(raw) as Partial<DashboardState>;
        if (
            !Array.isArray(parsed.searchTags) ||
            !Array.isArray(parsed.selectedStocks) ||
            !Array.isArray(parsed.activeCards) ||
            !Array.isArray(parsed.cardSettings) ||
            typeof parsed.globalStart !== 'string' ||
            typeof parsed.globalEnd !== 'string'
        ) {
            return null;
        }

        const defaultCards = createDefaultCardSettings(parsed.globalStart, parsed.globalEnd);

        return {
            searchTags: parsed.searchTags.map(tag => String(tag).trim().toUpperCase()).filter(Boolean).slice(0, 5),
            selectedStocks: parsed.selectedStocks.map(stock => String(stock).trim().toUpperCase()).filter(Boolean),
            activeCards: defaultCards.map((_, index) => Boolean(parsed.activeCards?.[index])),
            cardSettings: defaultCards.map((defaultSettings, index) => ({
                ...defaultSettings,
                ...(parsed.cardSettings?.[index] ?? {}),
                dateRange: {
                    start: parsed.cardSettings?.[index]?.dateRange?.start ?? parsed.globalStart ?? defaultSettings.dateRange.start,
                    end: parsed.cardSettings?.[index]?.dateRange?.end ?? parsed.globalEnd ?? defaultSettings.dateRange.end,
                },
                graphMade: Boolean(parsed.cardSettings?.[index]?.graphMade),
            })),
            globalStart: parsed.globalStart,
            globalEnd: parsed.globalEnd,
        };
    } catch (error) {
        console.error('readDashboardState error:', error);
        return null;
    }
};

const saveDashboardState = (userId: string | undefined, state: DashboardState) => {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(getDashboardStorageKey(userId), JSON.stringify(state));
    } catch (error) {
        console.error('saveDashboardState error:', error);
    }
};

const DashboardView: React.FC = () => {
    const { user, loading } = useAuth()
    const [searchTags, setSearchTags] = useState<string[]>([])
    const [selectedStocks, setSelectedStocks] = useState<string[]>([])
    const [topPickStocks, setTopPickStocks] = useState<string[]>([])
    const [prefsLoaded, setPrefsLoaded] = useState(false)
    const [activeCards, setActiveCards] = useState<boolean[]>([false, false, false, false, false, false]);
    const [observerOpen, setObserverOpen] = useState(false);
    const [observerWindows, setObserverWindows] = useState<ObserverWindow[]>([]);
    const skipNextGlobalDateSync = useRef(false);
    const stockSelectRef = useRef<HTMLDivElement | null>(null);
    const [stockSelectWidth, setStockSelectWidth] = useState(0);

    // global time range to initialize and pass to each card
    const [globalStart, setGlobalStart] = useState<string>(() => {
        // initialize to "now" in local ISO format YYYY‑MM‑DDThh:mm
        return getTodayDate();
    });
    const [globalEnd, setGlobalEnd] = useState<string>(globalStart);

    const [cardSettings, setCardSettings] = useState<CardSettings[]>(
        () => createDefaultCardSettings(globalStart, globalEnd)
    );

    useEffect(() => {
        if (skipNextGlobalDateSync.current) {
            skipNextGlobalDateSync.current = false;
            return;
        }

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

    useEffect(() => {
        if (!stockSelectRef.current) return;

        const observer = new ResizeObserver(([entry]) => {
            setStockSelectWidth(entry.contentRect.width);
        });

        observer.observe(stockSelectRef.current);
        return () => observer.disconnect();
    }, []);

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
            const savedState = readDashboardState(userId);
            if (savedState) {
                skipNextGlobalDateSync.current = true;
                setSearchTags(savedState.searchTags);
                setSelectedStocks(savedState.selectedStocks);
                setActiveCards(savedState.activeCards);
                setCardSettings(savedState.cardSettings);
                setGlobalStart(savedState.globalStart);
                setGlobalEnd(savedState.globalEnd);
            }

            const cfg = await loadPortfolioConfig(userId);
            if (cancelled) return;

            if (!savedState) {
                const tags = cfg?.tags ?? [];
                setSearchTags(tags);

                setSelectedStocks(prev => {
                    if (prev.length === tags.length && prev.every((v, i) => v === tags[i])) {
                        return prev;
                    }
                    return tags;
                });
            }
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

    const openObserverMode = () => {
        const visibleIndexes = activeCards
            .map((isActive, index) => isActive || cardSettings[index]?.graphMade ? index : -1)
            .filter(index => index >= 0);
        const initialIndexes = visibleIndexes.length ? visibleIndexes : [0];

        setObserverWindows(createObserverDashboardLayout(initialIndexes));
        setObserverOpen(true);
    };

    const closeObserverWindow = (cardIndex: number) => {
        setObserverWindows(prev => prev.filter(window => window.cardIndex !== cardIndex));
    };

    const addObserverWindow = () => {
        setObserverWindows(prev => {
            const usedIndexes = new Set(prev.map(window => window.cardIndex));
            const nextIndex = cardSettings.findIndex((_, index) => !usedIndexes.has(index));
            if (nextIndex === -1) return prev;

            setActiveCards(current => {
                const updated = [...current];
                updated[nextIndex] = true;
                return updated;
            });

            const maxZ = prev.reduce((max, window) => Math.max(max, window.z), 10);
            const nextWindow = createObserverDashboardLayout([...prev.map(window => window.cardIndex), nextIndex])
                .find(window => window.cardIndex === nextIndex) ?? createObserverWindow(nextIndex, prev.length);

            return [...prev, { ...nextWindow, z: maxZ + 1 }];
        });
    };

    const updateObserverWindow = (cardIndex: number, updates: Partial<ObserverWindow>) => {
        setObserverWindows(prev =>
            prev.map(window => window.cardIndex === cardIndex ? { ...window, ...updates } : window)
        );
    };

    const bringObserverWindowForward = (cardIndex: number) => {
        setObserverWindows(prev => {
            const target = prev.find(window => window.cardIndex === cardIndex);
            if (!target) return prev;

            const maxZ = prev.reduce((max, window) => Math.max(max, window.z), 10);
            if (target.z === maxZ) return prev;

            return prev.map(window =>
                window.cardIndex === cardIndex ? { ...window, z: maxZ + 1 } : window
            );
        });
    };

    const startObserverDrag = (event: React.PointerEvent<HTMLDivElement>, windowState: ObserverWindow) => {
        if (event.button !== 0) return;
        event.preventDefault();
        bringObserverWindowForward(windowState.cardIndex);

        const startX = event.clientX;
        const startY = event.clientY;
        const originX = windowState.x;
        const originY = windowState.y;

        const handleMove = (moveEvent: PointerEvent) => {
            updateObserverWindow(windowState.cardIndex, {
                x: Math.max(8, originX + moveEvent.clientX - startX),
                y: Math.max(8, originY + moveEvent.clientY - startY),
            });
        };

        const handleUp = () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
        };

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
    };

    const startObserverResize = (event: React.PointerEvent<HTMLDivElement>, windowState: ObserverWindow) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        bringObserverWindowForward(windowState.cardIndex);

        const startX = event.clientX;
        const startY = event.clientY;
        const originW = windowState.w;
        const originH = windowState.h;

        const handleMove = (moveEvent: PointerEvent) => {
            updateObserverWindow(windowState.cardIndex, {
                w: Math.max(OBSERVER_WINDOW_MIN_WIDTH, originW + moveEvent.clientX - startX),
                h: Math.max(OBSERVER_WINDOW_MIN_HEIGHT, originH + moveEvent.clientY - startY),
            });
        };

        const handleUp = () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
        };

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
    };

    useEffect(() => {
        let cancelled = false;

        fetchTopPicks({ limit: 10, sort_key: 'sharpe', sort_dir: 'desc' })
            .then(rows => {
                if (cancelled) return;

                setTopPickStocks(
                    rows
                        .map(row => row.symbol.trim().toUpperCase())
                        .filter(Boolean)
                );
            })
            .catch(error => {
                console.error('load top picks for dashboard error:', error);
                if (!cancelled) setTopPickStocks([]);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const topPickSet = useMemo(() => new Set(topPickStocks), [topPickStocks]);
    const stockOptions = useMemo(() => {
        const localStocks = Object.keys(stockDataMap).map(stock => stock.trim().toUpperCase());
        const merged = new Set([...topPickStocks, ...localStocks, ...searchTags]);
        return Array.from(merged).filter(Boolean);
    }, [topPickStocks, searchTags]);

    useEffect(() => {
        if (!userId || !prefsLoaded) return
        const h = setTimeout(() => {
        savePortfolioConfig(userId, { tags: searchTags }).catch(console.error)
        }, 600)
        return () => clearTimeout(h)
    }, [userId, prefsLoaded, searchTags]) 

    useEffect(() => {
        if (loading || !prefsLoaded) return;

        saveDashboardState(userId, {
            searchTags,
            selectedStocks,
            activeCards,
            cardSettings,
            globalStart,
            globalEnd,
        });
    }, [loading, prefsLoaded, userId, searchTags, selectedStocks, activeCards, cardSettings, globalStart, globalEnd]);

    return (
        <Box
            sx={{
                height: '100vh',
                overflow: 'hidden',
                backgroundColor: 'black',
                '@media (max-height: 720px), (max-width: 900px)': {
                    overflowY: 'auto',
                    overflowX: 'hidden',
                },
            }}
        >
            <div style={{ display: 'flex', height: '100%' }}>
                <Sidebar />
                <Box
                    component="main"
                    id="main-content"
                    tabIndex={-1}
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        height: '100vh',
                        overflow: 'hidden',
                        paddingLeft: 'var(--app-sidebar-width, 64px)',
                        transition: 'padding-left 200ms ease',
                        backgroundColor: 'black',
                        display: 'flex',
                        flexDirection: 'column',
                        '@media (max-height: 720px), (max-width: 900px)': {
                            height: 'auto',
                            minHeight: '100vh',
                            overflow: 'visible',
                        },
                    }}
                >

{/* Title and Search Bar-----------------------------------------------------------------------------------------------------------*/}
                    <Box
                        sx={{
                            height: 'clamp(114px, 14vh, 148px)',
                            px: 'clamp(8px, 0.85vw, 16px)',
                            py: 'clamp(6px, 1vh, 12px)',
                            backgroundColor: 'transparent',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'stretch',
                            gap: 'clamp(16px, 1.8vh, 22px)',
                            flexShrink: 0,
                            overflow: 'visible',
                            '@media (max-height: 720px), (max-width: 900px)': {
                                height: 'auto',
                                minHeight: 'unset',
                                overflow: 'visible',
                            },
                        }}
                    >    
                        <Typography
                            variant="h6"
                            sx={{ 
                                color: 'white', 
                                fontWeight: 600, 
                                fontSize: 'clamp(22px, 1.65vw, 32px)',
                                lineHeight: 1.1,
                                flexShrink: 0,
                            }}
                            >
                            Portfolio Analytics
                        </Typography>


{/* Search Bar UI only ---------------------------------------------------------------------------------------------------*/}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                gap: 'clamp(10px, 1vw, 16px)',
                                flexWrap: { xs: 'wrap', lg: 'nowrap' },
                                mt: 0,
                                minHeight: 0,
                            }}
                        >
                            <Box ref={stockSelectRef} sx={{ flex: '1 1 420px', minWidth: { xs: '100%', md: 320 }, position: 'relative', zIndex: 20 }}>
                                <Typography
                                    variant="h5"
                                    sx={{ 
                                        color: 'white', 
                                        fontWeight: 300, 
                                        fontSize: 'clamp(11px, 0.72vw, 14px)',
                                        mb: 'clamp(2px, 0.35vh, 4px)',
                                        lineHeight: 1.1,
                                    }}
                                >
                                    Select Stocks
                                </Typography>

                                <Autocomplete
                                    multiple
                                    freeSolo
                                    disablePortal
                                    filterSelectedOptions
                                    options={stockOptions}
                                    groupBy={(option) => topPickSet.has(option) ? 'Top Picks Recommended' : 'All Stocks'}
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
                                        '& .MuiAutocomplete-inputRoot': {
                                            flexWrap: 'wrap',
                                            gap: 'clamp(3px, 0.35vw, 6px)',
                                            minHeight: 'clamp(34px, 4vh, 42px)',
                                            backgroundColor: '#1b1b20',
                                            color: '#fff',
                                            borderRadius: 1,
                                            py: 'clamp(3px, 0.5vh, 6px)',
                                            pl: 'clamp(6px, 0.55vw, 10px)',
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
                                            fontSize: 'clamp(12px, 0.75vw, 14px)',
                                        },
                                        '& input::placeholder': {
                                            color: '#a09ca8',
                                            opacity: 1,
                                        },
                                        '& .MuiAutocomplete-popperDisablePortal': {
                                            width: stockSelectWidth ? `${stockSelectWidth}px !important` : '100%',
                                            maxWidth: stockSelectWidth ? `${stockSelectWidth}px` : '100%',
                                            zIndex: 40,
                                        },
                                    }}
                                    slotProps={{
                                        popper: {
                                            sx: {
                                                width: stockSelectWidth ? `${stockSelectWidth}px !important` : '100%',
                                                maxWidth: stockSelectWidth ? `${stockSelectWidth}px` : '100%',
                                                zIndex: 40,
                                            },
                                        },
                                        paper: {
                                            sx: {
                                                bgcolor: '#1b1b20',
                                                color: '#fff',
                                                border: '1px solid #2c2c33',
                                                borderRadius: 1,
                                                boxShadow: '0 12px 32px rgba(0,0,0,.45)',
                                                '& .MuiAutocomplete-option': {
                                                    color: '#fff',
                                                    fontSize: 'clamp(12px, 0.75vw, 14px)',
                                                },
                                                '& .MuiAutocomplete-option[aria-selected="true"]': {
                                                    bgcolor: 'rgba(109,93,252,.22)',
                                                },
                                                '& .MuiAutocomplete-option.Mui-focused': {
                                                    bgcolor: 'rgba(109,93,252,.28)',
                                                },
                                                '& .MuiAutocomplete-listbox': {
                                                    p: 0,
                                                    maxHeight: 'min(380px, calc(100vh - 180px))',
                                                },
                                            },
                                        },
                                    }}
                                    renderGroup={(params) => (
                                        <li key={params.key}>
                                            <Box
                                                sx={{
                                                    position: 'sticky',
                                                    top: 0,
                                                    zIndex: 1,
                                                    bgcolor: '#141419',
                                                    color: '#9aa7ff',
                                                    px: 1.5,
                                                    minHeight: 38,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    fontSize: 'clamp(11px, 0.68vw, 13px)',
                                                    fontWeight: 700,
                                                    borderTop: '1px solid rgba(255,255,255,0.04)',
                                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                    boxShadow: '0 8px 12px rgba(20,20,25,0.92)',
                                                }}
                                            >
                                                {params.group}
                                            </Box>
                                            <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>{params.children}</ul>
                                        </li>
                                    )}
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
                                                        mr: 'clamp(3px, 0.35vw, 6px)',
                                                        height: 'clamp(22px, 2.7vh, 26px)',
                                                        fontSize: 'clamp(11px, 0.7vw, 13px)',
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
                            </Box>

{/* Global Date Selection ------------------------------------------------------------------------------------------------*/}
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 'clamp(10px, 1vw, 16px)',
                                width: { xs: '100%', sm: 'clamp(420px, 27vw, 560px)' },
                                maxWidth: '100%',
                                flexDirection: 'row',
                            }}
                        >
                            <Box sx={{ flex: 1 }}>
                                <Typography
                                    sx={{
                                        color: 'white',
                                        fontSize: 'clamp(11px, 0.68vw, 13px)',
                                        fontWeight: 300,
                                        mb: 'clamp(2px, 0.35vh, 4px)',
                                        lineHeight: 1.1,
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
                                                height: 'clamp(34px, 4vh, 42px)',
                                                backgroundColor: '#1b1b20',
                                                color: '#fff',
                                                borderRadius: 2,
                                                fontSize: 'clamp(12px, 0.75vw, 14px)',
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
                                        color: 'white',
                                        fontSize: 'clamp(11px, 0.68vw, 13px)',
                                        fontWeight: 300,
                                        mb: 'clamp(2px, 0.35vh, 4px)',
                                        lineHeight: 1.1,
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
                                                height: 'clamp(34px, 4vh, 42px)',
                                                backgroundColor: '#1b1b20',
                                                color: '#fff',
                                                borderRadius: 2,
                                                fontSize: 'clamp(12px, 0.75vw, 14px)',
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
                            <Box sx={{ flex: '0 0 auto', minWidth: { xs: '100%', lg: 'auto' } }}>
                                <Typography
                                    sx={{
                                        color: 'transparent',
                                        fontSize: 'clamp(11px, 0.68vw, 13px)',
                                        fontWeight: 300,
                                        mb: 'clamp(2px, 0.35vh, 4px)',
                                        lineHeight: 1.1,
                                        userSelect: 'none',
                                    }}
                                >
                                    Observer
                                </Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<VisibilityOutlinedIcon fontSize="small" />}
                                    onClick={openObserverMode}
                                    sx={{
                                        height: 'clamp(34px, 4vh, 42px)',
                                        px: 'clamp(12px, 1vw, 16px)',
                                        borderRadius: 1,
                                        border: '1px solid #4f46e5',
                                        bgcolor: '#17181d',
                                        color: '#fff',
                                        boxShadow: 'none',
                                        textTransform: 'none',
                                        fontSize: 'clamp(12px, 0.75vw, 14px)',
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap',
                                        '&:hover': {
                                            bgcolor: '#22243a',
                                            boxShadow: 'none',
                                        },
                                    }}
                                >
                                    Observer Mode
                                </Button>
                            </Box>
                        </Box>
                    </Box>

{/*Visulization Box--------------------------------------------------------------------------------------------------------------*/}
                    <Box
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            p: 'clamp(8px, 0.85vw, 16px)',
                            pt: 0,
                            '@media (max-height: 720px), (max-width: 900px)': {
                                flex: 'none',
                                minHeight: 'unset',
                            },
                        }}
                    >
                        <Box
                            sx={{
                                height: '100%',
                                minHeight: 0,
                                display: 'grid',
                                gap: 'clamp(8px, 0.85vw, 16px)',
                                gridTemplateColumns: {
                                    xs: 'repeat(3, minmax(0, 1fr))',
                                    md: 'repeat(6, minmax(0, 1fr))',
                                },
                                gridTemplateRows: {
                                    xs: 'repeat(3, minmax(0, 1fr))',
                                    md: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.72fr)',
                                },
                                '& > *': {
                                    minWidth: 0,
                                    minHeight: 0,
                                },
                                '@media (max-height: 720px), (max-width: 900px)': {
                                    height: 'auto',
                                    minHeight: 'unset',
                                    gridTemplateColumns: '1fr',
                                    gridTemplateRows: 'none',
                                    gridAutoRows: 'clamp(280px, 58vh, 420px)',
                                    '& > *': {
                                        gridColumn: 'auto !important',
                                        gridRow: 'auto !important',
                                        minHeight: 0,
                                    },
                                },
                            }}
                        >
                            <Box sx={{ gridColumn: { xs: '1 / 4', md: '1 / 5' }, gridRow: { xs: '1 / 2', md: '1 / 3' } }}>
                                <StockChartCard
                                    index={0}
                                    selectedStocks={selectedStocks}
                                    isActive={activeCards[0]}
                                    cardSettings={cardSettings[0]}
                                    onClear={handleClear}
                                    onSwap={handleSwap}
                                    onActivate={handleActivate}
                                    onUpdateSettings={handleCardSettingsUpdate}
                                    height="100%"
                                    variant="main"
                                />
                            </Box>

                            {[1, 2].map((index) => (
                                <Box
                                    key={index}
                                    sx={{
                                        gridColumn: { xs: index === 1 ? '1 / 2' : '2 / 4', md: '5 / 7' },
                                        gridRow: { xs: '2 / 3', md: `${index} / ${index + 1}` },
                                    }}
                                >
                                    <StockChartCard
                                        index={index}
                                        selectedStocks={selectedStocks}
                                        isActive={activeCards[index]}
                                        cardSettings={cardSettings[index]}
                                        onClear={handleClear}
                                        onSwap={handleSwap}
                                        onActivate={handleActivate}
                                        onUpdateSettings={handleCardSettingsUpdate}
                                        height="100%"
                                        variant="main"
                                    />
                                </Box>
                            ))}

                            {[3, 4, 5].map((index) => (
                                <Box
                                    key={index}
                                    sx={{
                                        gridColumn: {
                                            xs: `${index - 2} / ${index - 1}`,
                                            md: `${(index - 3) * 2 + 1} / ${(index - 3) * 2 + 3}`,
                                        },
                                        gridRow: { xs: '3 / 4', md: '3 / 4' },
                                    }}
                                >
                                    <StockChartCard
                                        index={index}
                                        selectedStocks={selectedStocks}
                                        isActive={activeCards[index]}
                                        cardSettings={cardSettings[index]}
                                        onClear={handleClear}
                                        onSwap={handleSwap}
                                        onActivate={handleActivate}
                                        onUpdateSettings={handleCardSettingsUpdate}
                                        height="100%"
                                        variant="main"
                                        chartLayout="compact"
                                    />
                                </Box>
                            ))}
                        </Box>
                    </Box>
                    {observerOpen && (
                        <Box
                            sx={{
                                position: 'fixed',
                                inset: 0,
                                zIndex: 1500,
                                bgcolor: '#050506',
                                color: '#fff',
                                overflow: 'hidden',
                            }}
                        >
                            <Box
                                sx={{
                                    height: 56,
                                    px: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    borderBottom: '1px solid #24262d',
                                    bgcolor: '#0b0b0f',
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <VisibilityOutlinedIcon sx={{ color: '#9aa7ff' }} />
                                    <Typography sx={{ fontWeight: 800, fontSize: 18 }}>
                                        Observer Mode
                                    </Typography>
                                    <Typography sx={{ color: '#8f98aa', fontSize: 13 }}>
                                        Drag, resize, add, or close chart windows
                                    </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Button
                                        variant="contained"
                                        startIcon={observerWindows.length >= cardSettings.length ? undefined : <AddIcon fontSize="small" />}
                                        onClick={addObserverWindow}
                                        disabled={observerWindows.length >= cardSettings.length}
                                        sx={{
                                            bgcolor: '#17181d',
                                            color: '#fff',
                                            border: '1px solid #2f3340',
                                            boxShadow: 'none',
                                            textTransform: 'none',
                                            '&:hover': { bgcolor: '#22243a', boxShadow: 'none' },
                                            '&.Mui-disabled': {
                                                bgcolor: '#17181d',
                                                color: '#dce4ff',
                                                border: '1px solid #2f3340',
                                                opacity: 1,
                                            },
                                        }}
                                    >
                                        {observerWindows.length >= cardSettings.length ? 'Full' : 'Add Chart'}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        onClick={() => setObserverWindows(
                                            createObserverDashboardLayout(observerWindows.map(window => window.cardIndex))
                                        )}
                                        sx={{
                                            color: '#dce4ff',
                                            borderColor: '#343846',
                                            textTransform: 'none',
                                            '&:hover': {
                                                borderColor: '#5367ff',
                                                bgcolor: 'rgba(83,103,255,0.08)',
                                            },
                                        }}
                                    >
                                        Reset Layout
                                    </Button>
                                    <Button
                                        variant="contained"
                                        onClick={() => setObserverOpen(false)}
                                        sx={{
                                            bgcolor: '#5d67ff',
                                            color: '#fff',
                                            boxShadow: 'none',
                                            textTransform: 'none',
                                            '&:hover': { bgcolor: '#7079ff', boxShadow: 'none' },
                                        }}
                                    >
                                        Exit
                                    </Button>
                                </Box>
                            </Box>

                            <Box
                                sx={{
                                    position: 'relative',
                                    height: 'calc(100vh - 56px)',
                                    overflow: 'hidden',
                                    background:
                                        'linear-gradient(#0d0d10 1px, transparent 1px), linear-gradient(90deg, #0d0d10 1px, transparent 1px)',
                                    backgroundSize: '32px 32px',
                                }}
                            >
                                {observerWindows.length === 0 && (
                                    <Box
                                        sx={{
                                            height: '100%',
                                            display: 'grid',
                                            placeItems: 'center',
                                            color: '#8f98aa',
                                            fontSize: 15,
                                        }}
                                    >
                                        No chart windows. Use Add Chart to bring one back.
                                    </Box>
                                )}

                                {observerWindows.map((windowState) => (
                                    <ObserverChartWindow
                                        key={windowState.cardIndex}
                                        windowState={windowState}
                                        selectedStocks={selectedStocks}
                                        isActive={activeCards[windowState.cardIndex]}
                                        cardSettings={cardSettings[windowState.cardIndex]}
                                        onClear={handleClear}
                                        onSwap={handleSwap}
                                        onActivate={handleActivate}
                                        onUpdateSettings={handleCardSettingsUpdate}
                                        onClose={closeObserverWindow}
                                        onBringForward={bringObserverWindowForward}
                                        onStartDrag={startObserverDrag}
                                        onStartResize={startObserverResize}
                                    />
                                ))}
                            </Box>
                        </Box>
                    )}
                </Box>
            </div>
        </Box>
    );
};

export default DashboardView;
