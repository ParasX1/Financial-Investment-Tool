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
  | 'VolatilityAnalysis'
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

const dialogPaperSx = {
  bgcolor: 'var(--fit-color-surface, #09090b)',
  color: '#fff',
  fontFamily: 'var(--fit-font-family)',
  border: '1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))',
  borderRadius: '0.75rem',
  backgroundImage: 'none',
  boxShadow: '0 1.8rem 5rem rgba(0, 0, 0, 0.62)',
};

const fieldSx = {
  '& .MuiInputLabel-root': {
    color: 'var(--fit-color-text-muted, #8f98aa)',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: 'var(--fit-color-accent-strong, #65a0fd)',
  },
  '& .MuiFormHelperText-root': {
    color: 'var(--fit-color-text-muted, #8f98aa)',
  },
  '& .MuiOutlinedInput-root': {
    bgcolor: 'var(--fit-color-field, #18181b)',
    color: '#fff',
    borderRadius: '0.625rem',
    '& fieldset': {
      borderColor: 'var(--fit-color-border-control, #202230)',
    },
    '&:hover fieldset': {
      borderColor: 'var(--fit-color-brand-border-hover, rgba(123, 140, 255, 0.44))',
    },
    '&.Mui-focused fieldset': {
      borderColor: 'var(--fit-color-focus-ring, rgba(123, 140, 255, 0.82))',
    },
  },
};

const selectMenuProps = {
  PaperProps: {
    sx: {
      bgcolor: 'var(--fit-color-surface, #09090b)',
      color: '#fff',
      border: '1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))',
      borderRadius: '0.625rem',
      '& .MuiMenuItem-root.Mui-selected': {
        bgcolor: 'var(--fit-color-brand-chip, rgba(123, 140, 255, 0.1))',
      },
      '& .MuiMenuItem-root:hover': {
        bgcolor: 'var(--fit-color-brand-fill-hover, rgba(123, 140, 255, 0.12))',
      },
    },
  },
};

const secondaryButtonSx = {
  color: '#dce4ff',
  bgcolor: 'var(--fit-color-field, #18181b)',
  border: '1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))',
  borderRadius: '0.625rem',
  textTransform: 'none',
  fontWeight: 'var(--fit-type-weight-semibold)',
  '&:hover': {
    bgcolor: 'var(--fit-color-surface-soft, #111114)',
    borderColor: 'var(--fit-color-brand-border-hover, rgba(123, 140, 255, 0.44))',
  },
  '&:focus-visible': {
    outline: '2px solid var(--fit-color-focus-ring, rgba(123, 140, 255, 0.82))',
    outlineOffset: 2,
  },
};

const primaryButtonSx = {
  ...secondaryButtonSx,
  bgcolor: '#5d67ff',
  color: '#fff',
  borderColor: 'rgba(111, 124, 255, 0.62)',
  '&:hover': {
    bgcolor: '#7079ff',
    borderColor: 'rgba(123, 140, 255, 0.72)',
  },
};

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

      const settings: GraphSettings = {
        metricType,
        metricParams: params,
        stockColour
      };

    
      // Pass all Settings to the parent component
      onApply(settings);
      onClose();
    };

    const handleMetricTypeChange = (event: any) => {
      const newMetricType = event.target.value as MetricType;
      setMetricType(newMetricType);
    };
  

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: dialogPaperSx }}>
          <DialogTitle sx={{ fontSize: 'var(--fit-type-size-panel-title)', fontWeight: 'var(--fit-type-weight-semibold)', lineHeight: 'var(--fit-type-leading-heading)' }}>Metrics Settings</DialogTitle>
          <DialogContent dividers sx={{ borderColor: 'var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))', color: 'var(--fit-color-text-body, #b9c1d0)' }}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="metric-type-label" sx={{ color: 'var(--fit-color-text-muted, #8f98aa)', '&.Mui-focused': { color: 'var(--fit-color-accent-strong, #65a0fd)' } }}>Metric Type</InputLabel>
              <Select
                labelId="metric-type-label"
                value={metricType}
                label="Metric Type"
                onChange={handleMetricTypeChange}
                MenuProps={selectMenuProps}
                sx={{
                  bgcolor: 'var(--fit-color-field, #18181b)',
                  color: '#fff',
                  borderRadius: '0.625rem',
                  '& .MuiSelect-icon': { color: 'var(--fit-color-text-muted, #8f98aa)' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--fit-color-border-control, #202230)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--fit-color-brand-border-hover, rgba(123, 140, 255, 0.44))' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--fit-color-focus-ring, rgba(123, 140, 255, 0.82))' },
                }}
              >
                <MenuItem value="BetaAnalysis">Beta Analysis</MenuItem>
                <MenuItem value="AlphaComparison">Alpha Comparison</MenuItem>
                <MenuItem value="MaxDrawdownAnalysis">Max Drawdown</MenuItem>
                <MenuItem value="CumulativeReturnComparison">Cumulative Return</MenuItem>
                <MenuItem value="SortinoRatioVisualization">Sortino Ratio</MenuItem>
                <MenuItem value="MarketCorrelationAnalysis">Market Correlation</MenuItem>
                <MenuItem value="SharpeRatioMatrix">Sharpe Ratio</MenuItem>
                <MenuItem value="VolatilityAnalysis">Volatility</MenuItem>
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
                sx={fieldSx}
              />
              <TextField
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                margin="normal"
                sx={fieldSx}
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
                sx={fieldSx}
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
                sx={fieldSx}
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
                sx={fieldSx}
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
                sx={fieldSx}
              />
            )}
          </DialogContent>
          <DialogActions sx={{ borderTop: '1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))', p: 2 }}>
            <Button onClick={onClose} sx={secondaryButtonSx}>Cancel</Button>
            <Button onClick={handleApply} variant="contained" sx={primaryButtonSx}>
              Apply
            </Button>
          </DialogActions>
        </Dialog>
      );
    };
    
export default GraphSettingsModal;
