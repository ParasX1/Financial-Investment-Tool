import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import OHLCChart from './ohlc';
import BarGraph from './bargraph';
import LineGraph from './linegraph';
import GraphSettingsModal, {GraphSettings} from './graphSettingsModal';
import { fetchMetrics, MetricsResponse } from './fetchMetrics';
import { CardSettings } from '@/pages/dashboardView';

type OHLCData = {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
  };
  
const appleOHLCData = [
    { date: '2025-03-01', open: 218.2, high: 221.5, low: 215.6, close: 220.3 },
    { date: '2025-03-04', open: 220.3, high: 224.1, low: 219.5, close: 223.2 },
    { date: '2025-03-05', open: 223.2, high: 225.0, low: 221.4, close: 222.1 },
    { date: '2025-03-06', open: 222.1, high: 223.7, low: 218.0, close: 219.3 },
    { date: '2025-03-07', open: 219.3, high: 221.9, low: 217.1, close: 220.7 },
    { date: '2025-03-08', open: 220.7, high: 225.4, low: 219.6, close: 224.8 },
    { date: '2025-03-11', open: 224.8, high: 226.9, low: 223.1, close: 225.3 },
    { date: '2025-03-12', open: 225.3, high: 229.6, low: 224.0, close: 228.2 },
    { date: '2025-03-13', open: 228.2, high: 230.4, low: 225.5, close: 226.7 },
    { date: '2025-03-14', open: 226.7, high: 227.5, low: 223.3, close: 224.0 },
    { date: '2025-03-15', open: 224.0, high: 225.7, low: 221.2, close: 222.9 },
    { date: '2025-03-18', open: 222.9, high: 226.1, low: 222.0, close: 225.5 },
    { date: '2025-03-19', open: 225.5, high: 227.0, low: 224.1, close: 225.2 },
    { date: '2025-03-20', open: 225.2, high: 226.6, low: 222.8, close: 223.4 },
    { date: '2025-03-21', open: 223.4, high: 225.9, low: 221.7, close: 222.3 },
    { date: '2025-03-22', open: 222.3, high: 223.5, low: 218.9, close: 219.8 },
    { date: '2025-03-25', open: 219.8, high: 221.7, low: 217.6, close: 218.3 },
    { date: '2025-03-26', open: 218.3, high: 220.1, low: 216.0, close: 219.0 },
    { date: '2025-03-27', open: 219.0, high: 221.0, low: 217.4, close: 220.6 },
    { date: '2025-03-28', open: 220.6, high: 223.2, low: 219.5, close: 221.8 },
  ];

  const googleOHLCData = [
    { date: '2025-03-01', open: 1325, high: 1340, low: 1310, close: 1332 },
    { date: '2025-03-04', open: 1332, high: 1350, low: 1320, close: 1341 },
    { date: '2025-03-05', open: 1341, high: 1358, low: 1330, close: 1353 },
    { date: '2025-03-06', open: 1353, high: 1362, low: 1345, close: 1357 },
    { date: '2025-03-07', open: 1357, high: 1375, low: 1340, close: 1369 },
    { date: '2025-03-08', open: 1369, high: 1390, low: 1360, close: 1384 },
    { date: '2025-03-11', open: 1384, high: 1395, low: 1372, close: 1379 },
    { date: '2025-03-12', open: 1379, high: 1388, low: 1365, close: 1371 },
    { date: '2025-03-13', open: 1371, high: 1378, low: 1354, close: 1360 },
    { date: '2025-03-14', open: 1360, high: 1372, low: 1348, close: 1351 },
    { date: '2025-03-15', open: 1351, high: 1369, low: 1335, close: 1357 },
    { date: '2025-03-18', open: 1357, high: 1370, low: 1342, close: 1353 },
    { date: '2025-03-19', open: 1353, high: 1365, low: 1339, close: 1347 },
    { date: '2025-03-20', open: 1347, high: 1356, low: 1325, close: 1333 },
    { date: '2025-03-21', open: 1333, high: 1344, low: 1320, close: 1330 },
    { date: '2025-03-22', open: 1330, high: 1342, low: 1314, close: 1325 },
    { date: '2025-03-25', open: 1325, high: 1337, low: 1308, close: 1319 },
    { date: '2025-03-26', open: 1319, high: 1330, low: 1305, close: 1322 },
    { date: '2025-03-27', open: 1322, high: 1335, low: 1310, close: 1331 },
    { date: '2025-03-28', open: 1331, high: 1346, low: 1321, close: 1340 },
  ];

  const amazonOHLCData = [
    { date: '2025-03-01', open: 3190, high: 3220, low: 3170, close: 3208 },
    { date: '2025-03-04', open: 3208, high: 3250, low: 3192, close: 3239 },
    { date: '2025-03-05', open: 3239, high: 3270, low: 3210, close: 3244 },
    { date: '2025-03-06', open: 3244, high: 3266, low: 3220, close: 3233 },
    { date: '2025-03-07', open: 3233, high: 3260, low: 3208, close: 3250 },
    { date: '2025-03-08', open: 3250, high: 3285, low: 3230, close: 3274 },
    { date: '2025-03-11', open: 3274, high: 3300, low: 3251, close: 3262 },
    { date: '2025-03-12', open: 3262, high: 3280, low: 3237, close: 3243 },
    { date: '2025-03-13', open: 3243, high: 3258, low: 3214, close: 3220 },
    { date: '2025-03-14', open: 3220, high: 3244, low: 3195, close: 3211 },
    { date: '2025-03-15', open: 3211, high: 3230, low: 3187, close: 3196 },
    { date: '2025-03-18', open: 3196, high: 3215, low: 3172, close: 3205 },
    { date: '2025-03-19', open: 3205, high: 3221, low: 3183, close: 3210 },
    { date: '2025-03-20', open: 3210, high: 3235, low: 3195, close: 3223 },
    { date: '2025-03-21', open: 3223, high: 3242, low: 3204, close: 3214 },
    { date: '2025-03-22', open: 3214, high: 3228, low: 3189, close: 3198 },
    { date: '2025-03-25', open: 3198, high: 3217, low: 3170, close: 3182 },
    { date: '2025-03-26', open: 3182, high: 3204, low: 3160, close: 3173 },
    { date: '2025-03-27', open: 3173, high: 3190, low: 3151, close: 3184 },
    { date: '2025-03-28', open: 3184, high: 3209, low: 3167, close: 3195 },
  ];

  const microsoftOHLCData = [
    { date: '2025-03-01', open: 288, high: 292, low: 284, close: 290 },
    { date: '2025-03-04', open: 290, high: 295, low: 288, close: 293 },
    { date: '2025-03-05', open: 293, high: 296, low: 290, close: 292 },
    { date: '2025-03-06', open: 292, high: 294, low: 288, close: 289 },
    { date: '2025-03-07', open: 289, high: 291, low: 285, close: 286 },
    { date: '2025-03-08', open: 286, high: 289, low: 282, close: 285 },
    { date: '2025-03-11', open: 285, high: 287, low: 281, close: 283 },
    { date: '2025-03-12', open: 283, high: 285, low: 280, close: 281 },
    { date: '2025-03-13', open: 281, high: 284, low: 278, close: 280 },
    { date: '2025-03-14', open: 280, high: 283, low: 276, close: 278 },
    { date: '2025-03-15', open: 278, high: 280, low: 274, close: 277 },
    { date: '2025-03-18', open: 277, high: 281, low: 273, close: 276 },
    { date: '2025-03-19', open: 276, high: 280, low: 272, close: 274 },
    { date: '2025-03-20', open: 274, high: 278, low: 270, close: 272 },
    { date: '2025-03-21', open: 272, high: 275, low: 268, close: 270 },
    { date: '2025-03-22', open: 270, high: 273, low: 266, close: 269 },
    { date: '2025-03-25', open: 269, high: 272, low: 265, close: 268 },
    { date: '2025-03-26', open: 268, high: 271, low: 264, close: 267 },
    { date: '2025-03-27', open: 267, high: 270, low: 263, close: 266 },
    { date: '2025-03-28', open: 266, high: 269, low: 262, close: 265 },
  ];
  
