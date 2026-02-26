import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { GroceryProvider } from "./grocery/GroceryContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <GroceryProvider>
        <FavoritesProvider>
          <App />
        </FavoritesProvider>
      </GroceryProvider>
    </BrowserRouter>
  </React.StrictMode>
);