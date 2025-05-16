import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./components/mobile-responsive.css"; // Importação dos estilos específicos para mobile
import { ThemeProvider } from "./contexts/ThemeContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
