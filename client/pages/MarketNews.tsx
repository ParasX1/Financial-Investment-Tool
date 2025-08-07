import React from "react";
import Sidebar from "@/components/sidebar";
import { Box } from "@mui/material";
import NewsCardComponent from "@/components/NewsCardComponent";

const MarketNews: React.FC = () => {
  const titles = [
    "General News",
    "Watchlist News",
    "Regional News",
    "Industry News",
    "Commodity News",
    "Portfolio News",
  ];

  return (
    <Box sx={{ display: "flex", height: "100vh", minHeight: 0 }}>
      <Sidebar />

      <Box
        component="main"
        sx={{
          flex: 1,
          pl: "50px",
          bgcolor: "black",
          display: "flex",
          flexDirection: "column",
          gap: 1,
          minHeight: 0,
        }}
      >
        {/* Up-row */}
        <Box sx={{ display: "flex", flex: 3, gap: 1, minHeight: 0 }}>
          {/* General News */}
          <Box sx={{ flex: 2, display: "flex", minHeight: 0 }}>
            <NewsCardComponent index={0} title={titles[0]} height="100%" />
          </Box>

          {/* Watchlist */}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 1,
              minHeight: 0,
            }}
          >
            {[1].map((idx) => (
              <Box
                key={idx}
                sx={{ flex: 1, display: "flex", minHeight: 0 }}
              >
                <NewsCardComponent
                  index={idx}
                  title={titles[idx]}
                  height="100%"
                />
              </Box>
            ))}
          </Box>
        </Box>

        {/* Down-row */}
        <Box sx={{ display: "flex", flex: 2, gap: 1, minHeight: 0 }}>
          {[2, 3, 4].map((idx) => (
            <Box
              key={idx}
              sx={{ flex: 1, display: "flex", minHeight: 0 }}
            >
              <NewsCardComponent
                index={idx}
                title={titles[idx]}
                height="100%"
              />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default MarketNews;