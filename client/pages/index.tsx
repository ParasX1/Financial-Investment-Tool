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
  const img1 = require("@/assets/graphs.png");
  const imgStar = require("@/assets/star.png");
  const team = require("@/assets/teamimage.png");
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
        {user && <Sidebar />}
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
                            FIT brings together backend metrics into clear, sortable views. Compare risk and return, export data, and rely on saved preferences so your layout is ready each time you log in.
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
                                          Sharpe, Sortino, Volatility, Max Drawdown, Alpha, Beta, Information Ratio, 1Y Return.
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
                                          Tag holdings, track a watchlist, and keep your preferred columns, sorting, and pagination.
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
                    FIT combines stock data, clear visualizations, and saved user preferences to deliver a practical workflow for screening candidates, comparing risk-adjusted performance, and managing portfolios.
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
                      FIT (Financial Investment Tool) is built by a team of software and data-driven engineers passionate about making investing easier and smarter.
                      <br></br>
                      <br></br>
                      Our platform helps investors move beyond guesswork by giving clear, actionable analytics, from risk-adjusted performance metrics such as Sharpe, Sortino, Volatility, Max Drawdown, Alpha, Beta, Information Ratio, and 1-Year Return, to practical tools for screening stocks, tracking watchlists, building portfolios and following market news.
                      <br></br>
                      <br></br>
                      We combine reliable data, intuitive dashboards, and modern web technology to help both new and experienced investors make informed decisions with confidence.
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