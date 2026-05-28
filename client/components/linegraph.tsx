import * as d3 from 'd3';
import React, { useState, useRef, useEffect } from 'react';
import { STOCK_SERIES_COLORS, getChartSeriesColor } from './chartColors';

const CHART_BG = '#111';
const AXIS_COLOR = 'rgba(255,255,255,0.5)';
const GRID_COLOR = 'rgba(255,255,255,0.12)';
const TEXT_COLOR = 'rgba(255,255,255,0.65)';
const HOVER_LINE_COLOR = 'rgba(255,255,255,0.32)';
const LEGEND_MARKER_WIDTH = 18;
const LEGEND_TEXT_GAP = 6;
const LEGEND_ITEM_GAP = 24;
const CHART_ANIMATION_MS = 700;

interface LineGraphProps {
    data: {ticker: string; values: { date: Date; value: number }[]}[];
    width?: number;
    height?: number;
    mainColor?: string;
    lineColors?: string[];
    compact?: boolean;
}

    const LineGraph: React.FC<LineGraphProps> = ({
    data,
    width = 500,
    height = 300,
    mainColor,
    lineColors = STOCK_SERIES_COLORS,
    compact = false,
    }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
    if (!data.length) return;

    // Set up margins and graph dimensions
    const t = compact ? 8 : 30;
    const r = compact ? 18 : 30;
    const b = compact ? 44 : 58;
    const l = compact ? 42 : 50;
    const margin = { t, r, b, l };
    const graphWidth = width - l - r;
    const graphHeight = height - t - b;
    const yTickCount = compact
        ? Math.max(3, Math.min(6, Math.floor(graphHeight / 24)))
        : Math.max(4, Math.min(8, Math.floor(graphHeight / 30)));

    const allValues = data.flatMap(d => d.values);

    // Create scales for x (time) and y (values)
    const xScale = d3
        .scaleTime()
        .domain(d3.extent(allValues, (d) => d.date) as [Date, Date])
        .range([0, graphWidth]);

    const yExtent = d3.extent(allValues, (d) => d.value) as [number, number];
    const yScale = d3
        .scaleLinear()
        .domain(yExtent)
        .range([graphHeight, 0]);

    // Create line generator function
    const line = d3
        .line<{ date: Date; value: number }>()
        .defined(d => d.value !== null)
        .x((d) => xScale(d.date))
        .y((d) => yScale(d.value))
        .curve(d3.curveMonotoneX)

    const svg = d3.select(svgRef.current).attr('width', width).attr('height', height);
    const colorPalette = lineColors.length >= data.length ? lineColors : STOCK_SERIES_COLORS;
    const getSeriesColor = (index: number) => mainColor && data.length === 1
        ? mainColor
        : getChartSeriesColor(index, colorPalette);

    // Clear previous elements
    svg.selectAll('*').remove();

    // Add background
    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', CHART_BG);

    // Add graph group with margins
    const g = svg.append('g').attr('transform', `translate(${l},${t})`);

    // Append line paths for each series
    data.forEach((series, i) => {
        const lineColor = getSeriesColor(i);
        const path = g.append('path')
            .datum(series.values)
            .attr('fill', 'none')
            .attr('stroke', lineColor)
            .attr('stroke-width', 2)
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round')
            .attr('d', line);

        const totalLength = path.node()?.getTotalLength() ?? 0;
        path
            .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
            .attr('stroke-dashoffset', totalLength)
            .transition()
            .duration(CHART_ANIMATION_MS)
            .attr('stroke-dashoffset', 0);
    });

    const legendMarkerWidth = compact ? 12 : LEGEND_MARKER_WIDTH;
    const legendTextGap = compact ? 4 : LEGEND_TEXT_GAP;
    const legendItemGap = compact ? 12 : LEGEND_ITEM_GAP;
    const legendFontSize = compact ? 11 : 16;
    const legendData = data.map((series, i) => ({
        ticker: series.ticker,
        color: getSeriesColor(i),
        width: legendMarkerWidth + legendTextGap + series.ticker.length * (compact ? 7 : 9),
    }));
    const totalLegendWidth = legendData.reduce((sum, item) => sum + item.width, 0) +
        Math.max(0, legendData.length - 1) * legendItemGap;

    const legend = g.append('g')
        .attr('class', 'line-legend')
        .attr('transform', `translate(${Math.max(0, (graphWidth - totalLegendWidth) / 2)},${graphHeight + (compact ? 30 : 38)})`);

    const legendItems = legend.selectAll('g')
        .data(legendData)
        .enter()
        .append('g')
        .attr('transform', (_, i) => {
            const x = legendData
                .slice(0, i)
                .reduce((sum, item) => sum + item.width + legendItemGap, 0);
            return `translate(${x},0)`;
        });

    legendItems.append('line')
        .attr('x1', 0)
        .attr('x2', legendMarkerWidth)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', d => d.color)
        .attr('stroke-width', 2)
        .attr('stroke-linecap', 'round');

    legendItems.append('circle')
        .attr('cx', legendMarkerWidth / 2)
        .attr('cy', 0)
        .attr('r', compact ? 2.5 : 3)
        .attr('fill', CHART_BG)
        .attr('stroke', d => d.color)
        .attr('stroke-width', 1.5);

    legendItems.append('text')
        .attr('x', legendMarkerWidth + legendTextGap)
        .attr('y', compact ? 3 : 4)
        .attr('fill', d => d.color)
        .attr('font-size', legendFontSize)
        .text(d => d.ticker);

    const xGridLines = d3.axisBottom(xScale)
        .ticks(5)
        .tickSize(-graphHeight)
        .tickFormat('' as any);

    g.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${graphHeight})`)
        .call(xGridLines);

    const gridLines = d3.axisLeft(yScale)
        .ticks(yTickCount)
        .tickSize(-graphWidth)
        .tickFormat('' as any);

    g.append('g')
        .attr('class', 'grid')
        .call(gridLines);

    g.selectAll('.grid .domain')
        .attr('stroke', 'none');
    g.selectAll('.grid line')
        .attr('stroke', GRID_COLOR)
        .attr('stroke-dasharray', '3 4')
        .attr('shape-rendering', 'crispEdges');

    // Add X Axis (bottom)
    const xAxis = g.append('g')
        .attr('transform', `translate(0,${graphHeight})`)
        .call(d3.axisBottom(xScale).ticks(5));

    // Add Y Axis (left)
    const yAxis = g.append('g').call(d3.axisLeft(yScale).ticks(yTickCount));

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
        .attr('font-size', compact ? 11 : 12);
    yAxis.selectAll('text')
        .attr('fill', TEXT_COLOR)
        .attr('font-size', compact ? 11 : 12);
        
        
    // Tooltip setup
    const tooltip = d3.select(tooltipRef.current)
        .style('position', 'fixed')
        .style('background', '#1b1b20')
        .style('color', '#fff')
        .style('border', '1px solid rgba(255,255,255,0.14)')
        .style('border-radius', '8px')
        .style('padding', '10px')
        .style('display', 'none')
        .style('pointer-events', 'none');

    const hoverLayer = g.append('g')
        .attr('class', 'hover-layer')
        .style('display', 'none');

    const hoverLine = hoverLayer.append('line')
        .attr('y1', 0)
        .attr('y2', graphHeight)
        .attr('stroke', HOVER_LINE_COLOR)
        .attr('stroke-width', 1);

    const hoverDots = hoverLayer.append('g')
        .attr('class', 'hover-dots');

    const formatDate = d3.timeFormat('%Y-%m-%d');

    // Create an overlay for capturing mouse events
    svg.append('rect')
        .attr('width', graphWidth)
        .attr('height', graphHeight)
        .attr('transform', `translate(${l},${t})`)
        .attr('fill', 'none')
        .attr('pointer-events', 'all')
        .on('mousemove', (event) => {
        const [mouseX] = d3.pointer(event);
        const dateAtMouse = xScale.invert(mouseX); // Get the date based on mouse position

        const allPoints = data.flatMap((series, i) =>
            series.values
                .filter(d => d.value !== null)
                .map(d => ({
                    ...d,
                    ticker: series.ticker,
                    color: getSeriesColor(i),
                }))
        );

        if (!allPoints.length) {
            return;
        }

        const anchorPoint = allPoints.reduce((a, b) =>
            Math.abs(+a.date - +dateAtMouse) < Math.abs(+b.date - +dateAtMouse) ? a : b
        );

        const seriesClosest = data
            .map((series, i) => {
                const validValues = series.values.filter(d => d.value !== null);
                if (!validValues.length) {
                    return null;
                }

                const closest = validValues.reduce((a, b) =>
                    Math.abs(+a.date - +anchorPoint.date) < Math.abs(+b.date - +anchorPoint.date) ? a : b
                );
                const color = getSeriesColor(i);
                return { ...closest, ticker: series.ticker, color };
            })
            .filter(Boolean) as Array<{ date: Date; value: number; ticker: string; color: string }>;

        const pointX = xScale(anchorPoint.date);

        hoverLayer.style('display', null);
        hoverLine
            .attr('x1', pointX)
            .attr('x2', pointX);

        const dots = hoverDots
            .selectAll<SVGCircleElement, { date: Date; value: number; ticker: string; color: string }>('circle')
            .data(seriesClosest, d => d.ticker);

        dots.enter()
            .append('circle')
            .attr('r', 4)
            .attr('fill', CHART_BG)
            .attr('stroke-width', 2)
            .merge(dots)
            .attr('cx', d => xScale(d.date))
            .attr('cy', d => yScale(d.value))
            .attr('stroke', d => d.color);

        dots.exit().remove();

        const tooltipHtml = [
            `<div>${formatDate(anchorPoint.date)}</div>`,
            ...seriesClosest.map(point =>
                `<div style="color:${point.color}; margin-top: 8px;">${point.ticker}: ${point.value.toFixed(2)}</div>`
            )
        ].join('');

        const tooltipWidth = 150;
        const tooltipHeight = 36 + seriesClosest.length * 28;
        const gap = 12;
        const pointerX = event.clientX;
        const pointerY = event.clientY;
        const left = pointerX + tooltipWidth + gap > window.innerWidth
            ? pointerX - tooltipWidth - gap
            : pointerX + gap;
        const top = pointerY + tooltipHeight + gap > window.innerHeight
            ? pointerY - tooltipHeight - gap
            : pointerY + gap;

        tooltip
            .style('display', 'block')
            .style('left', `${left}px`)
            .style('top', `${top}px`)
            .html(tooltipHtml);
        })
        .on('mouseout', () => {
        hoverLayer.style('display', 'none');
        tooltip.style('display', 'none');
        });

    }, [data, width, height, mainColor, lineColors, compact]);

    return (
    <>
        <svg ref={svgRef}></svg>
        <div ref={tooltipRef}></div>
    </>
    );
};
    

export default LineGraph;
