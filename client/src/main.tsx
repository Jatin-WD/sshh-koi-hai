import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import AppErrorBoundary from "./components/AppErrorBoundary";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppErrorBoundary><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></AppErrorBoundary>
  </React.StrictMode>,
);
