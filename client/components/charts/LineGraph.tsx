import * as d3 from "d3";
import React, { useEffect, useId, useRef } from "react";
import {
  CHART_AXIS_COLOR,
  CHART_GRID_COLOR,
  CHART_POINT_BACKGROUND,
  CHART_TEXT_COLOR,
  CHART_TOOLTIP_BACKGROUND,
  CHART_ZERO_LINE_COLOR,
  STOCK_SERIES_COLORS,
  getChartSeriesColor,
  getZeroAnchoredDomain,
} from "./ChartTheme";

const HOVER_LINE_COLOR = "rgba(255,255,255,0.32)";
const DAY_IN_MILLISECONDS = 86_400_000;

const percentFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
  style: "percent",
});

const defaultValueFormat = (value: number) => percentFormatter.format(value);

const truncateLabel = (label: string, maximumCharacters: number) =>
  label.length > maximumCharacters
    ? `${label.slice(0, Math.max(1, maximumCharacters - 1))}…`
    : label;

const getPaddedTimeDomain = (timestamps: readonly number[]): [Date, Date] => {
  const minimum = Math.min(...timestamps);
  const maximum = Math.max(...timestamps);
  const span = maximum - minimum;
  const padding = span > 0 ? span * 0.025 : DAY_IN_MILLISECONDS / 2;

  return [new Date(minimum - padding), new Date(maximum + padding)];
};

interface LineGraphProps {
  data: { ticker: string; values: { date: Date; value: number }[] }[];
  width?: number;
  height?: number;
  mainColor?: string;
  lineColors?: string[];
  compact?: boolean;
  valueFormat?: (value: number) => string;
  ariaLabel?: string;
}

interface UsableSeries {
  colorIndex: number;
  ticker: string;
  values: { date: Date; value: number }[];
}

interface HoverPoint {
  color: string;
  date: Date;
  ticker: string;
  value: number;
}