const stockDataMap: { [key: string]: OHLCData[] } = {
    AAPL: appleOHLCData,
    GOOGL: googleOHLCData,
    AMZN: amazonOHLCData,
    MSFT: microsoftOHLCData,
  };

interface StockChartCardProps {
  index: number;
  selectedStocks: string[];
  isActive: boolean;
  cardSettings: CardSettings;
  onClear: (index: number) => void;
  onSwap: (index: number) => void;
  onActivate: (index: number) => void;
  onUpdateSettings: (index: number, settings: CardSettings) => void;
  height?: number;
  defaultStart: string;
  defaultEnd: string;
}

const StockChartCard: React.FC<StockChartCardProps> = ({
  index,
  selectedStocks,
  isActive,
  cardSettings,
  onClear,
  onSwap,
  onActivate,
  onUpdateSettings,
  height = 400,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 500, height });
  const [showSettings, setShowSettings] = useState(false);

  const [chartData, setChartData] = useState<MetricsResponse[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);

  const buttonBackgroundColor = '#777'; // Grey background color
  const buttonHoverColor = '#555'; // Darker grey on hover

  const { barColor, dateRange, metricType, graphMade } = cardSettings;
  const showGraph = isActive && selectedStocks.length > 0 && graphMade;

  const handleFullscreenToggle = () => setIsFullscreen((f) => !f);

  const handleApplySettings = async (settings: GraphSettings) => {
    
    onUpdateSettings(index, {
      barColor: settings.stockColour,
      dateRange: {
        start: settings.metricParams.startDate,
        end: settings.metricParams.endDate,
      },
      metricType: settings.metricType,
      graphMade: true,
    });

    onActivate(index);
  };

  useEffect(() => {

    if (!isActive || selectedStocks.length === 0 || !graphMade) {
      setChartData([]);
      return;
    }

    const fetchAllData = async () => {

      const allData = await fetchMetrics({
          tickers: selectedStocks,
          settings: {
            metricType: metricType as any,
            metricParams: {
              startDate: dateRange.start,
              endDate: dateRange.end,
            },
            stockColour: barColor
          },
        });

      setChartData([allData]);
    };

    fetchAllData();
  }, [isActive, selectedStocks, dateRange.start, dateRange.end, barColor, metricType, graphMade]);

  // resize observer
  useEffect(() => {
    const ob = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDimensions({ width, height });
    });
    if (containerRef.current) ob.observe(containerRef.current);
    return () => ob.disconnect();
  }, []);

  // choose chart component 
  const renderChart = () => {
    if (chartData.length === 0 || selectedStocks.length === 0){
      return null;
    }
    
    switch (metricType.toLowerCase()) {
      case 'ohlc':
        return (
          <OHLCChart
            multiData={chartData.map((data, i) => ({
              ticker: selectedStocks[i],
              color: barColor,
              data: data.series.ohlc || []
            }))}
            width={dimensions.width - 32}
            height={dimensions.height - 90}
          />
        );

    case 'betaanalysis':
    case 'alphacomparison':
    case 'sortinoratiovisualization':
    case 'sharperatiomatrix':
    case 'volatilityanalysis':
    case 'valueatriskanalysis':
      return (
        <BarGraph
          data={chartData.flatMap(data => {
            const tickers = data.tickers || [];
            const singleValue = data.series.singleValue || {};
            return tickers.map(t => ({
              label: t,
              value: singleValue[t]
            }));
          })}
          width={dimensions.width - 32}
          height={dimensions.height - 90}
          barColor={barColor}
        />
      );
    
    case 'marketcorrelationanalysis':
    case 'cumulativereturncomparison':
    case 'maxdrawdownanalysis':
      return (
        <LineGraph
          data={chartData.flatMap((data, index) => ({
            ticker: data.tickers[0],
            values: (data.series.timeSeries?.[data.tickers[0]] || []).map(point => ({
              date: new Date(point.date),
              value: point.value
            }))
          }))}
          width={dimensions.width - 32}
          height={dimensions.height - 90}
        />
      );
    /*
    case 'betaanalysis':
    case 'alphacomparison':
    case 'sortinoratiovisualization':
    case 'sharperatiomatrix':
    case 'volatilityanalysis':
    case 'valueatriskanalysis':
      Should be displayed as a bar chart.
      Potentially regression line but related functions will need to be changed to calculate metric per day instead of overall
    
    case 'marketcorrelationanalysis':
      This returns a series of values per day
      Should be a line chart
      Potentially a bar or heatmap if changed to overall stock

    case 'maxdrawdownanalysis':
    case 'cumulativereturncomparison':
      This returns a series of values per day
      Should be a line chart
    
    case 'efficientfrontieranalysis':
      This should be displayed as a scatter plot.
    */

    default:
      console.log('[renderChart] Unsupported metricType:', metricType);
      return null;
    };
  }

  // render
  return (
    <Box
      ref={containerRef}
      sx={{
        position: isFullscreen ? 'fixed' : 'relative',
        top:      isFullscreen ? 0 : 'unset',
        left:     isFullscreen ? 0 : 'unset',
        width:    isFullscreen ? '100vw' : '100%',
        height:   isFullscreen ? '100vh' : height,
        bgcolor:  '#111',
        border:   '1px solid #555',
        p:        '1rem',
        overflow: 'hidden',
        zIndex:   isFullscreen ? 1000 : 'unset',
      }}
    >
          {/* controls */}
          <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 1 }}>
            <Button variant="contained" size="small" onClick={() => onSwap(index)}>↔</Button>
            <Button variant="contained" size="small" onClick={() => onClear(index)}>×</Button>
            <Button variant="contained" size="small" onClick={handleFullscreenToggle}>
              {isFullscreen ? '⤡' : '⤢'}
            </Button>
          <Button variant="contained" size="small" onClick={() => setShowSettings(true)}>
            ⚙︎
          </Button>
        </Box>
      {showGraph ? (
        <>
          {renderChart()}
      </>
      ) : (
        <Button
        variant="contained"
        onClick={() => setShowSettings(true)}
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
      <GraphSettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onApply={handleApplySettings}
      />
    </Box>
  );
};

export default StockChartCard;
export { stockDataMap };