import React, { useEffect, useState } from "react";
import { Navbar } from "../components/navbar"
import Image from "next/image";

function Index() {
  const [message, setMessage] = useState("Loading");
  const [list, setList] = useState([]);
  const logo = require("@/assets/logo.png");

  /*
  useEffect(() => {
    fetch("http://localhost:8080/api/home")
      .then((response) => response.json())
      .then((data) => {
        setMessage(data.test);
        setList(data.testList);
      });
  }, []);
  */

  return (
    <div>
      <Navbar children={[
        {label: "Pricing", href: "#"},
        {label: "Solutions", href: "#"},
        {label: "Community", href: "#"},
        {label: "Contact", href: "#"},
      ]} />
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>
      <div>{message}</div>

      {list.map((item, index) => (
        <div key={index}>{item}</div>
      ))}
    </div>
  );
}

export default Index;
