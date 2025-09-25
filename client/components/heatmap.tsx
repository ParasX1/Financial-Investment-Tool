import * as d3 from "d3"
import React, { useRef, useEffect } from 'react';

// inputs are data, width heigh and color (optional)
interface HeatMapProps {
    data: number[][];
    labels: string[];
    width?: number;
    height?: number;
    barColor?: string;
}

    const HeatMap: React.FC<HeatMapProps> = ({
        data,
        labels = [],
        width = 500,
        height = 500,
        barColor,
    }) => {
        const svgRef = useRef<SVGSVGElement | null>(null);
        const tooltipRef = useRef<HTMLDivElement | null>(null);

        useEffect(() => {
            if (!data.length) return;

            const t = 50;
            const r = 30;
            const b = 30;
            const l = 50;
            const graphWidth = width- l - r;
            const graphHeight = height -t -b;

            const numRows = data.length;
            const numCols = data[0].length;

            const cellWidth = graphWidth / numCols;
            const cellHeight = graphHeight / numRows;

            const svg = d3.select(svgRef.current)
                .attr('width', width)
                .attr('height', height);
            svg.selectAll("*").remove();

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
            
            // Define color scale
            const colorScale = d3.scaleLinear<string>()
                .domain([-1, 0, 1])
                .range([invertColor(barColor || '#7a0404ff'), "#FFFFFF", barColor || '#004f00ff']);

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

            g.selectAll("rect.cell")
                .data(data.flatMap((row, i) => row.map((value, j) => ({row: i, col: j, value }))))
                .enter()
                .append("rect")
                .attr("class", "cell")
                .attr("x", d => d.col * cellWidth)
                .attr("y", d => d.row * cellHeight)
                .attr("width", cellWidth)
                .attr("height", cellHeight)
                .attr("fill", (d) => colorScale(d.value))
                .on("mouseover", (event, d) => {
                    tooltip
                        .style("display", "block")
                        .html(`Row: ${labels[d.row] || d.row}<br>Col: ${labels[d.col] || d.col}<br>Value: ${d.value.toFixed(2)}`);
                })
                .on("mousemove", (event) => {
                    tooltip
                        .style("left", `${event.pageX - 100}px`)
                        .style("top", `${event.pageY - 28}px`);
                })
                .on("mouseout", () => {
                    tooltip.style("display", "none");
                });
                
            const xAxis = d3.axisTop(d3.scaleBand()
                .domain(labels.length ? labels : data[0].map((_, i) => i.toString()))
                .range([0, graphWidth]));

            const yAxis = d3.axisLeft(d3.scaleBand()
                .domain(labels.length ? labels : data.map((_, i) => i.toString()))
                .range([0, graphHeight]));

            g.append("g").call(xAxis);

            g.append("g").call(yAxis);
    }, [data, labels, width, height]);
  
    return (
        <>
          <svg ref={svgRef}></svg>
          <div ref={tooltipRef}></div> {/* Tooltip container */}
        </>
      );
  };
  
  export default HeatMap;