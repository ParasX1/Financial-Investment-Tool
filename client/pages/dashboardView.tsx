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
import OHLCChart from '@/components/ohlc';
import { Select, SelectItem } from "@nextui-org/react";
import StockChartCard from '@/components/StockCardComponent';


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
    const [selectedStocks, setSelectedStocks] = useState<(string | null)[]>([
        null, null, null, null, null, null,
    ]);

    const handleSelectStock = (index: number, stock: string) => {
        const newStocks = [...selectedStocks];
        newStocks[index] = stock;
        setSelectedStocks(newStocks);
    };

    const handleClear = (index: number) => {
        const newStocks = [...selectedStocks];
        newStocks[index] = null;
        setSelectedStocks(newStocks);
    };

    const handleSwap = (index: number) => {
        if (index === 0) return;
        const newStocks = [...selectedStocks];
        const temp = newStocks[0];
        newStocks[0] = newStocks[index];
        newStocks[index] = temp;
        setSelectedStocks(newStocks);
    };

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