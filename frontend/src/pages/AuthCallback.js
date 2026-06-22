import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    // Ambil parameter dari URL (Google redirects to backend, then backend redirects to frontend with cookie)
    const checkAuth = async () => {
      try {
        // Cek apakah user sudah login via cookie
        const { data } = await api.get("/auth/me");
        setUser(data);
        navigate("/dashboard", { replace: true });
      } catch (e) {
        // Jika gagal, redirect ke login
        navigate("/login", { replace: true });
      }
    };

    // Tunggu sebentar agar cookie sempat terset
    const timer = setTimeout(checkAuth, 500);
    return () => clearTimeout(timer);
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
