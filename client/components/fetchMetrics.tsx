import { GraphSettings } from './graphSettingsModal';

export interface MetricsResponse {
    ticker: string;  
    metricType: string;
    series: {
      ohlc?: Array<{date: string, open: number, high: number, low: number, close: number}>;
      timeSeries?: Array<{date: string, value: number}>;
      singleValue?: number;
      portfolio?: {returns: number[], risks: number[], sharpe_ratios: number[]};
    };
  }

interface FetchMetricsRequest {
  ticker: string;
  settings: GraphSettings | null;
}

export async function fetchMetrics(
  req: FetchMetricsRequest
): Promise<MetricsResponse> {

  if (!req.settings) {
    throw new Error('Settings are required');
  }

  const { metricType, metricParams } = req.settings;
  const { startDate, endDate } = metricParams;

  try {
    const response = await fetch(`http://localhost:8080/api/metrics/${metricType.toLowerCase()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stock_tickers: [req.ticker],
        start_date: startDate,
        end_date: endDate,
        market_ticker: 'SPY',
        risk_free_rate: 0.01
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch metrics ${response.statusText}`);
    }

    const data = await response.json();
    return formatMetricsResponse(req.ticker, metricType, data);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    throw error;
  }
}

function formatMetricsResponse(ticker: string, metricType: string, data: any): MetricsResponse {
  const response: MetricsResponse = {
    ticker,
    metricType,
    series: {}
  };
  switch (metricType) {
    case 'ohlc':
      response.series.ohlc = data.ohlc || [];
      break;
    
    case 'BetaAnalysis':
    case 'AlphaComparison':
    case 'SortinoRatioVisualization':
    case 'SharpeRatioMatrix':
    case 'ValueAtRiskAnalysis':
    case 'VolatilityAnalysis':
      response.series.singleValue = data[ticker]
      break;
    
    case 'MaxDrawdownAnalysis':
    case 'CumulativeReturnComparison':
    case 'MarketCorrelationAnalysis':
      response.series.timeSeries = Object.entries(data[ticker] || {}).map(([date, value]) => ({
        date,
        value: value as number
      }));
      break;
    
    case 'EfficientFrontierVisualization':
      response.series.portfolio = {
        returns: data.returns || [],
        risks: data.risks || [],
        sharpe_ratios: data.sharpe_ratios || []
      };
      break;
    
      default:
        throw new Error(`Unknown metric type: ${metricType}`);
  }
  return response;
}