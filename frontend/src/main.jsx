import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { GroceryProvider } from "./grocery/GroceryContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <GroceryProvider>
        <App />
      </GroceryProvider>
    </BrowserRouter>
  </React.StrictMode>
);