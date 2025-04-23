// components/TextGrid.tsx

import React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Image from 'next/image';

// Import all images
import img1 from '@/assets/gridBackground1.png';
import img2 from '@/assets/gridBackground1.png';
import img3 from '@/assets/gridBackground1.png';
import img4 from '@/assets/gridBackground1.png';
import img5 from '@/assets/gridBackground1.png';
import img6 from '@/assets/gridBackground1.png';

const TextGrid: React.FC = () => {
    const items = [
        // Item 1
        {
            text: (
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
                        Volatility
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white', textAlign: 'center' }}>
                        Measures the degree of variation in trading prices over time.
                    </Typography>
                </Box>
            ),
            image: img1,
        },
        // Item 2
        {
            text: (
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
                        Sharpe Ratio
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white', textAlign: 'center' }}>
                    Measures risk-adjusted return—how much excess return you receive for the extra volatility endured.
                    </Typography>
                </Box>
            ),
            image: img2,
        },
        // Item 3
        {
            text: (
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
                        Value at Risk (VaR)
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white', textAlign: 'center' }}>
                        Quantifies the potential loss on an investment over a specific period.
                    </Typography>
                </Box>
            ),
            image: img3,
        },
        // Item 4
        {
            text: (
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
                        Cumulative Returns
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white', textAlign: 'center' }}>
                        Shows the total returns of an investment over a specific time period.
                    </Typography>
                </Box>
            ),
            image: img4,
        },
        // Item 5
        {
            text: (
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
                        Drawdown and Maximum Drawdown
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white', textAlign: 'center' }}>
                       Tracks the decline from a portfolio's peak to trough, indicating exposure to downside risk.
                    </Typography>
                </Box>
            ),
            image: img5,
        },
        // Item 6
        {
            text: (
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
                        Correlation Matrix
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white', textAlign: 'center' }}>
                        Examines the relationships between different stocks in the portfolio.
                    </Typography>
                </Box>
            ),
            image: img6,
        },
    ];

    return (
        <Box sx={{ padding: 4 }}>
            <Grid container spacing={2}>
                {items.map((item, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                        <Box
                            sx={{
                                position: 'relative',
                                height: 250,
                                border: '1px solid grey',
                                overflow: 'hidden',
                            }}
                        >
                            <Image
                                src={item.image}
                                alt={`Image for box ${index + 1}`}
                                layout="fill"
                                objectFit="cover"
                            />
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 1,
                                }}
                            >
                                {item.text}
                            </Box>
                        </Box>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default TextGrid;
