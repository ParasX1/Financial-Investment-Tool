import React, { useState, useEffect } from 'react';
import Image from "next/image";
import 'boxicons/css/boxicons.min.css';
import { useRouter } from 'next/router'; // Use Next.js router
import { useAuth } from "@/components/authContext";

const logo = require("@/assets/SidebarIcons/F.png");
const logoExpanded = require("@/assets/SidebarIcons/FIT.png");

const Sidebar = () => {
  const {isLoggedIn, login, logout} = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [showText, setShowText] = useState(false);
  const router = useRouter(); // Initialize useRouter hook for navigation

  const paidPages = ['/dashboardView', '/TopPicks', '/MarketNews', '/Watchlist', '/Community', '/Guide'];

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

  const handleClick = () => {
    alert('List item clicked!');
  };

  const navigateToPage = (path: string) => {
    if (paidPages.includes(path) && !isLoggedIn) {
    }
    else {
      router.push(path); // Use router.push to navigate to the specified path
    }  
  };

  const renderSidebarItem = (path: string, icon: string, label: string) => {
    const isLocked = paidPages.includes(path) && !isLoggedIn;
    return (
      <li
        className="hoverable"
        onClick={() => !isLocked && navigateToPage(path)}
        style={{ position: 'relative', opacity: isLocked ? 0.5 : 1, cursor: isLocked ? 'not-allowed' : 'pointer' }}
      >
        <i className={`bx ${icon}`} style={{ fontSize: '30px' }}></i>
        {showText && <span style={{ marginLeft: '10px' }}>{label}</span>}
        {isLocked && showText && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            zIndex: 1,
            borderRadius: '5px',
          }}>
          </div>
        )}   
      </li>
    )
  }


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
          <li className="hoverable" onClick={() => navigateToPage('/')}>
            <Image src={logo} alt="Logo" width={25} height={25} /> 
          </li>
          {renderSidebarItem('/dashboardView', 'bx-pie-chart-alt-2', 'Portfolio')}
        </ul>
      </div>

      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {renderSidebarItem('/TopPicks', 'bx-up-arrow-circle', 'Top Picks')}
          {renderSidebarItem('/MarketNews', 'bx-news', 'Market News')}
          {renderSidebarItem('/Watchlist', 'bx-list-ul', 'Watchlist')}
          {renderSidebarItem('/Community', 'bx-group', 'Community')}
          {renderSidebarItem('/Guide', 'bx-book-alt', 'Guide')}
        </ul>
      </div>

      <div style={{ flexShrink: 0 }}>
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {renderSidebarItem('Help', 'bx-help-circle', 'Help')}
          {renderSidebarItem('/Profile', 'bx-user-circle', 'Profile')}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
