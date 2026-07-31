import {
  buildFrontierView,
  getPaddedDomain,
  PortfolioPoint,
} from "@/features/portfolio/lib/portfolioAnalytics";
import * as d3 from "d3";
import React, { useEffect, useId, useRef } from "react";

const CHART_BG = "#111";
const AXIS_COLOR = "rgba(255,255,255,0.5)";
const GRID_COLOR = "rgba(255,255,255,0.12)";
const TEXT_COLOR = "rgba(255,255,255,0.65)";
const MAX_DISPLAY_POINTS = 900;
const FRONTIER_COLOR = "#fbbf24";
const MAX_SHARPE_COLOR = "#4ade80";
const MIN_RISK_COLOR = "#60a5fa";
const AXIS_PERCENT_FORMAT = d3.format(".0%");
const TOOLTIP_PERCENT_FORMAT = d3.format(".2%");

const positionTooltip = (
  event: MouseEvent,
  tooltip: d3.Selection<HTMLDivElement | null, unknown, null, undefined>,
  itemCount = 2,
) => {
  const tooltipWidth = 170;
  const tooltipHeight = 36 + itemCount * 28;
  const gap = 12;
  const candidateLeft =
    event.clientX + tooltipWidth + gap > window.innerWidth
      ? event.clientX - tooltipWidth - gap
      : event.clientX + gap;
  const candidateTop =
    event.clientY + tooltipHeight + gap > window.innerHeight
      ? event.clientY - tooltipHeight - gap
      : event.clientY + gap;
  const clampToViewport = (
    candidate: number,
    size: number,
    viewportSize: number,
  ) => {
    const maximumWithGap = viewportSize - size - gap;
    if (maximumWithGap >= gap) {
      return Math.min(Math.max(candidate, gap), maximumWithGap);
    }
    return Math.min(Math.max(candidate, 0), Math.max(0, viewportSize - size));
  };
  const left = clampToViewport(candidateLeft, tooltipWidth, window.innerWidth);
  const top = clampToViewport(candidateTop, tooltipHeight, window.innerHeight);

  tooltip.style("left", `${left}px`).style("top", `${top}px`);
};

interface PortfolioFrontierChartProps {
  data: { risk: number; return: number; sharpe?: number; weights?: number[] }[];
  onPointSelect?: (point: {
    risk: number;
    return: number;
    sharpe?: number;
    weights?: number[];
  }) => void;
  width?: number;
  height?: number;
  mainColor?: string;
}

