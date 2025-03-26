import * as d3 from "d3";
import React, { useRef, useEffect } from 'react';

interface OHLCData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface OHLCChartProps {
  data: OHLCData[];
  width?: number;
  height?: number;
  barColor?: string;
}

const OHLCChart: React.FC<OHLCChartProps> = ({
  data,
  width = 500,
  height = 300,
  barColor = '#800080',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const margin = { top: 30, right: 30, bottom: 30, left: 50 };
    const graphWidth = width - margin.left - margin.right;
    const graphHeight = height - margin.top - margin.bottom;

    const xScale = d3.scaleBand()
      .domain(data.map(d => d.date))
      .range([0, graphWidth])
      .padding(0.3);

    const yScale = d3.scaleLinear()
      .domain([
        d3.min(data, d => d.low)!,
        d3.max(data, d => d.high)!
      ]).nice()
      .range([graphHeight, 0]);

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .html(''); // clear old content

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create tooltip div and style it
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "#f4f4f4")
      .style("padding", "5px")
      .style("border", "1px solid #d4d4d4")
      .style("border-radius", "5px")
      .style("pointer-events", "none")
      .style("opacity", 0);

    // Draw OHLC vertical line
    g.selectAll(".ohlc")
      .data(data)
      .enter()
      .append("line")
      .attr("stroke", barColor)
      .attr("stroke-width", 2)
      .attr("x1", d => xScale(d.date)! + xScale.bandwidth() / 2)
      .attr("x2", d => xScale(d.date)! + xScale.bandwidth() / 2)
      .attr("y1", d => yScale(d.low))
      .attr("y2", d => yScale(d.high));

    // Draw open tick
    g.selectAll(".open")
      .data(data)
      .enter()
      .append("line")
      .attr("stroke", barColor)
      .attr("x1", d => xScale(d.date)!)
      .attr("x2", d => xScale(d.date)! + xScale.bandwidth() / 2)
      .attr("y1", d => yScale(d.open))
      .attr("y2", d => yScale(d.open));

    // Draw close tick
    g.selectAll(".close")
      .data(data)
      .enter()
      .append("line")
      .attr("stroke", barColor)
      .attr("x1", d => xScale(d.date)! + xScale.bandwidth() / 2)
      .attr("x2", d => xScale(d.date)! + xScale.bandwidth())
      .attr("y1", d => yScale(d.close))
      .attr("y2", d => yScale(d.close));

    // Append x-axis
    g.append('g')
      .attr('transform', `translate(0,${graphHeight})`)
      .call(d3.axisBottom(xScale));

    // Append y-axis
    g.append('g')
      .call(d3.axisLeft(yScale));

    // Add invisible rects for hover interaction
    g.selectAll(".hover-rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "hover-rect")
      .attr("x", d => xScale(d.date)!)
      .attr("width", xScale.bandwidth())
      .attr("y", 0)
      .attr("height", graphHeight)
      .style("fill", "transparent")
      .on("mouseover", function(event, d) {
        tooltip.transition()
          .duration(200)
          .style("opacity", 0.9);
        tooltip.html(
          `<strong>Date:</strong> ${d.date}<br/>
           <strong>Open:</strong> ${d.open}<br/>
           <strong>High:</strong> ${d.high}<br/>
           <strong>Low:</strong> ${d.low}<br/>
           <strong>Close:</strong> ${d.close}`
        )
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mousemove", function(event) {
        tooltip.style("left", (event.pageX + 10) + "px")
               .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        tooltip.transition()
          .duration(500)
          .style("opacity", 0);
      });

    // Cleanup tooltip on component unmount or before next update
    return () => {
      tooltip.remove();
    };

  }, [data, width, height, barColor]);

  return <svg ref={svgRef}></svg>;
};

export default OHLCChart;