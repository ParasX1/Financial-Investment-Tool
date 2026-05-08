import * as d3 from "d3";
import React, { useRef, useEffect } from 'react';

export interface OHLCData {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
}

interface OHLCChartProps {
  multiData: {
    ticker: string;
    color: string;
    data: OHLCData[];
  }[];
  width?: number;
  height?: number;
  backgroundColor?: string;
  showGridLines?: boolean;
}

const OHLCChart: React.FC<OHLCChartProps> = ({
  multiData,
  width = 500,
  height = 300,
  backgroundColor = 'black',
  showGridLines = false,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const margin = { top: 30, right: 80, bottom: 50, left: 50 }; // Increased right margin for legend
    const graphWidth = width - margin.left - margin.right;
    const graphHeight = height - margin.top - margin.bottom;

    const parseDate = d3.timeParse("%Y-%m-%d");
    
    // Format data for each ticker and flatten
    const formattedData = multiData.flatMap(d => d.data.map(e => ({
      ...e,
      parsedDate: parseDate(e.date) as Date,
      ticker: d.ticker,
      color: d.color
    })));

    // Get unique dates and sort them
    const uniqueDates = Array.from(new Set(formattedData.map(d => d.date))).sort();

    const xScale = d3.scaleBand()
      .domain(uniqueDates)
      .range([0, graphWidth])
      .padding(0.3);

    // const yScale = multiData.map(({ data }) =>
    //   d3.scaleLinear()
    //   .domain([
    //     d3.min(data, d => d.low)!,
    //     d3.max(data, d => d.high)!
    //   ])
    //   .nice()
    //   .range([graphHeight, 0])
    // );

    const yScale = d3.scaleLinear()
      .domain([
        d3.min(formattedData, d => d.low)!,
        d3.max(formattedData, d => d.high)!
      ])
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
      .style("opacity", 0)
      .style("z-index", "1000");

    // Grid lines
    if (showGridLines) {
      g.append('g')
        .attr("class", "grid")
        .call(d3.axisLeft(yScale).tickSize(-graphWidth).tickFormat(() => ''))
        .selectAll("line")
        .attr("stroke", "#444");

      g.append('g')
        .attr("class", "grid")
        .attr('transform', `translate(0,${graphHeight})`)
        .call(d3.axisBottom(xScale)
          .tickValues(uniqueDates.filter((_, i) => i % Math.ceil(uniqueDates.length / 10) === 0))
          .tickSize(-graphHeight)
          .tickFormat(() => ''))
        .selectAll("line")
        .attr("stroke", "#444");
    }

    // Calculate bandwidth for each ticker when multiple tickers share the same date
    const tickerBandwidth = xScale.bandwidth() / Math.max(multiData.length, 1);

    // Draw OHLC for each ticker
    multiData.forEach(({ ticker, color, data }, tickerIndex) => {
      const tickerFormattedData = data.map(d => ({
        ...d,
        parsedDate: parseDate(d.date) as Date,
      }));

      const tickerGroup = g.append('g').attr('class', `ticker-${tickerIndex}`);
      
      // Calculate x offset for this ticker
      const xOffset = tickerIndex * tickerBandwidth;

      // OHLC Lines (High-Low)
      tickerGroup.selectAll(`.ohlc-${tickerIndex}`)
        .data(tickerFormattedData)
        .enter()
        .append("line")
        .attr("class", `ohlc-${tickerIndex}`)
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("x1", d => (xScale(d.date) || 0) + xOffset + tickerBandwidth / 2)
        .attr("x2", d => (xScale(d.date) || 0) + xOffset + tickerBandwidth / 2)
        .attr("y1", d => yScale(d.low))
        .attr("y2", d => yScale(d.high));

      // Open ticks
      tickerGroup.selectAll(`.open-${tickerIndex}`)
        .data(tickerFormattedData)
        .enter()
        .append("line")
        .attr("class", `open-${tickerIndex}`)
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("x1", d => (xScale(d.date) || 0) + xOffset)
        .attr("x2", d => (xScale(d.date) || 0) + xOffset + tickerBandwidth / 2)
        .attr("y1", d => yScale(d.open))
        .attr("y2", d => yScale(d.open));

      // Close ticks
      tickerGroup.selectAll(`.close-${tickerIndex}`)
        .data(tickerFormattedData)
        .enter()
        .append("line")
        .attr("class", `close-${tickerIndex}`)
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("x1", d => (xScale(d.date) || 0) + xOffset + tickerBandwidth / 2)
        .attr("x2", d => (xScale(d.date) || 0) + xOffset + tickerBandwidth)
        .attr("y1", d => yScale(d.close))
        .attr("y2", d => yScale(d.close));
    });

    // Invisible bars for tooltip (cover full width for all tickers on that date)
    g.selectAll(".hover-rect")
      .data(uniqueDates)
      .enter()
      .append("rect")
      .attr("class", "hover-rect")
      .attr("x", d => xScale(d) || 0)
      .attr("width", xScale.bandwidth())
      .attr("y", 0)
      .attr("height", graphHeight)
      .attr("fill", "transparent")
      .on("mouseover", function (event, date) {
        // Find data for this date across all tickers
        const dateData = multiData.map(({ ticker, color, data }) => {
          const dayData = data.find(d => d.date === date);
          return dayData ? { ...dayData, ticker, color } : null;
        }).filter(Boolean);

        if (dateData.length === 0) return;

        tooltip.transition().duration(200).style("opacity", 0.9);
        
        const tooltipContent = `<strong>${date}</strong><br/>` + 
          dateData.map(d => 
            `<div style="color: ${d!.color}; margin: 4px 0;">
              <strong>${d!.ticker}</strong><br/>
              O: ${d!.open} H: ${d!.high}<br/>
              L: ${d!.low} C: ${d!.close}
            </div>`
          ).join('');

        tooltip
          .html(tooltipContent)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function () {
        tooltip.transition().duration(500).style("opacity", 0);
      });

    // Legend (show if multiple tickers)
    if (multiData.length > 1) {
      const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - margin.right + 10}, ${margin.top})`);

      legend.selectAll('.legend-item')
        .data(multiData)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 20})`)
        .each(function(d) {
          const item = d3.select(this);
          
          // Color rectangle
          item.append('rect')
            .attr('width', 12)
            .attr('height', 12)
            .attr('fill', d.color);
          
          // Ticker name
          item.append('text')
            .attr('x', 16)
            .attr('y', 9)
            .style('fill', 'white')
            .style('font-size', '12px')
            .text(d.ticker);
        });
    }

    // X Axis (Bottom)
    g.append('g')
      .attr('transform', `translate(0,${graphHeight})`)
      .call(
        d3.axisBottom(xScale)
          .tickValues(uniqueDates
            .filter((_, i) => i % Math.ceil(uniqueDates.length / 10) === 0))
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
      .style("fill", "white");

    // Style axis lines/ticks
    g.selectAll('.domain, .tick line')
      .style("stroke", "white");

    return () => {
      tooltip.remove(); // cleanup on unmount
    };
  }, [multiData, width, height, backgroundColor, showGridLines]); // Fixed dependency array

  return <svg ref={svgRef}></svg>;
};

export default OHLCChart;