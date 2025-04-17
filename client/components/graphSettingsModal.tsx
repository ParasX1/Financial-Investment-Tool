import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box
} from '@mui/material';

// Optional metric types
export type MetricType =
  | 'BetaAnalysis'
  | 'AlphaComparison'
  | 'MaxDrawdownAnalysis'
  | 'CumulativeReturnComparison'
  | 'SortinoRatioVisualization'
  | 'MarketCorrelationAnalysis'
  | 'SharpeRatioMatrix'
  | 'ValueAtRiskAnalysis'
  | 'EfficientFrontierVisualization';

  export interface GraphSettings {
    metricType: MetricType;
    metricParams: {
      startDate: string;
      endDate: string;
      marketTicker?: string;
      riskFreeRate?: number;
      confidenceLevel?: number;
    };
    stockColour: string;
  }

interface GraphSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (settings: GraphSettings) => void;
}

const defaultStart = new Date();
const isoDateOnly = (d: Date) => d.toISOString().slice(0, 10);

const GraphSettingsModal: React.FC<GraphSettingsModalProps> = ({ open, onClose, onApply }) => {
    // ————— Menu status —————
    const [metricType, setMetricType] = useState<MetricType>('BetaAnalysis');
    const [startDate, setStartDate] = useState<string>(isoDateOnly(defaultStart));
    const [endDate, setEndDate] = useState<string>(isoDateOnly(defaultStart));
    const [marketTicker, setMarketTicker] = useState<string>('AMZN');
    const [riskFreeRate, setRiskFreeRate] = useState<number>(0.01);
    const [confidenceLevel, setConfidenceLevel] = useState<number>(0.05);
    const [stockColour, setStockColour] = useState<string>('#fc03d7');

    // After user clicks, collect parameters and callback
    const handleApply = () => {
      const params: GraphSettings['metricParams'] = { startDate, endDate };
      if (metricType === 'BetaAnalysis' || metricType === 'MarketCorrelationAnalysis') {
        params.marketTicker = marketTicker;
      }
      if (metricType === 'AlphaComparison' || metricType === 'SharpeRatioMatrix' || metricType === 'SortinoRatioVisualization') {
        params.riskFreeRate = riskFreeRate;
      }
      if (metricType === 'ValueAtRiskAnalysis') {
        params.confidenceLevel = confidenceLevel;
      }

      // Pass all Settings to the parent component
      onApply({ metricType, metricParams: params, stockColour});
      onClose();
    };
  

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
          <DialogTitle>Metrics Settings</DialogTitle>
          <DialogContent dividers>
            <FormControl fullWidth margin="normal">
              <InputLabel id="metric-type-label">Metric Type</InputLabel>
              <Select
                labelId="metric-type-label"
                value={metricType}
                label="Metric Type"
                onChange={(e) => setMetricType(e.target.value as MetricType)}
              >
                <MenuItem value="BetaAnalysis">Beta Analysis</MenuItem>
                <MenuItem value="AlphaComparison">Alpha Comparison</MenuItem>
                <MenuItem value="MaxDrawdownAnalysis">Max Drawdown</MenuItem>
                <MenuItem value="CumulativeReturnComparison">Cumulative Return</MenuItem>
                <MenuItem value="SortinoRatioVisualization">Sortino Ratio</MenuItem>
                <MenuItem value="MarketCorrelationAnalysis">Market Correlation</MenuItem>
                <MenuItem value="SharpeRatioMatrix">Sharpe Ratio</MenuItem>
                <MenuItem value="ValueAtRiskAnalysis">Value at Risk</MenuItem>
                <MenuItem value="EfficientFrontierVisualization">Efficient Frontier</MenuItem>
              </Select>
            </FormControl>
    
            {/* Common date range inputs */}
            <Box display="flex" gap={2}>
              <TextField
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                margin="normal"
              />
              <TextField
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                margin="normal"
              />
            </Box>

            <TextField
                label="Series Color"
                type="color"
                value={stockColour}
                onChange={e=>setStockColour(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                margin="normal"
            />
    
            {/* Conditional inputs based on metricType */}
            {['BetaAnalysis', 'MarketCorrelationAnalysis'].includes(metricType) && (
              <TextField
                label="Market Ticker"
                placeholder="AMZN"
                value={marketTicker}
                onChange={(e) => setMarketTicker(e.target.value)}
                fullWidth
                margin="normal"
              />
            )}
    
            {['AlphaComparison', 'SharpeRatioMatrix', 'SortinoRatioVisualization'].includes(metricType) && (
              <TextField
                label="Risk-Free Rate"
                type="number"
                inputProps={{ step: 0.001, min: 0 }}
                value={riskFreeRate}
                onChange={(e) => setRiskFreeRate(parseFloat(e.target.value) || 0)}
                fullWidth
                margin="normal"
              />
            )}
    
            {metricType === 'ValueAtRiskAnalysis' && (
              <TextField
                label="Confidence Level"
                type="number"
                inputProps={{ step: 0.01, min: 0, max: 1 }}
                value={confidenceLevel}
                onChange={(e) => setConfidenceLevel(parseFloat(e.target.value) || 0)}
                helperText="Enter a value between 0 and 1"
                fullWidth
                margin="normal"
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button onClick={handleApply} variant="contained">
              Apply
            </Button>
          </DialogActions>
        </Dialog>
      );
    };
    
export default GraphSettingsModal;
