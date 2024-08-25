import React, {Component, useState} from 'react'
import {Button} from "@nextui-org/react";
import Modal from "react-bootstrap/Modal";
import 'bootstrap/dist/css/bootstrap.min.css';

// @ts-ignore
function ModalSignUp(props) {
    return(
        <Modal
            {...props}
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
                <form>
                    <div className="mb-3 mt-4">
                        <label className="form-label">Email Address</label>
                        <input type="email" className="form-control" placeholder="Enter Email" aria-describedby="emailHelp"/>
                    </div>

                    <div className="mb-3 mt-4">
                        <label className="form-label">First Name</label>
                        <input type="text" className="form-control" placeholder="Enter First Name"/>
                    </div>

                    <div className="mb-3 mt-4">
                        <label className="form-label">Last Name</label>
                        <input type="text" className="form-control" placeholder="Enter Last Name"/>
                    </div>

                    <div className="mb-3">
                        <label className='form-label'>Password</label>
                        <input type="password" placeholder="Enter Password"  className="form-control" required/>
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