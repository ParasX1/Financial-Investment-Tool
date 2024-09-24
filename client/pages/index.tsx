import React, { useEffect, useState } from "react";
import Modal from "react-bootstrap/Modal";
import ModalLogin from "@/components/Modal/ModalLogin";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Link,
  Button,
  Spacer,
  Card,
  CardBody,
  CardFooter,
} from "@nextui-org/react";
import Image from "next/image";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Button as MUIButton } from '@mui/material';
import ModalSignUp from "@/components/Modal/ModalSignUp";
import Sidebar from "@/components/sidebar"; // Adjust the path to match where Sidebar is located in your project


function TextGrid() {
  // Import images using require
  const img1 = require("@/assets/gridBackground1.png");
  const img2 = require("@/assets/gridBackground1.png");
  const img3 = require("@/assets/gridBackground1.png");
  const img4 = require("@/assets/gridBackground1.png");
  const img5 = require("@/assets/gridBackground1.png");
  const img6 = require("@/assets/gridBackground1.png");

  const items = [
    { text: (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
              Volatility
            </Typography>
            <Typography variant="body2" sx={{ color: 'white', textAlign: 'center' }}>
              Measures the degree of variation in trading prices over time.
            </Typography>
          </Box>
      ), image: img1 },
    { text: (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
              Sharpe Ratio
            </Typography>
            <Typography variant="body2" sx={{ color: 'white', textAlign: 'center' }}>
              A measure of risk-adjusted return.
            </Typography>
          </Box>
      ), image: img1 },
    { text: (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
              Value at Risk (VaR)
            </Typography>
            <Typography variant="body2" sx={{ color: 'white', textAlign: 'center' }}>
              Quantifies the potential loss on an investment over a specific period.
            </Typography>
          </Box>
      ), image: img1 },
    { text: (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
              Cumulative Returns
            </Typography>
            <Typography variant="body2" sx={{ color: 'white', textAlign: 'center' }}>
              Shows the total returns of an investment over a specific time period.
            </Typography>
          </Box>
      ), image: img1 },
    { text: (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
              Drawdown and Maximum Drawdown
            </Typography>
            <Typography variant="body2" sx={{ color: 'white', textAlign: 'center' }}>
              Measures the peak-to-trough decline during a specific period.
            </Typography>
          </Box>
      ), image: img1 },
    { text: (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
              Correlation Matrix
            </Typography>
            <Typography variant="body2" sx={{ color: 'white', textAlign: 'center' }}>
              Examines the relationships between different stocks in the portfolio.
            </Typography>
          </Box>
      ), image: img1 },
  ];

  return (
      <Box sx={{ padding: 4 }}>
        <Grid container spacing={2}>
          {items.map((item, index) => (
              <Grid item xs={4} key={index}>
                <Box
                    sx={{
                      position: "relative",
                      height: 250, // Set a fixed height for the boxes
                      border: "1px solid grey",
                      overflow: "hidden",
                    }}
                >
                  <Image
                      src={item.image}
                      alt={`Image for box ${index + 1}`}
                      layout="fill" // Makes the image take up the full box
                      objectFit="cover" // Ensures the image covers the entire box
                  />
                  <Box
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.5)", // Covers the entire image with a dark overlay
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
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
}

function Index() {
  const [message, setMessage] = useState("Loading");
  const [list, setList] = useState([]);
  const logo = require("@/assets/logo.png");
  const img1 = require("@/assets/gridBackground1.png");
  const imgStar = require("@/assets/star.png");
  const team = require("@/assets/team.png");

  // Signup-Login Modal
  const [showSignUp, setSignUp] = useState(false);
  const [showLogIn, setShowLogIn] =useState(false);
  const handleLoginShow = () => setShowLogIn(true);
  const handleLoginClose = () => setShowLogIn(false);

  const handleSignUpShow = () => setSignUp(true);
  const handleSignUpClose = () => setSignUp(false);

  useEffect(() => {
    fetch("http://localhost:8080/api/home")
      .then((response) => response.json())
      .then((data) => {
        setMessage(data.test);
        setList(data.testList);
      });
  }, []);


  return (
    <div>
      <div style={{ display: "flex" }}>
        <Sidebar />
        <div style={{ flex: 1, paddingLeft: "200px" }}>
          {/* Your existing content here */}
          <Navbar maxWidth={'full'}>
            <NavbarContent className="hidden sm:flex gap-4" justify="start">
              <NavbarItem>
                <Link color="foreground" href="#">
                  About Us
                </Link>
              </NavbarItem>
              <Spacer x={6} />
              <NavbarItem>
                <Link href="search" color="foreground">
                  Services
                </Link>
              </NavbarItem>
              <Spacer x={6} />
              <NavbarItem>
                <Link color="foreground" href="#">
                  Tools
                </Link>
              </NavbarItem>
              <Spacer x={6} />
              <NavbarItem>
                <Link color="foreground" href="#">
                  People
                </Link>
              </NavbarItem>
            </NavbarContent>
            <NavbarContent justify="end">
              <NavbarItem className="hidden lg:flex">
                <>
                  <Button color="primary" href="#" variant="flat" onClick={handleLoginShow}>
                    Log In
                  </Button>

                  <ModalLogin
                    show={showLogIn}
                    onHide={handleLoginClose}/>
                </>
              </NavbarItem>
              <NavbarItem>
                <>
                <Button color="primary" variant="flat" onClick={handleSignUpShow}>
                  Sign Up
                </Button>

                  <ModalSignUp
                    show={showSignUp}
                    onHide={handleSignUpClose}/>
                </>

              </NavbarItem>
            </NavbarContent>
          </Navbar>
          <div>{message}</div>

          {list.map((item, index) => (
            <div key={index}>{item}</div>
          ))}

          <div className="two-column">
            <div className="left-column">
              <h1 className="title-text">FIT</h1>
              <p>Descriptions add later</p>
              <Spacer y={3} />
              <div className="button-container">
                <Button className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg" color="primary">
                  Button1
                </Button>
                <Spacer x={3} />
                <Button className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg">
                  Button2
                </Button>
              </div>
            </div>
            <div className="right-column">
              {/* PUT IMAGE IN THE FUTURE */}
            </div>
          </div>

          <div className="two-rows">
            <p>Descriptions add later</p>
          </div>

            {/* ANALYSIS TOOLS AND DESCRIPTIONS SECTION */}
            <Box sx={{ backgroundColor: "black", padding: 4, marginBottom: 8 }}>

                {/* HEADER AND IMPORTANT POINTS */}
                <Box sx={{ padding: 2, paddingLeft: "30px", marginBottom: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={6}>
                            <Typography variant="h3" sx={{ fontWeight: "bold", color: "white" }}>
                                Level up your trading with <span style={{ color: "#007bff" }}>FIT</span>.
                            </Typography>
                            <Typography variant="body1" sx={{ marginTop: 1, maxWidth: "600px", color: "white" }}>
                                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam eu lorem non erat facilisis molestie. Fusce viverra purus lorem, at tempus ipsum dictum ac. Donec ut dui sit amet velit consectetur condimentum.
                            </Typography>
                        </Grid>
                        <Grid item xs={6}>
                            <Grid container spacing={2}>
                                <Grid item xs={4}>
                                    <Image src={imgStar} alt="Logo" height="80" />
                                    <Box sx={{ textAlign: "left" }}>
                                        <Typography variant="h6" sx={{ fontWeight: "bold", color: "white" }}>
                                            Important point
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: "white" }}>
                                            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                                            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={4}>
                                    <Image src={imgStar} alt="Logo" height="80" />
                                    <Box sx={{ textAlign: "left" }}>
                                        <Typography variant="h6" sx={{ fontWeight: "bold", color: "white" }}>
                                            Important point
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: "white" }}>
                                            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                                            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={4}>
                                    <Image src={imgStar} alt="Logo" height="80" />
                                    <Box sx={{ textAlign: "left" }}>
                                        <Typography variant="h6" sx={{ fontWeight: "bold", color: "white" }}>
                                            Important point
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: "white" }}>
                                            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                                            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </Box>


                {/* TOOL INFO SECTION */}
                <Box
                    sx={{
                        position: "relative",
                        width: "calc(100% - 60px)",
                        height: "350px",
                        border: "1px solid grey",
                        overflow: "hidden",
                        margin: "0 auto",
                        marginBottom: 8,
                    }}
                >
                    <Image
                        src={img1}
                        alt="Generational Wealth"
                        layout="fill"
                        objectFit="cover"
                    />
                </Box>

                {/* HEADER ABOVE THE GRID */}
                <Box sx={{ padding: 0, paddingLeft: "30px", textAlign: "center", marginBottom: 0 }}>
                    <Typography variant="h3" sx={{ fontWeight: "bold", textAlign: "left", color: "white" }}>
                        Analysis made easy
                    </Typography>
                </Box>

                {/* TOOL INFO GRID BOXES */}
                <TextGrid />


                {/* TAGLINE AND BUTTON SECTION */}
                <Box sx={{ backgroundColor: "black", padding: 4, textAlign: "center" }}>
                    <Typography variant="h4" sx={{ fontWeight: "bold", color: "white" }}>
                        Get financially <span style={{ color: "#007bff" }}>FIT.</span> today
                    </Typography>
                    <MUIButton
                        sx={{
                            marginTop: 2,
                            backgroundColor: "#007bff",
                            color: "white",
                            padding: "10px 20px",
                            borderRadius: "8px",
                        }}
                    >
                        Get FIT
                    </MUIButton>
                </Box>
            </Box>
          <div>
            <div className="about-us-wrapper">
              <div className="about-us-container">
                <h1 className="about-us-heading">About Us</h1>
                <div className="about-us-flex-container">

                  <Image src={team} alt="Team Picture" width="700" />
                  <div className="about-us-text">
                    <br></br>
                    <p>
                      We&#39;re a brilliant team of computer science students who somehow traded in our keyboards for investment algorithms
                      (though we still find time to throw in Valorant). We might have left the pro Valorant scene behind, but our passion
                      for winning now drives us to create the ultimate financial investment tool—FIT. Whether it&apos;s clutching rounds or
                      coding smart financial solutions, we’ve got it covered.
                      <br></br>
                      <br></br>
                      With FIT, we’re on a mission to help investors navigate the market by analyzing whether stocks are going up, down,
                      or sideways. We pull in historical data, visualize trends, and assess risk, all to ensure that you’re making informed
                      decisions. From tracking volatility to backtesting trading strategies, our app is designed to give you the edge in
                      your financial game.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    
  );
}


export default Index;
