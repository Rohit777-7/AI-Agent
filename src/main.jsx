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
          background: "#ffffff",
          color: "#18181b",
          border: "1px solid #e7e5e4",
          borderRadius: "12px",
          fontSize: "14px",
        },
      }}
    />
  </BrowserRouter>
)
