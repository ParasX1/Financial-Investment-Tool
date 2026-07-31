import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { METRIC_REGISTRY } from "@/features/portfolio/data/metricRegistry";

export type MetricType =
  | "BetaAnalysis"
  | "AlphaComparison"
  | "MaxDrawdownAnalysis"
  | "CumulativeReturnComparison"
  | "SortinoRatioVisualization"
  | "MarketCorrelationAnalysis"
  | "SharpeRatioMatrix"
  | "VolatilityAnalysis"
  | "ValueAtRiskAnalysis"
  | "EfficientFrontierVisualization";

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
  initialSettings?: GraphSettings | null;
}

const defaultEnd = new Date();
const defaultStart = new Date(defaultEnd);
defaultStart.setFullYear(defaultStart.getFullYear() - 1);
const isoDateOnly = (date: Date) => date.toISOString().slice(0, 10);

const dialogPaperSx = {
  bgcolor: "var(--fit-color-surface, #09090b)",
  color: "#fff",
  fontFamily: "var(--fit-font-family)",
  border: "1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))",
  borderRadius: "0.75rem",
  backgroundImage: "none",
  boxShadow: "0 1.8rem 5rem rgba(0, 0, 0, 0.62)",
};

const fieldSx = {
  "& .MuiInputLabel-root": {
    color: "var(--fit-color-text-muted, #8f98aa)",
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "var(--fit-color-accent-strong, #65a0fd)",
  },
  "& .MuiFormHelperText-root": {
    color: "var(--fit-color-text-muted, #8f98aa)",
  },
  "& .MuiOutlinedInput-root": {
    bgcolor: "var(--fit-color-field, #18181b)",
    color: "#fff",
    borderRadius: "0.625rem",
    "& fieldset": {
      borderColor: "var(--fit-color-border-control, #202230)",
    },
    "&:hover fieldset": {
      borderColor:
        "var(--fit-color-brand-border-hover, rgba(123, 140, 255, 0.44))",
    },
    "&.Mui-focused fieldset": {
      borderColor: "var(--fit-color-focus-ring, rgba(123, 140, 255, 0.82))",
    },
  },
};

const selectMenuProps = {
  PaperProps: {
    sx: {
      bgcolor: "var(--fit-color-surface, #09090b)",
      color: "#fff",
      border:
        "1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))",
      borderRadius: "0.625rem",
      "& .MuiMenuItem-root.Mui-selected": {
        bgcolor: "var(--fit-color-brand-chip, rgba(123, 140, 255, 0.1))",
      },
      "& .MuiMenuItem-root:hover": {
        bgcolor: "var(--fit-color-brand-fill-hover, rgba(123, 140, 255, 0.12))",
      },
    },
  },
};

const secondaryButtonSx = {
  color: "#dce4ff",
  bgcolor: "var(--fit-color-field, #18181b)",
  border: "1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))",
  borderRadius: "0.625rem",
  textTransform: "none",
  fontWeight: "var(--fit-type-weight-semibold)",
  "&:hover": {
    bgcolor: "var(--fit-color-surface-soft, #111114)",
    borderColor:
      "var(--fit-color-brand-border-hover, rgba(123, 140, 255, 0.44))",
  },
};

const primaryButtonSx = {
  ...secondaryButtonSx,
  bgcolor: "#5d67ff",
  color: "#fff",
  borderColor: "rgba(111, 124, 255, 0.62)",
  "&:hover": {
    bgcolor: "#7079ff",
    borderColor: "rgba(123, 140, 255, 0.72)",
  },
};

const defaultSettings = (): GraphSettings => ({
  metricType: "CumulativeReturnComparison",
  metricParams: {
    startDate: isoDateOnly(defaultStart),
    endDate: isoDateOnly(defaultEnd),
    marketTicker: "SPY",
    riskFreeRate: 0.01,
    confidenceLevel: 0.05,
  },
  stockColour: "#65a0fd",
});

const metricOptions = Object.values(METRIC_REGISTRY);

