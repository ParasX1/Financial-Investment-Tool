import "@/styles/globals.css";
import type { AppProps } from "next/app";
import DashboardView from "@/pages/dashboardView";
import React from "react";
import Index from "@/pages/index";
import { AuthProvider } from "@/components/authContext";
import { GraphSettingsProvider } from '@/components/GraphSettingsContext';
import { ToastContainer } from 'react-toastify';


export default function App({ Component, pageProps }: AppProps) {
    return (
    <AuthProvider>
        <GraphSettingsProvider>
            <Component {...pageProps} />
            <ToastContainer position="top-right" autoClose={5000} hideProgressBar={true} newestOnTop={true} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light"/>
        </GraphSettingsProvider>
    </AuthProvider>
  )
}
