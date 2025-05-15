import "@/styles/globals.css";
import type { AppProps } from "next/app";
import DashboardView from "@/pages/dashboardView";
import React from "react";
import Index from "@/pages/index";
import { AuthProvider } from "@/components/authContext";
import { GraphSettingsProvider } from '@/components/GraphSettingsContext';


export default function App({ Component, pageProps }: AppProps) {
    return (
    <AuthProvider>
        <GraphSettingsProvider>
            <Component {...pageProps} />
        </GraphSettingsProvider>
    </AuthProvider>
  )
}
