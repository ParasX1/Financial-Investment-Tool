"use client"
import { useState } from 'react';
import { Box, Button, Collapse, CssBaseline, Divider, IconButton, Typography, ThemeProvider } from '@mui/material';
import { TrendingDown, TrendingUp } from '@mui/icons-material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { theme } from '@/app/theme';

function StatisticsCard({ stock_name, stock_value, stock_growth_rate }:
  {
    stock_name: string,
    stock_value: number,
    stock_growth_rate: number
  }) {
  const font_color = stock_growth_rate > 0 ? 'green' : 'red';
  var text_growth_rate = (stock_growth_rate > 0 ? '+' + String(stock_growth_rate) : String(stock_growth_rate)) + '%';
  return (
    <Box sx={{
      width: 200, height: 120, border: 1, m: 2, padding: 2, borderRadius: 4, display: 'flex', flexDirection: 'column', borderColor: 'grey.800',
    }}>
      <Typography color='text.secondary'>{stock_name}</Typography>
      <Typography variant='h5' sx={{ fontWeight: 'bold' }}>{stock_value}</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'row' }}>
        {stock_growth_rate > 0 ? <TrendingUp sx={{ color: 'green' }} /> : <TrendingDown sx={{ color: 'red' }} />}
        <Typography sx={{ color: font_color }}>{text_growth_rate}</Typography>
      </Box>
    </Box>

  )
}

// function collapsableStockItem(){
//   const stockDataList = [
//     {'stock_name':, 'company_name':, 'stock_price':, 'stock_growth_rate':, 'ninty_day_performance':,'related_news':[{'news_title':, 'news_publisher':, 'published_time':},]}
//   ]
// }

interface NewsItem {
  newsTitle: string;
  newsPublisher: string;
  publishedTime: string;
}

interface StockData {
  stockName: string;
  companyName: string;
  stockPrice: number;
  stockGrowthValue: number;
  stockGrowthRate: number;
  ninetyDayPerformance: { date: string; value: number }[];
  relatedNews: NewsItem[];
}

// ─── Mock 数据（三组）───────────────────────────────────
const stockDataList: StockData[] = [
  {
    stockName: 'NVDA',
    companyName: 'NVIDIA Corp.',
    stockPrice: 875.34,
    stockGrowthValue: 12.45,
    stockGrowthRate: 1.44,
    ninetyDayPerformance: [
      { date: 'Feb 3', value: 96 }, { date: 'Feb 10', value: 98 },
      { date: 'Feb 18', value: 100 }, { date: 'Feb 26', value: 107 },
      { date: 'Mar 5', value: 109 }, { date: 'Mar 13', value: 108 },
      { date: 'Mar 21', value: 110 }, { date: 'Mar 29', value: 111 },
      { date: 'Apr 5', value: 113 }, { date: 'Apr 12', value: 114 },
      { date: 'Apr 20', value: 116 }, { date: 'Apr 30', value: 117 },
    ],
    relatedNews: [
      { newsTitle: 'Tech Giants Rally as AI Investment Continues to Surge', newsPublisher: 'Financial Times', publishedTime: '2 hours ago' },
      { newsTitle: 'NVIDIA Announces Next-Generation AI Chip Architecture', newsPublisher: 'Reuters', publishedTime: '5 hours ago' },
    ],
  },
  {
    stockName: 'AAPL',
    companyName: 'Apple Inc.',
    stockPrice: 213.18,
    stockGrowthValue: -1.32,
    stockGrowthRate: -0.61,
    ninetyDayPerformance: [
      { date: 'Feb 3', value: 220 }, { date: 'Feb 10', value: 218 },
      { date: 'Feb 18', value: 215 }, { date: 'Feb 26', value: 212 },
      { date: 'Mar 5', value: 210 }, { date: 'Mar 13', value: 208 },
      { date: 'Mar 21', value: 211 }, { date: 'Mar 29', value: 214 },
      { date: 'Apr 5', value: 212 }, { date: 'Apr 12', value: 210 },
      { date: 'Apr 20', value: 213 }, { date: 'Apr 30', value: 213 },
    ],
    relatedNews: [
      { newsTitle: 'Apple Vision Pro Sales Exceed Initial Analyst Expectations', newsPublisher: 'Bloomberg', publishedTime: '1 hour ago' },
      { newsTitle: 'Apple Eyes Expansion into Indian Manufacturing Market', newsPublisher: 'Wall Street Journal', publishedTime: '3 hours ago' },
    ],
  },
  {
    stockName: 'TSLA',
    companyName: 'Tesla, Inc.',
    stockPrice: 177.58,
    stockGrowthValue: 4.21,
    stockGrowthRate: 2.43,
    ninetyDayPerformance: [
      { date: 'Feb 3', value: 155 }, { date: 'Feb 10', value: 160 },
      { date: 'Feb 18', value: 158 }, { date: 'Feb 26', value: 163 },
      { date: 'Mar 5', value: 168 }, { date: 'Mar 13', value: 165 },
      { date: 'Mar 21', value: 170 }, { date: 'Mar 29', value: 172 },
      { date: 'Apr 5', value: 169 }, { date: 'Apr 12', value: 174 },
      { date: 'Apr 20', value: 176 }, { date: 'Apr 30', value: 178 },
    ],
    relatedNews: [
      { newsTitle: 'Tesla Full Self-Driving Beta Rolls Out to All US Customers', newsPublisher: 'TechCrunch', publishedTime: '4 hours ago' },
      { newsTitle: 'Elon Musk Outlines Tesla Robotaxi Launch Timeline', newsPublisher: 'CNBC', publishedTime: '6 hours ago' },
    ],
  },
];

