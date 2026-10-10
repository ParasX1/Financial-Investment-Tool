import * as d3 from "d3";
import React, { useEffect, useId, useRef } from "react";
import {
  CHART_AXIS_COLOR,
  CHART_GRID_COLOR,
  CHART_TEXT_COLOR,
  CHART_TOOLTIP_BACKGROUND,
  CHART_ZERO_LINE_COLOR,
  STOCK_SERIES_COLORS,
  getChartSeriesColor,
  getZeroAnchoredDomain,
} from "./ChartTheme";

const compactNumberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
  notation: "compact",
});

const defaultValueFormat = (value: number) =>
  compactNumberFormatter.format(value);

const positionTooltip = (
  event: MouseEvent,
  tooltip: d3.Selection<HTMLDivElement | null, unknown, null, undefined>,
  itemCount = 1,
) => {
  const tooltipWidth = 150;
  const tooltipHeight = 36 + itemCount * 28;
  const gap = 12;
  const left =
    event.clientX + tooltipWidth + gap > window.innerWidth
      ? event.clientX - tooltipWidth - gap
      : event.clientX + gap;
  const top =
    event.clientY + tooltipHeight + gap > window.innerHeight
      ? event.clientY - tooltipHeight - gap
      : event.clientY + gap;

  tooltip.style("left", `${left}px`).style("top", `${top}px`);
};

const truncateLabel = (label: string, maximumCharacters: number) =>
  label.length > maximumCharacters
    ? `${label.slice(0, Math.max(1, maximumCharacters - 1))}…`
    : label;

interface BarGraphProps {
  data: { label: string; value: number }[];
  width?: number;
  height?: number;
  barColor?: string;
  lineColors?: string[];
  compact?: boolean;
  valueFormat?: (value: number) => string;
  ariaLabel?: string;
}

