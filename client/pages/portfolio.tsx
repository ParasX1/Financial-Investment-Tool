import React from "react";
import Sidebar from "@/components/sidebar";
import BarGraph from "@/components/bargraph";
import LineGraph from "@/components/linegraph";

function Portfolio() {
  // Sample data for testing the graphs
  const exampleData = [
    { label: 'Apples', value: 50 },
    { label: 'Bananas', value: 80 },
    { label: 'Cherries', value: 30 },
    { label: 'Dates', value: 70 },
    { label: 'Elderberries', value: 45 },
  ];

  const timeSeriesData = [
    { date: new Date('2024-01-01'), value: 50 },
    { date: new Date('2024-01-02'), value: 55 },
    { date: new Date('2024-01-03'), value: 60 },
    { date: new Date('2024-01-04'), value: 40 },
    { date: new Date('2024-01-05'), value: 75 },
    { date: new Date('2024-01-06'), value: 85 },
  ];

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div style={{ flex: 1, paddingLeft: "50px" }}>
        <h1>Portfolio Page</h1>
        <p>This is where you can add your portfolio-related content.</p>

        {/* Render the graphs for testing with sample data */}
        <BarGraph data={exampleData} width={600} height={400} />
        <LineGraph data={timeSeriesData} width={600} height={400} />
      </div>
    </div>
  );
}

export default Portfolio;
