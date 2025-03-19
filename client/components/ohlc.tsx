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

    const parseDate = d3.timeParse("%Y-%m-%d");
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

    // OHLC lines
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

    // open tick
    g.selectAll(".open")
      .data(data)
      .enter()
      .append("line")
      .attr("stroke", barColor)
      .attr("x1", d => xScale(d.date)!)
      .attr("x2", d => xScale(d.date)! + xScale.bandwidth() / 2)
      .attr("y1", d => yScale(d.open))
      .attr("y2", d => yScale(d.open));

    // close tick
    g.selectAll(".close")
      .data(data)
      .enter()
      .append("line")
      .attr("stroke", barColor)
      .attr("x1", d => xScale(d.date)! + xScale.bandwidth() / 2)
      .attr("x2", d => xScale(d.date)! + xScale.bandwidth())
      .attr("y1", d => yScale(d.close))
      .attr("y2", d => yScale(d.close));

    g.append('g')
      .attr('transform', `translate(0,${graphHeight})`)
      .call(d3.axisBottom(xScale));

    g.append('g')
      .call(d3.axisLeft(yScale));

  }, [data, width, height, barColor]);

  return <svg ref={svgRef}></svg>;
};

export default OHLCChart;
