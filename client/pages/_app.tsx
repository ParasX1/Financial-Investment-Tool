import "@/styles/globals.css";
import type { AppProps } from "next/app";
import DashboardView from "@/pages/dashboardView";
import React from "react";
import Index from "@/pages/index";

export default function App({ Component, pageProps }: AppProps) {
    return (
        <Component {...pageProps} />
  )
}
