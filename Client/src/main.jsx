import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
    <Toaster
      toastOptions={{
        style: {
          background: "#fffdf9",
          color: "#1a1712",
          border: "1px solid #e3d3b2",
          borderRadius: "12px",
          fontSize: "14px",
        },
      }}
    />
  </BrowserRouter>
)
