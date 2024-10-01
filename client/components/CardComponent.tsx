// components/CardComponent.tsx

import React, { useState, useEffect } from 'react';
import Image, { StaticImageData } from 'next/image';
import { Box, Button } from '@mui/material';

interface CardComponentProps {
    index: number;
    content: StaticImageData | null;
    onLoadImage: (index: number) => void;
    onClear: (index: number) => void;
    onSwap: (index: number) => void;
    height?: number;
}

const CardComponent: React.FC<CardComponentProps> = ({
                                                         index,
                                                         content,
                                                         onLoadImage,
                                                         onClear,
                                                         onSwap,
                                                         height,
                                                     }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const buttonBackgroundColor = '#777'; // Grey background color
    const buttonHoverColor = '#555'; // Darker grey on hover

    const handleFullscreenToggle = () => {
        setIsFullscreen(!isFullscreen);
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
            {content ? (
                <Image
                    src={content}
                    alt={`Card ${index + 1}`}
                    layout="fill"
                    objectFit="cover"
                />
            ) : (
                <Button
                    variant="contained"
                    onClick={() => onLoadImage(index)}
                    sx={{
                        position: 'absolute',
                        top: 'calc(50% - 20px)',
                        left: 'calc(50% - 20px)',
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        minWidth: 'unset',
                        backgroundColor: buttonBackgroundColor,
                        color: 'white',
                        fontSize: '24px',
                        '&:hover': {
                            backgroundColor: buttonHoverColor,
                        },
                    }}
                >
                    +
                </Button>
            )}

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
