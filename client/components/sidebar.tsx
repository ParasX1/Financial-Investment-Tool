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

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--app-sidebar-width',
      isHovered ? '200px' : '50px',
    )

    return () => {
      document.documentElement.style.setProperty('--app-sidebar-width', '50px')
    }
  }, [isHovered])

  const requireAuth = () => setShowLogin(true)

  const navigateToPage = (path: string) => {
    if (!user && gatedPages.includes(path)) {
      requireAuth()
      return
    }
    router.push(path)
  }

  const handleSidebarBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsHovered(false)
    }
  }

  const Item = (
    path: string,
    icon: string,
    label: string,
    onSelect?: () => void,
  ) => {
    const locked = !user && gatedPages.includes(path)
    return (
      <li
        key={label}
        className="hoverable"
        style={{
          position: 'relative',
          opacity: locked ? 0.5 : 1,
          cursor: 'pointer',
          listStyleType: 'none',
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (onSelect) {
              onSelect()
              return
            }

            if (locked) {
              requireAuth()
              return
            }

            navigateToPage(path)
          }}
          aria-label={label}
          aria-disabled={locked || undefined}
          title={label}
          style={{
            width: '100%',
            border: 0,
            background: 'transparent',
            color: 'inherit',
            font: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 0',
            cursor: locked ? 'not-allowed' : 'pointer',
            textAlign: 'left',
          }}
        >
          <i className={`bx ${icon}`} style={{ fontSize: 28 }} aria-hidden="true" />
          {showText && <span>{label}</span>}
        </button>
      </li>
    )
  }

  return (
    <>
      <nav
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocusCapture={() => setIsHovered(true)}
        onBlurCapture={handleSidebarBlur}
        aria-label="Main navigation"
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
            <li className="hoverable" style={{ listStyleType: 'none' }}>
              <button
                type="button"
                onClick={() => navigateToPage('/')}
                aria-label="Home"
                title="Home"
                style={{
                  border: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: '6px 0',
                }}
              >
                <Image src={logo} alt="" width={25} height={25} />
              </button>
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
            {Item('/Help', 'bx-help-circle', 'Help')}
            {Item('/Profile', 'bx-user-circle', 'Profile')}
            {user ? Item('#logout', 'bx-log-out', 'Log out', signOut) : null}
          </ul>
        </div>
      </nav>

      <ModalLogin show={showLogin} onHide={() => setShowLogin(false)} />
      <ModalSignUp show={showSignup} onHide={() => setShowSignup(false)} setLogin={setShowLogin} />
    </>
  )
}

export default Sidebar
