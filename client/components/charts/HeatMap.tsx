import * as d3 from "d3";
import React, { useEffect, useId, useRef } from "react";
import {
  CHART_AXIS_COLOR,
  CHART_GRID_COLOR,
  CHART_TEXT_COLOR,
  CHART_TOOLTIP_BACKGROUND,
} from "./ChartTheme";

const DEFAULT_POSITIVE_COLOR = "#007a3d";
const DEFAULT_NEGATIVE_COLOR = "#c9435b";
const NEUTRAL_COLOR = "#1b1b20";

const positionTooltip = (
  event: MouseEvent,
  tooltip: d3.Selection<HTMLDivElement | null, unknown, null, undefined>,
) => {
  const tooltipWidth = 170;
  const tooltipHeight = 92;
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

const getOpposingColor = (color: string) => {
  const parsedColor = d3.color(color);

  if (!parsedColor) {
    return DEFAULT_NEGATIVE_COLOR;
  }

  const rgb = parsedColor.rgb();
  return d3.rgb(255 - rgb.r, 255 - rgb.g, 255 - rgb.b).formatHex();
};

const truncateLabel = (label: string, maximumCharacters: number) =>
  label.length > maximumCharacters
    ? `${label.slice(0, Math.max(1, maximumCharacters - 1))}…`
    : label;

interface HeatMapProps {
  data: Array<Array<number | null>>;
  labels: string[];
  width?: number;
  height?: number;
  barColor?: string;
  ariaLabel?: string;
  selectedCell?: { row: number; column: number } | null;
  onCellSelect?: (selection: {
    row: number;
    column: number;
    rowLabel: string;
    columnLabel: string;
    value: number;
  }) => void;
}

interface HeatMapCell {
  column: number;
  row: number;
  value: number;
}

const HeatMap: React.FC<HeatMapProps> = ({
  data,
  labels = [],
  width = 500,
  height = 500,
  barColor,
  ariaLabel,
  selectedCell,
  onCellSelect,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const safeWidth = Number.isFinite(width) ? Math.max(width, 240) : 500;
  const safeHeight = Number.isFinite(height) ? Math.max(height, 220) : 500;

  useEffect(() => {
    const rowCount = data.length;
    const columnCount = Math.max(0, ...data.map((row) => row.length));
    const isSquareMatrix =
      rowCount > 0 &&
      rowCount === columnCount &&
      data.every((row) => row.length === columnCount);
    const cells = data.flatMap((row, rowIndex) =>
      row.flatMap((value, columnIndex): HeatMapCell[] =>
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= -1 &&
        value <= 1
          ? [{ column: columnIndex, row: rowIndex, value }]
          : [],
      ),
    );
    const rowLabels = Array.from(
      { length: rowCount },
      (_, index) => labels[index]?.trim() || `Row ${index + 1}`,
    );
    const columnLabels = Array.from(
      { length: columnCount },
      (_, index) => labels[index]?.trim() || `Column ${index + 1}`,
    );
    const chartTitle = ariaLabel?.trim() || "Correlation heatmap";
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

    if (!isSquareMatrix || !cells.length) {
      const emptyMessage = isSquareMatrix
        ? "No valid correlation values are available for this heatmap."
        : "Correlation matrices must be square.";
      svg.append("desc").attr("id", descriptionId).text(emptyMessage);
      svg
        .append("text")
        .attr("x", safeWidth / 2)
        .attr("y", safeHeight / 2)
        .attr("fill", CHART_TEXT_COLOR)
        .attr("font-size", 13)
        .attr("text-anchor", "middle")
        .text(emptyMessage);

      return () => {
        tooltip.style("display", "none").attr("aria-hidden", "true");
      };
    }

    svg
      .append("desc")
      .attr("id", descriptionId)
      .text(
        `${rowCount} by ${columnCount} correlation matrix with ${cells.length} finite values. The fixed color scale runs from negative one through zero to positive one.`,
      );

    const longestLabelLength = Math.max(
      1,
      ...rowLabels.map((label) => label.length),
      ...columnLabels.map((label) => label.length),
    );
    const topMargin = Math.min(
      Math.max(44, longestLabelLength * 4.5),
      safeHeight * 0.28,
    );
    const rightMargin = 16;
    const bottomMargin = 18;
    const leftMargin = Math.min(
      Math.max(48, longestLabelLength * 7 + 14),
      safeWidth * 0.3,
    );
    const graphWidth = Math.max(1, safeWidth - leftMargin - rightMargin);
    const graphHeight = Math.max(1, safeHeight - topMargin - bottomMargin);
    const rowKeys = Array.from({ length: rowCount }, (_, index) => `${index}`);
    const columnKeys = Array.from(
      { length: columnCount },
      (_, index) => `${index}`,
    );
    const xScale = d3
      .scaleBand<string>()
      .domain(columnKeys)
      .range([0, graphWidth]);
    const yScale = d3
      .scaleBand<string>()
      .domain(rowKeys)
      .range([0, graphHeight]);
    const cellWidth = xScale.bandwidth();
    const cellHeight = yScale.bandwidth();
    const positiveColor =
      d3.color(barColor || DEFAULT_POSITIVE_COLOR)?.formatHex() ||
      DEFAULT_POSITIVE_COLOR;
    const negativeColor = barColor
      ? getOpposingColor(barColor)
      : DEFAULT_NEGATIVE_COLOR;
    const colorScale = d3
      .scaleLinear<string>()
      .domain([-1, 0, 1])
      .range([negativeColor, NEUTRAL_COLOR, positiveColor])
      .clamp(true);
    const group = svg
      .append("g")
      .attr("transform", `translate(${leftMargin},${topMargin})`);

    group
      .selectAll<SVGRectElement, HeatMapCell>("rect.cell")
      .data(cells)
      .enter()
      .append("rect")
      .attr("class", "cell")
      .attr("x", (cell) => xScale(`${cell.column}`) ?? 0)
      .attr("y", (cell) => yScale(`${cell.row}`) ?? 0)
      .attr("width", cellWidth)
      .attr("height", cellHeight)
      .attr("fill", (cell) => colorScale(cell.value))
      .attr("stroke", (cell) =>
        selectedCell?.row === cell.row &&
        selectedCell?.column === cell.column
          ? "#f7f8fc"
          : CHART_GRID_COLOR,
      )
      .attr("stroke-width", (cell) =>
        selectedCell?.row === cell.row &&
        selectedCell?.column === cell.column
          ? 2
          : 0.5,
      )
      .attr("tabindex", 0)
      .attr("role", "img")
      .attr("aria-label", (cell) => {
        const rowLabel = rowLabels[cell.row]!;
        const columnLabel = columnLabels[cell.column]!;
        return `${rowLabel} and ${columnLabel}: correlation ${cell.value.toFixed(2)}`;
      })
      .on("click", (_event, cell) =>
        onCellSelect?.({
          row: cell.row,
          column: cell.column,
          rowLabel: rowLabels[cell.row]!,
          columnLabel: columnLabels[cell.column]!,
          value: cell.value,
        }),
      )
      .on("keydown", (event: KeyboardEvent, cell) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onCellSelect?.({
          row: cell.row,
          column: cell.column,
          rowLabel: rowLabels[cell.row]!,
          columnLabel: columnLabels[cell.column]!,
          value: cell.value,
        });
      })
      .on("mouseover", (event: MouseEvent, cell) => {
        const rowLabel = rowLabels[cell.row]!;
        const columnLabel = columnLabels[cell.column]!;
        tooltip.selectAll("*").remove();
        tooltip.append("div").text(`${rowLabel} / ${columnLabel}`);
        tooltip
          .append("div")
          .style("color", CHART_TEXT_COLOR)
          .style("margin-top", "8px")
          .text(`Correlation: ${cell.value.toFixed(2)}`);
        tooltip.style("display", "block").attr("aria-hidden", "false");
        positionTooltip(event, tooltip);
      })
      .on("mousemove", (event: MouseEvent) => {
        positionTooltip(event, tooltip);
      })
      .on("mouseout", () => {
        tooltip.style("display", "none").attr("aria-hidden", "true");
      });

    if (Math.min(cellWidth, cellHeight) >= 22) {
      group
        .selectAll<SVGTextElement, HeatMapCell>("text.cell-label")
        .data(cells)
        .enter()
        .append("text")
        .attr("class", "cell-label")
        .attr("x", (cell) => (xScale(`${cell.column}`) ?? 0) + cellWidth / 2)
        .attr("y", (cell) => (yScale(`${cell.row}`) ?? 0) + cellHeight / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr(
          "font-size",
          Math.max(9, Math.min(13, Math.min(cellWidth, cellHeight) / 4)),
        )
        .attr("fill", (cell) =>
          Math.abs(cell.value) >= 0.45 ? "#fff" : CHART_TEXT_COLOR,
        )
        .attr("pointer-events", "none")
        .text((cell) => cell.value.toFixed(2));
    }

    const maximumColumnLabelCharacters = Math.max(3, Math.floor(cellWidth / 6));
    const maximumRowLabelCharacters = Math.max(
      4,
      Math.floor((leftMargin - 16) / 7),
    );
    const xAxis = d3
      .axisTop(xScale)
      .tickSizeOuter(0)
      .tickFormat((key) =>
        truncateLabel(columnLabels[Number(key)]!, maximumColumnLabelCharacters),
      );
    const yAxis = d3
      .axisLeft(yScale)
      .tickSizeOuter(0)
      .tickFormat((key) =>
        truncateLabel(rowLabels[Number(key)]!, maximumRowLabelCharacters),
      );
    const xAxisGroup = group.append("g").call(xAxis);
    const yAxisGroup = group.append("g").call(yAxis);

    group.selectAll(".domain, .tick line").attr("stroke", CHART_AXIS_COLOR);
    const axisFontSize = Math.max(
      9,
      Math.min(12, Math.min(cellWidth, cellHeight) / 3),
    );
    xAxisGroup
      .selectAll("text")
      .attr("fill", CHART_TEXT_COLOR)
      .attr("font-size", axisFontSize);
    yAxisGroup
      .selectAll("text")
      .attr("fill", CHART_TEXT_COLOR)
      .attr("font-size", axisFontSize);
    xAxisGroup
      .selectAll<SVGTextElement, string>("text")
      .append("title")
      .text((key) => columnLabels[Number(key)]!);
    yAxisGroup
      .selectAll<SVGTextElement, string>("text")
      .append("title")
      .text((key) => rowLabels[Number(key)]!);

    if (columnLabels.some((label) => label.length * 6 > cellWidth)) {
      xAxisGroup
        .selectAll("text")
        .attr("text-anchor", "start")
        .attr("dx", "0.35em")
        .attr("dy", "-0.2em")
        .attr("transform", "rotate(-35)");
    }

    return () => {
      svg.interrupt();
      svg.selectAll("*").interrupt();
      tooltip.style("display", "none").attr("aria-hidden", "true");
    };
  }, [
    ariaLabel,
    barColor,
    data,
    descriptionId,
    labels,
    onCellSelect,
    selectedCell,
    safeHeight,
    safeWidth,
    titleId,
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

export default HeatMap;
