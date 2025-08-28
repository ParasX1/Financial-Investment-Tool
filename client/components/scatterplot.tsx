import * as d3 from 'd3';
import React, { useState, useRef, useEffect } from 'react';

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
        .attr('fill', '#FFFFFF');


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

    g.append('g')
        .attr('transform', `translate(0, ${yScale(0)})`)
        .call(d3.axisBottom(xScale));
    g.append('g')
        .call(d3.axisLeft(yScale));

    g.append('text')
        .attr('x', graphWidth / 2)
        .attr('y', graphHeight + b - 10)
        .attr('text-anchor', 'middle')
        .text('Risk');

    g.append('text')
        .attr('x', -graphHeight / 2)
        .attr('y', -l + 15)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .text('Return');

    // Tooltip setup
    const tooltip = d3.select(tooltipRef.current)
        .style('position', 'absolute')
        .style('background', '#fff')
        .style('padding', '5px')
        .style('display', 'none')
        .style('pointer-events', 'none');
       

    g.selectAll('circle')
        .data(data)
        .enter()
        .append('circle')
        .attr('cx', d => xScale(d.risk))
        .attr('cy', d => yScale(d.return))
        .attr('r', 5)
        .attr('fill', mainColor)
        .on('mouseover', (event, d) => {
            tooltip
                .style('display', 'block')
                .html(`Risk: ${d.risk}<br>Return: ${d.return}<br>Sharpe: ${d.sharpe || 'N/A'}`);
        })
        .on('mousemove', (event) => {
            tooltip
                .style('left', `${event.pageX + 10}px`)
                .style('top', `${event.pageY - 28}px`);
        })
        .on('mouseout', () => {
            tooltip.style('display', 'none');
        });
        }, [data, width, height, mainColor]);

        return (
            <>
                <svg ref={svgRef}></svg>
                <div ref={tooltipRef}></div>
            </>
        );
    };

export default ScatterPlotGraph;