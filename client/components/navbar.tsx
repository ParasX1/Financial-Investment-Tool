import React, { useState, useRef, useEffect } from "react";
import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
// import BoltIcon from "@mui/icons-material/Bolt";
import ModalLogin from "@/components/Modal/ModalLogin";
import ModalSignUp from "@/components/Modal/ModalSignUp";
import { useAuth } from "@/components/authContext";
import { useRouter } from "next/navigation";

export interface NavbarElem {
    id: number
    label: string
    href: string
}

interface NavbarProps {
    items: NavbarElem[]
}

export function Navbar({ items }: NavbarProps) {
    const { user, loading, signOut } = useAuth()
    const [showSignUp, setShowSignUp] = useState(false)
    const [showLogIn, setShowLogIn] = useState(false)
    const router = useRouter()

    const [visible, setVisible] = useState(true)
    const lastScrollY = useRef(0)

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY
            setVisible(currentScrollY < lastScrollY.current || currentScrollY < 64)
            lastScrollY.current = currentScrollY
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const handleNavClick = (href: string) => {
        if (href.startsWith('#')) {
            const el = document.getElementById(href.slice(1))
            if (!el) return

            const navbarHeight = 64
            const top = el.getBoundingClientRect().top + window.scrollY - navbarHeight

            window.scrollTo({ top, behavior: 'smooth' })
        } else {
            router.push(href)
        }
    }

    return (
        <>
            <AppBar position="sticky" sx={{
                background: 'rgba(18, 18, 18, 0.7)',
                backdropFilter: 'blur(10px)',
                boxShadow: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                transform: visible ? 'translateY(0)' : 'translateY(-100%)',
                transition: 'transform 0.3s ease',
            }}>
                <Toolbar sx={{ gap: 2 }}>
                    {/* Logo */}
                    <Typography variant="h2" sx={{
                        background: 'linear-gradient(45deg, #5a5afc 30%, #ea19ea 90%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                    }} onClick={() => router.push('/')}>
                        FIT
                    </Typography>

                    {/* Nav links */}
                    {items.map((item) => (
                        <Typography
                            key={item.id}
                            sx={{ cursor: 'pointer' }}
                            onClick={() => handleNavClick(item.href)}
                        >
                            {item.label}
                        </Typography>
                    ))}

                    {/* Auth buttons */}
                    <Box sx={{ marginLeft: 'auto', display: 'flex', gap: 2, alignItems: 'center' }}>
                        {user ? (
                            <>
                                <Button
                                    color="inherit"
                                    // startIcon={<BoltIcon />}
                                    sx={{ fontWeight: 'bold' }}
                                    onClick={() => router.push('/dashboardView')}
                                >
                                    Dashboard
                                </Button>
                                <Button
                                    color="inherit"
                                    disabled={loading}
                                    onClick={() => signOut()}
                                >
                                    Log Out
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    color="inherit"
                                    disabled={loading}
                                    onClick={() => setShowLogIn(true)}
                                >
                                    Sign In
                                </Button>
                                <Button
                                    variant="contained"
                                    disabled={loading}
                                    onClick={() => setShowSignUp(true)}
                                    sx={{
                                        background: 'linear-gradient(45deg, #5a5afc 30%, #ea19ea 90%)',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        '&:hover': { background: 'linear-gradient(45deg, #4444e0 30%, #c010c0 90%)' },
                                    }}
                                >
                                    Get FIT
                                </Button>
                            </>
                        )}
                    </Box>
                </Toolbar>
            </AppBar>

            <ModalLogin show={showLogIn} onHide={() => setShowLogIn(false)} />
            <ModalSignUp show={showSignUp} onHide={() => setShowSignUp(false)} setLogin={setShowLogIn} />
        </>
    )
}

export default Navbar
