// pages/dashboardView.tsx

import React, {useEffect, useState} from 'react';
// @ts-ignore
import Sidebar from '@/components/Sidebar';
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
import { Grid, Box } from '@mui/material';
import img1 from '@/assets/gridBackground1.png';
import teamImage from '@/assets/team.png';
import { StaticImageData } from 'next/image';
import supabase from "@/components/supabase";

// Define the chart state for each card.
export type ChartType =
    | 'BetaAnalysis'
    | 'AlphaComparison'
    | 'MaxDrawdownAnalysis'
    | 'CumulativeReturnComparison'
    | 'SortinoRatioVisualization'
    | 'MarketCorrelationAnalysis'
    | 'SharpeRatioMatrix'
    | 'ValueAtRiskAnalysis'
    | 'EfficientFrontierVisualization'
    | null;

export interface ChartState {
    chartType: ChartType;
    image?: StaticImageData | null;
}

const DashboardView: React.FC = () => {
    // Signup-Login Modal states and handlers
    const [showSignUp, setSignUp] = useState(false);
    const [showLogIn, setLogIn] = useState(false);
    const [session, setSession] = useState(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            // @ts-ignore
            setSession(session)
        })

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            // @ts-ignore
            setSession(session)
        })

        return () => subscription.unsubscribe()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[])

    // Initialize card contents as an array of ChartState objects
    const [cardContents, setCardContents] = useState<Array<ChartState>>([
        { chartType: null, image: null },
        { chartType: null, image: null },
        { chartType: null, image: null },
        { chartType: null, image: null },
        { chartType: null, image: null },
        { chartType: null, image: null },
    ]);

    // Function to update a card's chart type based on user selection
    const handleSelectChartType = (index: number, selectedType: ChartType) => {
        const newContents = [...cardContents];
        newContents[index] = { ...newContents[index], chartType: selectedType };
        setCardContents(newContents);
    };
  

    // Functions to handle card actions
    const handleLoadImage = (index: number) => {
        const newContents = [...cardContents];
        newContents[index].image = index <= 2 ? teamImage : img1;
        setCardContents(newContents);
    };

    const handleClear = (index: number) => {
        const newContents = [...cardContents];
        newContents[index].image = null;
        newContents[index].chartType = null;
        setCardContents(newContents);
    };

    const handleSwap = (index: number) => {
        if (index === 0) return; // No need to swap with self
        const newContents = [...cardContents];
        const temp = newContents[0];
        newContents[0] = newContents[index];
        newContents[index] = temp;
        setCardContents(newContents);
    };

    return (
        <div>
            <div style={{ display: 'flex' }}>
                <Sidebar />
                <Box sx={{ flex: 1, paddingLeft: '50px', backgroundColor: 'black' }}>
                    {/* Navbar at the top */}
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

                    {/* Main content area */}
                    <div style={{ padding: '20px' }}>
                        <Grid container spacing={2}>
                        {/* Card 1 */}
                        <Grid item xs={12} md={8}>
                            <CardComponent
                            index={0}
                            content={cardContents[0]}
                            onSelectChartType={handleSelectChartType}
                            onLoadImage={handleLoadImage}
                            onClear={handleClear}
                            onSwap={handleSwap}
                            height={816} // Adjusted height
                            />
                        </Grid>
                        {/* Cards 2 and 3 */}
                        <Grid item xs={12} md={4}>
                            <Grid container direction="column" spacing={2}>
                            {[1, 2].map((index) => (
                                <Grid item key={index}>
                                <CardComponent
                                    index={index}
                                    content={cardContents[index]}
                                    onSelectChartType={handleSelectChartType}
                                    onLoadImage={handleLoadImage}
                                    onClear={handleClear}
                                    onSwap={handleSwap}
                                />
                                </Grid>
                            ))}
                            </Grid>
                        </Grid>
                        {/* Cards 4, 5, and 6 */}
                        <Grid item xs={12}>
                            <Grid container spacing={2}>
                            {[3, 4, 5].map((index) => (
                                <Grid item xs={12} sm={4} key={index}>
                                <CardComponent
                                    index={index}
                                    content={cardContents[index]}
                                    onSelectChartType={handleSelectChartType}
                                    onLoadImage={handleLoadImage}
                                    onClear={handleClear}
                                    onSwap={handleSwap}
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
