import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, IconButton, MenuItem, Select, Tooltip } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import TuneIcon from "@mui/icons-material/Tune";
import BarGraph from "./bargraph";
import { fetchMetrics, type MetricsResponse } from "./fetchMetrics";
import GraphSettingsModal, {
  type GraphSettings,
  type MetricType,
} from "./graphSettingsModal";
import HeatMap from "./heatmap";
import LineGraph from "./linegraph";
import ScatterPlotGraph from "./scatterplot";
import { METRIC_REGISTRY, formatMetricValue } from "@/features/portfolio/data/metricRegistry";
import type { CardSettings } from "@/features/portfolio/boardTypes";
import { validateAnalysisRange } from "@/features/portfolio/lib/portfolioAnalytics";

const metricOptions: { value: MetricType; label: string }[] = Object.values(
  METRIC_REGISTRY,
).map((metric) => ({
  value: metric.id,
  label: metric.label,
}));

type StockChartCardProps = {
  index: number;
  selectedStocks: string[];
  isActive: boolean;
  cardSettings: CardSettings;
  onClear: (index: number) => void;
  onSwap: (index: number) => void;
  onActivate: (index: number) => void;
  onUpdateSettings: (index: number, settings: Partial<CardSettings>) => void;
  height?: number | string;
  showSwap?: boolean;
  variant?: "default" | "main";
  chartLayout?: "default" | "compact";
};

type LoadState = "idle" | "loading" | "success" | "error";

const localDate = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const getCardValidationMessage = (
  metricType: MetricType,
  selectedStocks: string[],
  dateRange: CardSettings["dateRange"],
) => {
  const metric = METRIC_REGISTRY[metricType];
  const today = localDate(new Date());
  const rangeError = validateAnalysisRange(dateRange.start, dateRange.end, today);
  if (rangeError) return rangeError;
  if (!selectedStocks.length) return "Select at least one stock to populate the board.";
  if (selectedStocks.length < metric.minimumSymbols) {
    return `${metric.label} needs at least ${metric.minimumSymbols} stocks.`;
  }
  return null;
};

const buildInitialSettings = (cardSettings: CardSettings): GraphSettings => ({
  metricType: cardSettings.metricType,
  metricParams: {
    startDate: cardSettings.dateRange.start,
    endDate: cardSettings.dateRange.end,
    marketTicker: cardSettings.marketTicker ?? "SPY",
    riskFreeRate: cardSettings.riskRate ?? 0.01,
    confidenceLevel: cardSettings.confidenceLevel ?? 0.05,
  },
  stockColour: cardSettings.barColor,
});

