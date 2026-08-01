import "bootstrap/dist/css/bootstrap.min.css";
import "@/styles/globals.css";
import { ThemeProvider } from "@mui/material/styles";
import type { AppProps } from "next/app";
import React from "react";
import { AuthProvider } from "@/features/auth";
import { ToastContainer } from "react-toastify";
import { theme } from "@/styles/theme";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <Component {...pageProps} />
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </AuthProvider>
    </ThemeProvider>
  );
}