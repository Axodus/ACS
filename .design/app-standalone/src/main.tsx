import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AcsAccountProvider } from "./auth/acs-account-context";
import { ReownAppKitProvider } from "./auth/reown-appkit";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ReownAppKitProvider>
      <AcsAccountProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AcsAccountProvider>
    </ReownAppKitProvider>
  </React.StrictMode>
);