const StateMessage = ({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) => (
  <Box
    sx={{
      height: "100%",
      display: "grid",
      placeItems: "center",
      textAlign: "center",
      px: 3,
      py: 4,
    }}
  >
    <Box sx={{ maxWidth: 420 }}>
      <Box
        sx={{
          display: "inline-flex",
          px: 1.5,
          py: 0.5,
          borderRadius: 999,
          border: "1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))",
          color: "var(--fit-color-text-label, #8f98aa)",
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          mb: 1.5,
        }}
      >
        Portfolio
      </Box>
      <Box sx={{ color: "#eef2fb", fontWeight: 600, fontSize: 18, mb: 1 }}>
        {title}
      </Box>
      <Box sx={{ color: "var(--fit-color-text-muted, #a7b0c2)", fontSize: 14, lineHeight: 1.6 }}>
        {body}
      </Box>
      {action ? <Box sx={{ mt: 2 }}>{action}</Box> : null}
    </Box>
  </Box>
);

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
  showSwap = true,
  variant = "default",
  chartLayout = "default",
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 500, height: 400 });
  const [showSettings, setShowSettings] = useState(false);
  const [chartData, setChartData] = useState<MetricsResponse | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { barColor, dateRange, metricType, graphMade } = cardSettings;
  const metric = METRIC_REGISTRY[metricType];
  const validationMessage = useMemo(
    () => getCardValidationMessage(metricType, selectedStocks, dateRange),
    [dateRange, metricType, selectedStocks],
  );
  const isCompactChart = chartLayout === "compact";
  const isMainVariant = variant === "main";
  const availableChartWidth = Math.max(dimensions.width - 32, 120);
  const chartWidth = Math.floor(availableChartWidth);
  const chartVerticalReserve = isMainVariant
    ? Math.min(isCompactChart ? 84 : 112, Math.max(isCompactChart ? 64 : 86, dimensions.height * 0.24))
    : 90;
  const chartHeight = Math.max(dimensions.height - chartVerticalReserve, 80);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const { width, height: nextHeight } = entry.contentRect;
      setDimensions({
        width: Math.max(320, Math.floor(width)),
        height: Math.max(240, Math.floor(nextHeight)),
      });
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isActive || !graphMade || validationMessage) {
      setChartData(null);
      setLoadState("idle");
      setLoadError(null);
      return;
    }

    let cancelled = false;
    const abortController = new AbortController();

    const run = async () => {
      setLoadState("loading");
      setLoadError(null);

      try {
        const nextData = await fetchMetrics({
          tickers: selectedStocks,
          settings: {
            metricType,
            metricParams: {
              startDate: dateRange.start,
              endDate: dateRange.end,
              marketTicker: cardSettings.marketTicker ?? "SPY",
              riskFreeRate: cardSettings.riskRate ?? 0.01,
              confidenceLevel: cardSettings.confidenceLevel ?? 0.05,
            },
            stockColour: barColor,
          },
          signal: abortController.signal,
        });
        if (cancelled) return;
        setChartData(nextData);
        setLoadState("success");
      } catch (error) {
        if (abortController.signal.aborted || cancelled) return;
        setChartData(null);
        setLoadState("error");
        setLoadError(
          error instanceof Error
            ? error.message
            : "Metric data is temporarily unavailable.",
        );
      }
    };

    run();
    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [
    barColor,
    cardSettings.confidenceLevel,
    cardSettings.marketTicker,
    cardSettings.riskRate,
    dateRange.end,
    dateRange.start,
    graphMade,
    isActive,
    metricType,
    selectedStocks,
    validationMessage,
  ]);

  const handleFullscreenToggle = () => setIsFullscreen((value) => !value);

  const handleMetricSelect = (nextMetricType: MetricType) => {
    onUpdateSettings(index, {
      metricType: nextMetricType,
      graphMade: true,
    });
    onActivate(index);
  };

  const handleApplySettings = (settings: GraphSettings) => {
    onUpdateSettings(index, {
      barColor: settings.stockColour,
      dateRange: {
        start: settings.metricParams.startDate,
        end: settings.metricParams.endDate,
      },
      metricType: settings.metricType,
      marketTicker: settings.metricParams.marketTicker,
      riskRate: settings.metricParams.riskFreeRate,
      confidenceLevel: settings.metricParams.confidenceLevel,
      graphMade: true,
    });
    onActivate(index);
  };

  const chart = useMemo(() => {
    if (!chartData) return null;

    switch (metric.chartKind) {
      case "bar": {
        const values = selectedStocks
          .map((ticker) => ({
            label: ticker,
            value: chartData.series.singleValue?.[ticker],
          }))
          .filter((entry) => Number.isFinite(entry.value));

        if (!values.length) return null;

        return (
          <BarGraph
            data={values as Array<{ label: string; value: number }>}
            width={chartWidth}
            height={chartHeight}
            barColor={barColor}
            compact={isCompactChart}
            valueFormat={(value) => formatMetricValue(metricType, value)}
            ariaLabel={`${metric.label} comparison`}
          />
        );
      }
      case "line": {
        const series = selectedStocks
          .map((ticker) => ({
            ticker,
            values: (chartData.series.timeSeries?.[ticker] ?? []).map((point) => ({
              date: new Date(`${point.date}T00:00:00`),
              value: point.value,
            })),
          }))
          .filter((entry) => entry.values.length > 0);

        if (!series.length) return null;

        return (
          <LineGraph
            data={series}
            width={chartWidth}
            height={chartHeight}
            mainColor={barColor}
            compact={isCompactChart}
            valueFormat={(value) => formatMetricValue(metricType, value)}
            ariaLabel={`${metric.label} over time`}
          />
        );
      }
      case "heatmap": {
        const matrix = chartData.series.correlationMatrix ?? {};
        const benchmark = cardSettings.marketTicker ?? "SPY";
        const labels = Array.from(
          new Set([...selectedStocks, ...Object.keys(matrix), benchmark]),
        ).filter(Boolean);

        if (!labels.length) return null;

        return (
          <HeatMap
            data={labels.map((rowLabel) =>
              labels.map((columnLabel) => matrix[rowLabel]?.[columnLabel] ?? Number.NaN),
            )}
            labels={labels}
            width={chartWidth}
            height={chartHeight}
            barColor={barColor}
            ariaLabel={`${metric.label} matrix`}
          />
        );
      }
      case "scatter": {
        const portfolio = chartData.series.portfolio;
        if (!portfolio) return null;
        const points = portfolio.returns.map((pointReturn, pointIndex) => ({
          risk: portfolio.risks[pointIndex] ?? Number.NaN,
          return: pointReturn,
          sharpe: portfolio.sharpe_ratios[pointIndex],
          weights: portfolio.weights[pointIndex] ?? [],
        }));
        if (!points.length) return null;

        return (
          <ScatterPlotGraph
            data={points}
            width={chartWidth}
            height={chartHeight}
            mainColor={barColor}
          />
        );
      }
      default:
        return null;
    }
  }, [
    barColor,
    cardSettings.marketTicker,
    chartData,
    chartHeight,
    chartWidth,
    isCompactChart,
    metric,
    metricType,
    selectedStocks,
  ]);

  const metadata = [
    metric.requiresBenchmark ? `Benchmark ${cardSettings.marketTicker ?? "SPY"}` : null,
    metric.usesRiskFreeRate
      ? `RF ${(100 * (cardSettings.riskRate ?? 0.01)).toFixed(1)}%`
      : null,
    metric.usesConfidenceLevel
      ? `${Math.round((1 - (cardSettings.confidenceLevel ?? 0.05)) * 100)}% VaR`
      : null,
  ].filter(Boolean);

  const body = () => {
    if (!graphMade) {
      return (
        <StateMessage
          title="Choose a metric for this slot"
          body="Each chart answers a different question about the same basket. Start with the preset or open settings for a custom metric."
          action={
            <Button
              variant="contained"
              onClick={() => setShowSettings(true)}
              sx={{ bgcolor: "#5d67ff", textTransform: "none" }}
            >
              Configure chart
            </Button>
          }
        />
      );
    }

    if (validationMessage) {
      return (
        <StateMessage
          title={metric.label}
          body={validationMessage}
          action={
            metric.minimumSymbols > 1 ? (
              <Button
                variant="outlined"
                onClick={() => setShowSettings(true)}
                sx={{ color: "#dce4ff", textTransform: "none" }}
              >
                Review settings
              </Button>
            ) : undefined
          }
        />
      );
    }

    if (loadState === "loading") {
      return (
        <StateMessage
          title={`Loading ${metric.label}`}
          body="Refreshing the chart with the latest board inputs."
        />
      );
    }

    if (loadState === "error") {
      return (
        <StateMessage
          title="Metric unavailable"
          body={loadError ?? "Metric data is temporarily unavailable."}
        />
      );
    }

    if (!chart) {
      const statusValues = Object.values(chartData?.series.singleValueStatuses ?? {}).map((entry) => entry.status);
      if (metricType === "SortinoRatioVisualization" && statusValues.length) {
        const noDownsideCount = statusValues.filter((status) => status === "infinite").length;
        return (
          <StateMessage
            title={noDownsideCount === statusValues.length ? "No downside shortfall observed" : "Sortino needs downside observations"}
            body={noDownsideCount === statusValues.length ? "The selected window did not produce returns below the risk-free target, so Sortino is undefined rather than zero." : "Sortino only becomes numeric when the series has enough downside shortfall to estimate downside deviation."}
          />
        );
      }

      return (
        <StateMessage
          title="No usable data"
          body="The selected symbols do not have enough overlapping history for this metric."
        />
      );
    }

    return chart;
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        position: isFullscreen ? "fixed" : "relative",
        top: isFullscreen ? 0 : "unset",
        left: isFullscreen ? 0 : "unset",
        width: isFullscreen ? "100vw" : "100%",
        height: isFullscreen ? "100vh" : height,
        bgcolor: "var(--fit-color-surface-soft, #111114)",
        color: "#fff",
        fontFamily: "var(--fit-font-family)",
        border: "1px solid var(--fit-color-border-panel, #27272a)",
        borderRadius: isMainVariant ? 2 : 0,
        p: isMainVariant ? "clamp(10px, 0.85vw, 16px)" : "1rem",
        overflow: "hidden",
        zIndex: isFullscreen ? 1000 : "unset",
        boxShadow: isMainVariant
          ? "inset 0 1px 0 rgba(255, 255, 255, 0.035)"
          : "none",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: "clamp(10px, 0.85vw, 16px)",
          left: "clamp(10px, 0.85vw, 16px)",
          right: "clamp(10px, 0.85vw, 16px)",
          zIndex: 2,
          display: "grid",
          gap: 1.25,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
            <Select
              size="small"
              value={metricType}
              renderValue={(value) =>
                metricOptions.find((option) => option.value === value)?.label ??
                "Select metric"
              }
              sx={{
                height: "clamp(32px, 3.8vh, 38px)",
                minWidth: "clamp(170px, 12vw, 220px)",
                color: "#fff",
                bgcolor: "var(--fit-color-field, #18181b)",
                fontSize: 13,
                borderRadius: "0.625rem",
                ".MuiSelect-icon": {
                  color: "var(--fit-color-text-muted, #8f98aa)",
                },
                ".MuiOutlinedInput-notchedOutline": {
                  borderColor: "var(--fit-color-border-control, #202230)",
                },
              }}
            >
              {metricOptions.map((option) => (
                <MenuItem
                  key={option.value}
                  value={option.value}
                  onClick={() => handleMetricSelect(option.value)}
                >
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            <Box
              sx={{
                color: "var(--fit-color-text-muted, #8f98aa)",
                fontSize: 12,
                whiteSpace: "nowrap",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {selectedStocks.length} stocks
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Tooltip title={index === 0 ? "Main view" : "Switch to main view"} arrow>
              <span>
                <IconButton
                  size="small"
                  aria-label={index === 0 ? "Main view" : "Switch to main view"}
                  onClick={() => onSwap(index)}
                  disabled={index === 0 || !showSwap}
                  sx={{
                    color: "var(--fit-color-text-muted, #8f98aa)",
                    "&:hover": {
                      color: "var(--fit-color-accent-strong, #65a0fd)",
                      bgcolor:
                        "var(--fit-color-brand-fill-hover, rgba(123, 140, 255, 0.12))",
                    },
                    "&.Mui-disabled": {
                      color: "rgba(143, 152, 170, 0.32)",
                    },
                  }}
                >
                  <SwapHorizIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Chart settings" arrow>
              <IconButton
                aria-label="Open chart settings"
                size="small"
                onClick={() => setShowSettings(true)}
                sx={{
                  color: "var(--fit-color-text-muted, #8f98aa)",
                  "&:hover": {
                    color: "var(--fit-color-accent-strong, #65a0fd)",
                    bgcolor:
                      "var(--fit-color-brand-fill-hover, rgba(123, 140, 255, 0.12))",
                  },
                }}
              >
                <TuneIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={isFullscreen ? "Exit fullscreen" : "Fullscreen"} arrow>
              <IconButton
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                size="small"
                onClick={handleFullscreenToggle}
                sx={{
                  color: "var(--fit-color-text-muted, #8f98aa)",
                  "&:hover": {
                    color: "var(--fit-color-accent-strong, #65a0fd)",
                    bgcolor:
                      "var(--fit-color-brand-fill-hover, rgba(123, 140, 255, 0.12))",
                  },
                }}
              >
                {isFullscreen ? (
                  <CloseFullscreenIcon fontSize="small" />
                ) : (
                  <OpenInFullIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear" arrow>
              <IconButton
                aria-label="Clear chart"
                size="small"
                onClick={() => onClear(index)}
                sx={{
                  color: "var(--fit-color-text-muted, #8f98aa)",
                  "&:hover": {
                    color: "#ff9bb0",
                    bgcolor: "rgba(255, 61, 104, 0.1)",
                  },
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ color: "#eef2fb", fontSize: 16, fontWeight: 600 }}>
            {metric.description}
          </Box>
          <Box
            sx={{
              mt: 0.5,
              display: "flex",
              flexWrap: "wrap",
              gap: 0.75,
              color: "var(--fit-color-text-muted, #8f98aa)",
              fontSize: 12,
            }}
          >
            <Box>{dateRange.start} → {dateRange.end}</Box>
            {metadata.map((item) => (
              <Box key={item}>{item}</Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          pt: isMainVariant
            ? isCompactChart
              ? "clamp(82px, 11vh, 102px)"
              : "clamp(92px, 13vh, 122px)"
            : 0,
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "stretch",
        }}
      >
        {body()}
      </Box>

      <GraphSettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onApply={handleApplySettings}
        initialSettings={buildInitialSettings(cardSettings)}
      />
    </Box>
  );
};

export default StockChartCard;