// ─── Custom Tooltip ──────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <Box sx={{
        background: 'rgba(30,30,30,0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 2, px: 2, py: 1.5,
      }}>
        <Typography sx={{ color: 'white', fontSize: 14 }}>{label}</Typography>
        <Typography sx={{ color: '#4f8ef7', fontSize: 14 }}>
          value : {payload[0].value}
        </Typography>
      </Box>
    );
  }
  return null;
}

function CollapsableStockItem({ stockId }: { stockId: number }) {
  const [expanded, setExpanded] = useState(false);
  const stock = stockDataList[stockId];
  const isPositive = stock.stockGrowthValue >= 0;

  return (
    <Box sx={{
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 3,
      overflow: 'hidden',
      background: '#0f0f0f',
      mb: 2,
    }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', px: 3, py: 2,
          cursor: 'pointer',
          '&:hover': { background: 'rgba(255,255,255,0.03)' },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
            <Typography sx={{ fontWeight: 'bold', fontSize: 20, color: 'white' }}>
              {stock.stockName}
            </Typography>
            <Typography sx={{ color: 'grey.500', fontSize: 14 }}>
              {stock.companyName}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
            <Typography sx={{ fontWeight: 'bold', fontSize: 22, color: 'white' }}>
              ${stock.stockPrice.toFixed(2)}
            </Typography>
            <Typography sx={{ color: isPositive ? '#00c853' : '#ff1744', fontSize: 15 }}>
              {isPositive ? '+' : ''}{stock.stockGrowthValue.toFixed(2)} ({isPositive ? '+' : ''}{stock.stockGrowthRate.toFixed(2)}%)
            </Typography>
          </Box>
        </Box>
        <IconButton sx={{ color: 'grey.400' }}>
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      {/* Collapsable Content */}
      <Collapse in={expanded} sx={{ width: '100%' }}>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', width: '100%' }} />
        <Box sx={{ display: 'flex', flexDirection: 'row', px: 3, py: 3, gap: 4, width: '100%' }}>

          {/* Chart */}
          <Box sx={{ flex: 1, width: '50%' }}>
            <Typography sx={{ fontWeight: 'bold', color: 'white', mb: 2 }}>
              90-Day Performance
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stock.ninetyDayPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone" dataKey="value"
                  stroke="#4f8ef7" strokeWidth={2}
                  dot={false} activeDot={{ r: 5, fill: '#4f8ef7', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>

          {/* News */}
          <Box sx={{ width: '50%', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography sx={{ fontWeight: 'bold', color: 'white', mb: 1 }}>
              Related News
            </Typography>
            {stock.relatedNews.map((news, index) => (
              <Box key={index} sx={{
                p: 2, borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.07)',
                '&:hover': { background: 'rgba(255,255,255,0.04)', cursor: 'pointer' },
              }}>
                <Typography sx={{ fontWeight: 'bold', color: 'white', fontSize: 14, mb: 0.5 }}>
                  {news.newsTitle}
                </Typography>
                <Typography sx={{ color: 'grey.500', fontSize: 12 }}>
                  {news.newsPublisher} · {news.publishedTime}
                </Typography>
              </Box>
            ))}
          </Box>

        </Box>
      </Collapse>
    </Box>
  );
}

export default function page() {
  const stockDataList1 = [
    { 'stock_name': 'S&P 500', 'stock_value': 5284.31, 'stock_growth_rate': 0.87 },
    { 'stock_name': 'NASDAQ', 'stock_value': 16920.79, 'stock_growth_rate': 1.24 },
    { 'stock_name': 'Dow Jones', 'stock_value': 39512.84, 'stock_growth_rate': 0.23 },
    { 'stock_name': 'VIX', 'stock_value': 14.23, 'stock_growth_rate': -2.45 },
  ]
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ padding: 5, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{width:'60%', alignItems: 'left'}}>
          <Typography sx={{ color: 'white', fontSize: 24, fontWeight:'bold' }}>Watchlist</Typography>
          <Typography>Monitor your favorite stocks with charts and related news</Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'row', }}>
          {stockDataList1.map((item) => (
            <Box key={item.stock_name}>
              <StatisticsCard
                stock_name={item.stock_name}
                stock_value={item.stock_value}
                stock_growth_rate={item.stock_growth_rate}
              />
            </Box>
          ))}
        </Box>

        <Box sx={{ p: 4, background: 'black', minHeight: '100vh', width: '60%' }}>
          <Box>
            <Button>Expand All</Button>
            <Button>Collapse All</Button>
          </Box>
          {stockDataList.map((_, index) => (
            <CollapsableStockItem key={index} stockId={index} />
          ))}
        </Box>
      </Box>
    </ThemeProvider>
  )
}