const LineGraph: React.FC<LineGraphProps> = ({
  data,
  width = 500,
  height = 300,
  mainColor,
  lineColors = STOCK_SERIES_COLORS,
  compact = false,
  valueFormat = defaultValueFormat,
  ariaLabel,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const safeWidth = Number.isFinite(width) ? Math.max(width, 240) : 500;
  const safeHeight = Number.isFinite(height)
    ? Math.max(height, compact ? 132 : 180)
    : 300;

  useEffect(() => {
    const usableData = data
      .map<UsableSeries>((series, colorIndex) => ({
        colorIndex,
        ticker: series.ticker.trim() || `Series ${colorIndex + 1}`,
        values: series.values
          .filter(
            (point) =>
              point.date instanceof Date &&
              Number.isFinite(point.date.getTime()) &&
              Number.isFinite(point.value),
          )
          .map((point) => ({
            date: new Date(point.date.getTime()),
            value: point.value,
          }))
          .sort((left, right) => left.date.getTime() - right.date.getTime()),
      }))
      .filter((series) => series.values.length > 0);
    const chartTitle = ariaLabel?.trim() || "Percentage trend line chart";
    const svg = d3
      .select(svgRef.current)
      .attr("width", safeWidth)
      .attr("height", safeHeight)
      .attr("viewBox", `0 0 ${safeWidth} ${safeHeight}`)
      .attr("role", "group")
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
        .text("No finite, dated values are available for this chart.");
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

    const allValues = usableData.flatMap((series) => series.values);
    const timestamps = allValues.map((point) => point.date.getTime());
    const numericValues = allValues.map((point) => point.value);
    const minimumValue = Math.min(...numericValues);
    const maximumValue = Math.max(...numericValues);
    const minimumDate = new Date(Math.min(...timestamps));
    const maximumDate = new Date(Math.max(...timestamps));
    const formatDescriptionDate = d3.timeFormat("%Y-%m-%d");
    svg
      .append("desc")
      .attr("id", descriptionId)
      .text(
        `${usableData.length} series from ${formatDescriptionDate(
          minimumDate,
        )} to ${formatDescriptionDate(maximumDate)}. Values range from ${valueFormat(
          minimumValue,
        )} to ${valueFormat(maximumValue)}. Zero is the reference baseline. Values are compared on the selected date; N/A means no observation on that date. Use arrow keys to inspect dates, Home or End to reach the first or last date, and Escape to dismiss details.`,
      );

    const topMargin = compact ? 12 : 24;
    const rightMargin = compact ? 14 : 22;
    const bottomMargin = compact ? 54 : 68;
    const leftMargin = compact ? 44 : 58;
    const graphWidth = Math.max(1, safeWidth - leftMargin - rightMargin);
    const graphHeight = Math.max(1, safeHeight - topMargin - bottomMargin);
    const yTickCount = compact
      ? Math.max(2, Math.min(5, Math.floor(graphHeight / 28)))
      : Math.max(3, Math.min(7, Math.floor(graphHeight / 34)));
    const xTickCount = Math.max(
      2,
      Math.min(compact ? 4 : 6, Math.floor(graphWidth / (compact ? 82 : 104))),
    );
    const xDomain = getPaddedTimeDomain(timestamps);
    const xScale = d3.scaleTime().domain(xDomain).range([0, graphWidth]);
    const yScale = d3
      .scaleLinear()
      .domain(getZeroAnchoredDomain(numericValues))
      .range([graphHeight, 0])
      .nice(yTickCount);
    const colorPalette = lineColors.length ? lineColors : STOCK_SERIES_COLORS;
    const getSeriesColor = (series: UsableSeries) =>
      mainColor && usableData.length === 1
        ? mainColor
        : getChartSeriesColor(series.colorIndex, colorPalette);
    const line = d3
      .line<{ date: Date; value: number }>()
      .x((point) => xScale(point.date))
      .y((point) => yScale(point.value))
      .curve(d3.curveLinear);
    const group = svg
      .append("g")
      .attr("transform", `translate(${leftMargin},${topMargin})`);

    const xGridLines = d3
      .axisBottom(xScale)
      .ticks(xTickCount)
      .tickSize(-graphHeight)
      .tickFormat(() => "");
    const yGridLines = d3
      .axisLeft(yScale)
      .ticks(yTickCount)
      .tickSize(-graphWidth)
      .tickFormat(() => "");
    group
      .append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${graphHeight})`)
      .call(xGridLines);
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

    usableData.forEach((series) => {
      const lineColor = getSeriesColor(series);
      const latestPoint = series.values.at(-1)!;
      group
        .append("path")
        .datum(series.values)
        .attr("class", "series-line")
        .attr("fill", "none")
        .attr("stroke", lineColor)
        .attr("stroke-width", 2)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr("d", line)
        .attr("role", "img")
        .attr(
          "aria-label",
          `${series.ticker} series, latest value ${valueFormat(latestPoint.value)}`,
        );

      group
        .append("circle")
        .attr("class", "series-end-point")
        .attr("cx", xScale(latestPoint.date))
        .attr("cy", yScale(latestPoint.value))
        .attr("r", 2.75)
        .attr("fill", CHART_POINT_BACKGROUND)
        .attr("stroke", lineColor)
        .attr("stroke-width", 1.5);
    });

    const span = xDomain[1].getTime() - xDomain[0].getTime();
    const crossesCalendarDay =
      minimumDate.toDateString() !== maximumDate.toDateString();
    const formatAxisDate =
      span > DAY_IN_MILLISECONDS * 730
        ? d3.timeFormat("%Y")
        : span > DAY_IN_MILLISECONDS * 90
          ? d3.timeFormat("%b %Y")
          : span > DAY_IN_MILLISECONDS * 2 || crossesCalendarDay
            ? d3.timeFormat("%b %d")
            : d3.timeFormat("%H:%M");
    const xAxis = group
      .append("g")
      .attr("transform", `translate(0,${graphHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(xTickCount)
          .tickSizeOuter(0)
          .tickFormat((value) => formatAxisDate(value as Date)),
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
      .attr("font-size", compact ? 10 : 11);
    yAxis
      .selectAll("text")
      .attr("fill", CHART_TEXT_COLOR)
      .attr("font-size", compact ? 10 : 11);

    const legendSlotWidth = graphWidth / usableData.length;
    const legendMarkerWidth = compact ? 12 : 16;
    const legendTextGap = compact ? 4 : 6;
    const legendCharacterWidth = compact ? 6 : 7;
    const maximumLegendCharacters = Math.max(
      2,
      Math.floor(
        (legendSlotWidth - legendMarkerWidth - legendTextGap - 4) /
          legendCharacterWidth,
      ),
    );
    const legendData = usableData.map((series) => ({
      color: getSeriesColor(series),
      displayTicker: truncateLabel(series.ticker, maximumLegendCharacters),
      ticker: series.ticker,
    }));
    const legend = group
      .append("g")
      .attr("class", "line-legend")
      .attr("transform", `translate(0,${graphHeight + (compact ? 28 : 36)})`);
    const legendItems = legend
      .selectAll<SVGGElement, (typeof legendData)[number]>("g")
      .data(legendData)
      .enter()
      .append("g")
      .attr(
        "transform",
        (_, index) => `translate(${index * legendSlotWidth},0)`,
      );

    legendItems
      .append("line")
      .attr("x1", 0)
      .attr("x2", legendMarkerWidth)
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", (item) => item.color)
      .attr("stroke-width", 2)
      .attr("stroke-linecap", "round");
    legendItems
      .append("circle")
      .attr("cx", legendMarkerWidth / 2)
      .attr("cy", 0)
      .attr("r", compact ? 2.5 : 3)
      .attr("fill", CHART_POINT_BACKGROUND)
      .attr("stroke", (item) => item.color)
      .attr("stroke-width", 1.5);
    legendItems
      .append("text")
      .attr("x", legendMarkerWidth + legendTextGap)
      .attr("y", compact ? 3 : 4)
      .attr("fill", (item) => item.color)
      .attr("font-size", compact ? 10 : 11)
      .text((item) => item.displayTicker)
      .append("title")
      .text((item) => item.ticker);

    const hoverLayer = group
      .append("g")
      .attr("class", "hover-layer")
      .style("display", "none");
    const hoverLine = hoverLayer
      .append("line")
      .attr("y1", 0)
      .attr("y2", graphHeight)
      .attr("stroke", HOVER_LINE_COLOR)
      .attr("stroke-width", 1);
    const hoverDots = hoverLayer.append("g").attr("class", "hover-dots");
    const inspectionDates = Array.from(new Set(timestamps)).sort(
      (left, right) => left - right,
    );
    const inspectionSeries = usableData.map((series) => ({
      ticker: series.ticker,
      color: getSeriesColor(series),
      values: new Map(
        series.values.map((point) => [point.date.getTime(), point.value]),
      ),
    }));
    const formatTooltipDate = d3.timeFormat("%Y-%m-%d");
    let inspectionIndex = 0;
    const rowsAt = (index: number) =>
      inspectionSeries.map((series) => ({
        ticker: series.ticker,
        color: series.color,
        date: new Date(inspectionDates[index]),
        value: series.values.get(inspectionDates[index]) ?? null,
      }));
    const rowText = (point: ReturnType<typeof rowsAt>[number]) =>
      `${point.ticker}: ${point.value === null ? "N/A" : valueFormat(point.value)}`;
    const valueText = (index: number) =>
      `${formatTooltipDate(new Date(inspectionDates[index]))}. ${rowsAt(index).map(rowText).join("; ")}`;
    const hideInspection = () => {
      hoverLayer.style("display", "none");
      tooltip.style("display", "none").attr("aria-hidden", "true");
    };
    const showInspection = (
      index: number,
      position: Pick<MouseEvent, "clientX" | "clientY">,
    ) => {
      inspectionIndex = index;
      const rows = rowsAt(index);
      const points = rows.filter(
        (point): point is HoverPoint => point.value !== null,
      );
      const date = new Date(inspectionDates[index]);
      const pointX = xScale(date);
      overlay
        .attr("aria-valuenow", index)
        .attr("aria-valuetext", valueText(index));
      hoverLayer.style("display", null);
      hoverLine.attr("x1", pointX).attr("x2", pointX);
      const dots = hoverDots
        .selectAll<SVGCircleElement, HoverPoint>("circle")
        .data(points, (point) => point.ticker);
      dots
        .enter()
        .append("circle")
        .attr("r", 4)
        .attr("fill", CHART_POINT_BACKGROUND)
        .attr("stroke-width", 2)
        .merge(dots)
        .attr("cx", (point) => xScale(point.date))
        .attr("cy", (point) => yScale(point.value))
        .attr("stroke", (point) => point.color);
      dots.exit().remove();

      tooltip.selectAll("*").remove();
      tooltip.append("div").text(formatTooltipDate(date));
      rows.forEach((point) => {
        tooltip
          .append("div")
          .style("color", point.color)
          .style("margin-top", "8px")
          .text(rowText(point));
      });
      const tooltipWidth = 170;
      const tooltipHeight = 36 + rows.length * 28;
      const gap = 12;
      const left =
        position.clientX + tooltipWidth + gap > window.innerWidth
          ? position.clientX - tooltipWidth - gap
          : position.clientX + gap;
      const top =
        position.clientY + tooltipHeight + gap > window.innerHeight
          ? position.clientY - tooltipHeight - gap
          : position.clientY + gap;
      tooltip
        .style("display", "block")
        .style(
          "left",
          `${Math.max(0, Math.min(left, window.innerWidth - tooltipWidth))}px`,
        )
        .style(
          "top",
          `${Math.max(0, Math.min(top, window.innerHeight - tooltipHeight))}px`,
        )
        .attr("aria-hidden", "false");
    };
    const showKeyboardInspection = (element: SVGRectElement) => {
      const bounds = element.getBoundingClientRect();
      showInspection(inspectionIndex, {
        clientX:
          bounds.left + xScale(new Date(inspectionDates[inspectionIndex])),
        clientY: bounds.top,
      });
    };
    const overlay = svg
      .append("rect")
      .attr("class", "hover-overlay")
      .attr("width", graphWidth)
      .attr("height", graphHeight)
      .attr("transform", `translate(${leftMargin},${topMargin})`)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .attr("tabindex", 0)
      .attr("role", "slider")
      .attr("aria-label", `Inspect ${chartTitle} by date`)
      .attr("aria-describedby", descriptionId)
      .attr("aria-valuemin", 0)
      .attr("aria-valuemax", inspectionDates.length - 1)
      .attr("aria-valuenow", inspectionIndex)
      .attr("aria-valuetext", valueText(inspectionIndex))
      .on("focus", function () {
        overlay.attr("stroke", "#fff").attr("stroke-width", 1.5);
        showKeyboardInspection(this);
      })
      .on("blur", () => {
        overlay.attr("stroke", null);
        hideInspection();
      })
      .on("keydown", function (event: KeyboardEvent) {
        if (
          event.defaultPrevented ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey ||
          event.isComposing
        )
          return;
        const nextIndex =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? inspectionDates.length - 1
              : event.key === "ArrowRight" || event.key === "ArrowUp"
                ? Math.min(inspectionIndex + 1, inspectionDates.length - 1)
                : event.key === "ArrowLeft" || event.key === "ArrowDown"
                  ? Math.max(0, inspectionIndex - 1)
                  : null;
        if (nextIndex !== null) {
          event.preventDefault();
          event.stopPropagation();
          inspectionIndex = nextIndex;
          showKeyboardInspection(this);
        } else if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          hideInspection();
        }
      })
      .on("mousemove", function (event: MouseEvent) {
        const [mouseX] = d3.pointer(event, this);
        const dateAtMouse = xScale.invert(mouseX);
        const nearestIndex = inspectionDates.reduce(
          (best, timestamp, index) =>
            Math.abs(timestamp - dateAtMouse.getTime()) <
            Math.abs(inspectionDates[best] - dateAtMouse.getTime())
              ? index
              : best,
          0,
        );
        showInspection(nearestIndex, event);
      })
      .on("mouseout", hideInspection);

    return () => {
      svg.interrupt();
      svg.selectAll("*").interrupt();
      tooltip.style("display", "none").attr("aria-hidden", "true");
    };
  }, [
    ariaLabel,
    compact,
    data,
    descriptionId,
    lineColors,
    mainColor,
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
        role="group"
        style={{ display: "block", height: "auto", maxWidth: "100%" }}
        viewBox={`0 0 ${safeWidth} ${safeHeight}`}
        width={safeWidth}
      />
      <div ref={tooltipRef} />
    </>
  );
};

export default LineGraph;
