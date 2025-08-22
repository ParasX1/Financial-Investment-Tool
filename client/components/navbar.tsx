import {
	Button,
	Link,
	NavbarContent,
	NavbarItem,
	Navbar as Nb,
	Spacer
} from "@nextui-org/react"

import React, { useEffect, useState, Fragment } from "react";
import ModalLogin from "@/components/Modal/ModalLogin";
import ModalSignUp from "@/components/Modal/ModalSignUp";
import {useAuth} from "@/components/authContext";

export interface NavbarElem {
    id: number
    label: string
    href: string 
}

interface NavbarProps {
    items: NavbarElem[]
}

  
export function Navbar({ items } : NavbarProps) {
    const { user, loading, signOut } = useAuth()
    const [showSignUp, setSignUp] = useState(false)
    const [showLogIn, setShowLogIn] = useState(false)

    const handleLoginShow = () => setShowLogIn(true)
    const handleLoginClose = () => setShowLogIn(false)

    const handleSignUpShow = () => setSignUp(true)
    const handleSignUpClose = () => setSignUp(false)
    
         return (
        <Nb maxWidth="full" shouldHideOnScroll>
        <NavbarContent className="hidden sm:flex gap-4" justify="center">
            {items.map((child, idx) => {
            const disabled = !user
            return (
                <React.Fragment key={child.href + idx}>

                <NavbarItem>
                    {disabled ? (
                    <span
                        aria-disabled="true"
                        style={{ opacity: 0.4, cursor: 'not-allowed' }}
                        onClick={handleLoginShow}
                    >
                        {child.label}
                    </span>
                    ) : (
                    <Link color="foreground" href={child.href}>
                        {child.label}
                    </Link>
                    )}
                </NavbarItem>
                <Spacer x={6} />
                </React.Fragment>
            )
            })}
        </NavbarContent>


        <NavbarContent justify="end">
            {user ? (
            <NavbarItem>
                <Button className="bg-black text-white" variant="flat" onClick={() => signOut()}>
                Log Out

                </Button>
            </NavbarItem>
            ) : (
            <>
                <NavbarItem>
                <Button
                    className="bg-white text-black border-1 border-black"
                    variant="flat"
                    onClick={handleLoginShow}
                    isDisabled={loading}
                >
                    Log In
                </Button>
                <ModalLogin show={showLogIn} onHide={handleLoginClose} />
                </NavbarItem>
                <NavbarItem>
                <Button className="bg-black text-white" variant="flat" onClick={handleSignUpShow} isDisabled={loading}>
                    Sign Up
                </Button>
                <ModalSignUp show={showSignUp} onHide={handleSignUpClose} setLogin={setShowLogIn} />
                </NavbarItem>
            </>
            )}
        </NavbarContent>
        </Nb>
    )
}

export default Navbar