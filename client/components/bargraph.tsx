import * as d3 from "d3"
import React, { useState, useRef, useEffect } from 'react';

// inputs are data, width heigh and color (optional)
interface BarGraphProps {
        data: { label: string; value: number }[];
        width?: number;
        height?: number;
        barColor?: string;
    }
  
    const BarGraph: React.FC<BarGraphProps> = ({
        data,
        width = 500,
        height = 300,
        barColor = '#800080',
    }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const t = 30;
        const r = 30;
        const b = 30;
        const l = 30;
        const margin = {t,r,b,l};
        const graphWidth = width- l - r;
        const graphHeight = height -t -b;
        // scales 
        const xScale = d3.scaleBand().domain(data.map((d) => d.label))
            .range([0, graphWidth]).padding(0.2);
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, (d) => d.value)!]).nice()
            .range([graphHeight, 0]);
  
        const svg = d3.select(svgRef.current)
        .attr('width', width)
        .attr('height', height);

    // Set background color
    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', '#FFFFFF');

    // Add graph group
    const g = svg.append('g')
        .attr('transform', `translate(${l},${t})`);

    // Tool tip
    const tooltip = d3.select(tooltipRef.current)
        .style("position", "absolute")
        .style("background", "#fff")
        .style("padding", "5px")
        .style("display", "none")
        .style("pointer-events", "none");

    // Append bars with animation
    const bars = g.selectAll('.bar')
        .data(data);

    bars.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d) => xScale(d.label)!)
        .attr("y", graphHeight) // Start from the bottom
        .attr("width", xScale.bandwidth())
        .attr("height", 0) // Start with height 0
        .attr("fill", barColor)
        .on("mouseover", function (event, d) {
            tooltip
            .style("display", "block")
            .html(`Label: ${d.label}<br>Value: ${d.value}`);
        })
        .on("mousemove", (event) => {
        tooltip
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => {
        tooltip.style("display", "none");
        })
        .transition() // Animate the bars
        .duration(800)
        .attr("y", (d) => yScale(d.value))
        .attr("height", (d) => graphHeight - yScale(d.value));

    // Append axes
    g.append('g')
        .attr('transform', `translate(0,${graphHeight})`)
        .call(d3.axisBottom(xScale));
    g.append('g')
        .call(d3.axisLeft(yScale));


        
    }, [data, width, height, barColor]);
  
    return (
        <>
          <svg ref={svgRef}></svg>
          <div ref={tooltipRef}></div> {/* Tooltip container */}
        </>
      );
  };
  
  export default BarGraph;