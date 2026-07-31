import React, { useEffect, useMemo, useRef, useState } from "react";
import type { MetricsResponse } from "@/lib/market-metrics";
import { BarGraph, HeatMap, LineGraph } from "@/components/charts";
import { PortfolioFrontierChart } from "./PortfolioFrontierChart";
import { formatMetricValue, METRIC_REGISTRY } from "../data/metricRegistry";
import { toCorrelationHeatMapModel } from "../lib/portfolioChartModel";
import type { PortfolioMetricType } from "../types";
import baseStyles from "../styles/PortfolioScreen.module.css";
import workspaceStyles from "../styles/PortfolioTraderWorkspace.module.css";

const useChartDimensions = (compact: boolean) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const minimumHeight = compact ? 180 : 320;
  const [dimensions, setDimensions] = useState({
    width: compact ? 460 : 860,
    height: compact ? 220 : 420,
  });
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      setDimensions({
        width: Math.max(260, Math.floor(entry.contentRect.width)),
        height: Math.max(minimumHeight, Math.floor(entry.contentRect.height)),
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [minimumHeight]);
  return { ref, dimensions };
};

export const PortfolioChart = ({
  data,
  metricType,
  benchmark,
  compact = false,
}: {
  data: MetricsResponse;
  metricType: PortfolioMetricType;
  benchmark: string;
  compact?: boolean;
}) => {
  const { ref, dimensions } = useChartDimensions(compact);
  const metric = METRIC_REGISTRY[metricType];
  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    column: number;
  } | null>(null);
  const [pinnedSelection, setPinnedSelection] = useState<{
    title: string;
    detail: string;
  } | null>(null);

  useEffect(() => {
    setSelectedCell(null);
    setPinnedSelection(null);
  }, [data, metricType]);

  const chart = useMemo(() => {
    if (metric.chartKind === "bar") {
      const values = Object.entries(data.series.singleValue ?? {}).map(
        ([label, value]) => ({ label, value }),
      );
      return (
        <BarGraph
          data={values}
          width={dimensions.width}
          height={dimensions.height}
          valueFormat={(value) => formatMetricValue(metricType, value)}
          ariaLabel={`${metric.label} comparison`}
        />
      );
    }
    if (metric.chartKind === "line") {
      const series = Object.entries(data.series.timeSeries ?? {}).map(
        ([ticker, values]) => ({
          ticker,
          values: values.map((point) => ({
            date: new Date(`${point.date}T00:00:00`),
            value: point.value,
          })),
        }),
      );
      return (
        <LineGraph
          data={series}
          width={dimensions.width}
          height={dimensions.height}
          valueFormat={(value) => formatMetricValue(metricType, value)}
          ariaLabel={`${metric.label} over time`}
        />
      );
    }
    if (metric.chartKind === "heatmap") {
      const model = toCorrelationHeatMapModel(
        data.series.correlationMatrix ?? {},
      );
      return (
        <HeatMap
          data={model.values}
          labels={model.labels}
          width={dimensions.width}
          height={dimensions.height}
          ariaLabel={`${metric.label} matrix`}
          selectedCell={selectedCell}
          onCellSelect={(selection) => {
            setSelectedCell({
              row: selection.row,
              column: selection.column,
            });
            setPinnedSelection({
              title: `${selection.rowLabel} / ${selection.columnLabel}`,
              detail: `Rolling correlation ${selection.value.toFixed(2)}`,
            });
          }}
        />
      );
    }

    const portfolio = data.series.portfolio;
    const points = (portfolio?.returns ?? []).map((pointReturn, index) => ({
      risk: portfolio?.risks[index] ?? 0,
      return: pointReturn,
      sharpe: portfolio?.sharpe_ratios[index],
      weights: portfolio?.weights[index] ?? [],
    }));
    return (
      <PortfolioFrontierChart
        data={points}
        width={dimensions.width}
        height={dimensions.height}
        mainColor="#65a0fd"
        onPointSelect={(point) => {
          const allocation = (portfolio?.asset_order ?? [])
            .map((symbol, index) => {
              const weight = point.weights?.[index];
              return Number.isFinite(weight)
                ? `${symbol} ${formatMetricValue(metricType, weight!, true)}`
                : null;
            })
            .filter(Boolean)
            .join(" · ");
          setPinnedSelection({
            title: "Pinned sampled portfolio",
            detail: `${formatMetricValue(
              metricType,
              point.return,
            )} return · ${formatMetricValue(
              metricType,
              point.risk,
            )} risk${
              Number.isFinite(point.sharpe)
                ? ` · Sharpe ${point.sharpe!.toFixed(2)}`
                : ""
            }${allocation ? ` · ${allocation}` : ""}`,
          });
        }}
      />
    );
  }, [
    data.series.correlationMatrix,
    data.series.portfolio,
    data.series.singleValue,
    data.series.timeSeries,
    dimensions.height,
    dimensions.width,
    metric.chartKind,
    metric.label,
    metricType,
    selectedCell,
  ]);

  return (
    <div
      ref={ref}
      className={`${baseStyles.chartCanvas} ${
        compact ? workspaceStyles.chartCanvasCompact : ""
      }`}
      aria-label={`${metric.label} chart`}
      data-benchmark={benchmark}
      style={{ position: "relative" }}
    >
      {chart}
      {pinnedSelection && (
        <div
          className={workspaceStyles.chartSelection}
          role="status"
          aria-live="polite"
        >
          <span>
            <strong>{pinnedSelection.title}</strong>
            {pinnedSelection.detail}
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedCell(null);
              setPinnedSelection(null);
            }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};
