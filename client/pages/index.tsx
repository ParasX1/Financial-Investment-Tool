import React, { useEffect, useState } from "react";
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
import Image from "next/image";

function Index() {
  const [message, setMessage] = useState("Loading");
  const [list, setList] = useState([]);
  const logo = require("@/assets/logo.png");
  const team = require("@/assets/image4.png");


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
      <Navbar isBordered>
        <NavbarBrand>
          <Image src={logo} alt="Logo" height="60" />
        </NavbarBrand>
        <NavbarContent className="hidden sm:flex gap-4" justify="center">
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
            <Link href="#">Login</Link>
          </NavbarItem>
          <NavbarItem>
            <Button as={Link} color="primary" href="#" variant="flat">
              Sign Up
            </Button>
          </NavbarItem>
        </NavbarContent>
      </Navbar>

     

      <div>{message}</div>

      <div className="about-us-wrapper">
        <div className="about-us-container">
        <h1 className="about-us-heading">About Us</h1>
        <div className="about-us-flex-container">

          <Image src={team} alt="Team Picture" width="700" />
          <div className="about-us-text">
            <br></br>
            <p>
              We're a brilliant team of computer science students who somehow traded in our keyboards for investment algorithms 
              (though we still find time to throw in Valorant). We might have left the pro Valorant scene behind, but our passion
              for winning now drives us to create the ultimate financial investment tool—FIT. Whether it's clutching rounds or 
              coding smart financial solutions, we’ve got it covered.
              <br></br>
              <br></br>
              With FIT, we’re on a mission to help investors navigate the market by analyzing whether stocks are going up, down, 
              or sideways. We pull in historical data, visualize trends, and assess risk, all to ensure that you’re making informed 
              decisions. From tracking volatility to backtesting trading strategies, our app is designed to give you the edge in 
              your financial game.
            </p>
          </div>
        </div>
      </div>

    </div>
      {list.map((item, index) => (
        <div key={index}>{item}</div>
      ))}
    </div>

    
  );
}

export default Index;
