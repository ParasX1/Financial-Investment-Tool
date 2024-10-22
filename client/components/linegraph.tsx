import * as d3 from 'd3';
import React, { useState, useRef, useEffect } from 'react';

interface LineGraphProps {
    data: { date: Date; value: number }[];
    width?: number;
    height?: number;
    lineColor?: string;
}

    const LineGraph: React.FC<LineGraphProps> = ({
    data,
    width = 500,
    height = 300,
    lineColor = '#800080',
    }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
    if (!data.length) return;

    // Set up margins and graph dimensions
    const t = 30;
    const r = 30;
    const b = 30;
    const l = 50;
    const margin = { t, r, b, l };
    const graphWidth = width - l - r;
    const graphHeight = height - t - b;

    // Create scales for x (time) and y (values)
    const xScale = d3
        .scaleTime()
        .domain(d3.extent(data, (d) => d.date) as [Date, Date])
        .range([0, graphWidth]);

    const yScale = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.value)!])
        .range([graphHeight, 0]);

    // Create line generator function
    const line = d3
        .line<{ date: Date; value: number }>()
        .x((d) => xScale(d.date))
        .y((d) => yScale(d.value))

    const svg = d3.select(svgRef.current).attr('width', width).attr('height', height);

    // Clear previous elements
    svg.selectAll('*').remove();

    // Add background
    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', '#FFFFFF');

    // Add graph group with margins
    const g = svg.append('g').attr('transform', `translate(${l},${t})`);

    // Append line path
    g.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', lineColor)
        .attr('stroke-width', 2)
        .attr('d', line);

    // Add X Axis (bottom)
    g.append('g')
        .attr('transform', `translate(0,${graphHeight})`)
        .call(d3.axisBottom(xScale).ticks(5));

    // Add Y Axis (left)
    g.append('g').call(d3.axisLeft(yScale));

    // Optional: add grid lines for better visualization
    const gridLines = d3.axisLeft(yScale)
        .tickSize(-graphWidth)
        .tickFormat('' as any);

    g.append('g')
        .attr('class', 'grid')
        .call(gridLines)
        .selectAll('line')
        
        
    // Tooltip setup
    const tooltip = d3.select(tooltipRef.current)
        .style('position', 'absolute')
        .style('background', '#fff')
        .style('padding', '5px')
        .style('display', 'none')
        .style('pointer-events', 'none');

    // Create an overlay for capturing mouse events
    svg.append('rect')
        .attr('width', graphWidth)
        .attr('height', graphHeight)
        .attr('transform', `translate(${l},${t})`)
        .attr('fill', 'none')
        .attr('pointer-events', 'all')
        .on('mousemove', (event) => {
        const [mouseX] = d3.pointer(event);
        const dateAtMouse = xScale.invert(mouseX - l); // Get the date based on mouse position

        // Find the closest data point to the mouse position
        const closestPoint = data.reduce((a, b) =>
            Math.abs(+a.date - +dateAtMouse) < Math.abs(+b.date - +dateAtMouse) ? a : b
        );

        tooltip
            .style('display', 'block')
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 28}px`)
            .html(
            `Date: ${closestPoint.date.toDateString()}<br>Value: ${closestPoint.value}`
            );
        })
        .on('mouseout', () => {
        tooltip.style('display', 'none');
        });

    }, [data, width, height, lineColor]);

    return (
    <>
        <svg ref={svgRef}></svg>
        <div ref={tooltipRef}></div>
    </>
    );
};
    

export default LineGraph;
