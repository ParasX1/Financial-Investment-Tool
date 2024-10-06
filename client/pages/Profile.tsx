import React, {useEffect, useState} from "react";
import Sidebar from "@/components/sidebar"; // Adjust the path to match where Sidebar is located in your project
import supabase from "@/components/supabase";

// @ts-ignore
function Profile(props) {
    const [email, setEmail] = useState("");
    const [fname, setFname] = useState("");
    const [lname, setLname] = useState("");
    const [session, setSession] = useState(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            // @ts-ignore
            setSession(session)
        })

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            // @ts-ignore
            setSession(session)
        })

        return () => subscription.unsubscribe()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[])

    async function fetchUserData() {
        const {data, error} = await supabase.from('Users')
            .select(`
            id,
            first_name,
            last_name,
            email`);
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
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div style={{ flex: 1, paddingLeft: "50px" }}>
        {/* Your portfolio page content will go here */}
        <h1>Profile Page</h1>
          <p>Email: </p>
        <input readOnly={props.readonly} value={email}/>
          <p> First Name: </p>
          <input readOnly={props.readonly} value={fname}/>

          <p>Last Name: </p>
          <input readOnly={props.readonly} value={lname}/>
      </div>
    </div>
  );
}

export default Profile;
