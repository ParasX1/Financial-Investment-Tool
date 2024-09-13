import React, { useState, useEffect } from 'react';
import Image from "next/image";

const logo = require("@/assets/SidebarIcons/F.png");
const logoExpanded = require("@/assets/SidebarIcons/FIT.png");
const portfolio = require("@/assets/SidebarIcons/portfolio.png");
const topPicks = require("@/assets/SidebarIcons/topPicks.png");
const marketNews = require("@/assets/SidebarIcons/marketNews.png");
const watchlist = require("@/assets/SidebarIcons/watchlist.png");
const community = require("@/assets/SidebarIcons/community.png");
const guide = require("@/assets/SidebarIcons/guide.png");
const help = require("@/assets/SidebarIcons/help.png");
const profile = require("@/assets/SidebarIcons/profile.png");

const Sidebar = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined; // Initialize as undefined
    if (isHovered) {
      timeout = setTimeout(() => setShowText(true), 145); // Show text after 500ms delay
    } else {
      if (timeout) {
        clearTimeout(timeout); // Only clear timeout if it exists
      }
      setShowText(false); // Hide text immediately on hover out
    }
    return () => {
      if (timeout) {
        clearTimeout(timeout); // Clear the timeout when the effect cleans up
      }
    };
  }, [isHovered]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const liStyle = {
    marginBottom: '20px', 
    display: 'flex', 
    alignItems: 'center'
  };


  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        backgroundColor: 'black',
        width: isHovered ? '200px' : '50px', // Expands width on hover
        height: '100vh',
        color: 'white',
        padding: '10px',
        position: 'fixed',  // Fixed position on the left
        top: 0,
        left: 0,
        zIndex: 1000,  // High z-index to ensure it stays on top
        transition: 'width 0.3s ease', // Smooth transition for the hover effect
        display: 'flex',
        flexDirection: 'column', // Stack items vertically
        justifyContent: 'space-between', // Space between top and bottom sections
      }}
    >
      {/* Top section: Logo and Portfolio */}
      <div style={{ flexShrink: 0 }}>
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          <li className="hoverable">
            {showText ? (
              <Image src={logo} alt="Logo" width={25} height={25} /> 
            ) : (
              <Image src={logo} alt="Logo" width={25} height={25}  />
            )}
          </li>
          <li className="hoverable">
            <Image src={portfolio} alt="Portfolio" height={25} width={25} />
            {showText && <span style={{ marginLeft: '10px' }}>Portfolio</span>} {/* Show text with delay */}
          </li>
        </ul>
      </div>

      {/* Middle section: Icons */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          <li className="hoverable">
            <Image src={topPicks} alt="Top Picks" height={25} width={25} />
            {showText && <span style={{ marginLeft: '10px' }}>Top Picks</span>}
          </li>
          <li className="hoverable">
            <Image src={marketNews} alt="Market News" height={25} width={25} />
            {showText && <span style={{ marginLeft: '10px' }}>Market News</span>}
          </li>
          <li className="hoverable">
            <Image src={watchlist} alt="Watchlist" height={25} width={25} />
            {showText && <span style={{ marginLeft: '10px' }}>Watchlist</span>}
          </li>
          <li className="hoverable">
            <Image src={community} alt="Community" height={25} width={25} />
            {showText && <span style={{ marginLeft: '10px' }}>Community</span>}
          </li>
          <li className="hoverable">
            <Image src={guide} alt="Guide" height={25} width={25} />
            {showText && <span style={{ marginLeft: '10px' }}>Guide</span>}
          </li>
        </ul>
      </div>

      {/* Bottom section: Help and Profile */}
      <div style={{ flexShrink: 0 }}>
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          <li className="hoverable">
            <Image src={help} alt="Help" height={25} width={25} />
            {showText && <span style={{ marginLeft: '10px' }}>Help</span>}
          </li>
          <li className="hoverable">
            <Image src={profile} alt="Profile" height={25} width={25} />
            {showText && <span style={{ marginLeft: '10px' }}>Profile</span>}
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
