// components/CardComponent.tsx

import React from 'react';
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
    const buttonBackgroundColor = '#777'; // Grey background color
    const buttonHoverColor = '#555'; // Darker grey on hover

    return (
        <Box
            sx={{
                position: 'relative',
                width: '100%',
                height: height || 400, // Increased default height
                backgroundColor: '#333',
                border: '1px solid #555',
                overflow: 'hidden',
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

            {/* Swap and Clear buttons */}
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
                        minWidth: 'unset',
                        padding: '4px',
                        backgroundColor: buttonBackgroundColor,
                        color: 'white',
                        fontSize: '16px',
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
                        minWidth: 'unset',
                        padding: '4px',
                        backgroundColor: buttonBackgroundColor,
                        color: 'white',
                        fontSize: '16px',
                        '&:hover': {
                            backgroundColor: buttonHoverColor,
                        },
                    }}
                >
                    ×
                </Button>
            </Box>
        </Box>
    );
};

export default CardComponent;