export const PortfolioFrontierChart: React.FC<PortfolioFrontierChartProps> = ({
  data,
  width = 500,
  height = 300,
  mainColor = "#65a0fd",
  onPointSelect,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const accessibilityId = useId().replace(/:/g, "");
  const titleId = `${accessibilityId}-portfolio-frontier-title`;
  const descriptionId = `${accessibilityId}-portfolio-frontier-description`;

  useEffect(() => {
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "img")
      .attr("aria-labelledby", `${titleId} ${descriptionId}`);

    svg.selectAll("*").remove();
    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", CHART_BG);

    const view = buildFrontierView(data, MAX_DISPLAY_POINTS);
    const finitePoints = view.displayPoints;
    svg
      .append("title")
      .attr("id", titleId)
      .text("Simulated portfolio opportunity set");
    const description = svg.append("desc").attr("id", descriptionId);

    if (finitePoints.length === 0) {
      description.text("No finite portfolio simulations are available.");
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", TEXT_COLOR)
        .attr("font-size", 12)
        .text("No portfolio data available");
      return;
    }

    const topMargin = Math.min(28, Math.max(18, height * 0.09));
    const rightMargin = Math.min(110, Math.max(24, width * 0.2));
    const bottomMargin = Math.min(52, Math.max(34, height * 0.17));
    const leftMargin = Math.min(62, Math.max(42, width * 0.12));
    const graphWidth = Math.max(1, width - leftMargin - rightMargin);
    const graphHeight = Math.max(1, height - topMargin - bottomMargin);
    const xDomain = getPaddedDomain(finitePoints.map((point) => point.risk));
    const yDomain = getPaddedDomain(finitePoints.map((point) => point.return));
    const maximumObservedReturn = d3.max(finitePoints, (point) => point.return);
    const allReturnsNegative =
      maximumObservedReturn !== undefined && maximumObservedReturn < 0;

    const minimumRiskDescription = view.minimumRisk
      ? `Lowest sampled risk is ${TOOLTIP_PERCENT_FORMAT(view.minimumRisk.risk)}.`
      : "";
    const maximumSharpeDescription = view.maximumSharpe
      ? `Best sampled Sharpe ratio is ${view.maximumSharpe.sharpe?.toFixed(2)}.`
      : "";
    description.text(
      `Risk is plotted on the horizontal axis and annualised return on the vertical axis. ` +
        `${finitePoints.length} of ${view.sourcePointCount} simulated portfolios are shown. ` +
        `${minimumRiskDescription} ${maximumSharpeDescription}` +
        (allReturnsNegative
          ? " All simulated portfolios have negative expected returns."
          : ""),
    );

    const chart = svg
      .append("g")
      .attr("transform", `translate(${leftMargin}, ${topMargin})`);
    const xScale = d3.scaleLinear().domain(xDomain).range([0, graphWidth]);
    const yScale = d3.scaleLinear().domain(yDomain).range([graphHeight, 0]);
    const xTickCount = Math.max(2, Math.floor(graphWidth / 90));
    const yTickCount = Math.max(2, Math.floor(graphHeight / 55));

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

    chart
      .append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0, ${graphHeight})`)
      .call(xGridLines);
    chart.append("g").attr("class", "grid").call(yGridLines);
    chart.selectAll(".grid .domain").attr("stroke", "none");
    chart
      .selectAll(".grid line")
      .attr("stroke", GRID_COLOR)
      .attr("stroke-dasharray", "3 4")
      .attr("shape-rendering", "crispEdges");

    const xAxis = chart
      .append("g")
      .attr("transform", `translate(0, ${graphHeight})`)
      .call(
        d3.axisBottom(xScale).ticks(xTickCount).tickFormat(AXIS_PERCENT_FORMAT),
      );
    const yAxis = chart
      .append("g")
      .call(
        d3.axisLeft(yScale).ticks(yTickCount).tickFormat(AXIS_PERCENT_FORMAT),
      );

    [xAxis, yAxis].forEach((axis) => {
      axis
        .selectAll(".domain, .tick line")
        .attr("stroke", AXIS_COLOR)
        .attr("stroke-dasharray", "3 4");
      axis.selectAll("text").attr("fill", TEXT_COLOR);
    });

    chart
      .append("text")
      .attr("x", graphWidth / 2)
      .attr("y", graphHeight + bottomMargin - 10)
      .attr("text-anchor", "middle")
      .attr("fill", TEXT_COLOR)
      .attr("font-size", 11)
      .text("Annualised risk");
    chart
      .append("text")
      .attr("x", -graphHeight / 2)
      .attr("y", -leftMargin + 14)
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("fill", TEXT_COLOR)
      .attr("font-size", 11)
      .text("Annualised return");

    const tooltip = d3
      .select(tooltipRef.current)
      .attr("role", "tooltip")
      .attr("aria-hidden", "true")
      .style("position", "fixed")
      .style("z-index", "1000")
      .style("background", "#1b1b20")
      .style("color", "#fff")
      .style("border", "1px solid rgba(255,255,255,0.14)")
      .style("border-radius", "8px")
      .style("padding", "10px")
      .style("display", "none")
      .style("pointer-events", "none");

    const showTooltip = (
      event: MouseEvent,
      point: PortfolioPoint,
      pointLabel = "Portfolio point",
    ) => {
      tooltip.selectAll("*").remove();
      tooltip.append("div").style("font-weight", "600").text(pointLabel);

      const rows = [
        ["Risk", TOOLTIP_PERCENT_FORMAT(point.risk)],
        ["Return", TOOLTIP_PERCENT_FORMAT(point.return)],
        [
          "Sharpe",
          typeof point.sharpe === "number" && Number.isFinite(point.sharpe)
            ? point.sharpe.toFixed(2)
            : "N/A",
        ],
      ];
      rows.forEach(([label, value]) => {
        const row = tooltip
          .append("div")
          .style("color", mainColor)
          .style("margin-top", "8px");
        row.append("span").text(`${label}: `);
        row.append("span").text(value);
      });

      tooltip.attr("aria-hidden", "false").style("display", "block");
      positionTooltip(event, tooltip, rows.length);
    };
    const moveTooltip = (event: MouseEvent) => {
      positionTooltip(event, tooltip, 3);
    };
    const hideTooltip = () => {
      tooltip.attr("aria-hidden", "true").style("display", "none");
    };

    const frontierLine = d3
      .line<PortfolioPoint>()
      .x((point) => xScale(point.risk))
      .y((point) => yScale(point.return))
      .curve(d3.curveMonotoneX);
    chart
      .append("path")
      .datum(view.frontier)
      .attr("class", "efficient-frontier")
      .attr("d", frontierLine)
      .attr("fill", "none")
      .attr("stroke", FRONTIER_COLOR)
      .attr("stroke-width", 2)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("opacity", 0.9);

    chart
      .selectAll<SVGCircleElement, PortfolioPoint>("circle.portfolio-point")
      .data(finitePoints)
      .enter()
      .append("circle")
      .attr("class", "portfolio-point")
      .attr("cx", (point) => xScale(point.risk))
      .attr("cy", (point) => yScale(point.return))
      .attr("r", 1.7)
      .attr("fill", mainColor)
      .attr("fill-opacity", finitePoints.length > 350 ? 0.2 : 0.34)
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr(
        "aria-label",
        (point) =>
          `Portfolio: risk ${TOOLTIP_PERCENT_FORMAT(point.risk)}, return ${TOOLTIP_PERCENT_FORMAT(point.return)}`,
      )
      .on("click", (_event, point) => onPointSelect?.(point))
      .on("keydown", (event: KeyboardEvent, point) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onPointSelect?.(point);
      })
      .on("mouseover", (event, point) => showTooltip(event, point))
      .on("mousemove", moveTooltip)
      .on("mouseout", hideTooltip);

    const appendHighlight = (
      point: PortfolioPoint | null,
      label: string,
      color: string,
      labelOffset: number,
    ) => {
      if (!point) return;

      const pointX = xScale(point.risk);
      const pointY = yScale(point.return);
      const labelOnLeft = pointX > graphWidth - 105;
      chart
        .append("circle")
        .datum(point)
        .attr("cx", pointX)
        .attr("cy", pointY)
        .attr("r", 5)
        .attr("fill", CHART_BG)
        .attr("stroke", color)
        .attr("stroke-width", 2.4)
        .attr("pointer-events", "none");
      chart
        .append("text")
        .attr("x", pointX + (labelOnLeft ? -8 : 8))
        .attr("y", pointY + labelOffset)
        .attr("text-anchor", labelOnLeft ? "end" : "start")
        .attr("fill", color)
        .attr("font-size", 10)
        .attr("font-weight", 700)
        .attr("paint-order", "stroke")
        .attr("stroke", CHART_BG)
        .attr("stroke-width", 3)
        .attr("pointer-events", "none")
        .text(label);
    };

    appendHighlight(
      view.maximumSharpe,
      `Best sampled Sharpe ${view.maximumSharpe?.sharpe?.toFixed(2) ?? "N/A"}`,
      MAX_SHARPE_COLOR,
      -8,
    );
    appendHighlight(
      view.minimumRisk,
      `Lowest sampled risk ${TOOLTIP_PERCENT_FORMAT(view.minimumRisk?.risk ?? 0)}`,
      MIN_RISK_COLOR,
      14,
    );

    if (allReturnsNegative) {
      const calloutWidth = Math.min(265, Math.max(120, graphWidth - 12));
      const callout = chart.append("g").attr("transform", "translate(6, 6)");
      callout
        .append("rect")
        .attr("width", calloutWidth)
        .attr("height", 26)
        .attr("rx", 6)
        .attr("fill", "rgba(127,29,29,0.92)")
        .attr("stroke", "rgba(248,113,113,0.65)");
      callout
        .append("text")
        .attr("x", 10)
        .attr("y", 17)
        .attr("fill", "#fecaca")
        .attr("font-size", 10)
        .attr("font-weight", 600)
        .text("All simulated returns are negative for this period.");
    }

    return () => {
      tooltip.attr("aria-hidden", "true").style("display", "none");
    };
  }, [data, width, height, mainColor, onPointSelect, titleId, descriptionId]);

  return (
    <>
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef}></div>
    </>
  );
};
