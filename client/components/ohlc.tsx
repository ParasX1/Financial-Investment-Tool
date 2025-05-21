import * as d3 from "d3";
import React, { useRef, useEffect } from 'react';



export interface OHLCData {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
}

interface Series {
    name: string;
    values: OHLCData[];
    color: string;
}
  
interface OHLCChartProps {
    series: Series[];
    width?: number;
    height?: number;
    backgroundColor?: string;
    showGridLines?: boolean;
}

const OHLCChart: React.FC<OHLCChartProps> = ({
  series,
  width = 500,
  height = 300,
  backgroundColor = 'black',
  showGridLines = false,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const margin = { top: 30, right: 30, bottom: 50, left: 50 };
    const graphWidth = width - margin.left - margin.right;
    const graphHeight = height - margin.top - margin.bottom;

    const allDates = Array.from(
       new Set(series.flatMap(s => s.values.map(d => d.date)))
    ).sort();

    const parseDate = d3.timeParse("%Y-%m-%d");
    const formattedSeries = series.map(s => ({
            ...s,
           formatted: s.values.map(d => ({
              ...d,
             parsedDate: parseDate(d.date) as Date,
            }))
          }));

    const xScale = d3.scaleBand()
      .domain(allDates)
      .range([0, graphWidth])
      .padding(0.3);

    const lows = formattedSeries.flatMap(s => s.formatted.map(d => d.low));
      const highs = formattedSeries.flatMap(s => s.formatted.map(d => d.high));
      const yScale = d3.scaleLinear()
      .domain([d3.min(lows)!, d3.max(highs)!])
      .nice()
      .range([graphHeight, 0]);

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('background-color', backgroundColor)
      .html(''); // clear previous content

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "ohlc-tooltip")
      .style("position", "absolute")
      .style("padding", "8px")
      .style("background", "#333")
      .style("color", "#fff")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0);

    // Grid lines
    if (showGridLines) {
      g.append('g')
        .attr("class", "grid")
        .call(d3.axisLeft(yScale).tickSize(-graphWidth).tickFormat(() => ''))
        .selectAll("line")
        .attr("stroke", "#444")
        .attr("stroke-opacity", 0.2); 

      g.append('g')
        .attr("class", "grid")
        .attr('transform', `translate(0,${graphHeight})`)
        .call(d3.axisBottom(xScale)
        .tickValues(allDates.filter((_, i) => i % Math.ceil(allDates.length/10) === 0))
        .tickSize(-graphHeight)
          .tickFormat(() => ''))
        .selectAll("line")
        .attr("stroke", "#444")
        .attr("stroke-opacity", 0.2);
    }

    // draw each series’ candlesticks
    formattedSeries.forEach((s, i) => {
      const color = s.color;

      // high-low stems
      g.selectAll(`.stem-${i}`)
        .data(s.formatted)
        .enter().append("line")
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("x1", d => xScale(d.date)! + xScale.bandwidth() / 2)
        .attr("x2", d => xScale(d.date)! + xScale.bandwidth() / 2)
        .attr("y1", d => yScale(d.low))
        .attr("y2", d => yScale(d.high));

    // Open ticks
      g.selectAll(`.open-${i}`)
        .data(s.formatted)
        .enter().append("line")
        .attr("stroke", color)
        .attr("x1", d => xScale(d.date)!)
        .attr("x2", d => xScale(d.date)! + xScale.bandwidth() / 2)
        .attr("y1", d => yScale(d.open))
        .attr("y2", d => yScale(d.open));

    // Close ticks
      g.selectAll(`.close-${i}`)
        .data(s.formatted)
        .enter().append("line")
        .attr("stroke", color)
        .attr("x1", d => xScale(d.date)! + xScale.bandwidth() / 2)
        .attr("x2", d => xScale(d.date)! + xScale.bandwidth())
        .attr("y1", d => yScale(d.close))
        .attr("y2", d => yScale(d.close));
    });

    // Invisible bars for tooltip
    formattedSeries[0].formatted.forEach((_, idx) => {
      g.selectAll(`.hover-rect-${idx}`)
        .data([formattedSeries[0].formatted[idx]])
        .enter().append("rect")
        .attr("x", d => xScale(d.date)!)
        .attr("width", xScale.bandwidth())
        .attr("y", 0)
        .attr("height", graphHeight)
        .attr("fill", "transparent")
        .on("mouseover", function (event, d) {
          tooltip.transition().duration(200).style("opacity", 0.9);
          tooltip.html(
            `<strong>${d.date}</strong><br/>
             Open: ${d.open}<br/>
             High: ${d.high}<br/>
             Low: ${d.low}<br/>
             Close: ${d.close}`
          )
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
        })
        .on("mousemove", function (event) {
          tooltip.style("left", (event.pageX + 10) + "px")
                 .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));
    });

    // X Axis (Bottom)
    g.append('g')
      .attr('transform', `translate(0,${graphHeight})`)
      .call(
        d3.axisBottom(xScale)
        .tickValues(allDates.filter((_, i) => i % Math.ceil(allDates.length/10)===0))
        )
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-0.8em")
      .attr("dy", "0.15em")
      .attr("transform", "rotate(-45)")
      .style("fill", "white");

    // Y Axis (Left)
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(6))
      .selectAll("text")
      .style("fill", "white")
      .style("font-size", "16px"); 

    // Style axis lines/ticks
    g.selectAll('.domain, .tick line')
      .style("stroke", "white");

    return () => {
      tooltip.remove(); // cleanup on unmount
    };
  }, [series, width, height, backgroundColor, showGridLines]);

  return <svg ref={svgRef}></svg>;
};

export default OHLCChart;