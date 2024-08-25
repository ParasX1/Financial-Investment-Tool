import React, { useEffect, useState } from "react";
import Modal from "react-bootstrap/Modal";
import ModalLogin from "@/components/Modal/ModalLogin";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Link,
  Button,
  Spacer,
  Card,
  CardBody,
  CardFooter,
} from "@nextui-org/react";
import ModalSignUp from "@/components/Modal/ModalSignUp";


function Index() {
  const [message, setMessage] = useState("Loading");
  const [list, setList] = useState([]);
  const logo = require("@/assets/logo.png");

  // Signup-Login Modal
  const [showSignUp, setSignUp] = useState(false);
  const [showLogIn, setShowLogIn] =useState(false);
  const handleLoginShow = () => setShowLogIn(true);
  const handleLoginClose = () => setShowLogIn(false);

  const handleSignUpShow = () => setSignUp(true);
  const handleSignUpClose = () => setSignUp(false);

  useEffect(() => {
    fetch("http://localhost:8080/api/home")
      .then((response) => response.json())
      .then((data) => {
        setMessage(data.test);
        setList(data.testList);
      });
  }, []);


  return (
    <div>
      <Navbar maxWidth={'full'}>
        <NavbarContent className="hidden sm:flex gap-4" justify="start">
          <NavbarItem>
            <Link color="foreground" href="#">
              About Us
            </Link>
          </NavbarItem>
          <Spacer x={6} />
          <NavbarItem>
            <Link href="search" color="foreground">
              Services
            </Link>
          </NavbarItem>
          <Spacer x={6} />
          <NavbarItem>
            <Link color="foreground" href="#">
              Tools
            </Link>
          </NavbarItem>
          <Spacer x={6} />
          <NavbarItem>
            <Link color="foreground" href="#">
              People
            </Link>
          </NavbarItem>
        </NavbarContent>
        <NavbarContent justify="end">
          <NavbarItem className="hidden lg:flex">
            <>
              <Button color="primary" href="#" variant="flat" onClick={handleLoginShow}>
                Log In
              </Button>

              <ModalLogin
                show={showLogIn}
                onHide={handleLoginClose}/>
            </>
          </NavbarItem>
          <NavbarItem>
            <>
            <Button color="primary" variant="flat" onClick={handleSignUpShow}>
              Sign Up
            </Button>

              <ModalSignUp
                show={showSignUp}
                onHide={handleSignUpClose}/>
            </>

          </NavbarItem>
        </NavbarContent>
      </Navbar>

      <div className="two-column">
        <div className="left-column">
          <h1 className="title-text">FIT</h1>
          <p>Descriptions add later</p>
          <Spacer y={3} />
          <div className="button-container">
            <Button className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg" color="primary">
              Button1
            </Button>
            <Spacer x={3} />
            <Button className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg">
              Button2
            </Button>
          </div>
        </div>
        <div className="right-column">
          {/* PUT IMAGE IN THE FUTURE */}
        </div>
      </div>

      <div className="two-rows">
      <p>Descriptions add later</p>
      </div>
    </div>
  );
}


export default Index;
