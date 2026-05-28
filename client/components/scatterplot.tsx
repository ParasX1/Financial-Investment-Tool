import * as d3 from 'd3';
import React, { useState, useRef, useEffect } from 'react';

const CHART_BG = '#111';
const AXIS_COLOR = 'rgba(255,255,255,0.5)';
const GRID_COLOR = 'rgba(255,255,255,0.12)';
const TEXT_COLOR = 'rgba(255,255,255,0.65)';
const CHART_ANIMATION_MS = 500;

const positionTooltip = (
    event: MouseEvent,
    tooltip: d3.Selection<HTMLDivElement | null, unknown, null, undefined>,
    itemCount = 2
) => {
    const tooltipWidth = 170;
    const tooltipHeight = 36 + itemCount * 28;
    const gap = 12;
    const left = event.clientX + tooltipWidth + gap > window.innerWidth
        ? event.clientX - tooltipWidth - gap
        : event.clientX + gap;
    const top = event.clientY + tooltipHeight + gap > window.innerHeight
        ? event.clientY - tooltipHeight - gap
        : event.clientY + gap;

    tooltip
        .style('left', `${left}px`)
        .style('top', `${top}px`);
};

interface ScatterPlotProps {
    data: {risk: number; return: number; sharpe?: number }[];
    width?: number;
    height?: number;
    mainColor?: string;
}

const ScatterPlotGraph: React.FC<ScatterPlotProps> = ({
    data,
    width = 500,
    height = 300,
    mainColor = '#fc03d7',
}) => {

    const svgRef = useRef<SVGSVGElement | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    
    useEffect(() => {
    if (!data.length) return;

    // Set up margins and graph dimensions
    const t = 30;
    const r = 30;
    const b = 50;
    const l = 50;
    const graphWidth = width - l - r;
    const graphHeight = height - t - b;    
    
    const svg = d3
        .select(svgRef.current)
        .attr('width', width)
        .attr('height', height);
    
    svg.selectAll('*').remove();

    // Set background color
    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', CHART_BG);


    const g = svg.append('g').attr('transform', `translate(${l}, ${t})`);
    
    const minY = d3.min(data, d => d.return)!;
    const maxY = d3.max(data, d => d.return)!;
    const absY = Math.max(Math.abs(minY), Math.abs(maxY));

    // Create scales
    const xScale = d3
        .scaleLinear()
        .domain(d3.extent(data, d => d.risk) as [number, number])
        .nice()
        .range([0, graphWidth]);

    const yScale = d3
        .scaleLinear()
        .domain([-absY, absY])
        .nice()
        .range([graphHeight, 0]);

    const xGridLines = d3.axisBottom(xScale)
        .tickSize(-graphHeight)
        .tickFormat('' as any);
    g.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0, ${graphHeight})`)
        .call(xGridLines);

    const yGridLines = d3.axisLeft(yScale)
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

    const xAxis = g.append('g')
        .attr('transform', `translate(0, ${yScale(0)})`)
        .call(d3.axisBottom(xScale));
    const yAxis = g.append('g')
        .call(d3.axisLeft(yScale));

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
    xAxis.selectAll('text').attr('fill', TEXT_COLOR);
    yAxis.selectAll('text').attr('fill', TEXT_COLOR);

    g.append('text')
        .attr('x', graphWidth / 2)
        .attr('y', graphHeight + b - 10)
        .attr('text-anchor', 'middle')
        .attr('fill', TEXT_COLOR)
        .text('Risk');

    g.append('text')
        .attr('x', -graphHeight / 2)
        .attr('y', -l + 15)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .attr('fill', TEXT_COLOR)
        .text('Return');

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
    
    const handleMouseOver = (event: MouseEvent, d: {risk: number; return: number; sharpe?: number}) => {
        tooltip
            .style('display', 'block')
            .html(
                `<div>Portfolio Point</div><div style="color:${mainColor}; margin-top: 8px;">Risk: ${d.risk.toFixed(2)}</div><div style="color:${mainColor}; margin-top: 8px;">Return: ${d.return.toFixed(2)}</div><div style="color:${mainColor}; margin-top: 8px;">Sharpe: ${typeof d.sharpe === 'number' ? d.sharpe.toFixed(2) : 'N/A'}</div>`
            );
        positionTooltip(event, tooltip, 3);
    };

    const handleMouseMove = (event: MouseEvent) => {
        positionTooltip(event, tooltip, 3);
    };

    const handleMouseOut = () => {
        tooltip.style('display', 'none');
    };

    const sorted = [...data].sort((a, b) => a.risk - b.risk);
    const frontier: {risk: number; return: number; sharpe?: number }[] = [];
    let maxReturn = -Infinity;
    sorted.forEach(point => {
        if (point.return > maxReturn) {
            frontier.push(point);
            maxReturn = point.return;
        }
    });

    g.selectAll('circle')
        .data(data)
        .enter()
        .append('circle')
        .attr('cx', d => xScale(d.risk))
        .attr('cy', d => yScale(d.return))
        .attr('r', 0)
        .attr('fill', mainColor)
        .on('mouseover', handleMouseOver)
        .on('mousemove', handleMouseMove)
        .on('mouseout', handleMouseOut)
        .transition()
        .duration(CHART_ANIMATION_MS)
        .attr('r', 5)

        function invertColor(hex: string): string {
            if (hex.startsWith('#')) {
                hex = hex.slice(1);
            }

            if (hex.length === 3) {
                hex = hex.split('').map(c => c + c).join('');
            }

            const r = (255 - parseInt(hex.slice(0, 2), 16));
            const g = (255 - parseInt(hex.slice(2, 4), 16));
            const b = (255 - parseInt(hex.slice(4, 6), 16));
            return `rgb(${r},${g},${b})`;
        }

        g.selectAll('circle.frontier')
            .data(frontier)
            .enter()
            .append('circle')
            .attr('class', 'frontier')
            .attr('cx', d => xScale(d.risk))
            .attr('cy', d => yScale(d.return))
            .attr('r', 0)
            .attr('fill', invertColor(mainColor))
            .on('mouseover', handleMouseOver)
            .on('mousemove', handleMouseMove)
            .on('mouseout', handleMouseOut)
            .transition()
            .duration(CHART_ANIMATION_MS)
            .attr('r', 6)

        }, [data, width, height, mainColor]);

        return (
            <>
                <svg ref={svgRef}></svg>
                <div ref={tooltipRef}></div>
            </>
        );
    };

export default ScatterPlotGraph;
