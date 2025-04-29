import React, {Component, useState} from 'react'
import {Button} from "@nextui-org/react";
import Modal from "react-bootstrap/Modal";
import 'bootstrap/dist/css/bootstrap.min.css';
import supabase from "@/components/supabase";
import {useRouter} from "next/router";
import {useAuth} from "@/components/authContext";



// @ts-ignore
function ModalLogin({ show, onHide, setLogin }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();
    const {login} = useAuth();

    const handleLogin = async () => {
        if (email == "" || password == "") {
            alert("Please fill in the fields!");
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

    return(
        <Modal
            show ={show}
            onHide ={onHide}
            backdrop="static"
            keyboard={false}
            size="lg"
            centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    Login
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <form onSubmit={handleSubmit}>
                    <div className="mb-3 mt-4">
                        <label className="form-label">Email Address</label>
                        <input type="email" className="form-control" placeholder="Enter Email" aria-describedby="emailHelp"
                        onChange={(e) => setEmail(e.target.value)}/>

                    </div>

                    <div className="mb-3">
                        <label className='form-label'>Password</label>
                        <input type="password" placeholder="Enter Password"  className="form-control" required
                               onChange={(e) => setPassword(e.target.value)}/>
                    </div>
                    <div>
                        <a href="#">Forgot password?</a>
                    </div>

                    <div className="d-flex justify-content-center">
                        <Button type="submit" className="btn btn-dark mt-md-4 w-100">
                            Login
                        </Button>
                    </div>

                    <div className="mt-3 d-flex justify-content-center">
                        Not a member?&nbsp;<a href="#">Signup now</a>
                    </div>
                </form>

            </Modal.Body>
            <Modal.Footer>
            </Modal.Footer>
        </Modal>
    )
}



export default ModalLogin