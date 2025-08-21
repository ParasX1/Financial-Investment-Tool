import React, { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
import supabase from "@/components/supabase";
import Image from "next/image"

//@ts-ignore
function Profile(props) {
  const [email, setEmail] = useState("");
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      //@ts-ignore
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      //@ts-ignore
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserData() {
    const { data, error } = await supabase
      .from("Users")
      .select(`id, first_name, last_name, email`);
    if (error) {
      console.error("Error fetching User data", error);
      return;
    }

    console.log("Fetched data:", data)
    console.log("Email is: " + data[0].email);
    setEmail(data[0].email);
    setFname(data[0].first_name);
    setLname(data[0].last_name);
  }

  fetchUserData();

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "rgb(69,69,69)" }}>
      <Sidebar />
      <div className="flex flex-col flex-1 p-10">

        <div className="flex flex-row gap-6 items-start flex-nowrap">
          <div className="bg-white rounded-xl shadow-md p-6 ml-10 w-1/3 h-full text-center flex flex-col justify-center">
            <Image src='' alt="Profile Picture" width={128} height={128} className="rounded-full mx-auto mb-4 border-4 border-black"/>
            <h2 className="text-xl font-semibold">example user {fname} {lname}</h2>
            <p className="text-gray-500">Software Engineer</p>
            <p className="text-gray-500">Reliability: 12345</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 w-2/3 h-full">
            <div className="flex flex-col divide-y divide-gray-400">
              <div className="py-6 flex">
                <span className="text-gray-800 w-1/5">First Name:</span>
                {/*<span className="text-gray-600 flex-1">{fname}</span>*/}
                <span className="text-gray-600 flex-1">tester</span>
              </div>
              <div className="py-8 flex">
                <span className="text-gray-800 w-1/5">Last Name:</span>
                {/*<span className="text-gray-600 flex-1">{lname}</span>*/}
                <span className="text-gray-600 flex-1">testington</span>
              </div>
              <div className="py-8 flex">
                <span className="text-gray-800 w-1/5">Email:</span>
                {/*<span className="text-gray-600 flex-1">{email}</span>*/}
                <span className="text-gray-600 flex-1">test@gmail.com</span>
              </div>
              <div className="py-8 flex items-center">
                <label className="text-gray-800 w-1/5">Password:</label>
                  {/*<input type="password" value={password} readOnly className="flex-1 bg-transparent text-gray-600 focus:outline-none"/>*/}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 ml-10 mt-10 h-full">
          <div className="flex flex-col divide-y divide-gray-400">
              <div className="py-8 flex">
                <span className="text-gray-800 w-1/2">Example Message 1</span>
                <span className="text-gray-500 flex-1">Timestamp</span>
                <span className="text-gray-800 justify-right">Agreement: 100</span>
              </div>
              <div className="py-8 flex">
                <span className="text-gray-800 w-1/2">Example Message 2</span>
                <span className="text-gray-500 flex-1">Timestamp</span>
                <span className="text-gray-800 justify-right">Agreement: 100</span>
              </div>
              <div className="py-8 flex">
                <span className="text-gray-800 w-1/2">Example Message 3</span>
                <span className="text-gray-500 flex-1">Timestamp</span>
                <span className="text-gray-800 justify-right">Agreement: 100</span>
              </div>
              <div className="py-8 flex">
                <span className="text-gray-800 w-1/2">Example Message 4</span>
                <span className="text-gray-500 flex-1">Timestamp</span>
                <span className="text-gray-800 justify-right">Agreement: 100</span>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