const GraphSettingsModal: React.FC<GraphSettingsModalProps> = ({
  open,
  onClose,
  onApply,
  initialSettings,
}) => {
  const fallback = useMemo(defaultSettings, []);
  const [metricType, setMetricType] = useState<MetricType>(fallback.metricType);
  const [startDate, setStartDate] = useState<string>(
    fallback.metricParams.startDate,
  );
  const [endDate, setEndDate] = useState<string>(fallback.metricParams.endDate);
  const [marketTicker, setMarketTicker] = useState<string>("SPY");
  const [riskFreeRate, setRiskFreeRate] = useState<number>(0.01);
  const [confidenceLevel, setConfidenceLevel] = useState<number>(0.05);
  const [stockColour, setStockColour] = useState<string>("#65a0fd");

  useEffect(() => {
    if (!open) return;
    const source = initialSettings ?? fallback;
    setMetricType(source.metricType);
    setStartDate(source.metricParams.startDate);
    setEndDate(source.metricParams.endDate);
    setMarketTicker(source.metricParams.marketTicker ?? "SPY");
    setRiskFreeRate(source.metricParams.riskFreeRate ?? 0.01);
    setConfidenceLevel(source.metricParams.confidenceLevel ?? 0.05);
    setStockColour(source.stockColour);
  }, [fallback, initialSettings, open]);

  const metric = METRIC_REGISTRY[metricType];
  const usesBenchmark = Boolean(metric.requiresBenchmark);
  const usesRiskFreeRate = Boolean(metric.usesRiskFreeRate);
  const usesConfidenceLevel = Boolean(metric.usesConfidenceLevel);

  const handleApply = () => {
    const metricParams: GraphSettings["metricParams"] = {
      startDate,
      endDate,
    };

    if (usesBenchmark) {
      metricParams.marketTicker = marketTicker.trim().toUpperCase() || "SPY";
    }
    if (usesRiskFreeRate) {
      metricParams.riskFreeRate = riskFreeRate;
    }
    if (usesConfidenceLevel) {
      metricParams.confidenceLevel = confidenceLevel;
    }

    onApply({
      metricType,
      metricParams,
      stockColour,
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: dialogPaperSx }}
    >
      <DialogTitle
        sx={{
          fontSize: "var(--fit-type-size-panel-title)",
          fontWeight: "var(--fit-type-weight-semibold)",
          lineHeight: "var(--fit-type-leading-heading)",
        }}
      >
        Metric settings
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          borderColor:
            "var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))",
          color: "var(--fit-color-text-body, #b9c1d0)",
        }}
      >
        <FormControl fullWidth margin="normal">
          <InputLabel
            id="metric-type-label"
            sx={{
              color: "var(--fit-color-text-muted, #8f98aa)",
              "&.Mui-focused": {
                color: "var(--fit-color-accent-strong, #65a0fd)",
              },
            }}
          >
            Metric type
          </InputLabel>
          <Select
            labelId="metric-type-label"
            value={metricType}
            label="Metric type"
            onChange={(event) => setMetricType(event.target.value as MetricType)}
            MenuProps={selectMenuProps}
            sx={{
              bgcolor: "var(--fit-color-field, #18181b)",
              color: "#fff",
              borderRadius: "0.625rem",
              "& .MuiSelect-icon": {
                color: "var(--fit-color-text-muted, #8f98aa)",
              },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "var(--fit-color-border-control, #202230)",
              },
            }}
          >
            {metricOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box display="flex" gap={2}>
          <TextField
            label="Start date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            margin="normal"
            sx={fieldSx}
          />
          <TextField
            label="End date"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            margin="normal"
            sx={fieldSx}
          />
        </Box>

        <TextField
          label="Series color"
          type="color"
          value={stockColour}
          onChange={(event) => setStockColour(event.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
          margin="normal"
          sx={fieldSx}
        />

        {usesBenchmark && (
          <TextField
            label="Benchmark ticker"
            placeholder="SPY"
            value={marketTicker}
            onChange={(event) => setMarketTicker(event.target.value)}
            fullWidth
            margin="normal"
            sx={fieldSx}
          />
        )}

        {usesRiskFreeRate && (
          <TextField
            label="Risk-free rate"
            type="number"
            inputProps={{ step: 0.001, min: -1, max: 1 }}
            value={riskFreeRate}
            onChange={(event) => setRiskFreeRate(Number(event.target.value))}
            helperText="Annual decimal rate, for example 0.01 = 1%."
            fullWidth
            margin="normal"
            sx={fieldSx}
          />
        )}

        {usesConfidenceLevel && (
          <TextField
            label="Tail probability"
            type="number"
            inputProps={{ step: 0.01, min: 0.001, max: 0.999 }}
            value={confidenceLevel}
            onChange={(event) =>
              setConfidenceLevel(Number(event.target.value))
            }
            helperText="Use 0.05 for 95% VaR, 0.01 for 99% VaR."
            fullWidth
            margin="normal"
            sx={fieldSx}
          />
        )}
      </DialogContent>
      <DialogActions
        sx={{
          borderTop:
            "1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))",
          p: 2,
        }}
      >
        <Button onClick={onClose} sx={secondaryButtonSx}>
          Cancel
        </Button>
        <Button onClick={handleApply} variant="contained" sx={primaryButtonSx}>
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GraphSettingsModal;
