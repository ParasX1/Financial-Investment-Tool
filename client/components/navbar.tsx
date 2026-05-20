import React, { useState } from "react";
import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
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

    const handleNavClick = (href: string) => {
        if (href.startsWith('#')) {
            const el = document.getElementById(href.slice(1))
            el?.scrollIntoView({ behavior: 'smooth' })
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

// import {
// 	Button,
// 	Link,
// 	NavbarContent,
// 	NavbarItem,
// 	Navbar as Nb,
// 	Spacer
// } from "@nextui-org/react"

// import React, { useEffect, useState, Fragment } from "react";
// import ModalLogin from "@/components/Modal/ModalLogin";
// import ModalSignUp from "@/components/Modal/ModalSignUp";
// import {useAuth} from "@/components/authContext";

// export interface NavbarElem {
//     id: number
//     label: string
//     href: string 
// }

// interface NavbarProps {
//     items: NavbarElem[]
// }

  
// export function Navbar({ items } : NavbarProps) {
//     const { user, loading, signOut } = useAuth()
//     const [showSignUp, setSignUp] = useState(false)
//     const [showLogIn, setShowLogIn] = useState(false)

//     const handleLoginShow = () => setShowLogIn(true)
//     const handleLoginClose = () => setShowLogIn(false)

//     const handleSignUpShow = () => setSignUp(true)
//     const handleSignUpClose = () => setSignUp(false)
    
//         return (
//         <Nb maxWidth="full" shouldHideOnScroll>
//         <NavbarContent className="hidden sm:flex gap-4" justify="center">
//             {items.map((child, idx) => {
//             return (
//                 <React.Fragment key={child.href + idx}>

//                 <NavbarItem>
//                     <Link color="foreground" href={child.href}>
//                         {child.label}
//                     </Link>
//                 </NavbarItem>
//                 <Spacer x={6} />
//                 </React.Fragment>
//             )
//             })}
//         </NavbarContent>


//         <NavbarContent justify="end">
//             {user ? (
//             <NavbarItem>
//                 <Button className="bg-black text-white" variant="flat" onClick={() => signOut()}>
//                 Log Out

//                 </Button>
//             </NavbarItem>
//             ) : (
//             <>
//                 <NavbarItem>
//                 <Button
//                     className="bg-white text-black border-1 border-black"
//                     variant="flat"
//                     onClick={handleLoginShow}
//                     isDisabled={loading}
//                 >
//                     Log In
//                 </Button>
//                 <ModalLogin show={showLogIn} onHide={handleLoginClose} />
//                 </NavbarItem>
//                 <NavbarItem>
//                 <Button className="bg-black text-white" variant="flat" onClick={handleSignUpShow} isDisabled={loading}>
//                     Sign Up
//                 </Button>
//                 <ModalSignUp show={showSignUp} onHide={handleSignUpClose} setLogin={setShowLogIn} />
//                 </NavbarItem>
//             </>
//             )}
//         </NavbarContent>
//         </Nb>
//     )
// }

// export default Navbar