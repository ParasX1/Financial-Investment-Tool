import React, {useState} from 'react'
import {Button} from "@nextui-org/react";
import Modal from "react-bootstrap/Modal";
import 'bootstrap/dist/css/bootstrap.min.css';
import supabase from "@/components/supabase";
import {useRouter} from "next/router";
import {useAuth} from "@/components/authContext";
import styles from '@/styles/login.module.css'

// @ts-ignore
function ModalSignUp({ show, onHide, setSignUp, setLogin }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fname, setFname] = useState("");
    const [lname, setLname] = useState("");
    const router = useRouter();
    const {login} = useAuth();

    // @ts-ignore
    const handleSignUp = async (e) => {
        if (email == "" || password == "" || fname == "" || lname == "") {
            alert("Please fill in the fields!");
        } else {
            // Sign user up through supabase
            const {data, error} = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        first_name: fname,
                        last_name: lname
                    }
                }
            });

            if (error) {
                alert("User already exists!");
                return false;
            } else {
                console.log("Email: " + email);
                console.log("First name: " + fname);
                console.log("Last name: " + lname);
                console.log("User Signed Up successfully");
                return true;

            }
        }
    }

    // @ts-ignore
    const handleSubmit = async (e) => {
        e.preventDefault();
        const succ = await handleSignUp(e);
        //if (succ) {
            login();
            router.push("/dashboardView");
        //}
    }


    return (
        <Modal
            show={show}
            onHide={onHide}
            keyboard={false}
            centered
            className="text-center">
            <Modal.Body className={styles.loginModal}>
                <h2 className={styles.loginHeader}>FIT.</h2>
                <h4 className={styles.loginSubheader} style={{ fontSize: '0.875rem', fontWeight: '300'}}>START FOR FREE!</h4>
                <h3 className={styles.loginSubheader} style={{ fontSize: '1.5rem', fontWeight: '400' }}>Create new account</h3>
                <h4 className={styles.loginSubheader} style={{ fontSize: '0.875rem', fontWeight: '300'}}>Already a member? <span onClick={() => {setSignUp(false); setLogin(true);}} className={styles.loginLink}>Log in</span></h4>                
                
                <form onSubmit={handleSubmit}>
                    <div className={styles.inputTwo}>
                        <input 
                            type="text" 
                            className={styles.inputFull}
                            placeholder="First Name"
                            onChange={(e) => setFname(e.target.value)}
                        />
                        <input 
                            type="text" 
                            className={styles.inputFull}
                            placeholder="Last Name"
                            onChange={(e) => setLname(e.target.value)}
                        />
                    </div>
                    <div className={styles.inputRow}>
                        <input 
                            type="email" 
                            className={styles.inputFull}
                            placeholder="Email Address"
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className={styles.inputRow}>
                        <input 
                            type="text" 
                            className={styles.inputFull}
                            placeholder="Password"
                            onChange={(e) => setPassword(e.target.value)} 
                        />
                    </div>
                    <div className={styles.buttonRowTwo}>
                        <Button type="submit" className={styles.buttonSubmit}>
                            Sign up
                        </Button>
                        <Button className={styles.buttonOutline}>
                            Sign up with Google
                        </Button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    )
}




export default ModalSignUp