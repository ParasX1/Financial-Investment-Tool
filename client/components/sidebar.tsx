import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import 'boxicons/css/boxicons.min.css'
import { useRouter } from 'next/router'
import { useAuth } from '@/components/authContext'
import ModalLogin from '@/components/Modal/ModalLogin'
import ModalSignUp from '@/components/Modal/ModalSignUp'

const logo = require('@/assets/SidebarIcons/F.png')

const Sidebar: React.FC = () => {
  const { user, signOut } = useAuth()
  const [isHovered, setIsHovered] = useState(false)
  const [showText, setShowText] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showSignup, setShowSignup] = useState(false)
  const router = useRouter()

  const gatedPages = ['/dashboardView', '/TopPicks', '/MarketNews', '/Watchlist', '/Community', '/Guide', '/Profile']

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined
    if (isHovered) {
      t = setTimeout(() => setShowText(true), 145)
    } else {
      if (t) clearTimeout(t)
      setShowText(false)
    }
    return () => t && clearTimeout(t)
  }, [isHovered])

  const requireAuth = () => setShowLogin(true)

  const navigateToPage = (path: string) => {
    if (!user && gatedPages.includes(path)) {
      requireAuth()
      return
    }
    router.push(path)
  }

  const Item = (path: string, icon: string, label: string) => {
    const locked = !user && gatedPages.includes(path)
    return (
      <li
        key={label}
        className="hoverable"
        onClick={() => (!locked ? navigateToPage(path) : requireAuth())}
        style={{
          position: 'relative',
          opacity: locked ? 0.5 : 1,
          cursor: locked ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 0',
        }}
      >
        <i className={`bx ${icon}`} style={{ fontSize: 28 }} />
        {showText && <span>{label}</span>}
      </li>
    )
  }

  return (
    <>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          backgroundColor: 'black',
          width: isHovered ? '200px' : '50px',
          height: '100vh',
          color: 'white',
          padding: '10px',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 1000,
          transition: 'width 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Top */}
        <div style={{ flexShrink: 0 }}>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            <li className="hoverable" onClick={() => navigateToPage('/')}>
              <Image src={logo} alt="Logo" width={25} height={25} />
            </li>
            {Item('/dashboardView', 'bx-pie-chart-alt-2', 'Portfolio')}
          </ul>
        </div>

        {/* Middle */}
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {Item('/TopPicks', 'bx-up-arrow-circle', 'Top Picks')}
            {Item('/MarketNews', 'bx-news', 'Market News')}
            {Item('/Watchlist', 'bx-list-ul', 'Watchlist')}
            {Item('/Community', 'bx-group', 'Community')}
            {Item('/Guide', 'bx-book-alt', 'Guide')}
          </ul>
        </div>

        {/* Bottom */}
        <div style={{ flexShrink: 0 }}>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {Item('Help', 'bx-help-circle', 'Help')}
            {Item('/Profile', 'bx-user-circle', 'Profile')}
            {user &&
              Item('#logout', 'bx-log-out', 'Log out') && (
                <li
                  onClick={() => signOut()}
                  style={{ listStyleType: 'none', opacity: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                />
              )}
          </ul>
        </div>
      </div>

      <ModalLogin show={showLogin} onHide={() => setShowLogin(false)} />
      <ModalSignUp show={showSignup} onHide={() => setShowSignup(false)} setLogin={setShowLogin} />
    </>
  )
}

export default Sidebar
