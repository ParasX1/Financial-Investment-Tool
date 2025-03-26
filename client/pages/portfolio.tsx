import React, { useState } from 'react';
import Sidebar from '@/components/sidebar';
import {
  Navbar,
  NavbarContent,
  NavbarItem,
  Link as NextUILink,
  Button as NextUIButton,
  Spacer,
} from '@nextui-org/react';
import { Grid, Box } from '@mui/material';

import ModalLogin from '@/components/Modal/ModalLogin';
import ModalSignUp from '@/components/Modal/ModalSignUp';
import CardComponent from '@/components/CardComponent';

import BarGraph from '@/components/bargraph';
import LineGraph from '@/components/linegraph';

// Sample data - testing integration
const Portfolio: React.FC = () => {
  const barData = [
    { label: 'Apples', value: 50 },
    { label: 'Bananas', value: 80 },
    { label: 'Cherries', value: 30 },
    { label: 'Dates', value: 70 },
    { label: 'Elderberries', value: 45 },
  ];

  const lineData = [
    { date: new Date('2024-01-01'), value: 50 },
    { date: new Date('2024-01-02'), value: 55 },
    { date: new Date('2024-01-03'), value: 60 },
    { date: new Date('2024-01-04'), value: 40 },
    { date: new Date('2024-01-05'), value: 75 },
    { date: new Date('2024-01-06'), value: 85 },
  ];

  // Sample data - AAPL historical data (https://www.nasdaq.com/market-activity/stocks/aapl/historical)
  const appleVolumeData = [
    { label: '03/21/2025', value: 94127770 },
    { label: '03/20/2025', value: 48862950 },
    { label: '03/19/2025', value: 54385390 },
    { label: '03/18/2025', value: 42432430 },
    { label: '03/17/2025', value: 48073430 },
    { label: '03/14/2025', value: 60107580 },
    { label: '03/13/2025', value: 61368330 },
    { label: '03/12/2025', value: 62547470 },
    { label: '03/11/2025', value: 76137410 },
    { label: '03/10/2025', value: 72071200 },
  ];

  const appleClosingData = [
    { date: new Date('2025-03-21'), value: 218.27 },
    { date: new Date('2025-03-20'), value: 214.10 },
    { date: new Date('2025-03-19'), value: 215.24 },
    { date: new Date('2025-03-18'), value: 212.69 },
    { date: new Date('2025-03-17'), value: 214.00 },
    { date: new Date('2025-03-14'), value: 213.49 },
    { date: new Date('2025-03-13'), value: 209.68 },
    { date: new Date('2025-03-12'), value: 216.98 },
    { date: new Date('2025-03-11'), value: 220.84 },
    { date: new Date('2025-03-10'), value: 227.48 },
  ];

  // Constants from dashboardView.tsx - to be used in the future
  const [showSignUp, setSignUp] = useState(false);
  const [showLogIn, setLogIn] = useState(false);

  const handleLoginShow = () => setLogIn(true);
  const handleLoginClose = () => setLogIn(false);

  const handleSignUpShow = () => setSignUp(true);
  const handleSignUpClose = () => setSignUp(false);

  const [cardContents, setCardContents] = useState<Array<React.ReactNode | null>>(
    [null, null, null, null]
  );

  // Decide which graph to load depending on card index
  // Put one on each side for now
  const handleLoadImage = (index: number) => {
    const newContents = [...cardContents];
    
    if (index == 2 || index == 0) {
      newContents[index] = <BarGraph data={appleVolumeData} width={1455} height={700} />;
    }
    else {
      newContents[index] = <LineGraph data={appleClosingData} width={1455} height={700} />;
    }

    setCardContents(newContents);
  };

  const handleClear = (index: number) => {
    const newContents = [...cardContents];
    newContents[index] = null;
    setCardContents(newContents);
  };

  const handleSwap = (index: number) => {
    const newContents = [...cardContents];
    if (index === 0 || index === 1) {
      const swapIndex = index === 0 ? 1 : 0;
      const temp = newContents[index];
      newContents[index] = newContents[swapIndex];
      newContents[swapIndex] = temp;
    } else if (index === 2 || index === 3) {
      const swapIndex = index === 2 ? 3 : 2;
      const temp = newContents[index];
      newContents[index] = newContents[swapIndex];
      newContents[swapIndex] = temp;
    }
    setCardContents(newContents);
  };
  

  return (
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
          <NavbarContent justify="end">
            <NavbarItem className="hidden lg:flex">
              <>
                <NextUIButton color="primary" href="#" variant="flat" onClick={handleLoginShow}>
                  Log In
                </NextUIButton>
                <ModalLogin show={showLogIn} onHide={handleLoginClose} />
              </>
            </NavbarItem>
            <NavbarItem>
              <>
                <NextUIButton color="primary" variant="flat" onClick={handleSignUpShow}>
                  Sign Up
                </NextUIButton>
                <ModalSignUp show={showSignUp} onHide={handleSignUpClose} />
              </>
            </NavbarItem>
          </NavbarContent>
        </Navbar>

        {/* Main content area */}
        <div style={{ padding: '20px' }}>
          <Grid container spacing={2}>
            {[0, 1, 2, 3].map((i) => (
              <Grid item xs={12} md={6} key={i}>
                <CardComponent
                  index={i}
                  content={cardContents[i]}
                  onLoadImage={handleLoadImage}
                  onClear={handleClear}
                  onSwap={handleSwap}
                  height={700}
                />
              </Grid>
            ))}
          </Grid>
        </div>
      </Box>
    </div>
  );
};

export default Portfolio;
