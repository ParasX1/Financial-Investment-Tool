import * as d3 from "d3"
import React, { useState, useRef, useEffect } from 'react';

const CHART_BG = '#111';
const AXIS_COLOR = 'rgba(255,255,255,0.5)';
const GRID_COLOR = 'rgba(255,255,255,0.12)';
const TEXT_COLOR = 'rgba(255,255,255,0.65)';

const positionTooltip = (
    event: MouseEvent,
    tooltip: d3.Selection<HTMLDivElement | null, unknown, null, undefined>,
    itemCount = 1
) => {
    const tooltipWidth = 150;
    const tooltipHeight = 36 + itemCount * 28;
    const gap = 12;
    const left = event.clientX + tooltipWidth + gap > window.innerWidth
        ? event.clientX - tooltipWidth - gap
        : event.clientX + gap;
    const top = event.clientY + tooltipHeight + gap > window.innerHeight
        ? event.clientY - tooltipHeight - gap
        : event.clientY + gap;

    tooltip
        .style("left", `${left}px`)
        .style("top", `${top}px`);
};

// inputs are data, width heigh and color (optional)
interface BarGraphProps {
        data: { label: string; value: number }[];
        width?: number;
        height?: number;
        barColor?: string;
        lineColors?: string[];
        compact?: boolean;
    }
  
    const BarGraph: React.FC<BarGraphProps> = ({
        data,
        width = 500,
        height = 300,
        barColor = '#fc03d7',
        lineColors = ['#FF0000', '#008000', '#0000FF'],
        compact = false
    }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const t = compact ? 8 : 30;
        const r = compact ? 18 : 30;
        const b = compact ? 34 : 58;
        const l = compact ? 42 : 50;
        const margin = {t,r,b,l};
        const graphWidth = width- l - r;
        const graphHeight = height -t -b;
        const yTickCount = compact
            ? Math.max(3, Math.min(6, Math.floor(graphHeight / 24)))
            : Math.max(4, Math.min(8, Math.floor(graphHeight / 30)));
        // scales 
        const xScale = d3.scaleBand().domain(data.map((d) => d.label))
            .range([0, graphWidth]).padding(0.2);
        
        const values = data.map((d) => d.value);
        const minValue = d3.min(values)!;
        const maxValue = d3.max(values)!;

        const yMin = Math.min(0, minValue - (maxValue - minValue) * 0.1);
        const yMax = Math.max(0, maxValue + (maxValue - minValue) * 0.1);

        const yScale = d3.scaleLinear()
            .domain([yMin, yMax])
            .range([graphHeight, 0])
            .nice();
  
        const svg = d3.select(svgRef.current)
        .attr('width', width)
        .attr('height', height);
        svg.selectAll('*').remove();

    // Set background color
    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', CHART_BG);

    // Add graph group
    const g = svg.append('g')
        .attr('transform', `translate(${l},${t})`);

    // Tool tip
    const tooltip = d3.select(tooltipRef.current)
        .style("position", "fixed")
        .style("background", "#1b1b20")
        .style("color", "#fff")
        .style("border", "1px solid rgba(255,255,255,0.14)")
        .style("border-radius", "8px")
        .style("padding", "10px")
        .style("display", "none")
        .style("pointer-events", "none");

    // Append bars with animation
    const bars = g.selectAll('.bar')
        .data(data);

    const zeroY = yScale(0);
    bars.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d) => xScale(d.label)!)
        .attr("y", zeroY) // Start from the bottom
        .attr("width", xScale.bandwidth())
        .attr("height", 0) // Start with height 0
        .attr("rx", Math.min(8, xScale.bandwidth() / 2))
        .attr("ry", Math.min(8, xScale.bandwidth() / 2))
        .attr("fill", (d, i) => i === 0 ? barColor : lineColors[(i-1) % lineColors.length])
        .on("mouseover", function (event: MouseEvent, d) {
            tooltip
            .style("display", "block")
            .html(`<div>${d.label}</div><div style="color:${d3.select(this).attr("fill")}; margin-top: 8px;">Value: ${d.value.toFixed(2)}</div>`);
            positionTooltip(event, tooltip);
        })
        .on("mousemove", (event: MouseEvent) => {
            positionTooltip(event, tooltip);
        })
        .on("mouseout", () => {
        tooltip.style("display", "none");
        })
        .transition() // Animate the bars
        .duration(800)
        .attr("y", (d) => d.value >= 0 ? yScale(d.value) : zeroY)
        .attr("height", (d) => Math.abs(yScale(d.value) - zeroY));

    const xGridLines = d3.axisBottom(xScale)
        .tickSize(-graphHeight)
        .tickFormat('' as any);
    g.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${graphHeight})`)
        .call(xGridLines);

    const yGridLines = d3.axisLeft(yScale)
        .ticks(yTickCount)
        .tickSize(-graphWidth)
        .tickFormat('' as any);
    g.append('g')
        .attr('class', 'grid')
        .call(yGridLines);

    g.selectAll('.grid .domain')
        .attr('stroke', 'none');
    g.selectAll('.grid line')
        .attr('stroke', GRID_COLOR)
        .attr('stroke-dasharray', '3 4')
        .attr('shape-rendering', 'crispEdges');

    // Append axes
    const xAxis = g.append('g')
        .attr('transform', `translate(0,${yScale(0)})`)
        .call(d3.axisBottom(xScale));
    const yAxis = g.append('g')
        .call(d3.axisLeft(yScale).ticks(yTickCount));

    xAxis.selectAll('.domain')
        .attr('stroke', AXIS_COLOR)
        .attr('stroke-dasharray', '3 4');
    yAxis.selectAll('.domain')
        .attr('stroke', AXIS_COLOR)
        .attr('stroke-dasharray', '3 4');
    xAxis.selectAll('.tick line')
        .attr('stroke', AXIS_COLOR)
        .attr('stroke-dasharray', '3 4');
    yAxis.selectAll('.tick line')
        .attr('stroke', AXIS_COLOR)
        .attr('stroke-dasharray', '3 4');
    xAxis.selectAll('text')
        .attr('fill', TEXT_COLOR)
        .attr('font-size', compact ? 13 : 16);
    yAxis.selectAll('text')
        .attr('fill', TEXT_COLOR)
        .attr('font-size', compact ? 11 : 12);

        
    }, [data, width, height, barColor, lineColors, compact]);
  
    return (
        <>
          <svg ref={svgRef}></svg>
          <div ref={tooltipRef}></div> {/* Tooltip container */}
        </>
      );
  };
  
  export default BarGraph;
