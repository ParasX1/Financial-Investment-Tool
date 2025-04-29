import React, {useState} from 'react'
import {Button} from "@nextui-org/react";
import Modal from "react-bootstrap/Modal";
import 'bootstrap/dist/css/bootstrap.min.css';
import supabase from "@/components/supabase";
import {useRouter} from "next/router";
import { loadGetInitialProps } from 'next/dist/shared/lib/utils';
import {useAuth} from "@/components/authContext";

// @ts-ignore
function ModalSignUp({ show, onHide, setSignUp }) {
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
                    Sign Up
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <form onSubmit={handleSubmit}>
                    <div className="mb-3 mt-4">
                        <label className="form-label">Email Address</label>
                        <input type="email" className="form-control" placeholder="Enter Email" aria-describedby="emailHelp"
                        onChange={(e) => setEmail(e.target.value)}/>
                    </div>

                    <div className="mb-3 mt-4">
                        <label className="form-label">First Name</label>
                        <input type="text" className="form-control" placeholder="Enter First Name"
                        onChange={(e) => setFname(e.target.value)}/>
                    </div>

                    <div className="mb-3 mt-4">
                        <label className="form-label">Last Name</label>
                        <input type="text" className="form-control" placeholder="Enter Last Name"
                               onChange={(e) => setLname(e.target.value)}/>
                    </div>

                    <div className="mb-3">
                        <label className='form-label'>Password</label>
                        <input type="password" placeholder="Enter Password"  className="form-control" required
                               onChange={(e) => setPassword(e.target.value)}/>
                    </div>

                    <div className="d-flex justify-content-center">
                        <Button type="submit" className="btn btn-dark mt-md-4 w-100">
                            Sign Up
                        </Button>
                    </div>

                </form>
            </Modal.Body>
            <Modal.Footer>
            </Modal.Footer>
        </Modal>
    )
}




export default ModalSignUp