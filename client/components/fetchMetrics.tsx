import { GraphSettings } from './graphSettingsModal';
import { toast } from 'react-toastify';

export interface MetricsResponse {
    tickers: string[];  
    metricType: string;
    series: {
      timeSeries?: {[ticker: string]: Array<{date: string, value: number}>};
      singleValue?: { [ticker: string]: number };
      portfolio?: {returns: number[], risks: number[], sharpe_ratios: number[]};
      correlationMatrix?: { [ticker: string]: { [ticker: string]: number } };
    };
  }

interface FetchMetricsRequest {
  tickers: string[];
  settings: GraphSettings | null;
}

export async function fetchMetrics(
  req: FetchMetricsRequest
): Promise<MetricsResponse> {

  if (!req.settings) {
    throw new Error('Settings are required');
  }

  const { metricType, metricParams } = req.settings;
  const { startDate, endDate, marketTicker, riskFreeRate, confidenceLevel} = metricParams;

  try {
    const response = await fetch(`http://localhost:8080/api/metrics/${metricType.toLowerCase()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stock_tickers: req.tickers,
        start_date: startDate,
        end_date: endDate,
        market_ticker: marketTicker || 'SPY',
        risk_free_rate: riskFreeRate || 0.01,
        confidence_level: confidenceLevel || 0.05,
      }),
    });

    if (!response.ok) {
      const serverMessage = await readMetricsError(response);
      toast.error(`Unable to fetch ${metricType}: ${serverMessage}`);
      return createEmptyMetricsResponse(req.tickers, metricType);
    }

    const data = await response.json();
    return formatMetricsResponse(req.tickers, metricType, data);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    toast.error(`Unable to fetch ${metricType}. Check that the backend server is running.`);
    return createEmptyMetricsResponse(req.tickers, metricType);
  }
}

async function readMetricsError(response: Response) {
  try {
    const data = await response.json();
    return data?.error || response.statusText || 'Unknown backend error';
  } catch {
    return response.statusText || 'Unknown backend error';
  }
}

function createEmptyMetricsResponse(tickers: string[], metricType: string): MetricsResponse {
  const response: MetricsResponse = {
    tickers,
    metricType,
    series: {},
  };

  switch (metricType) {
    case 'BetaAnalysis':
    case 'AlphaComparison':
    case 'SharpeRatioMatrix':
    case 'SortinoRatioVisualization':
    case 'ValueAtRiskAnalysis':
    case 'VolatilityAnalysis':
      response.series.singleValue = {};
      break;
    case 'MaxDrawdownAnalysis':
    case 'CumulativeReturnComparison':
      response.series.timeSeries = {};
      break;
    case 'MarketCorrelationAnalysis':
      response.series.correlationMatrix = {};
      break;
    case 'EfficientFrontierVisualization':
      response.series.portfolio = { returns: [], risks: [], sharpe_ratios: [] };
      break;
  }

  return response;
}

function formatMetricsResponse(tickers: string[], metricType: string, data: any): MetricsResponse {
  const response: MetricsResponse = {
    tickers,
    metricType,
    series: {}
  };
  switch (metricType) {
    
    case 'BetaAnalysis':
    case 'AlphaComparison':
    case 'SharpeRatioMatrix':
    case 'ValueAtRiskAnalysis':
    case 'VolatilityAnalysis':
      response.series.singleValue = {}
      if (data === null || Object.keys(data).length === 0) {
        toast.error('Not enough days for calculation (need at least 3 days).');
      } else {
        tickers.forEach(ticker => {
          if (data[ticker] !== undefined && data[ticker] !== null) {
            response.series.singleValue![ticker] = data[ticker];
          }
      });
      }
      break;
    
    case 'SortinoRatioVisualization':
      response.series.singleValue = {}
      Object.keys(data).forEach(ticker => {
        if (data[ticker].status === 'infinite') {
          toast.warning(`Sortino ratio for ${ticker} is infinite. Day range may be too short.`);
          response.series.singleValue![ticker] = {} as any;
        } else if (data[ticker].status === 'limited_data') {
          toast.error(`Not enough data to calculate Sortino Ratio for ${ticker} (need at least 2 days with negative returns).`);
          response.series.singleValue![ticker] = {} as any;
        } else {
          response.series.singleValue![ticker] = data[ticker];
        }
      });
      break;
     
    case 'MaxDrawdownAnalysis':
    case 'CumulativeReturnComparison':
      response.series.timeSeries = {};
      if (data === null || Object.keys(data).length === 0) {
        toast.error('Not enough days for calculation (need at least 2 days).');
        break;
      } else {
        tickers.forEach(ticker => {
          response.series.timeSeries![ticker] = Object.entries(data[ticker] || {}).map(([date, value]) => ({
            date,
            value: value as number
          }));
        });
      }
      break;
    
    case 'MarketCorrelationAnalysis':
      if (!data || Object.keys(data).length === 0) {
        toast.error('Not enough days for correlation calculation (need at least 21 days).');
        response.series.correlationMatrix = {};
      } else {
        response.series.correlationMatrix = data;
      }
      break;
    
    case 'EfficientFrontierVisualization':
      if (!data || !data.returns || data.returns.length === 0) {
        toast.error('Not enough data to compute Efficient Frontier (need at least 3 days).');
        response.series.portfolio = { returns: [], risks: [], sharpe_ratios: [] };
        break;
      } else {
        response.series.portfolio = {
          returns: data.returns || [],
          risks: data.risks || [],
          sharpe_ratios: data.sharpe_ratios || []
        };
      }
      break;
    
      default:
        throw new Error(`Unknown metric type: ${metricType}`);
  }
  return response;
}