const BarGraph: React.FC<BarGraphProps> = ({
  data,
  width = 500,
  height = 300,
  barColor,
  lineColors = STOCK_SERIES_COLORS,
  compact = false,
  valueFormat = defaultValueFormat,
  ariaLabel,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const safeWidth = Number.isFinite(width) ? Math.max(width, 220) : 500;
  const safeHeight = Number.isFinite(height)
    ? Math.max(height, compact ? 132 : 160)
    : 300;

  useEffect(() => {
    const usableData = data
      .filter(
        (item) => typeof item.label === "string" && Number.isFinite(item.value),
      )
      .map((item, index) => ({
        label: item.label.trim() || `Item ${index + 1}`,
        value: item.value,
      }));
    const chartTitle = ariaLabel?.trim() || "Bar chart";
    const svg = d3
      .select(svgRef.current)
      .attr("width", safeWidth)
      .attr("height", safeHeight)
      .attr("viewBox", `0 0 ${safeWidth} ${safeHeight}`)
      .attr("role", "img")
      .attr("aria-labelledby", `${titleId} ${descriptionId}`);

    svg.selectAll("*").interrupt();
    svg.selectAll("*").remove();
    svg.append("title").attr("id", titleId).text(chartTitle);

    const tooltip = d3
      .select(tooltipRef.current)
      .attr("role", "tooltip")
      .attr("aria-hidden", "true")
      .style("position", "fixed")
      .style("background", CHART_TOOLTIP_BACKGROUND)
      .style("color", "#fff")
      .style("border", `1px solid ${CHART_GRID_COLOR}`)
      .style("border-radius", "8px")
      .style("padding", "10px")
      .style("display", "none")
      .style("pointer-events", "none");

    if (!usableData.length) {
      svg
        .append("desc")
        .attr("id", descriptionId)
        .text("No finite values are available for this chart.");
      svg
        .append("text")
        .attr("x", safeWidth / 2)
        .attr("y", safeHeight / 2)
        .attr("fill", CHART_TEXT_COLOR)
        .attr("font-size", compact ? 11 : 13)
        .attr("text-anchor", "middle")
        .text("No chart data");

      return () => {
        tooltip.style("display", "none").attr("aria-hidden", "true");
      };
    }

    const values = usableData.map((item) => item.value);
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    svg
      .append("desc")
      .attr("id", descriptionId)
      .text(
        `${usableData.length} categories. Values range from ${valueFormat(
          minimum,
        )} to ${valueFormat(maximum)}. Zero is the reference baseline.`,
      );

    const topMargin = compact ? 12 : 26;
    const rightMargin = compact ? 12 : 20;
    const bottomMargin = compact ? 30 : 48;
    const leftMargin = compact ? 40 : 54;
    const graphWidth = Math.max(1, safeWidth - leftMargin - rightMargin);
    const graphHeight = Math.max(1, safeHeight - topMargin - bottomMargin);
    const yTickCount = compact
      ? Math.max(2, Math.min(5, Math.floor(graphHeight / 28)))
      : Math.max(3, Math.min(7, Math.floor(graphHeight / 34)));
    const xScale = d3
      .scaleBand<string>()
      .domain(usableData.map((item) => item.label))
      .range([0, graphWidth])
      .padding(0.22);
    const yScale = d3
      .scaleLinear()
      .domain(getZeroAnchoredDomain(values))
      .range([graphHeight, 0])
      .nice(yTickCount);
    const colorPalette = lineColors.length ? lineColors : STOCK_SERIES_COLORS;
    const getBarColor = (index: number) =>
      barColor && usableData.length === 1
        ? barColor
        : getChartSeriesColor(index, colorPalette);
    const group = svg
      .append("g")
      .attr("transform", `translate(${leftMargin},${topMargin})`);

    const yGridLines = d3
      .axisLeft(yScale)
      .ticks(yTickCount)
      .tickSize(-graphWidth)
      .tickFormat(() => "");
    group.append("g").attr("class", "grid").call(yGridLines);
    group.selectAll(".grid .domain").attr("stroke", "none");
    group
      .selectAll(".grid line")
      .attr("stroke", CHART_GRID_COLOR)
      .attr("stroke-dasharray", "3 4")
      .attr("shape-rendering", "crispEdges");

    const zeroY = yScale(0);
    group
      .append("line")
      .attr("class", "zero-reference-line")
      .attr("x1", 0)
      .attr("x2", graphWidth)
      .attr("y1", zeroY)
      .attr("y2", zeroY)
      .attr("stroke", CHART_ZERO_LINE_COLOR)
      .attr("stroke-width", 1.25)
      .attr("aria-hidden", "true");

    group
      .selectAll<SVGRectElement, (typeof usableData)[number]>("rect.bar")
      .data(usableData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (item) => xScale(item.label) ?? 0)
      .attr("y", (item) => (item.value >= 0 ? yScale(item.value) : zeroY))
      .attr("width", xScale.bandwidth())
      .attr("height", (item) => Math.abs(yScale(item.value) - zeroY))
      .attr("rx", Math.min(6, xScale.bandwidth() / 2))
      .attr("ry", Math.min(6, xScale.bandwidth() / 2))
      .attr("fill", (_, index) => getBarColor(index))
      .attr("tabindex", 0)
      .attr("role", "img")
      .attr("aria-label", (item) => `${item.label}: ${valueFormat(item.value)}`)
      .on("mouseover", function (event: MouseEvent, item) {
        tooltip.selectAll("*").remove();
        tooltip.append("div").text(item.label);
        tooltip
          .append("div")
          .style("color", d3.select(this).attr("fill"))
          .style("margin-top", "8px")
          .text(`Value: ${valueFormat(item.value)}`);
        tooltip.style("display", "block").attr("aria-hidden", "false");
        positionTooltip(event, tooltip);
      })
      .on("mousemove", (event: MouseEvent) => {
        positionTooltip(event, tooltip);
      })
      .on("mouseout", () => {
        tooltip.style("display", "none").attr("aria-hidden", "true");
      });

    const maximumLabelCharacters = Math.max(
      3,
      Math.floor(xScale.bandwidth() / (compact ? 6 : 7)),
    );
    const xAxis = group
      .append("g")
      .attr("transform", `translate(0,${graphHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickSizeOuter(0)
          .tickFormat((label) => truncateLabel(label, maximumLabelCharacters)),
      );
    const yAxis = group.append("g").call(
      d3
        .axisLeft(yScale)
        .ticks(yTickCount)
        .tickFormat((value) => valueFormat(Number(value))),
    );

    xAxis.selectAll(".domain, .tick line").attr("stroke", CHART_AXIS_COLOR);
    yAxis.selectAll(".domain, .tick line").attr("stroke", CHART_AXIS_COLOR);
    xAxis
      .selectAll("text")
      .attr("fill", CHART_TEXT_COLOR)
      .attr(
        "font-size",
        Math.max(9, Math.min(compact ? 11 : 12, xScale.bandwidth() / 2)),
      );
    xAxis
      .selectAll<SVGTextElement, string>("text")
      .append("title")
      .text((label) => label);
    yAxis
      .selectAll("text")
      .attr("fill", CHART_TEXT_COLOR)
      .attr("font-size", compact ? 10 : 11);

    return () => {
      svg.interrupt();
      svg.selectAll("*").interrupt();
      tooltip.style("display", "none").attr("aria-hidden", "true");
    };
  }, [
    ariaLabel,
    barColor,
    compact,
    data,
    descriptionId,
    lineColors,
    safeHeight,
    safeWidth,
    titleId,
    valueFormat,
  ]);

  return (
    <>
      <svg
        ref={svgRef}
        aria-labelledby={`${titleId} ${descriptionId}`}
        focusable="false"
        height={safeHeight}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        style={{ display: "block", height: "auto", maxWidth: "100%" }}
        viewBox={`0 0 ${safeWidth} ${safeHeight}`}
        width={safeWidth}
      />
      <div ref={tooltipRef} />
    </>
  );
};

export default BarGraph;
