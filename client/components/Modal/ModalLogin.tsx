import React, {Component, useState} from 'react'
import {Button} from "@nextui-org/react";
import Modal from "react-bootstrap/Modal";
import 'bootstrap/dist/css/bootstrap.min.css';
import supabase from "@/components/supabase";
import {useRouter} from "next/router";
import {useAuth} from "@/components/authContext";
import styles from '@/styles/login.module.css'



// @ts-ignore
function ModalLogin({ show, onHide, setLogin }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();
    const {login} = useAuth();

    const handleLogin = async () => {
        if (email == "" || password == "") {
            alert("Please fill in the fields!");
            return false;
        } else {
            // Sign user in through supabase
            const { error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                alert("Sign in Error! " + error.message);
                return false;
            } else {
                console.log("Email: " + email);
                console.log("User Signed In successfully");
                return true;

            }
        }

    }

    // @ts-ignore
    const handleSubmit = async (e) => {
        e.preventDefault();
        const succ = await handleLogin();
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
                
                <form onSubmit={handleSubmit}>
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
                            Log in
                        </Button>
                        <Button className={styles.buttonOutline}>
                            Log in with Google
                        </Button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    )
}


export default ModalLogin