import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      localStorage.setItem("token", token);
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      api.get("/auth/me")
        .then(res => {
          setUser(res.data);
          navigate("/dashboard", { replace: true });
        })
        .catch(() => {
          navigate("/login", { replace: true });
        });
    } else {
      navigate("/login", { replace: true });
    }
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A8A] mx-auto"></div>
        <p className="mt-4 text-gray-600">Menyelesaikan login...</p>
      </div>
    </div>
  );
}
