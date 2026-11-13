import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";

import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Builder from "./pages/Builder";
import Billing from "./pages/Billing";

// API calls go to /api on the same domain: Vite proxies them in development, vercel.json in production.
export const ServerUrl = import.meta.env.VITE_SERVER_URL || "";
export const CLIENT_URL = window.location.origin;
const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await axios.get(
          ServerUrl + "/api/user/current-user",
          {
            withCredentials: true,
          }
        );

        console.log(res.data);
        setUser(res.data);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, []);

  console.log("User:", user);

   return (
    <Routes>
      <Route path="/login" element={<Login setUser={setUser} />} />

      <Route
        path="/"
        element={
          <ProtectedRoute user={user} loading={loading}>
            <>
              <Navbar user={user} setUser={setUser} />
              <Home user={user} />
            </>
          </ProtectedRoute>
        }
      />

      <Route
        path="/builder"
        element={
          <ProtectedRoute user={user} loading={loading}>
            <>
              <Navbar user={user} setUser={setUser} />
              <Builder user={user} setUser={setUser} />
            </>
          </ProtectedRoute>
        }
      />

      <Route
        path="/billing"
        element={
          <ProtectedRoute user={user} loading={loading}>
            <>
              <Navbar user={user} setUser={setUser} />
              <Billing user={user} setUser={setUser} />
            </>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;