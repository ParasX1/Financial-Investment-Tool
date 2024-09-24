import React from "react";
import Sidebar from "@/components/sidebar"; // Adjust the path to match where Sidebar is located in your project

function MarketNews() {
  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div style={{ flex: 1, paddingLeft: "50px" }}>
        {/* Your portfolio page content will go here */}
        <h1>Market News</h1>
        <p>This is where you can add your market news content.</p>
      </div>
    </div>
  );
}

export default MarketNews;
