import React, { useState, useEffect } from 'react';
import Image from "next/image";
import 'boxicons/css/boxicons.min.css';
import { useRouter } from 'next/router'; // Use Next.js router

const logo = require("@/assets/SidebarIcons/F.png");
const logoExpanded = require("@/assets/SidebarIcons/FIT.png");

const Sidebar = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [showText, setShowText] = useState(false);
  const router = useRouter(); // Initialize useRouter hook for navigation

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
    router.push(path); // Use router.push to navigate to the specified path
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
          <li className="hoverable" onClick={() => navigateToPage('/')}>
            {showText ? (
              <Image src={logo} alt="Logo" width={25} height={25} /> 
            ) : (
              <Image src={logo} alt="Logo" width={25} height={25}  />
            )}
          </li>
            <li className="hoverable" onClick={() => navigateToPage('/dashboardView')}>
                <i className='bx bx-pie-chart-alt-2' style={{ fontSize: '30px' }}></i>
                {showText && <span style={{ marginLeft: '10px' }}>Portfolio</span>} {/* Show text with delay */}
            </li>
        </ul>
      </div>

      {/* Middle section: Icons */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          <li className="hoverable" onClick={() => navigateToPage('/TopPicks')}>
            <i className='bx bx-up-arrow-circle' style={{ fontSize: '30px' }}></i>
            {showText && <span style={{ marginLeft: '10px' }}>Top Picks</span>}
          </li>
          <li className="hoverable" onClick={() => navigateToPage('/MarketNews')}>
            <i className='bx bx-news' style={{ fontSize: '30px' }}></i>
            {showText && <span style={{ marginLeft: '10px' }}>Market News</span>}
          </li>
          <li className="hoverable" onClick={() => navigateToPage('/Watchlist')}>
            <i className='bx bx-list-ul' style={{ fontSize: '30px' }}></i>
            {showText && <span style={{ marginLeft: '10px' }}>Watchlist</span>}
          </li>
          <li className="hoverable" onClick={() => navigateToPage('/Community')}>
            <i className='bx bx-group' style={{ fontSize: '30px' }}></i>
            {showText && <span style={{ marginLeft: '10px' }}>Community</span>}
          </li>
          <li className="hoverable" onClick={() => navigateToPage('/Guide')}>
            <i className='bx bx-book-alt' style={{ fontSize: '30px' }}></i>
            {showText && <span style={{ marginLeft: '10px' }}>Guide</span>}
          </li>
        </ul>
      </div>

      {/* Bottom section: Help and Profile */}
      <div style={{ flexShrink: 0 }}>
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          <li className="hoverable" onClick={() => navigateToPage('Help')}>
            <i className='bx bx-help-circle' style={{ fontSize: '30px' }}></i>
            {showText && <span style={{ marginLeft: '10px' }}>Help</span>}
          </li>
          <li className="hoverable" onClick={() => navigateToPage('/Profile')}>
            <i className='bx bx-user-circle' style={{ fontSize: '30px' }}></i>
            {showText && <span style={{ marginLeft: '10px' }}>Profile</span>}
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
