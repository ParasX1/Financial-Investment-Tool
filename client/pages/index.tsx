import React, { useEffect, useState, useContext } from "react";
import {
  NavbarContent,
  NavbarItem,
  Button,
  Spacer,
} from "@nextui-org/react";
import Image from "next/image";
import { Box, Grid} from '@mui/material';
import Typography from "@mui/material/Typography";
import { Button as MUIButton } from '@mui/material';
import Footer from "@/components/Footer";
import Sidebar from "@/components/sidebar"; // Adjust the path to match where Sidebar is located in your project
import 'boxicons/css/boxicons.min.css';
import TextGrid from "@/components/TextGrid";
import { Navbar } from "@/components/navbar";
import supabase from "@/components/supabase";
import Link from 'next/link';
import { useRouter } from 'next/router'
import { GraphSettingsContext } from '@/components/GraphSettingsContext';
import ModalLogin from '@/components/Modal/ModalLogin';
import ModalSignUp from '@/components/Modal/ModalSignUp';
import { useAuth } from '@/components/authContext'


function Index() {

  const [message, setMessage] = useState("Loading");
  const [list, setList] = useState([]);
  const logo = require("@/assets/logo.png");
  const img1 = require("@/assets/gridBackground1.png");
  const imgStar = require("@/assets/star.png");
  const team = require("@/assets/team.png");
  // Signup-Login Modal
  const { user, loading } = useAuth()
  const router = useRouter()
  const [session, setSession] = useState(null);
  const { settings, setSettings } = useContext(GraphSettingsContext);

  useEffect(() => {
    if (loading || !router.isReady || router.pathname !== '/index') return
    if (!user) return

    const stayParam = Array.isArray(router.query.stay)
      ? router.query.stay[0]
      : router.query.stay

    if (stayParam !== '1') {
      router.replace('/dashboardView')
    }
  }, [loading, user, router.isReady, router.pathname, router.query.stay])




  return (
        <div>
      <div style={{ display: "flex" }}>
        <Sidebar />
        <div style={{ flex: 1, paddingLeft: "50px" }}>
        <Navbar items ={[
            {id: 0, label: "Dashboard", href: "#dashboard"},
            {id: 1, label: "Tools", href: "#tools"},
            {id: 2, label: "About Us", href: "#about"},
          ]} />

          <div className="two-column">
            <div className="left-column">
              <h1 className="title-text">FIT</h1>
              <p>
              The Financial Investment Tool (FIT) is an advanced web-based platform designed to help investors analyze stock market trends, track key performance metrics, and optimize their portfolios with data-driven insights.
              </p>
              <Spacer y={3} />
              <div className="button-container">
                <Button className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg" color="primary">
                  Get FIT
                </Button>
                <Spacer x={3} />
                <Button className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg">
                  Pricing
                </Button>
              </div>
            </div>
            <div className="right-column">
              {/* PUT IMAGE IN THE FUTURE */}
            </div>
          </div>
          
            {/* ANALYSIS TOOLS AND DESCRIPTIONS SECTION */}
            <Box id="tools" sx={{ backgroundColor: "black", padding: 4, marginBottom: 8 }}>

                {/* HEADER AND IMPORTANT POINTS */}
                <Box sx={{ padding: 2, paddingLeft: "30px", marginBottom: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={6}>
                            <Typography variant="h3" sx={{ fontWeight: "bold", color: "white" }}>
                                Level up your trading with <span style={{ color: "#007bff" }}>FIT</span>.
                            </Typography>
                            <Typography variant="body1" sx={{ marginTop: 1, maxWidth: "600px", color: "white" }}>
                            Take your trading skills to the next level with FIT. Our platform provides cutting-edge tools for investors, combining real-time data analysis, 
                            interactive charts, and AI-driven insights to help you navigate the complexities of the market with confidence.
                            </Typography>
                        </Grid>
                        <Grid item xs={6}>
                            <Grid container spacing={2}>
                                <Grid item xs={4}>
                                    <Image src={imgStar} alt="Logo" height="80" />
                                    <Box sx={{ textAlign: "left" }}>
                                        <Typography variant="h6" sx={{ fontWeight: "bold", color: "white" }}>
                                          Real-Time Market Insights
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: "white" }}>
                                          Stay ahead with real-time data tracking and stock trend analysis, enabling you to make well-informed investment decisions.
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={4}>
                                    <Image src={imgStar} alt="Logo" height="80" />
                                    <Box sx={{ textAlign: "left" }}>
                                        <Typography variant="h6" sx={{ fontWeight: "bold", color: "white" }}>
                                        Performance Metrics
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: "white" }}>
                                          ROI, volatility, Sharpe ratio, alpha, and beta—get a clear view of risk-adjusted returns and investment performance.
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={4}>
                                    <Image src={imgStar} alt="Logo" height="80" />
                                    <Box sx={{ textAlign: "left" }}>
                                        <Typography variant="h6" sx={{ fontWeight: "bold", color: "white" }}>
                                          Portfolio Optimization
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: "white" }}>
                                          Optimize your portfolio with algorithms that balance risk and return using real-world data and simulation models.
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
                        fill
                        style={{ objectFit: "cover"}}
                    />
                </Box>

                {/* HEADER ABOVE THE GRID */}
                <Box sx={{ padding: 0, paddingLeft: "30px", textAlign: "center", marginBottom: 0 }}>
                    <Typography variant="h3" sx={{ fontWeight: "bold", textAlign: "left", color: "white" }}>
                    Our platform combines real-time stock data, powerful visualizations, and machine learning-driven predictions to deliver unmatched insight into investment performance. 
                    Customizable dashboards let you stay focused on what matters most—your financial growth.
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
                <h1 id="about" className="about-us-heading">About Us</h1>
                <div className="about-us-flex-container">

                  <Image src={team} alt="Team Picture" width="700" />
                  <div className="about-us-text">
                    <br></br>
                    <p>
                      We&#39;re a brilliant team of computer science students who somehow traded in our keyboards for investment algorithms
                      (though we still find time to throw in Valorant). We might have left the pro Valorant scene behind, but our passion
                      for winning now drives us to create the ultimate financial investment tool—FIT. Whether it&apos;s clutching rounds or
                      coding smart financial solutions, we've got it covered.
                      <br></br>
                      <br></br>
                      With FIT, we're on a mission to help investors navigate the market by analyzing whether stocks are going up, down,
                      or sideways. We pull in historical data, visualize trends, and assess risk, all to ensure that you're making informed
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

    <Footer ></Footer>
    </div>
  );
}


export default Index;