import React, {Component, useState} from 'react'
import {Button} from "@nextui-org/react";
import Modal from "react-bootstrap/Modal";
import 'bootstrap/dist/css/bootstrap.min.css';

// @ts-ignore
function ModalLogin(props) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    return(
        <Modal
            {...props}
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
                <form>
                    <div className="mb-3 mt-4">
                        <label className="form-label">Email Address</label>
                        <input type="email" className="form-control" placeholder="Enter Email" aria-describedby="emailHelp"/>

                    </div>

                    <div className="mb-3">
                        <label className='form-label'>Password</label>
                        <input type="password" placeholder="Enter Password"  className="form-control" required/>
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