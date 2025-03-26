// components/CardComponent.tsx

import React, { useState, useEffect } from 'react';
import Image, { StaticImageData } from 'next/image';
import { Box, Button, IconButton, Menu, MenuItem } from '@mui/material';
import { ChartState, ChartType } from '@/pages/dashboardView';

interface CardComponentProps {
    index: number;
    content: ChartState;
    onSelectChartType: (index: number, selectedType: ChartType) => void;
    onLoadImage: (index: number) => void;
    onClear: (index: number) => void;
    onSwap: (index: number) => void;
    height?: number;
}

const CardComponent: React.FC<CardComponentProps> = ({
                                                         index,
                                                         content,
                                                         onLoadImage,
                                                         onSelectChartType,
                                                         onClear,
                                                         onSwap,
                                                         height,
                                                     }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const buttonBackgroundColor = '#777'; // Grey background color
    const buttonHoverColor = '#555'; // Darker grey on hover

    const handleFullscreenToggle = () => {
        setIsFullscreen(!isFullscreen);
    };

    const handlePlusClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };
    
    const handleCloseMenu = () => {
        setAnchorEl(null);
    };
    
    const handleMenuSelect = (chartValue: ChartType) => {
        onSelectChartType(index, chartValue);
        handleCloseMenu();
    };

    // Optional: Prevent background scrolling when in fullscreen mode
    useEffect(() => {
        if (isFullscreen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }, [isFullscreen]);

    return (
        <Box
            sx={{
                position: isFullscreen ? 'fixed' : 'relative',
                top: isFullscreen ? 0 : 'unset',
                left: isFullscreen ? 0 : 'unset',
                width: isFullscreen ? '100vw' : '100%',
                height: isFullscreen ? '100vh' : height || 400,
                backgroundColor: '#333',
                border: '1px solid #555',
                overflow: 'hidden',
                zIndex: isFullscreen ? 1000 : 'unset',
            }}
            >
                {content.chartType ? (
                    // Render placeholder for the selected chart type
                    <Box
                        sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: 'white',
                        fontSize: '24px',
                        }}
                    >
                        Placeholder for {content.chartType}
                    </Box>
                    ) : (
                    // Render plus button that opens the dropdown menu
                    <IconButton
                        onClick={handlePlusClick}
                        sx={{
                        position: 'absolute',
                        top: 'calc(50% - 20px)',
                        left: 'calc(50% - 20px)',
                        width: 40,
                        height: 40,
                        backgroundColor: '#777',
                        color: 'white',
                        '&:hover': {
                            backgroundColor: '#555',
                        },
                        }}
                    >
                        +
                    </IconButton>
                )}
        
                {/* Dropdown Menu for chart type selection */}
                <Menu anchorEl={anchorEl} open={open} onClose={handleCloseMenu}>
                    <MenuItem onClick={() => handleMenuSelect('BetaAnalysis')}>BetaAnalysis</MenuItem>
                    <MenuItem onClick={() => handleMenuSelect('AlphaComparison')}>AlphaComparison</MenuItem>
                    <MenuItem onClick={() => handleMenuSelect('MaxDrawdownAnalysis')}>MaxDrawdownAnalysis</MenuItem>
                    <MenuItem onClick={() => handleMenuSelect('CumulativeReturnComparison')}>CumulativeReturnComparison</MenuItem>
                    <MenuItem onClick={() => handleMenuSelect('SortinoRatioVisualization')}>SortinoRatioVisualization</MenuItem>
                    <MenuItem onClick={() => handleMenuSelect('MarketCorrelationAnalysis')}>MarketCorrelationAnalysis</MenuItem>
                    <MenuItem onClick={() => handleMenuSelect('SharpeRatioMatrix')}>SharpeRatioMatrix</MenuItem>
                    <MenuItem onClick={() => handleMenuSelect('ValueAtRiskAnalysis')}>ValueAtRiskAnalysis(VaR)</MenuItem>
                    <MenuItem onClick={() => handleMenuSelect('EfficientFrontierVisualization')}>EfficientFrontierVisualization</MenuItem>
                </Menu>

            {/* Swap, Clear, and Fullscreen buttons */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    display: 'flex',
                    gap: 1,
                }}
            >
                <Button
                    variant="contained"
                    size="small"
                    onClick={() => onSwap(index)}
                    sx={{
                        width: 32,
                        height: 32,
                        minWidth: 'unset',
                        padding: 0,
                        backgroundColor: buttonBackgroundColor,
                        color: 'white',
                        fontSize: '18px',
                        '&:hover': {
                            backgroundColor: buttonHoverColor,
                        },
                    }}
                >
                    ↔
                </Button>
                <Button
                    variant="contained"
                    size="small"
                    onClick={() => onClear(index)}
                    sx={{
                        width: 32,
                        height: 32,
                        minWidth: 'unset',
                        padding: 0,
                        backgroundColor: buttonBackgroundColor,
                        color: 'white',
                        fontSize: '18px',
                        '&:hover': {
                            backgroundColor: buttonHoverColor,
                        },
                    }}
                >
                    ×
                </Button>
                <Button
                    variant="contained"
                    size="small"
                    onClick={handleFullscreenToggle}
                    sx={{
                        width: 32,
                        height: 32,
                        minWidth: 'unset',
                        padding: 0,
                        backgroundColor: buttonBackgroundColor,
                        color: 'white',
                        fontSize: '18px',
                        '&:hover': {
                            backgroundColor: buttonHoverColor,
                        },
                    }}
                >
                    {isFullscreen ? '⤡' : '⤢'}
                </Button>
            </Box>
        </Box>
    );
};

export default CardComponent;
