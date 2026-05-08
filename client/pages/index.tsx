"use client"

import { AppBar, CssBaseline, Box, Button, Divider, Grid, IconButton, ThemeProvider, Toolbar, Typography, } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SecurityIcon from '@mui/icons-material/Security';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import { SvgIconComponent } from '@mui/icons-material';
import BoltIcon from '@mui/icons-material/Bolt';
import pic1 from '@/src/assets/pic1.jpg';
import pic2 from '@/src/assets/pic2.jpg';
import { theme } from '@/app/theme';

function MyTitleBar() {
    return (
        <AppBar position="sticky" sx={{
            background: 'rgba(18, 18, 18, 0.7)',  // 半透明深色背景
            backdropFilter: 'blur(10px)',          // 毛玻璃模糊效果
            boxShadow: 'none',                     // 去掉默认阴影（可选）
            borderBottom: '1px solid rgba(255,255,255,0.1)',  // 细边框（可选）
        }}>
            <Toolbar sx={{ gap: 2 }}>
                <Typography variant="h2" sx={{
                    background: 'linear-gradient(45deg, #5a5afc 30%, #ea19ea 90%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontWeight: 'bold',
                }}>
                    FIT
                </Typography>
                <Typography>Features</Typography>
                <Typography>Performance</Typography>
                <Typography>About</Typography>
                {/* <IconButton edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }}>
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          News
        </Typography> */}
                <Box sx={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                    <Button color="inherit">Sign In</Button>
                    <Button color="inherit">Get FIT</Button>
                </Box>
            </Toolbar>
        </AppBar>
    );
}

function PowerfulFeaturesCard({ title, introduction, themeColor, Icon }: { title: string, introduction: string, themeColor: string, Icon: SvgIconComponent }) {
    return (
        <Box sx={{
            width: 300, border: 1, borderRadius: 4, padding: 3, borderColor: 'grey.800',
            '&:hover': {
                // borderColor: 'primary.main',  // 悬停变蓝
                borderColor: themeColor,
            },
            '&:focus-within': {
                // borderColor: 'primary.main',  // 内部元素聚焦时变蓝
                borderColor: themeColor,
                borderWidth: '2px',
            },
        }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', }}>
                <Icon sx={{ color: themeColor, fontSize: 32 }} />
                <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {title}
                </Typography>
                <Typography>
                    {introduction}
                </Typography>
            </Box>
        </Box>
    )
}

function TrustedbyInvestorsCard({ title, introduction }: { title: string, introduction: string }) {
    return (
        <Box sx={{
            width: 300, border: 1, borderRadius: 4, display: 'flex', flexDirection: 'column', borderColor: 'grey.800',
            height: 100,
            m: 2,
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover': {
                borderColor: 'primary.main',  // 悬停变蓝
            },
            '&:focus-within': {
                borderColor: 'primary.main',  // 内部元素聚焦时变蓝
                borderWidth: '2px',
            },
        }}>
            <Typography variant="h4" sx={{
                background: 'linear-gradient(45deg, #5a5afc 30%, #ea19ea 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 'bold',
            }}>
                {title}
            </Typography>
            <Typography color='text.secondary'>
                {introduction}
            </Typography>
        </Box>
    )
}

export default function Frontpage() {
    const powerfulFeaturesList = [
        { 'title': 'Advanced Analytics', 'introduction': 'Deep dive into performance metrics including Sharpe, Sortino, Alpha, Beta, and more with customizable dashboards.', icon: BarChartIcon },
        { 'title': 'Portfolio Optimization', 'introduction': 'Visualize efficient frontiers, analyze risk-return profiles, and optimize your portfolio allocation strategies.', icon: ShowChartIcon },
        { 'title': 'Real-time Market Data', 'introduction': 'Stay informed with live market news, stock rankings, and curated watchlists tailored to your investment focus.', icon: TrendingUpIcon },
        { 'title': 'Risk Management', 'introduction': 'Monitor Value at Risk, Max Drawdown, and volatility metrics to protect your portfolio during market turbulence.', icon: SecurityIcon },
        { 'title': 'Community Insights', 'introduction': 'Engage with fellow investors, share strategies, and discover new perspectives in our active community forum.', icon: PeopleAltIcon },
        { 'title': 'Custom Alerts', 'introduction': 'Set up personalized email notifications for top picks, watchlist updates, and critical market movements.', icon: BoltIcon },
    ]
    const trustedbyInvestorsDataList = [
        { 'title': '15K+', info: 'Active Users' },
        { 'title': '$2.4B', info: 'Assets Analyzed' },
        { 'title': '500+', info: 'Stocks Tracked' },
        { 'title': '99.9%', info: 'Uptime' },
    ]
    return (
        <>
            <ThemeProvider theme={theme}>
                <CssBaseline />

                <MyTitleBar />

                {/* 主内容区 */}
                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, py: 6, mt: 8 }}>

                    {/* Hero Section */}
                    <Box sx={{ width: '80%', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', width: '50%', gap: 2 }}>
                            <Box>
                                <Typography variant="h2" sx={{ fontWeight: 'bold' }}>Master Your</Typography>
                                <Typography variant="h2" sx={{
                                    background: 'linear-gradient(45deg, #5a5afc 30%, #ea19ea 90%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    fontWeight: 'bold',
                                }}>
                                    Investment
                                </Typography>
                                <Typography variant="h2" sx={{ fontWeight: 'bold' }}>Strategy</Typography>
                            </Box>
                            <Typography color="text.secondary">
                                FIT empowers investors and portfolio managers with advanced analytics, risk-adjusted metrics, and real-time market insights to make smarter investment decisions.
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
                                <Button
                                    variant="contained"
                                    startIcon={<BoltIcon />}
                                    sx={{
                                        background: 'linear-gradient(45deg, #5a5afc 30%, #ea19ea 90%)',
                                        color: 'white',  // 字体和icon变白
                                        fontWeight: 'bold',
                                        '&:hover': {
                                            background: 'linear-gradient(45deg, #4444e0 30%, #c010c0 90%)',  // hover时稍深
                                        },
                                    }}
                                >
                                    Get Started
                                </Button>
                                <Button
                                    variant="outlined"
                                    sx={{
                                        borderColor: 'grey.600',
                                        color: 'grey.300',
                                        '&:hover': {
                                            borderColor: 'grey.400',
                                            backgroundColor: 'grey.800',
                                        },
                                    }}
                                >
                                    Learn More
                                </Button>
                            </Box>
                        </Box>
                        <Box sx={{ width: '50%', display: 'flex', justifyContent: 'center' }}>
                            <Box component="img" alt="frontpage pic 1" src={pic1.src} sx={{ width: '100%', borderRadius: 2 }} />
                        </Box>
                    </Box>

                    <Divider sx={{ width: '80%' }} />

                    {/* Powerful Features */}
                    <Box sx={{ width: '80%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h3" sx={{ textAlign: "center", fontWeight: 'bold' }}>Powerful Features</Typography>
                        <Typography color="text.secondary" sx={{ textAlign: "center" }}>Everything you need for sophisticated investment analysis</Typography>
                        <Grid container spacing={3} sx={{ justifyContent: 'center' }}>
                            {powerfulFeaturesList.map((item, index) => (
                                <Grid size={{ xs: 12, sm: 4 }} key={item.title}>
                                    <PowerfulFeaturesCard
                                        title={item.title}
                                        introduction={item.introduction}
                                        themeColor={index % 2 === 0 ? '#5a5afc' : '#ea19ea'}
                                        Icon={item.icon}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    </Box>

                    <Divider sx={{ width: '80%' }} />

                    {/* Trusted by Investors */}
                    <Box sx={{ width: '80%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h3" sx={{ textAlign: "center", fontWeight: 'bold' }}>Trusted by Investors</Typography>
                        <Typography color="text.secondary" sx={{ textAlign: "center", }}>Real performance metrics from our platform</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, width: '100%', justifyContent: 'center' }}>
                            {trustedbyInvestorsDataList.map((item) => (
                                <Box key={item.title}>
                                    <TrustedbyInvestorsCard title={item.title} introduction={item.info} />
                                </Box>
                            ))}
                        </Box>
                    </Box>

                    <Divider sx={{ width: '80%' }} />

                    {/* Built for Modern Investors */}
                    <Box sx={{ width: '80%', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', width: '50%', gap: 2 }}>
                            <Typography variant="h3" sx={{ fontWeight: 'bold' }}>Built for Modern Investors</Typography>
                            <Typography color="text.secondary">FIT was created by a team of quantitative analysts, software engineers, and portfolio managers who understand the challenges of modern investing.</Typography>
                            <Typography color="text.secondary">Our mission is to democratize sophisticated financial analytics, making institutional-grade tools accessible to individual investors and portfolio managers worldwide.</Typography>
                            <Typography color="text.secondary">Whether you're managing a personal portfolio or overseeing institutional assets, FIT provides the insights you need to make informed, data-driven investment decisions.</Typography>
                        </Box>
                        <Box sx={{ width: '50%', display: 'flex', justifyContent: 'center' }}>
                            <Box component="img" alt="frontpage pic 2" src={pic2.src} sx={{ width: '100%', borderRadius: 2 }} />
                        </Box>
                    </Box>

                    <Divider sx={{ width: '80%' }} />

                    {/* CTA */}
                    <Box sx={{ width: '80%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ width: '100%', backgroundColor: '#080919', border: 1, borderColor: '#152B5F', borderRadius: 5, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Typography variant="h2" sx={{ textAlign: "center", fontWeight: 'bold', m: 3 }}>Ready to Get FIT?</Typography>
                            <Typography sx={{ color: "text.secondary", textAlign: "center", width: 500 }}>Join thousands of investors using FIT to analyze markets, optimize portfolios, and achieve their financial goals.</Typography>
                            <Button variant="contained" startIcon={<BoltIcon />} sx={{
                                m: 3,
                                background: 'linear-gradient(45deg, #5a5afc 30%, #ea19ea 90%)',
                                color: 'white',  // 字体和icon变白
                                fontWeight: 'bold',
                                '&:hover': {
                                    background: 'linear-gradient(45deg, #4444e0 30%, #c010c0 90%)',  // hover时稍深
                                },
                            }} size="large">
                                Start Free Today
                            </Button>
                        </Box>
                    </Box>

                </Box>

                <Divider />

                {/* Footer */}
                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, py: 6 }}>
                    <Box sx={{ width: '80%', display: 'flex', flexDirection: 'row', gap: 4 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '25%' }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>FIT</Typography>
                            <Typography color="text.secondary">Financial Investment Tool for modern portfolio management.</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '25%' }}>
                            <Typography sx={{ fontWeight: 'bold' }}>Product</Typography>
                            <Typography color="text.secondary">Features</Typography>
                            <Typography color="text.secondary">Pricing</Typography>
                            <Typography color="text.secondary">Documentation</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '25%' }}>
                            <Typography sx={{ fontWeight: 'bold' }}>Company</Typography>
                            <Typography color="text.secondary">About</Typography>
                            <Typography color="text.secondary">Blog</Typography>
                            <Typography color="text.secondary">Careers</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '25%' }}>
                            <Typography sx={{ fontWeight: 'bold' }}>Legal</Typography>
                            <Typography color="text.secondary">Privacy</Typography>
                            <Typography color="text.secondary">Terms</Typography>
                            <Typography color="text.secondary">Security</Typography>
                        </Box>
                    </Box>
                    <Divider sx={{ width: '80%' }} />
                    <Typography color="text.secondary">© 2026 FIT. All rights reserved.</Typography>
                </Box>
            </ThemeProvider>
        </>
    )
}