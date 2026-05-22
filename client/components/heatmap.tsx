import * as d3 from "d3"
import React, { useRef, useEffect } from 'react';

const CHART_BG = '#111';
const AXIS_COLOR = 'rgba(255,255,255,0.5)';
const TEXT_COLOR = 'rgba(255,255,255,0.65)';

const positionTooltip = (
    event: MouseEvent,
    tooltip: d3.Selection<HTMLDivElement | null, unknown, null, undefined>,
) => {
    const tooltipWidth = 160;
    const tooltipHeight = 92;
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
                .attr('fill', CHART_BG);

            // Add graph group
            const g = svg.append('g')
                .attr('transform', `translate(${l},${t})`);

            const tooltip = d3.select(tooltipRef.current)
                .style('position', 'fixed')
                .style('background', '#1b1b20')
                .style('color', '#fff')
                .style('border', '1px solid rgba(255,255,255,0.14)')
                .style('border-radius', '8px')
                .style('padding', '10px')
                .style('display', 'none')
                .style('pointer-events', 'none');
            
            // Define color scale
            const colorScale = d3.scaleLinear<string>()
                .domain([-1, 0, 1])
                .range([invertColor(barColor || '#c00000ff'), '#1b1b20', barColor || '#004e00ff']);

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
                .on("mouseover", (event: MouseEvent, d) => {
                    const rowLabel = labels[d.row] ?? d.row.toString();
                    const colLabel = labels[d.col] ?? d.col.toString();
                    tooltip
                        .style('display', 'block')
                        .html(
                            `<div>${rowLabel} / ${colLabel}</div><div style="color:${TEXT_COLOR}; margin-top: 8px;">Correlation: ${d.value.toFixed(2)}</div>`
                        );
                    positionTooltip(event, tooltip);
                })
                .on("mousemove", (event: MouseEvent) => {
                    positionTooltip(event, tooltip);
                })
                .on("mouseout", () => {
                    tooltip.style('display', 'none');
                })
            
            g.selectAll("text.cell-label")
                .data(data.flatMap((row, i) => row.map((value, j) => ({row: i, col: j, value }))))
                .enter()
                .append("text")
                .attr("x", d => d.col * cellWidth + cellWidth / 2)
                .attr("y", d => d.row * cellHeight + cellHeight / 2)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .style("font-size", Math.min(cellWidth, cellHeight) / 5)
                .attr("fill", d => Math.abs(d.value) > 0.35 ? "#fff" : TEXT_COLOR)
                .text(d => d.value.toFixed(2));
                
            const xAxis = d3.axisTop(d3.scaleBand()
                .domain(labels.length ? labels : data[0].map((_, i) => i.toString()))
                .range([0, graphWidth]));

            const yAxis = d3.axisLeft(d3.scaleBand()
                .domain(labels.length ? labels : data.map((_, i) => i.toString()))
                .range([0, graphHeight]));

            const xAxisGroup = g.append("g").call(xAxis);

            const yAxisGroup = g.append("g").call(yAxis);

            g.selectAll('.domain, .tick line')
                .attr('stroke', AXIS_COLOR)
                .attr('stroke-dasharray', '3 4');
            xAxisGroup.selectAll('text').attr('fill', TEXT_COLOR);
            yAxisGroup.selectAll('text').attr('fill', TEXT_COLOR);
    }, [data, labels, width, height, barColor]);
  
    return (
        <>
          <svg ref={svgRef}></svg>
          <div ref={tooltipRef}></div>
        </>
      );
  };
  
  export default HeatMap;
