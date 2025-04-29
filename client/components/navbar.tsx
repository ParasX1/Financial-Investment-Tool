import {
	Button,
	Link,
	NavbarContent,
	NavbarItem,
	Navbar as Nb,
	Spacer
} from "@nextui-org/react"
import React, { useEffect, useState } from "react";
import ModalLogin from "@/components/Modal/ModalLogin";
import ModalSignUp from "@/components/Modal/ModalSignUp";
import {useAuth} from "@/components/authContext";

export interface NavbarElem {
    label: string
    href: string 
    // only supports jumping to other pages, can replace with
    // action to have it do other things
}

interface NavbarProps {
    children: NavbarElem[]
}

  

export function Navbar({children} : NavbarProps) {
    const {isLoggedIn, login, logout} = useAuth();
    const [showSignUp, setSignUp] = useState(false);
    const [showLogIn, setShowLogIn] = useState(false);
    const handleLoginShow = () => setShowLogIn(true);
    const handleLoginClose = () => setShowLogIn(false);

    const handleSignUpShow = () => setSignUp(true);
    const handleSignUpClose = () => setSignUp(false);
  
        return (
        <Nb maxWidth="full" shouldHideOnScroll>
          <NavbarContent className="hidden sm:flex gap-4" justify="center" >
            {children.map(child => (
                <>
                <NavbarItem>
                    <Link color="foreground" href={child.href}>
                        {child.label}
                    </Link>
                </NavbarItem>
                  <Spacer x={6} />
                </>
            ))}
            </NavbarContent>

			<NavbarContent justify="end">
            {isLoggedIn ? (
            <NavbarItem>
                <Button className="bg-black text-white" variant="flat" onClick={logout}>
                    Log Out
                </Button>
            </NavbarItem>
            ) : (
            <>
            <NavbarItem>
                <Button className="bg-white text-black border-1 border-black" variant="flat" onClick={handleLoginShow}>
                    Log In
                </Button>
                <ModalLogin
                    show={showLogIn}
                    onHide={handleLoginClose}
                    setLogin={setShowLogIn}
                />
            </NavbarItem>
            <NavbarItem>
                <Button className="bg-black text-white" variant="flat" onClick={handleSignUpShow}>
                    Sign Up
                </Button>
                <ModalSignUp
                    show={showSignUp}
                    onHide={handleSignUpClose}
                    setSignUp={setSignUp}
                />
            </NavbarItem>
          </>
        )}
      </NavbarContent>
    </Nb>
      )
}